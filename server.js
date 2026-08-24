const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

app.use(express.json());
app.use(express.static('public'));

// 1. 기존 틱톡 API (초기 안정화 버전 원복)
app.post('/api/tiktok', async (req, res) => {
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
                title: response.data.data.title || 'TikTok Video'
            });
        }
        return res.status(400).json({ success: false, message: 'TikTok parsing failed.' });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'TikTok server error.' });
    }
});

// 2. 인스타그램 릴스 API
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
        const resData = response.data;

        let videoUrl = null;
        if (resData && resData.data) {
            videoUrl = resData.data.media || resData.data.video || resData.data.url;
        } else if (resData.url) {
            videoUrl = resData.url;
        }

        if (videoUrl) {
            return res.json({ success: true, videoUrl: videoUrl });
        }
        return res.status(400).json({ success: false, message: 'Instagram parsing failed.' });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Instagram server error.' });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
