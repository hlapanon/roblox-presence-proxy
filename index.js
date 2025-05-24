const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

// Настройка CORS для Roblox
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
    return res.status(400).json({ success: false, error: 'Требуется имя пользователя' });
  }

  try {
    // Получение userId по имени
    const userIdResponse = await axios.post('https://users.roblox.com/v1/usernames/users', {
      usernames: [username],
      excludeBannedUsers: true
    });
    const userData = userIdResponse.data.data[0];
    if (!userData) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }
    const userId = userData.id;

    // Получение базовой информации
    const userInfoResponse = await axios.get(`https://users.roblox.com/v1/users/${userId}`);
    const creationDate = userInfoResponse.data.created;

    // Получение статуса последнего онлайна
    const presenceResponse = await axios.post('https://presence.roblox.com/v1/presence/users', {
      userIds: [userId]
    });
    const lastOnline = presenceResponse.data.userPresences[0].lastOnline;

    // Получение количества друзей
    const friendsCountResponse = await axios.get(`https://friends.roblox.com/v1/users/${userId}/friends/count`);
    const friendsCount = friendsCountResponse.data.count;

    // Сборка данных
    const userInfo = {
      success: true,
      username: userData.name,
      userId: userId,
      creationDate: creationDate,
      lastOnline: lastOnline,
      friendsCount: friendsCount
    };

    return res.status(200).json(userInfo);
  } catch (error) {
    console.error('Ошибка:', error.message);
    return res.status(500).json({ success: false, error: `Ошибка API: ${error.message}` });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
