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

// Axios Instance
const axiosInstance = axios.create({
    timeout: 10000,
    headers: { 'Content-Type': 'application/json' }
});

// API Base URLs (from https://create.roblox.com/docs/cloud/legacy/develop/v2)
const USERS_API_BASE = 'https://users.roblox.com';
const PRESENCE_API_BASE = 'https://presence.roblox.com';
const FRIENDS_API_BASE = 'https://friends.roblox.com';
const GROUPS_API_BASE = 'https://groups.roblox.com';
const BADGES_API_BASE = 'https://badges.roblox.com';
const MEMBERSHIP_API_BASE = 'https://premiumfeatures.roblox.com';

// In-Memory Cache
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Request Queue
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
        console.error('Queue error:', error.message);
        res.status(500).json({ success: false, error: `Queue error: ${error.message}` });
        resolve();
    }
    isProcessing = false;
    await processQueue();
}

// Utility: Delay
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// API Call with Retry
async function makeApiCall(url, method = 'get', data = null, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await axiosInstance({ method, url, data });
            return { success: true, data: response.data };
        } catch (error) {
            const status = error.response?.status;
            console.error(`API call failed (attempt ${attempt}/${retries}): ${url}`, {
                status,
                message: error.message
            });
            if (status === 401) return { success: false, error: 'Unauthorized', status: 401 };
            if (status === 429) {
                if (attempt === retries) return { success: false, error: 'Rate limit exceeded', status: 429 };
                await delay(2000 * Math.pow(2, attempt - 1));
                continue;
            }
            return { success: false, error: error.message, status: status || 500 };
        }
    }
}

// Batch API Calls
async function batchApiCalls(calls, batchSize = 1, delayMs = 1000) {
    const results = [];
    for (let i = 0; i < calls.length; i += batchSize) {
        const batch = calls.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(call => call()));
        results.push(...batchResults);
        if (i + batchSize < calls.length) await delay(delayMs);
    }
    return results;
}

async function handleRequest(req, res) {
    const { username } = req.body;
    if (!username) {
        console.error('Missing username');
        return res.status(400).json({ success: false, error: 'Username is required' });
    }

    // Check Cache
    if (cache.has(username)) {
        const cached = cache.get(username);
        if (Date.now() - cached.timestamp < CACHE_DURATION) {
            console.log(`Cached response for ${username}`);
            return res.status(200).json(cached.data);
        }
    }

    try {
        console.log(`Processing ${username}`);

        // Get User ID
        const userIdResponse = await makeApiCall(
            `${USERS_API_BASE}/v1/usernames/users`,
            'post',
            { usernames: [username], excludeBannedUsers: true }
        );
        if (!userIdResponse.success) throw new Error(`User ID fetch failed: ${userIdResponse.error}`);
        const userData = userIdResponse.data.data[0];
        if (!userData) {
            console.error(`User not found: ${username}`);
            return res.status(404).json({ success: false, error: 'Player not found' });
        }
        const userId = userData.id;

        // Batch API Calls
        const apiCalls = [
            () => makeApiCall(`${USERS_API_BASE}/v1/users/${userId}`),
            () => makeApiCall(`${PRESENCE_API_BASE}/v1/presence/users`, 'post', { userIds: [userId] }),
            () => makeApiCall(`${FRIENDS_API_BASE}/v1/users/${userId}/friends/count`),
            () => makeApiCall(`${FRIENDS_API_BASE}/v1/users/${userId}/friends`),
            () => makeApiCall(`${USERS_API_BASE}/v1/users/${userId}/username-history`),
            () => makeApiCall(`${GROUPS_API_BASE}/v1/users/${userId}/groups/roles`),
            () => makeApiCall(`${FRIENDS_API_BASE}/v1/users/${userId}/followers/count`),
            () => makeApiCall(`${FRIENDS_API_BASE}/v1/users/${userId}/followings/count`),
            () => makeApiCall(`${MEMBERSHIP_API_BASE}/v1/users/${userId}/membership`)
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
            premium
        ] = await batchApiCalls(apiCalls, 1, 1000);

        // Fetch Badges with Pagination
        let badges = [];
        let nextPageCursor = null;
        do {
            const params = nextPageCursor ? `?cursor=${nextPageCursor}` : '';
            const badgesResponse = await makeApiCall(`${BADGES_API_BASE}/v1/users/${userId}/badges${params}`);
            if (badgesResponse.success) {
                badges = badges.concat(badgesResponse.data.data);
                nextPageCursor = badgesResponse.data.nextPageCursor;
            } else {
                console.warn(`Badges failed: ${badgesResponse.error}`);
                break;
            }
            await delay(100);
        } while (nextPageCursor);

        // Handle Responses
        const userInfoData = userInfo.success ? userInfo.data : { created: 'N/A', description: '', displayName: username };
        const presenceData = presence.success ? presence.data.userPresences[0] : { userPresenceType: 0, lastOnline: 'N/A', placeId: null };
        const friendsCountData = friendsCount.success ? friendsCount.data.count : 0;
        const friendsData = friends.success ? friends.data.data : [];
        const pastUsernamesData = pastUsernames.success ? pastUsernames.data.data : [];
        const groupsData = groups.success ? groups.data.data : [];
        const followersData = followers.success ? followers.data.count : 0;
        const followingData = following.success ? following.data.count : 0;
        const isPremium = premium.success ? premium.data.membershipType === 'Premium' : false;

        // Process Presence
        const isInGame = presenceData.userPresenceType === 2 && presenceData.placeId;

        // Log Failures
        if (!userInfo.success) console.warn(`User info failed: ${userInfo.error}`);
        if (!presence.success) console.warn(`Presence failed: ${presence.error}`);
        if (!friendsCount.success) console.warn(`Friends count failed: ${friendsCount.error}`);
        if (!friends.success) console.warn(`Friends failed: ${friends.error}`);
        if (!pastUsernames.success) console.warn(`Past usernames failed: ${pastUsernames.error}`);
        if (!groups.success) console.warn(`Groups failed: ${groups.error}`);
        if (!followers.success) console.warn(`Followers failed: ${followers.error}`);
        if (!following.success) console.warn(`Following failed: ${following.error}`);
        if (!premium.success) console.warn(`Premium failed: ${premium.error}`);

        // Build Response
        const response = {
            success: true,
            username: userData.name,
            userId: userId,
            creationDate: userInfoData.created,
            description: userInfoData.description,
            lastOnline: presenceData.lastOnline,
            friendsCount: friendsCountData,
            friends: friendsData.map(friend => ({
                id: friend.id,
                name: friend.name,
                displayName: friend.displayName || friend.name
            })),
            pastUsernames: pastUsernamesData.map(entry => entry.name),
            groups: groupsData.map(group => ({
                id: group.group.id,
                name: group.group.name,
                role: group.role.name
            })),
            followersCount: followersData,
            followingCount: followingData,
            isPremium: isPremium,
            displayName: userInfoData.displayName || userData.name,
            badgesCount: badges.length,
            badges: badges.map(badge => ({
                id: badge.id,
                name: badge.name,
                description: badge.description,
                icon: badge.iconImageUrl || ''
            })),
            isInGame: isInGame,
            placeId: isInGame ? presenceData.placeId : null
        };

        // Cache and Respond
        cache.set(username, { data: response, timestamp: Date.now() });
        console.log(`Processed ${username}: Badges=${badges.length}, Friends=${friendsCountData}`);
        return res.status(200).json(response);
    } catch (error) {
        console.error('Server error:', username, error.message);
        return res.status(500).json({ success: false, error: `Internal server error: ${error.message}` });
    }
}

// Endpoint
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
