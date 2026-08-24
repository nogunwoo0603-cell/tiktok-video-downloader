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

// 1. 인스타그램 릴스 파싱 API (RapidAPI 연결)
app.post('/api/insta', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ success: false, message: 'URL is required.' });

    try {
        const options = {
            method: 'GET',
            url: 'https://instagram-reels-downloader-api.p.rapidapi.com/download',
            params: { url: url },
            headers: {
                'x-rapidapi-key': '02a8b103c7msh11fcec01d0ee8e4p17d118jsn529ff52a627f',
                'x-rapidapi-host': 'instagram-reels-downloader-api.p.rapidapi.com'
            },
            timeout: 15000
        };

        const response = await axios.request(options);
        const data = response.data;

        // API 응답 구조 추출
        let videoUrl = null;
        if (data) {
            if (typeof data === 'string' && data.startsWith('http')) {
                videoUrl = data;
            } else if (data.download_url) {
                videoUrl = data.download_url;
            } else if (data.url) {
                videoUrl = data.url;
            } else if (data.data && data.data.video_url) {
                videoUrl = data.data.video_url;
            } else if (Array.isArray(data) && data[0] && data[0].url) {
                videoUrl = data[0].url;
            }
        }

        if (videoUrl) {
            return res.json({
                success: true,
                videoUrl: videoUrl,
                title: 'Instagram Reels Video'
            });
        }

        throw new Error('Could not find video URL in response');
    } catch (err) {
        console.error('Insta Error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to process Instagram link.' });
    }
});

// 2. 파일 다운로드 스트리밍 API
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

        res.setHeader('Content-Disposition', 'attachment; filename="instagram_reels.mp4"');
        res.setHeader('Content-Type', 'video/mp4');
        response.data.pipe(res);
    } catch (err) {
        res.status(500).send('Download stream error.');
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
