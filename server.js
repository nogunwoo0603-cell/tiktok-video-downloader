const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());
app.use(express.static('public'));

app.post('/api/download', async (req, res) => {
    const { url } = req.body;

    try {
        const response = await axios.post('https://www.tikwm.com/api/', 
            new URLSearchParams({ url: url, count: 12, cursor: 0, web: 1 }), 
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            }
        );

        const data = response.data.data;

        if (data && data.play) {
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
        console.error(error);
        res.status(500).json({ success: false });
    }
});

// 스트리밍 다운로드 라우트
app.get('/api/stream', async (req, res) => {
    const { videoUrl } = req.query;
    try {
        const videoStream = await axios({
            method: 'get',
            url: videoUrl,
            responseType: 'stream',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        res.setHeader('Content-Disposition', 'attachment; filename="tiktok_video.mp4"');
        res.setHeader('Content-Type', 'video/mp4');
        videoStream.data.pipe(res);
    } catch (error) {
        res.status(500).send('Download failed');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});