const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

const userAgents = [
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
    'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
];

const getRandomUA = () => userAgents[Math.floor(Math.random() * userAgents.length)];

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

app.use(express.json());
app.use(express.static('public'));

// 1. 기존 틱톡(TikTok) 다운로드 API
app.post('/api/tiktok', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ success: false, message: 'URL is required.' });

    try {
        const response = await axios.post('https://www.tikwm.com/api/', null, {
            params: { url: url },
            headers: { 'User-Agent': getRandomUA() },
            timeout: 10000
        });

        if (response.data && response.data.data) {
            return res.json({
                success: true,
                videoUrl: response.data.data.play || response.data.data.wmplay,
                title: response.data.data.title || 'TikTok Video'
            });
        }
        return res.status(400).json({ success: false, message: 'Failed to extract TikTok video.' });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'TikTok processing error.' });
    }
});

// 2. 인스타그램 릴스(Instagram Reels) 다운로드 API
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
                'x-rapidapi-host': 'instagram-reels-downloader-api.p.rapidapi.com',
                'User-Agent': getRandomUA()
            },
            timeout: 15000
        };

        const response = await axios.request(options);
        const resData = response.data;

        let videoUrl = null;
        if (resData && resData.data) {
            videoUrl = resData.data.media || resData.data.video || resData.data.url;
        } else if (resData.url) {
            videoUrl = resData.url;
        }

        if (videoUrl) {
            return res.json({ success: true, videoUrl: videoUrl, title: 'Instagram Reels' });
        }
        return res.status(400).json({ success: false, message: 'Failed to extract Instagram video.' });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Instagram processing error.' });
    }
});

// 3. 파일 스트리밍 파이프 API (MP4 데이터 손실 및 비디오 깨짐 완전 방지)
app.get('/api/stream', async (req, res) => {
    const videoUrl = req.query.videoUrl;
    if (!videoUrl) return res.status(400).send('Video URL is required.');

    try {
        const response = await axios({
            method: 'get',
            url: videoUrl,
            responseType: 'stream',
            headers: {
                'User-Agent': getRandomUA(),
                'Referer': videoUrl.includes('instagram') ? 'https://www.instagram.com/' : 'https://www.tiktok.com/'
            }
        });

        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Content-Disposition', 'attachment; filename="video.mp4"');
        response.data.pipe(res);
    } catch (err) {
        console.error('Stream Error:', err.message);
        res.status(500).send('Download stream error.');
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
