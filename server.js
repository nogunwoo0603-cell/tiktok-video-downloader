const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());
app.use(express.static('public'));

// --- 틱톡 강제 다운로드 백엔드 API (아이폰 플레이어 우회 및 갤러리 저장용) ---
app.get('/download-video', async (req, res) => {
    const videoUrl = req.query.url;
    if (!videoUrl) return res.status(400).send('URL is required');

    try {
        const response = await axios({
            method: 'GET',
            url: videoUrl,
            responseType: 'stream',
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' 
            }
        });

        // ⭐ 아이폰 플레이어 화면을 막고 곧바로 파일로 저장되도록 강제하는 핵심 헤더
        res.setHeader('Content-Disposition', 'attachment; filename="tiktok_video.mp4"');
        res.setHeader('Content-Type', 'application/octet-stream');

        response.data.pipe(res);
    } catch (error) {
        console.error('Download Error:', error.message);
        res.status(500).send('Download failed');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});