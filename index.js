const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

// Enable CORS for Roblox HttpService
app.use((req, res, next) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        return res.status(200).send();
    }
    next();
});

app.post('/getUserInfo', async (req, res) => {
    const { username } = req.body;
    if (!username) {
        console.log('Missing username');
        return res.status(400).json({ success: false, error: 'Username is required' });
    }

    try {
        // Step 1: Get User ID from username
        console.log(`Fetching user ID for username: ${username}`);
        const userIdResponse = await axios.post('https://users.roblox.com/v1/usernames/users', {
            usernames: [username],
            excludeBannedUsers: true
        }, {
            headers: { 'Content-Type': 'application/json' }
        });

        const userData = userIdResponse.data.data[0];
        if (!userData) {
            console.log(`User not found: ${username}`);
            return res.status(404).json({ success: false, error: 'Player not found' });
        }
        const userId = userData.id;
        console.log(`Found user ID: ${userId}`);

        // Step 2: Get User Info (creation date)
        console.log(`Fetching user info for user ID: ${userId}`);
        const userInfoResponse = await axios.get(`https://users.roblox.com/v1/users/${userId}`);
        const creationDate = userInfoResponse.data.created;

        // Step 3: Get Presence (last online)
        console.log(`Fetching presence for user ID: ${userId}`);
        const presenceResponse = await axios.post('https://presence.roblox.com/v1/presence/users', {
            userIds: [userId]
        }, {
            headers: { 'Content-Type': 'application/json' }
        });
        const lastOnline = presenceResponse.data.userPresences[0].lastOnline;

        // Step 4: Get Friends Count
        console.log(`Fetching friends count for user ID: ${userId}`);
        const friendsCountResponse = await axios.get(`https://friends.roblox.com/v1/users/${userId}/friends/count`);
        const friendsCount = friendsCountResponse.data.count;

        // Step 5: Check Presence Type (optional, for in-game status)
        const presence = presenceResponse.data.userPresences[0];
        const isInGame = presence.userPresenceType === 2 && presence.placeId;

        // Return comprehensive user info
        console.log(`Returning user info for ${username}`);
        return res.status(200).json({
            success: true,
            username: userData.name,
            userId: userId,
            creationDate: creationDate,
            lastOnline: lastOnline,
            friendsCount: friendsCount,
            isInGame: isInGame,
            placeId: isInGame ? presence.placeId : null
        });
    } catch (error) {
        console.error('Error:', error.message, error.response ? error.response.status : 'No status');
        return res.status(500).json({ success: false, error: `API error: ${error.message}` });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
