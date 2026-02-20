const { chromium } = require('playwright');
const logger = require('./logger');
const path = require('path');
const fs = require('fs');

const SCREENSHOTS_DIR = path.join(__dirname, '../../data/screenshots');

function ensureScreenshotsDir() {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }
}

const BROWSER_OPTIONS = {
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-blink-features=AutomationControlled',
  ],
};

const CONTEXT_OPTIONS = {
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  viewport: { width: 1366, height: 768 },
  locale: 'en-GB',
  timezoneId: 'Europe/London',
};

/**
 * Launch a browser instance with anti-detection measures
 */
async function launchBrowser() {
  const browser = await chromium.launch(BROWSER_OPTIONS);
  return browser;
}

/**
 * Create a new browser context
 */
async function createContext(browser) {
  const context = await browser.newContext(CONTEXT_OPTIONS);
  // Add anti-bot detection script
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
  });
  return context;
}

/**
 * Take a screenshot for debugging
 */
async function screenshotOnFailure(page, supplierName, reason) {
  ensureScreenshotsDir();
  const filename = `${supplierName}-${Date.now()}-${reason.replace(/[^a-z0-9]/gi, '_')}.png`;
  const filepath = path.join(SCREENSHOTS_DIR, filename);
  try {
    await page.screenshot({ path: filepath, fullPage: true });
    logger.info(`Screenshot saved: ${filename}`);
    return filepath;
  } catch (e) {
    logger.error('Failed to take screenshot', e.message);
    return null;
  }
}

/**
 * Wait for an element with retries
 */
async function waitForElement(page, selector, timeout = 10000) {
  try {
    await page.waitForSelector(selector, { timeout, state: 'visible' });
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Safe click with retry
 */
async function safeClick(page, selector, timeout = 10000) {
  await page.waitForSelector(selector, { timeout, state: 'visible' });
  // Small human-like delay
  await page.waitForTimeout(100 + Math.random() * 200);
  await page.click(selector);
}

/**
 * Safe fill with human-like typing
 */
async function safeFill(page, selector, value, timeout = 10000) {
  await page.waitForSelector(selector, { timeout, state: 'visible' });
  await page.waitForTimeout(50 + Math.random() * 100);
  await page.fill(selector, String(value));
}

/**
 * Safe select option
 */
async function safeSelect(page, selector, value, timeout = 10000) {
  await page.waitForSelector(selector, { timeout, state: 'visible' });
  await page.waitForTimeout(50 + Math.random() * 100);
  await page.selectOption(selector, value);
}

/**
 * Extract a price from text
 */
function extractPrice(text) {
  if (!text) return null;
  const match = text.replace(/,/g, '').match(/[\d]+\.?\d{0,2}/);
  if (match) return parseFloat(match[0]);
  return null;
}

module.exports = {
  launchBrowser,
  createContext,
  screenshotOnFailure,
  waitForElement,
  safeClick,
  safeFill,
  safeSelect,
  extractPrice,
};
