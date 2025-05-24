const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

// CORS Middleware
app.use((req, res, next) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        return res.status(200).send();
    }
    next();
});

// Axios Instance with Timeout
const axiosInstance = axios.create({
    timeout: 10000,
    headers: { 'Content-Type': 'application/json' }
});

// API Call with Retry Logic
async function makeApiCall(url, method = 'get', data = null, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await axiosInstance({
                method,
                url,
                data
            });
            return { success: true, data: response.data };
        } catch (error) {
            const status = error.response?.status;
            console.error(`API call failed (attempt ${attempt}/${retries}): ${url}`, {
                status,
                message: error.message,
                data: error.response?.data
            });
            if (status === 401) {
                // Handle 401 Unauthorized by returning a fallback
                return { success: false, error: 'Unauthorized', status: 401 };
            }
            if (attempt === retries || status !== 429) {
                throw error;
            }
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }
}

// Main Endpoint
app.post('/getUserInfo', async (req, res) => {
    const { username } = req.body;
    if (!username) {
        console.error('Missing username in request body');
        return res.status(400).json({ success: false, error: 'Username is required' });
    }

    try {
        console.log(`Processing request for username: ${username}`);

        // Get User ID
        const userIdResponse = await makeApiCall(
            'https://users.roblox.com/v1/usernames/users',
            'post',
            { usernames: [username], excludeBannedUsers: true }
        );
        if (!userIdResponse.success) {
            throw new Error(`Failed to get user ID: ${userIdResponse.error}`);
        }
        const userData = userIdResponse.data.data[0];
        if (!userData) {
            console.error(`User not found: ${username}`);
            return res.status(404).json({ success: false, error: 'Player not found' });
        }
        const userId = userData.id;

        // Parallel API Calls
        const [
            userInfo,
            presence,
            friendsCount,
            friends,
            pastUsernames,
            groups,
            followers,
            following,
            premium,
            badges,
            inventoryAccess
        ] = await Promise.all([
            makeApiCall(`https://users.roblox.com/v1/users/${userId}`),
            makeApiCall('https://presence.roblox.com/v1/presence/users', 'post', { userIds: [userId] }),
            makeApiCall(`https://friends.roblox.com/v1/users/${userId}/friends/count`),
            makeApiCall(`https://friends.roblox.com/v1/users/${userId}/friends`),
            makeApiCall(`https://users.roblox.com/v1/users/${userId}/username-history`),
            makeApiCall(`https://groups.roblox.com/v1/users/${userId}/groups/roles`),
            makeApiCall(`https://friends.roblox.com/v1/users/${userId}/followers/count`),
            makeApiCall(`https://friends.roblox.com/v1/users/${userId}/followings/count`),
            makeApiCall(`https://premiumfeatures.roblox.com/v1/users/${userId}/validate-membership`),
            makeApiCall(`https://badges.roblox.com/v1/users/${userId}/badges`),
            makeApiCall(`https://inventory.roblox.com/v1/users/${userId}/can-view-inventory`)
        ]);

        // Check for failed API calls
        if (!userInfo.success) throw new Error(`User info failed: ${userInfo.error}`);
        if (!presence.success) throw new Error(`Presence failed: ${presence.error}`);
        if (!friendsCount.success) throw new Error(`Friends count failed: ${friendsCount.error}`);
        if (!friends.success) throw new Error(`Friends list failed: ${friends.error}`);
        if (!pastUsernames.success) throw new Error(`Past usernames failed: ${pastUsernames.error}`);
        if (!groups.success) throw new Error(`Groups failed: ${groups.error}`);
        if (!followers.success) throw new Error(`Followers failed: ${followers.error}`);
        if (!following.success) throw new Error(`Following failed: ${following.error}`);
        if (!badges.success) throw new Error(`Badges failed: ${badges.error}`);
        if (!inventoryAccess.success) throw new Error(`Inventory access failed: ${inventoryAccess.error}`);

        // Fetch Inventory if Accessible
        let inventory = [];
        if (inventoryAccess.data.canView) {
            try {
                const inventoryResponse = await makeApiCall(
                    `https://inventory.roblox.com/v2/users/${userId}/inventory`,
                    'get',
                    { params: { assetTypes: 'Hat,Clothing,Accessory' } }
                );
                if (inventoryResponse.success) {
                    inventory = inventoryResponse.data.data.map(item => ({
                        id: item.assetId,
                        name: item.name,
                        type: item.assetType,
                        icon: `https://thumbnails.roblox.com/v1/assets?assetIds=${item.assetId}&size=150x150&format=Png`
                    }));
                } else {
                    console.error(`Inventory fetch failed for user ${userId}: ${inventoryResponse.error}`);
                }
            } catch (error) {
                console.error(`Failed to fetch inventory for user ${userId}:`, error.message);
            }
        }

        // Process Presence
        const presenceData = presence.data.userPresences[0];
        const isInGame = presenceData.userPresenceType === 2 && presenceData.placeId;

        // Handle Premium Status
        const isPremium = premium.success ? premium.data : false;

        // Build Response
        const response = {
            success: true,
            username: userData.name,
            userId: userId,
            creationDate: userInfo.data.created,
            description: userInfo.data.description,
            lastOnline: presenceData.lastOnline,
            friendsCount: friendsCount.data.count,
            friends: friends.data.data.slice(0, 50).map(friend => ({
                id: friend.id,
                name: friend.name
            })),
            pastUsernames: pastUsernames.data.data.map(entry => entry.name),
            groups: groups.data.data.map(group => ({
                id: group.group.id,
                name: group.group.name,
                role: group.role.name
            })),
            followersCount: followers.data.count,
            followingCount: following.data.count,
            isInGame: isInGame,
            placeId: isInGame ? presenceData.placeId : null,
            isPremium: isPremium,
            badges: badges.data.data.map(badge => ({
                id: badge.id,
                name: badge.name,
                description: badge.description,
                icon: badge.iconImageUrl
            })),
            inventoryAccessible: inventoryAccess.data.canView,
            inventory: inventory
        };

        console.log(`Successfully processed request for ${username}`);
        return res.status(200).json(response);
    } catch (error) {
        console.error('Internal server error for username:', username, {
            message: error.message,
            stack: error.stack,
            requestBody: req.body
        });
        return res.status(500).json({ success: false, error: `Internal server error: ${error.message}` });
    }
});

// Start Server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
