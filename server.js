const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());
app.use(express.static('public'));

// 1. RapidAPI 인스타그램 분석 라우트
app.post('/api/insta', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.json({ success: false, message: 'URL을 입력해주세요.' });

    try {
        const response = await axios.get('https://instagram-reels-downloader-api.p.rapidapi.com/download', {
            params: { url: url },
            headers: {
                'X-RapidAPI-Key': '02a8b103c7msh11fcec01d0ee8e4p17d118jsn529ff52a627f',
                'X-RapidAPI-Host': 'instagram-reels-downloader-api.p.rapidapi.com'
            }
        });

        const data = response.data;
        let videoUrl = null;

        if (data && data.data && data.data.url) {
            videoUrl = data.data.url;
        } else if (data && data.data && data.data.medias && data.data.medias.length > 0) {
            videoUrl = data.data.medias[0].url;
        }

        if (videoUrl) {
            return res.json({
                success: true,
                title: data.data.title || 'Instagram Reel',
                videoUrl: videoUrl
            });
        } else {
            return res.json({ success: false, message: '영상을 찾을 수 없습니다.' });
        }
    } catch (error) {
        console.error('RapidAPI Error:', error.message);
        return res.json({ success: false, message: 'API 호출 실패: ' + error.message });
    }
});

// 2. 동영상 스트리밍 다운로드 라우트 (TikWM / Instagram 공통)
app.get('/api/stream', async (req, res) => {
    const { videoUrl } = req.query;
    if (!videoUrl) return res.status(400).send('URL이 필요합니다.');

    try {
        const videoStream = await axios({
            method: 'get',
            url: videoUrl,
            responseType: 'stream'
        });

        res.setHeader('Content-Disposition', 'attachment; filename="download_video.mp4"');
        res.setHeader('Content-Type', 'video/mp4');

        videoStream.data.pipe(res);
    } catch (error) {
        res.status(500).send('Streaming Failed');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});