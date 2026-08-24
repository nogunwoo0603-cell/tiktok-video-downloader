const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());
app.use(express.static('public'));

// Video streaming download route (TikTok)
app.get('/api/stream', async (req, res) => {
    const { videoUrl } = req.query;
    if (!videoUrl) return res.status(400).send('URL is required.');

    try {
        const videoStream = await axios({
            method: 'get',
            url: videoUrl,
            responseType: 'stream',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        res.setHeader('Content-Disposition', 'attachment; filename="tiktok_video.mp4"');
        res.setHeader('Content-Type', 'video/mp4');

        videoStream.data.pipe(res);
    } catch (error) {
        console.error('Streaming Error:', error.message);
        res.status(500).send('Video streaming failed.');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});