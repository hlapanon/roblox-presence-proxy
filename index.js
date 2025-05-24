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
            return response.data;
        } catch (error) {
            console.error(`API call failed (attempt ${attempt}/${retries}): ${url}`, {
                status: error.response?.status,
                message: error.message,
                data: error.response?.data
            });
            if (attempt === retries || error.response?.status !== 429) {
                throw error;
            }
            await new Promise(resolve => set|+Timeout(resolve, 1000 * attempt));
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
        const userData = userIdResponse.data[0];
        if (!userData) {
            console.error(`User not found: ${username}`);
            return res.status(404).json({ success: false, error: 'Player not found' });
        }
        const userId = userData.id;

        // Parallel API Calls
        const [userInfo, presence, friendsCount, friends, pastUsernames, groups, followers, following, premium, badges, inventoryAccess] = await Promise.all([
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

        // Fetch Inventory if Accessible
        let inventory = [];
        if (inventoryAccess.canView) {
            try {
                const inventoryResponse = await makeApiCall(
                    `https://inventory.roblox.com/v2/users/${userId}/inventory`,
                    'get',
                    { params: { assetTypes: 'Hat,Clothing,Accessory' } }
                );
                inventory = inventoryResponse.data.map(item => ({
                    id: item.assetId,
                    name: item.name,
                    type: item.assetType,
                    icon: `https://thumbnails.roblox.com/v1/assets?assetIds=${item.assetId}&size=150x150&format=Png`
                }));
            } catch (error) {
                console.error(`Failed to fetch inventory for user ${userId}:`, error.message);
            }
        }

        // Process Presence
        const presenceData = presence.userPresences[0];
        const isInGame = presenceData.userPresenceType === 2 && presenceData.placeId;

        // Build Response
        const response = {
            success: true,
            username: userData.name,
            userId: userId,
            creationDate: userInfo.created,
            description: userInfo.description,
            lastOnline: presenceData.lastOnline,
            friendsCount: friendsCount.count,
            friends: friends.data.slice(0, 50).map(friend => ({
                id: friend.id,
                name: friend.name
            })),
            pastUsernames: pastUsernames.data.map(entry => entry.name),
            groups: groups.data.map(group => ({
                id: group.group.id,
                name: group.group.name,
                role: group.role.name
            })),
            followersCount: followers.count,
            followingCount: following.count,
            isInGame: isInGame,
            placeId: isInGame ? presenceData.placeId : null,
            isPremium: premium,
            badges: badges.data.map(badge => ({
                id: badge.id,
                name: badge.name,
                description: badge.description,
                icon: badge.iconImageUrl
            })),
            inventoryAccessible: inventoryAccess.canView,
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
