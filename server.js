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
    '/api/pub-clan': 'https://jukstats-pub-clan.onrender.com',
    '/api/pub-platoon': 'https://jukstats-pub-platoon.onrender.com',
    '/api/pub-tournament': 'https://jukstats-pub-tournament.onrender.com',
    '/api/pub-training': 'https://jukstats-pub-training.onrender.com',
    '/api/pub-general': 'https://jukstats-pub-chat.onrender.com',
    '/api/pub-discussion': 'https://jukstats-pub-discussion-3mb8.onrender.com',
    '/api/pub-news': 'https://jukstats-pub-news.onrender.com',
};

app.all('/api/*', (req, res) => {
    let targetBase = null;
    let matchedPrefix = '';
    
    for (const [prefix, target] of Object.entries(PROXY_MAP)) {
        if (req.path.startsWith(prefix)) {
            targetBase = target;
            matchedPrefix = prefix;
            break;
        }
    }
    
    if (!targetBase) {
        return res.status(404).json({ error: 'Not found', path: req.path });
    }
    
    // Убираем префикс и добавляем /api
    let remainingPath = req.path.substring(matchedPrefix.length);
    if (!remainingPath.startsWith('/api/')) {
        remainingPath = '/api' + (remainingPath || '/');
    }
    
    const targetUrl = targetBase + remainingPath;
    console.log(`🔄 ${req.method} ${req.path} -> ${targetUrl}`);
    
    const url = new URL(targetUrl);
    const options = {
        hostname: url.hostname,
        port: 443,
        path: url.pathname + url.search,
        method: req.method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': req.headers.authorization || '',
        }
    };
    
    const proxyReq = https.request(options, (proxyRes) => {
        let body = '';
        proxyRes.on('data', chunk => body += chunk);
        proxyRes.on('end', () => {
            try {
                res.status(proxyRes.statusCode).json(JSON.parse(body));
            } catch(e) {
                res.status(proxyRes.statusCode).send(body);
            }
        });
    });
    
    proxyReq.on('error', (e) => {
        res.status(502).json({ error: 'Unavailable: ' + e.message });
    });
    
    if (req.body && Object.keys(req.body).length > 0) {
        proxyReq.write(JSON.stringify(req.body));
    }
    
    proxyReq.end();
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', proxy: true, timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy on ${PORT}`));
