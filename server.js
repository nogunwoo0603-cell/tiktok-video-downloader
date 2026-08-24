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
        const isInsta = videoUrl.includes('cdninstagram.com') || videoUrl.includes('fbcdn.net') || videoUrl.includes('instagram');

        const headers = {
            'User-Agent': getRandomUserAgent(),
            'Accept': '*/*',
            'Accept-Encoding': 'identity',
            'Connection': 'keep-alive'
        };

        if (isInsta) {
            headers['Referer'] = 'https://www.instagram.com/';
            headers['Origin'] = 'https://www.instagram.com';
        }

        const videoStream = await axios({
            method: 'get',
            url: videoUrl,
            responseType: 'stream',
            headers: headers,
            timeout: 15000
        });

        // 파일 손상 방지용 헤더 세팅
        res.setHeader('Content-Disposition', 'attachment; filename="video.mp4"');
        res.setHeader('Content-Type', 'video/mp4');

        if (videoStream.headers['content-length']) {
            res.setHeader('Content-Length', videoStream.headers['content-length']);
        }

        videoStream.data.pipe(res);
    } catch (error) {
        console.error('Streaming error:', error.message);
        res.status(500).send('Video Stream Failed');
    }
});

// 인스타그램 릴스 파싱 전용 API (인스타그램 전용 오픈 API 적용)
app.post('/api/insta', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.json({ success: false, message: 'URL을 입력해주세요.' });

    try {
        // 인스타그램 전용 파싱 인스턴스 호출
        const response = await axios.get(`https://api.cobalt.tools/api/json?url=${encodeURIComponent(url)}`, {
            headers: {
                'User-Agent': getRandomUserAgent(),
                'Accept': 'application/json'
            },
            timeout: 10000
        });

        if (response.data && response.data.url) {
            return res.json({
                success: true,
                title: 'Instagram Reel',
                videoUrl: response.data.url
            });
        }

        // 2차 백업 파서 (공용 인스타그램 다운로드 엔드포인트)
        const backupRes = await axios.post('https://saveig.app/api/ajaxSearch', 
            new URLSearchParams({ q: url, t: 'media', lang: 'en' }), 
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'User-Agent': getRandomUserAgent()
                },
                timeout: 8000
            }
        );

        if (backupRes.data && backupRes.data.data) {
            const html = backupRes.data.data;
            const match = html.match(/href="(https?:\/\/[^"]+)"/);
            if (match && match[1]) {
                return res.json({
                    success: true,
                    title: 'Instagram Reel',
                    videoUrl: match[1].replace(/&amp;/g, '&')
                });
            }
        }

        return res.json({ success: false, message: '인스타그램 영상을 찾을 수 없습니다.' });

    } catch (error) {
        console.error('Instagram parsing error:', error.message);
        return res.json({ success: false, message: '인스타그램 분석 실패' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
