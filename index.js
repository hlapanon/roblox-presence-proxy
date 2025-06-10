const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const CRUSHON_API_URL = 'https://crushon.ai/api/chat/send'; // Замени на реальный endpoint
const SESSION_TOKEN = process.env.eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..RVFh5H4Ujr47Z9kO.VNDdk5-kx8Uu3B0pXiX56tOadgdqD0lDWYqxTB_iu7h0DdurKlXRpiSduEUp0ZGv51GCDTqhGFukdYpPmmwzieeAKiy_XndzBQG_A-n94pGAMkx8OlTR5QqPx14tyzvtyNlUtOjv4J0N9wXVxAO2yVZlK3PewfwKnysV0ILmtjmLJ1oCcUOXDeupkQLD8FsPO2_3w12LA9k35MCiGOfBKN9cKKQGLdmJ4RqGIw7zjkSeEqxByuiZmLcKseeQ628RxJMa6Ix_HGkDqaKdbTm5uOc54IK7JS2xfvkh-hvos0H_vGvPcQQeB-twqzU2Ic4CL87MroAeCSNu82qbaTT2vtXSibtTJaubntlYlmlB5smTvz06IEL6qmzk1ZWqSaL7nR3cGkrG30uMTICMbxMJbG8sNB8pVYNCjWrkfprz2xSNArccq7NqCgGE5NBGNjjoT6i1Nl6mzrCSd8JNuR55oCAbiPvhoKHLaCN4rm8bXmYeOXeIp-aeaI23TtZKLtXNCzLFN80l6bfnEu7v1tC9t1pq_8ETrNsoJF1mkdg3osIBM4Gf7byi3Jl9VPUvahiB5uyAy02ickgWiR7ksyVeJBIsmVBy7OlNEwmy-8bs1PGd.sKPPbrMTq9PlShf0hS1RGQ; // Куки из переменной окружения

app.post('/send_message', async (req, res) => {
  const message = req.body.message;
  try {
    const response = await axios.post(CRUSHON_API_URL, { message }, {
      headers: {
        'Cookie': `__Secure-next-auth.session-token=${SESSION_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    res.send(response.data); // Отправляем ответ бота обратно в Roblox
  } catch (error) {
    res.status(500).send('Ошибка связи с CrushOn AI');
  }
});

app.listen(3000, () => console.log('Сервер запущен на порту 3000'));
