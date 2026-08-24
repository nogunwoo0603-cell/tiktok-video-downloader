const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// 랜덤 User-Agent 생성 (IP 및 단일 기기 패턴 차단 우회)
const userAgents = [
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
    'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36'
];

const getRandomUA = () => userAgents[Math.floor(Math.random() * userAgents.length)];

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
            return res.json({ success: true, videoUrl: videoUrl });
        }

        return res.status(400).json({ success: false, message: 'Failed to extract video URL.' });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server processing error.' });
    }
});

// 갤러리 다운로드 전용 Blob 바이너리 스트림
app.get('/api/stream', async (req, res) => {
    const videoUrl = req.query.videoUrl;
    if (!videoUrl) return res.status(400).send('Video URL is required.');

    try {
        const response = await axios({
            method: 'get',
            url: videoUrl,
            responseType: 'arraybuffer', // 바이너리 버퍼로 변환하여 파일 훼손 방지
            headers: {
                'User-Agent': getRandomUA(),
                'Referer': 'https://www.instagram.com/',
                'Accept': 'video/mp4,video/*;q=0.9,*/*;q=0.8'
            }
        });

        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Content-Disposition', 'inline; filename="reels.mp4"');
        res.send(Buffer.from(response.data));
    } catch (err) {
        res.status(500).send('Download stream error.');
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
