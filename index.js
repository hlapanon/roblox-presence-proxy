const functions = require('firebase-functions');
const axios = require('axios');

exports.checkPlayerPresence = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).send();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ success: false, error: 'Username is required' });
  }

  try {
    const userResponse = await axios.get(`https://users.roblox.com/v1/usernames/users`, {
      data: { usernames: [username], excludeBannedUsers: true },
      headers: { 'Content-Type': 'application/json' }
    });

    const userData = userResponse.data.data[0];
    if (!userData) {
      return res.status(404).json({ success: false, error: 'Player not found' });
    }

    const userId = userData.id;

    const presenceResponse = await axios.post('https://presence.roblox.com/v1/presence/users', {
      userIds: [userId]
    }, {
      headers: { 'Content-Type': 'application/json' }
    });

    const presence = presenceResponse.data.userPresences[0];
    if (!presence || presence.userPresenceType !== 2 || !presence.placeId) {
      return res.status(200).json({ success: true, isInGame: false });
    }

    const thumbnailResponse = await axios.get(`https://thumbnails.roblox.com/v1/places/gameicons?placeIds=${presence.placeId}&size=150x150&format=Png`);
    const thumbnailData = thumbnailResponse.data.data[0];

    return res.status(200).json({
      success: true,
      isInGame: true,
      placeId: presence.placeId,
      thumbnailUrl: thumbnailData ? thumbnailData.imageUrl : ''
    });

  } catch (error) {
    console.error('Error:', error.message);
    return res.status(500).json({ success: false, error: `API error: ${error.message}` });
  }
});
