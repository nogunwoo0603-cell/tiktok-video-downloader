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
            return res.json({
                success: true,
                videoUrl: videoUrl,
                title: 'Instagram Reels Video'
            });
        }

        return res.status(400).json({ success: false, message: 'Failed to extract video URL.' });

    } catch (err) {
        console.error('Insta Error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to process Instagram link.' });
    }
});

// 파일 리다이렉트 처리 (인스타그램 CDN 직연결로 용량 손실 방지)
app.get('/api/stream', (req, res) => {
    const videoUrl = req.query.videoUrl;
    if (!videoUrl) return res.status(400).send('Video URL is required.');
    
    // 서버를 거치지 않고 원본 고화질 영상 링크로 직접 연결
    res.redirect(videoUrl);
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
