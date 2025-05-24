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

// In-Memory Cache
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Request Queue to Prevent Overload
const requestQueue = [];
let isProcessing = false;

async function processQueue() {
    if (isProcessing || requestQueue.length === 0) return;
    isProcessing = true;
    const { req, res, resolve } = requestQueue.shift();
    try {
        await handleRequest(req, res);
        resolve();
    } catch (error) {
        console.error('Queue processing error:', error);
        res.status(500).json({ success: false, error: `Queue error: ${error.message}` });
        resolve();
    }
    isProcessing = false;
    await processQueue();
}

// Utility to Add Delay
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

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
                return { success: false, error: 'Unauthorized', status: 401 };
            }
            if (status === 429) {
                if (attempt === retries) {
                    return { success: false, error: 'Rate limit exceeded', status: 429 };
                }
                // Exponential backoff: 2s, 4s, 8s
                await delay(2000 * Math.pow(2, attempt - 1));
                continue;
            }
            return { success: false, error: error.message, status: status || 500 };
        }
    }
}

// Batch API Calls with Throttling
async function batchApiCalls(calls, batchSize = 1, delayMs = 1000) {
    const results = [];
    for (let i = 0; i < calls.length; i += batchSize) {
        const batch = calls.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(call => call()));
        results.push(...batchResults);
        if (i + batchSize < calls.length) {
            await delay(delayMs);
        }
    }
    return results;
}

// Handle Individual Request
async function handleRequest(req, res) {
    const { username } = req.body;
    if (!username) {
        console.error('Missing username in request body');
        return res.status(400).json({ success: false, error: 'Username is required' });
    }

    // Check Cache
    if (cache.has(username)) {
        const cached = cache.get(username);
        if (Date.now() - cached.timestamp < CACHE_DURATION) {
            console.log(`Returning cached response for ${username}`);
            return res.status(200).json(cached.data);
        }
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

        // Batch API Calls (Reduced Endpoints)
        const apiCalls = [
            () => makeApiCall(`https://users.roblox.com/v1/users/${userId}`),
            () => makeApiCall('https://presence.roblox.com/v1/presence/users', 'post', { userIds: [userId] }),
            () => makeApiCall(`https://friends.roblox.com/v1/users/${userId}/friends/count`),
            () => makeApiCall(`https://friends.roblox.com/v1/users/${userId}/friends`),
            // Skip username-history
            () => Promise.resolve({ success: true, data: { data: [] } }),
            () => makeApiCall(`https://groups.roblox.com/v1/users/${userId}/groups/roles`),
            () => makeApiCall(`https://friends.roblox.com/v1/users/${userId}/followers/count`),
            () => makeApiCall(`https://friends.roblox.com/v1/users/${userId}/followings/count`),
            // Skip premium
            () => Promise.resolve({ success: true, data: false }),
            () => makeApiCall(`https://badges.roblox.com/v1/users/${userId}/badges`),
            // Skip can-view-inventory
            () => Promise.resolve({ success: true, data: { canView: false } })
        ];

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
        ] = await batchApiCalls(apiCalls, 1, 1000);

        // Handle Failed API Calls with Fallbacks
        const userInfoData = userInfo.success ? userInfo.data : { created: 'N/A', description: '' };
        const presenceData = presence.success ? presence.data.userPresences[0] : { userPresenceType: 0, lastOnline: 'N/A' };
        const friendsCountData = friendsCount.success ? friendsCount.data : { count: 0 };
        const friendsData = friends.success ? friends.data : { data: [] };
        const groupsData = groups.success ? groups.data : { data: [] };
        const followersData = followers.success ? followers.data : { count: 0 };
        const followingData = following.success ? following.data : { count: 0 };
        const badgesData = badges.success ? badges.data : { data: [] };
        const pastUsernamesData = pastUsernames.success ? pastUsernames.data : { data: [] };
        const inventoryAccessData = inventoryAccess.success ? inventoryAccess.data : { canView: false };
        const isPremium = premium.success ? premium.data : false;

        // Log Failures
        if (!userInfo.success) console.warn(`User info failed: ${userInfo.error}`);
        if (!presence.success) console.warn(`Presence failed: ${presence.error}`);
        if (!friendsCount.success) console.warn(`Friends count failed: ${friendsCount.error}`);
        if (!friends.success) console.warn(`Friends list failed: ${friends.error}`);
        if (!groups.success) console.warn(`Groups failed: ${groups.error}`);
        if (!followers.success) console.warn(`Followers failed: ${followers.error}`);
        if (!following.success) console.warn(`Following failed: ${following.error}`);
        if (!badges.success) console.warn(`Badges failed: ${badges.error}`);

        // Skip Inventory Fetch
        let inventory = [];

        // Process Presence
        const isInGame = presenceData.userPresenceType === 2 && presenceData.placeId;

        // Build Response
        const response = {
            success: true,
            username: userData.name,
            userId: userId,
            creationDate: userInfoData.created,
            description: userInfoData.description,
            lastOnline: presenceData.lastOnline,
            friendsCount: friendsCountData.count,
            friends: friendsData.data.slice(0, 50).map(friend => ({
                id: friend.id,
                name: friend.name
            })),
            pastUsernames: pastUsernamesData.data.map(entry => entry.name),
            groups: groupsData.data.map(group => ({
                id: group.group.id,
                name: group.group.name,
                role: group.role.name
            })),
            followersCount: followersData.count,
            followingCount: followingData.count,
            isInGame: isInGame,
            placeId: isInGame ? presenceData.placeId : null,
            isPremium: isPremium,
            badges: badgesData.data.map(badge => ({
                id: badge.id,
                name: badge.name,
                description: badge.description,
                icon: badge.iconImageUrl
            })),
            inventoryAccessible: inventoryAccessData.canView,
            inventory: inventory
        };

        // Cache Response
        cache.set(username, { data: response, timestamp: Date.now() });
        console.log(`Successfully processed and cached request for ${username}`);
        return res.status(200).json(response);
    } catch (error) {
        console.error('Internal server error for username:', username, {
            message: error.message,
            stack: error.stack,
            requestBody: req.body
        });
        return res.status(500).json({ success: false, error: `Internal server error: ${error.message}` });
    }
}

// Main Endpoint with Queue
app.post('/getUserInfo', (req, res) => {
    new Promise(resolve => {
        requestQueue.push({ req, res, resolve });
        processQueue();
    });
});

// Cache Cleanup
setInterval(() => {
    for (const [key, value] of cache) {
        if (Date.now() - value.timestamp > CACHE_DURATION) {
            cache.delete(key);
        }
    }
}, 60 * 1000);

// Start Server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
