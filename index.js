const express = require('express');
const WebSocket = require('ws');
const app = express();
app.use(express.json());

const wssUrl = 'wss://crushon.ai/ws/trpc';
const ws = new WebSocket(wssUrl, {
  headers: {
    'Cookie': `__Secure-next-auth.session-token=${process.env.eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..woDcPMyImt60Di_Q.3uICUd5iqBEJo1KL5nGxmOvIPMuJsTuCEG1GQi5dRyfuz89ZGBGLADud54VAIVrvoKVItM9vJSCLhvj-49XSYnHrAQnpcUS_av1uuXv5yySH4vwS0A0ds3-LhLeeuacpOV6OMK0LE77fqHocuMDyemC4ntDFcIE7syGdsbn8zd--hPdlYCNlPnWhAgr58kFPpQuGxmO3CuvgxiH9je1TF6xe5J6S6p5zuVIMmE1DTwfrZochaBwM7o5E3g2MlNJEg_ZOPZj_ypYrqQGptGQB9PYVAK5j6s8BO6rVlnEQsxPAmUppdK8SnpvL7OqaeRXW9ufw3ki3X18M2kHK6WP1iFDPkNfTaRK0T199y_wzoaAXzpoxeu6tXmjHPOM6QXiTsjPLB6si9cUmOr2iyG5s2Zth5aWWtkte8Q24LnCd7UGFCB6O_oPl6tbbRP4C5_gWuJWuM4NJjh9cjeSlrXun6Kos257urNfSdJV3n3Tx9fes0Qpio08n5kcZopLbsLSt2A42l4dfgcC8-2f0V1DZdvbrb9Ww3JHy-N2DdMqQq0-bIvZ1oWU2_ETOwZVNvZpzGc8JSbd_7Vl36BWj3KyTTKnqLfm8_33JNXnoxvZ30H4A.txoB36o7Xwtdajnppzeb7w}`
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
