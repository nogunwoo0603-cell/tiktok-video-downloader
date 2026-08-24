const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS 보안 설정 (모든 요청 허용)
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

app.use(express.json());
app.use(express.static('public'));

// 최신 모바일 브라우저 위장 헤더 생성 함수
function getSafariHeaders() {
    return {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3.1 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        'Sec-Fetch-Mode': 'navigate'
    };
}

// 1. 틱톡(TikTok) 링크 분석 API
app.post('/api/tiktok', async (req, res) => {
    const { url } = req.body;
    if (!url) {
        return res.status(400).json({ success: false, message: 'TikTok URL이 입력되지 않았습니다.' });
    }

    try {
        const response = await axios.post('https://www.tikwm.com/api/', null, {
            params: { url: url },
            headers: getSafariHeaders(),
            timeout: 12000
        });

        if (response.data && response.data.data) {
            const videoUrl = response.data.data.play || response.data.data.wmplay;
            if (videoUrl) {
                return res.json({
                    success: true,
                    videoUrl: videoUrl,
                    title: response.data.data.title || 'TikTok Video'
                });
            }
        }
        return res.status(400).json({ success: false, message: '틱톡 동영상 링크를 추출할 수 없습니다.' });
    } catch (err) {
        console.error('TikTok API Error:', err.message);
        return res.status(500).json({ success: false, message: '틱톡 서버 처리 중 오류가 발생했습니다.' });
    }
});

// 2. 인스타그램 릴스(Instagram Reels) 링크 분석 API
app.post('/api/insta', async (req, res) => {
    const { url } = req.body;
    if (!url) {
        return res.status(400).json({ success: false, message: 'Instagram URL이 입력되지 않았습니다.' });
    }

    try {
        const options = {
            method: 'GET',
            url: 'https://instagram-reels-downloader-api.p.rapidapi.com/download',
            params: { url: url },
            headers: {
                'x-rapidapi-key': '02a8b103c7msh11fcec01d0ee8e4p17d118jsn529ff52a627f',
                'x-rapidapi-host': 'instagram-reels-downloader-api.p.rapidapi.com',
                ...getSafariHeaders()
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
        return res.status(400).json({ success: false, message: '인스타그램 동영상 링크 추출에 실패했습니다.' });
    } catch (err) {
        console.error('Instagram API Error:', err.message);
        return res.status(500).json({ success: false, message: '인스타그램 API 서버 응답 오류입니다.' });
    }
});

// 3. 파일 손상 방지용 스트리밍 다운로드 엔드포인트
app.get('/api/download', async (req, res) => {
    const videoUrl = req.query.url;
    const platform = req.query.platform || 'video';

    if (!videoUrl) {
        return res.status(400).send('동영상 URL 파라미터가 누락되었습니다.');
    }

    try {
        const customHeaders = getSafariHeaders();
        if (videoUrl.includes('instagram.com') || videoUrl.includes('cdninstagram.com') || videoUrl.includes('fbcdn.net')) {
            customHeaders['Referer'] = 'https://www.instagram.com/';
        } else if (videoUrl.includes('tiktok.com') || videoUrl.includes('tikwm.com')) {
            customHeaders['Referer'] = 'https://www.tiktok.com/';
        }

        // 바이너리 데이터 직접 수신 Stream 설정
        const response = await axios({
            method: 'get',
            url: videoUrl,
            responseType: 'stream',
            headers: customHeaders,
            timeout: 30000
        });

        const filename = `${platform}_${Date.now()}.mp4`;

        // 헤더 세팅: 모바일 브라우저 다운로드 전용 설정
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        
        if (response.headers['content-length']) {
            res.setHeader('Content-Length', response.headers['content-length']);
        }

        // 손상 없는 데이터 파이프 전송
        response.data.pipe(res);

        response.data.on('error', (err) => {
            console.error('Stream Pipe Error:', err.message);
            if (!res.headersSent) {
                res.status(500).send('스트리밍 중 파일 전송 오류가 발생했습니다.');
            }
        });
    } catch (err) {
        console.error('Download Endpoint Error:', err.message);
        if (!res.headersSent) {
            res.status(500).send('동영상 파일을 불러오는 중 오류가 발생했습니다.');
        }
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
