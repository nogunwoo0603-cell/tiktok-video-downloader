const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 1. 인스타그램 릴스 파싱 API
app.post('/api/insta', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ success: false, message: 'URL is required.' });

    try {
        const response = await axios.post('https://v3.tikwm.com/api/fetch', null, {
            params: { url: url },
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (response.data && response.data.data) {
            return res.json({
                success: true,
                videoUrl: response.data.data.play || response.data.data.wmplay,
                title: response.data.data.title || 'Instagram Reels Video'
            });
        }

        throw new Error('Failed to parse video');
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to process Instagram link.' });
    }
});

// 2. 파일 다운로드 스트리밍 API (강제 파일 저장)
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

        res.setHeader('Content-Disposition', 'attachment; filename="downloaded_video.mp4"');
        res.setHeader('Content-Type', 'video/mp4');
        response.data.pipe(res);
    } catch (err) {
        res.status(500).send('Download stream error.');
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
