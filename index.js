const express = require('express');
const WebSocket = require('ws');
const app = express();
app.use(express.json());

const wssUrl = 'wss://crushon.ai/ws/trpc';
const ws = new WebSocket(wssUrl, {
  headers: {
    'Cookie': `__Secure-next-auth.session-token=${process.env.SESSION_TOKEN}`
  }
});

let responseBuffer = '';

ws.on('open', () => {
  console.log('Подключено к WebSocket');
});

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());
  if (message.result?.type === 'data') {
    responseBuffer += message.result.data.json.response.content;
  } else if (message.result?.type === 'stopped') {
    console.log('Полный ответ:', responseBuffer);
    // Отправка в Roblox здесь
    responseBuffer = '';
  }
});

app.post('/send_message', (req, res) => {
  const { message } = req.body;
  if (ws.readyState === WebSocket.OPEN) {
    const request = {
      id: Date.now(),
      method: 'subscription.start',
      params: {
        message,
        characterId: 'bd4d826c-e3a5-4d9c-8ea0-87017dce81d3',
        userId: '883c032d-9239-4d9d-ad1c-4fdbd28a19fd'
      }
    };
    ws.send(JSON.stringify(request));
    res.send('Сообщение отправлено, жди ответ');
  } else {
    res.status(503).send('WebSocket не подключён');
  }
});

app.listen(3000, () => console.log('Сервер запущен'));
