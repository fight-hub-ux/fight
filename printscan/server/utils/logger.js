const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '../../data/logs');

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function timestamp() {
  return new Date().toISOString();
}

function writeLog(level, message, extra) {
  ensureLogDir();
  const entry = {
    timestamp: timestamp(),
    level,
    message,
    ...(extra ? { extra } : {})
  };
  const line = JSON.stringify(entry) + '\n';

  // Console output
  const prefix = `[${timestamp()}] [${level.toUpperCase()}]`;
  if (level === 'error') {
    console.error(prefix, message, extra || '');
  } else {
    console.log(prefix, message, extra || '');
  }

  // File output
  const logFile = path.join(LOG_DIR, `${new Date().toISOString().slice(0, 10)}.log`);
  try {
    fs.appendFileSync(logFile, line);
  } catch (e) {
    // Fail silently on log write errors
  }
}

module.exports = {
  info: (msg, extra) => writeLog('info', msg, extra),
  warn: (msg, extra) => writeLog('warn', msg, extra),
  error: (msg, extra) => writeLog('error', msg, extra),
  debug: (msg, extra) => writeLog('debug', msg, extra),
};
