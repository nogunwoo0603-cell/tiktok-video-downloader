const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());
app.use(express.static('public'));

// 다양한 모바일/데스크톱 User-Agent
const USER_AGENTS = [
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
];

function getRandomUserAgent() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// 인스타그램 Shortcode 추출 함수 (reel, p, tv 지원)
function extractInstagramShortcode(url) {
    const match = url.match(/(?:reels?|p|tv)\/([A-Za-z0-9_-]+)/);
    return match ? match[1] : null;
}

// 영상 강제 파일 다운로드 스트리밍 라우트 (TikWM / Instagram 공통)
app.get('/api/stream', async (req, res) => {
    const { videoUrl } = req.query;
    if (!videoUrl) return res.status(400).send('URL이 필요합니다.');

    try {
        const isInsta = videoUrl.includes('cdninstagram') || videoUrl.includes('fbcdn') || videoUrl.includes('instagram');

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
            timeout: 20000
        });

        res.setHeader('Content-Disposition', 'attachment; filename="download_video.mp4"');
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

// 인스타그램 자체 우회 파싱 API (외부 API 키 미사용, 직접 뚫는 로직)
app.post('/api/insta', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.json({ success: false, message: 'URL을 입력해주세요.' });

    const shortcode = extractInstagramShortcode(url);
    if (!shortcode) {
        return res.json({ success: false, message: '올바른 인스타그램 릴스/게시물 링크가 아닙니다.' });
    }

    try {
        let videoUrl = null;
        let title = 'Instagram Reel';

        // [시도 1] Instagram GraphQL API 우회 (공식 Web App ID 주입)
        try {
            const graphqlUrl = `https://www.instagram.com/graphql/query/?query_hash=b30141954238740273783344d5e23eb0&variables=${encodeURIComponent(JSON.stringify({ shortcode: shortcode }))}`;
            const gqlRes = await axios.get(graphqlUrl, {
                headers: {
                    'User-Agent': getRandomUserAgent(),
                    'X-IG-App-ID': '936619743392459',
                    'Accept': '*/*',
                    'Sec-Fetch-Mode': 'cors',
                    'Cookie': 'ig_did=11111111-1111-1111-1111-111111111111; datr=1;'
                },
                timeout: 8000
            });

            const media = gqlRes.data?.data?.shortcode_media;
            if (media && media.is_video && media.video_url) {
                videoUrl = media.video_url;
                title = media.edge_media_to_caption?.edges[0]?.node?.text || title;
            }
        } catch (e) {
            console.log('GraphQL시도 미응답, 백업 엔드포인트 진행');
        }

        // [시도 2] Instagram Embed / HTML JSON 파싱 우회 (GraphQL 실패 시)
        if (!videoUrl) {
            const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/captioned/`;
            const embedRes = await axios.get(embedUrl, {
                headers: {
                    'User-Agent': getRandomUserAgent(),
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9'
                },
                timeout: 8000
            });

            const html = embedRes.data;
            
            // HTML 내부의 video_url 필드 패턴 정규식 매칭
            const videoMatch = html.match(/"video_url":"([^"]+)"/);
            if (videoMatch && videoMatch[1]) {
                // Unicode 이스케이프 문자열 디코딩 (\u0026 -> &)
                videoUrl = JSON.parse(`"${videoMatch[1]}"`);
            }

            if (!videoUrl) {
                // 추가 og:video 태그 파싱
                const ogVideoMatch = html.match(/<meta property="og:video" content="([^"]+)"/);
                if (ogVideoMatch && ogVideoMatch[1]) {
                    videoUrl = ogVideoMatch[1].replace(/&amp;/g, '&');
                }
            }
        }

        // [시도 3] Instagram Mobile API direct endpoint (최후 우회)
        if (!videoUrl) {
            const mobileUrl = `https://i.instagram.com/api/v1/media/${shortcode}/info/`;
            const mobileRes = await axios.get(mobileUrl, {
                headers: {
                    'User-Agent': 'Instagram 219.0.0.12.117 Android',
                    'Accept': '*/*'
                },
                timeout: 8000
            });

            const items = mobileRes.data?.items;
            if (items && items.length > 0 && items[0].video_versions) {
                videoUrl = items[0].video_versions[0].url;
            }
        }

        if (videoUrl) {
            return res.json({
                success: true,
                title: title.substring(0, 100),
                videoUrl: videoUrl
            });
        } else {
            return res.json({ success: false, message: '영상을 찾을 수 없거나 비공개 계정의 콘텐츠입니다.' });
        }

    } catch (error) {
        console.error('Instagram parsing error:', error.message);
        return res.json({ success: false, message: '인스타그램 서버 응답 제한으로 분석에 실패했습니다.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
