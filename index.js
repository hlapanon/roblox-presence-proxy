const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

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
        return res.status(400).json({ success: false, error: 'Username is required' });
    }

    try {
        const userIdResponse = await axios.post('https://users.roblox.com/v1/usernames/users', {
            usernames: [username],
            excludeBannedUsers: true
        }, {
            headers: { 'Content-Type': 'application/json' }
        });

        const userData = userIdResponse.data.data[0];
        if (!userData) {
            return res.status(404).json({ success: false, error: 'Player not found' });
        }
        const userId = userData.id;

        const userInfoResponse = await axios.get(`https://users.roblox.com/v1/users/${userId}`);
        const creationDate = userInfoResponse.data.created;
        const description = userInfoResponse.data.description;

        const presenceResponse = await axios.post('https://presence.roblox.com/v1/presence/users', {
            userIds: [userId]
        }, {
            headers: { 'Content-Type': 'application/json' }
        });
        const lastOnline = presenceResponse.data.userPresences[0].lastOnline;

        const friendsCountResponse = await axios.get(`https://friends.roblox.com/v1/users/${userId}/friends/count`);
        const friendsCount = friendsCountResponse.data.count;

        const friendsResponse = await axios.get(`https://friends.roblox.com/v1/users/${userId}/friends`);
        const friends = friendsResponse.data.data.slice(0, 5).map(friend => ({
            id: friend.id,
            name: friend.name
        }));

        const pastUsernamesResponse = await axios.get(`https://users.roblox.com/v1/users/${userId}/username-history`);
        const pastUsernames = pastUsernamesResponse.data.data.map(entry => entry.name);

        const groupsResponse = await axios.get(`https://groups.roblox.com/v1/users/${userId}/groups/roles`);
        const groups = groupsResponse.data.data.map(group => ({
            id: group.group.id,
            name: group.group.name,
            role: group.role.name
        }));

        const followersResponse = await axios.get(`https://friends.roblox.com/v1/users/${userId}/followers/count`);
        const followingResponse = await axios.get(`https://friends.roblox.com/v1/users/${userId}/followings/count`);
        const followersCount = followersResponse.data.count;
        const followingCount = followingResponse.data.count;

        const presence = presenceResponse.data.userPresences[0];
        const isInGame = presence.userPresenceType === 2 && presence.placeId;

        return res.status(200).json({
            success: true,
            username: userData.name,
            userId: userId,
            creationDate: creationDate,
            description: description,
            lastOnline: lastOnline,
            friendsCount: friendsCount,
            friends: friends,
            pastUsernames: pastUsernames,
            groups: groups,
            followersCount: followersCount,
            followingCount: followingCount,
            isInGame: isInGame,
            placeId: isInGame ? presence.placeId : null
        });
    } catch (error) {
        return res.status(500).json({ success: false, error: `API error: ${error.message}` });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
