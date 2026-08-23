const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());
app.use(express.static('public'));

app.post('/api/download', async (req, res) => {
  const { url } = req.body;

  try {
    const response = await axios.post('https://www.tikwm.com/api/', {
      url: url,
      count: 12,
      cursor: 0,
      web: 1
    });

    const data = response.data.data;
    if (data && data.play) {
      // 주소가 http로 시작하지 않으면 앞에 tikwm 도메인을 강제로 붙여줍니다.
      let realVideoUrl = data.play;
      if (!realVideoUrl.startsWith('http')) {
        realVideoUrl = 'https://www.tikwm.com' + realVideoUrl;
      }

      res.json({
        success: true,
        title: data.title || 'TikTok Video',
        downloadUrl: `/api/stream?videoUrl=${encodeURIComponent(realVideoUrl)}`
      });
    } else {
      res.json({ success: false });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/stream', async (req, res) => {
  const { videoUrl } = req.query;

  try {
    const response = await axios({
      method: 'get',
      url: videoUrl,
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', 'attachment; filename="tiktok_video.mp4"');
    response.data.pipe(res);
  } catch (error) {
    res.status(500).send('영상 다운로드에 실패했습니다.');
  }
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));