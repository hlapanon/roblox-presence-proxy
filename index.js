const express = require('express');
const axios = require('axios');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

const ROBLOX_API_BASE = 'https://api.roblox.com';
const BADGES_API_BASE = 'https://badges.roblox.com';

app.post('/getUserInfo', async (req, res) => {
    const { username } = req.body;
    if (!username) {
        return res.status(400).json({ success: false, error: 'Username is required' });
    }

    try {
        // Get user ID
        const userResponse = await axios.get(`${ROBLOX_API_BASE}/v1/users/search`, {
            params: { keyword: username, limit: 1 }
        });
        const user = userResponse.data.data[0];
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        const userId = user.id;

        // Get user info
        const userInfoResponse = await axios.get(`${ROBLOX_API_BASE}/v1/users/${userId}`);
        const userInfo = userInfoResponse.data;

        // Get friends
        const friendsResponse = await axios.get(`${ROBLOX_API_BASE}/v1/users/${userId}/friends`);
        const friends = friendsResponse.data.data;

        // Get presence
        const presenceResponse = await axios.post(`${ROBLOX_API_BASE}/v1/presence/users`, {
            userIds: [userId]
        });
        const lastOnline = presenceResponse.data.userPresences[0].lastOnline;

        // Get premium status
        const membershipResponse = await axios.get(`${ROBLOX_API_BASE}/v1/users/${userId}/membership`);
        const isPremium = membershipResponse.data.membershipType === 'Premium';

        // Get past usernames
        const pastUsernamesResponse = await axios.get(`${ROBLOX_API_BASE}/v1/users/${userId}/username-history`);
        const pastUsernames = pastUsernamesResponse.data.data.map(entry => entry.name);

        // Get badges with pagination
        let badges = [];
        let nextPageCursor = null;
        do {
            const badgesResponse = await axios.get(`${BADGES_API_BASE}/v1/users/${userId}/badges`, {
                params: { cursor: nextPageCursor }
            });
            badges = badges.concat(badgesResponse.data.data);
            nextPageCursor = badgesResponse.data.nextPageCursor;
        } while (nextPageCursor);

        res.json({
            success: true,
            username: userInfo.name,
            userId: userId,
            creationDate: userInfo.created,
            lastOnline: lastOnline,
            friendsCount: friends.length,
            badgesCount: badges.length,
            description: userInfo.description,
            pastUsernames: pastUsernames,
            isPremium: isPremium,
            displayName: userInfo.displayName,
            friends: friends,
            badges: badges
        });
    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
        res.status(500).json({ success: false, error: error.response ? error.response.data : 'Internal server error' });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
