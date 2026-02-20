const path = require('path');
const fs = require('fs');
const logger = require('./logger');

const DATA_DIR = path.join(__dirname, '../../data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');

const DEFAULT_SETTINGS = {
  defaultPostcode: '',
  defaultTurnaround: '3-5 Days',
  showIncVat: false,
  suppliers: {
    solopress: {
      enabled: true,
      name: 'Solopress',
      url: 'https://www.solopress.com',
      discount: 0,
      requiresAuth: false,
    },
    wttb: {
      enabled: true,
      name: 'WTTB',
      url: 'https://www.wttb.com',
      discount: 0,
      requiresAuth: true,
      credentials: { email: '', password: '' },
    },
    'printed-easy': {
      enabled: true,
      name: 'Printed Easy',
      url: 'https://www.printedeasy.com',
      discount: 0,
      requiresAuth: false,
    },
    instantprint: {
      enabled: true,
      name: 'Instantprint',
      url: 'https://www.instantprint.co.uk',
      discount: 0,
      requiresAuth: false,
    },
    helloprint: {
      enabled: true,
      name: 'HelloPrint',
      url: 'https://www.helloprint.co.uk',
      discount: 0,
      requiresAuth: false,
    },
    route1print: {
      enabled: true,
      name: 'Route1Print',
      url: 'https://www.route1print.co.uk',
      discount: 0,
      requiresAuth: false,
    },
    printuk: {
      enabled: true,
      name: 'PrintUK',
      url: 'https://www.printuk.com',
      discount: 0,
      requiresAuth: false,
    },
  },
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readSettings() {
  ensureDataDir();
  if (!fs.existsSync(SETTINGS_FILE)) {
    writeSettings(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
  } catch (e) {
    logger.error('Failed to read settings', e.message);
    return DEFAULT_SETTINGS;
  }
}

function writeSettings(settings) {
  ensureDataDir();
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

function readHistory() {
  ensureDataDir();
  if (!fs.existsSync(HISTORY_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
  } catch (e) {
    return [];
  }
}

function addToHistory(searchRecord) {
  const history = readHistory();
  history.unshift(searchRecord);
  // Keep last 50
  const trimmed = history.slice(0, 50);
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(trimmed, null, 2));
}

async function initDatabase() {
  ensureDataDir();
  if (!fs.existsSync(SETTINGS_FILE)) {
    writeSettings(DEFAULT_SETTINGS);
    logger.info('Initialized settings.json with defaults');
  }
  if (!fs.existsSync(HISTORY_FILE)) {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify([]));
    logger.info('Initialized history.json');
  }
}

module.exports = { initDatabase, readSettings, writeSettings, readHistory, addToHistory, DEFAULT_SETTINGS };
