const express = require('express');
const http = require('http');
const https = require('https');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const PROXY_MAP = {
    '/api/chat': 'https://jukstats-chat.onrender.com',
    '/api/support': 'https://jukstats-support-sjb8.onrender.com',
    '/api/profiles': 'https://jukstats-profiles-72ch.onrender.com',
    '/api/planner': 'https://jukstats-planner-server.onrender.com',
    '/api/marks': 'https://jukstats-marks-6j7a.onrender.com',
    '/api/upload': 'https://jukstats-upload-wiy3.onrender.com',
    '/api/augusta': 'https://jukstats-server.onrender.com',
    '/api/daily': 'https://jukstats-daily-0zyr.onrender.com',
};

app.all('/api/*', (req, res) => {
    let targetBase = null;
    
    for (const [prefix, target] of Object.entries(PROXY_MAP)) {
        if (req.path.startsWith(prefix)) {
            targetBase = target;
            break;
        }
    }
    
    if (!targetBase) {
        return res.status(404).json({ error: 'Not found' });
    }
    
    const targetUrl = targetBase + req.path;
    
    https.get(targetUrl, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
    }).on('error', () => res.status(502).json({ error: 'Unavailable' }));
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(process.env.PORT || 3000);
