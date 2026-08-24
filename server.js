const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS 설정
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

app.use(express.json());
app.use(express.static('public'));

// 1. 인스타그램 릴스 전용 백엔드 파싱 API
app.post('/api/insta', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ success: false, message: 'URL is required.' });

    try {
        // 백엔드 요청 헤더 위장 (봇 차단 방지)
        const response = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json'
            },
            timeout: 10000
        });

        if (response.data && response.data.data && response.data.data.play) {
            let videoUrl = response.data.data.play;
            if (!videoUrl.startsWith('http')) {
                videoUrl = 'https://www.tikwm.com' + videoUrl;
            }
            return res.json({
                success: true,
                videoUrl: videoUrl,
                title: response.data.data.title || 'Instagram Reels Video'
            });
        }

        return res.status(400).json({ success: false, message: 'Could not extract video. Check link validity.' });
    } catch (err) {
        console.error('Insta Error:', err.message);
        return res.status(500).json({ success: false, message: 'Server error processing video.' });
    }
});

// 2. 강제 다운로드 스트리밍 API
app.get('/api/stream', async (req, res) => {
    const videoUrl = req.query.videoUrl;
    if (!videoUrl) return res.status(400).send('Video URL is required.');

    try {
        const response = await axios({
            method: 'get',
            url: videoUrl,
            responseType: 'stream',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        res.setHeader('Content-Disposition', 'attachment; filename="video.mp4"');
        res.setHeader('Content-Type', 'video/mp4');
        response.data.pipe(res);
    } catch (err) {
        res.status(500).send('Download stream error.');
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
