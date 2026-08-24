const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());
app.use(express.static('public'));

// 다양한 User-Agent 목록 (IP 차단 및 패턴 감지 방지용)
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1'
];

function getRandomUserAgent() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// 영상 강제 파일 다운로드 스트리밍 라우트 (TikWM / Instagram 공통)
app.get('/api/stream', async (req, res) => {
    const { videoUrl } = req.query;
    if (!videoUrl) return res.status(400).send('URL이 필요합니다.');

    try {
        const videoStream = await axios({
            method: 'get',
            url: videoUrl,
            responseType: 'stream',
            headers: {
                'User-Agent': getRandomUserAgent(),
                'Referer': 'https://www.instagram.com/'
            },
            timeout: 10000
        });

        res.setHeader('Content-Disposition', 'attachment; filename="download_video.mp4"');
        res.setHeader('Content-Type', 'video/mp4');
        videoStream.data.pipe(res);
    } catch (error) {
        console.error('Streaming error:', error.message);
        res.status(500).send('Video Stream Failed');
    }
});

// 인스타그램 릴스 파싱 전용 안전 API
app.post('/api/insta', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.json({ success: false, message: 'URL을 입력해주세요.' });

    try {
        // 전문 파싱 노드 우회 호출 (내 서버 IP 직접 노출 방지)
        const response = await axios.post('https://v3.tikwm.com/api/', 
            new URLSearchParams({ url: url }), 
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'User-Agent': getRandomUserAgent()
                },
                timeout: 8000
            }
        );

        if (response.data && response.data.data) {
            const data = response.data.data;
            res.json({
                success: true,
                title: data.title || 'Instagram Reel',
                videoUrl: data.play
            });
        } else {
            res.json({ success: false, message: '영상을 찾을 수 없습니다.' });
        }
    } catch (error) {
        console.error('Instagram parsing error:', error.message);
        res.json({ success: false, message: '서버 분석 실패' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
