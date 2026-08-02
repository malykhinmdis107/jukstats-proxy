const express = require('express');
const http = require('http');
const https = require('https');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Карта прокси: путь -> целевой сервер
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

// Прокси-запросы
app.all('/api/*', (req, res) => {
    // Ищем подходящий прокси
    let targetBase = null;
    
    for (const [prefix, target] of Object.entries(PROXY_MAP)) {
        if (req.path.startsWith(prefix)) {
            targetBase = target;
            break;
        }
    }
    
    if (!targetBase) {
        return res.status(404).json({ error: 'Прокси не найден', path: req.path });
    }
    
    // Строим целевой URL
    const targetUrl = targetBase + req.path;
    const url = new URL(targetUrl);
    
    console.log(`🔄 ${req.method} ${req.path} -> ${targetUrl}`);
    
    const options = {
        hostname: url.hostname,
        port: 443,
        path: url.pathname + url.search,
        method: req.method,
        headers: {
            ...req.headers,
            host: url.hostname
        }
    };
    
    const proxyReq = https.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
    });
    
    proxyReq.on('error', (e) => {
        console.error('❌ Прокси ошибка:', e.message);
        res.status(502).json({ error: 'Сервис недоступен: ' + e.message });
    });
    
    proxyReq.setTimeout(30000, () => {
        proxyReq.destroy();
        res.status(504).json({ error: 'Таймаут прокси' });
    });
    
    req.pipe(proxyReq);
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        proxy: true, 
        timestamp: new Date().toISOString(),
        services: Object.keys(PROXY_MAP).length
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🔄 JUK Stats Прокси запущен на порту ${PORT}`);
    console.log('📋 Проксируемые сервисы:');
    Object.entries(PROXY_MAP).forEach(([path, target]) => {
        console.log(`   ${path} -> ${target}`);
    });
});
