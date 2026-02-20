require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const { WebSocketServer } = require('ws');
const http = require('http');
const { initDatabase } = require('./utils/database');
const logger = require('./utils/logger');

const app = express();
const server = http.createServer(app);

// WebSocket server for real-time progress updates
const wss = new WebSocketServer({ server, path: '/ws' });
const wsClients = new Map(); // searchId -> Set of ws clients

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const searchId = url.searchParams.get('searchId');
  if (searchId) {
    if (!wsClients.has(searchId)) wsClients.set(searchId, new Set());
    wsClients.get(searchId).add(ws);
    logger.info(`WS client connected for search ${searchId}`);
    ws.on('close', () => {
      const clients = wsClients.get(searchId);
      if (clients) {
        clients.delete(ws);
        if (clients.size === 0) wsClients.delete(searchId);
      }
    });
  }
});

// Broadcast progress to WS clients for a given searchId
function broadcastProgress(searchId, data) {
  const clients = wsClients.get(searchId);
  if (clients) {
    const msg = JSON.stringify(data);
    clients.forEach(ws => {
      if (ws.readyState === 1) ws.send(msg);
    });
  }
}

// Make broadcastProgress available globally
global.broadcastProgress = broadcastProgress;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/parse', require('./api/parse'));
app.use('/api/search', require('./api/search'));
app.use('/api/settings', require('./api/settings'));

// Serve React frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build/index.html'));
  });
}

const PORT = process.env.PORT || 3001;

// Initialize database then start server
initDatabase().then(() => {
  server.listen(PORT, () => {
    logger.info(`PrintScan server running on port ${PORT}`);
    logger.info(`WebSocket server ready`);
  });
}).catch(err => {
  logger.error('Failed to initialize database', err);
  process.exit(1);
});

module.exports = { app, broadcastProgress };
