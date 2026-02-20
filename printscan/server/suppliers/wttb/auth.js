/**
 * WTTB Authentication Handler
 * Manages login session for WTTB trade account
 */

const { launchBrowser, createContext, screenshotOnFailure } = require('../../utils/browser');
const { decrypt } = require('../../utils/encryption');
const logger = require('../../utils/logger');

const LOGIN_URL = 'https://www.wttb.com/account/login';
let savedCookies = null;
let cookieExpiry = null;

/**
 * Get authenticated browser context for WTTB
 */
async function getAuthenticatedContext(browser, config) {
  const credentials = config.credentials || {};
  const email = decrypt(credentials.email) || process.env.WTTB_EMAIL;
  const password = decrypt(credentials.password) || process.env.WTTB_PASSWORD;

  if (!email || !password) {
    throw new Error('WTTB credentials not configured. Please add them in Settings.');
  }

  const context = await createContext(browser);

  // Restore saved cookies if still valid
  if (savedCookies && cookieExpiry && Date.now() < cookieExpiry) {
    await context.addCookies(savedCookies);
    logger.info('[WTTB] Using cached session cookies');
    return context;
  }

  logger.info('[WTTB] Logging in...');
  const page = await context.newPage();

  try {
    await page.goto(LOGIN_URL, { waitUntil: 'networkidle', timeout: 20000 });

    // Fill in credentials
    await page.waitForSelector('input[type="email"], input[name="email"], #email', { timeout: 10000 });

    const emailSelectors = ['input[type="email"]', 'input[name="email"]', '#email', '[name="login"]'];
    const passSelectors = ['input[type="password"]', 'input[name="password"]', '#password'];

    for (const sel of emailSelectors) {
      try {
        const el = await page.$(sel);
        if (el) { await page.fill(sel, email); break; }
      } catch (e) { /* try next */ }
    }

    for (const sel of passSelectors) {
      try {
        const el = await page.$(sel);
        if (el) { await page.fill(sel, password); break; }
      } catch (e) { /* try next */ }
    }

    // Submit login form
    const submitSelectors = ['button[type="submit"]', 'input[type="submit"]', '.login-button', '#login-submit'];
    for (const sel of submitSelectors) {
      try {
        const el = await page.$(sel);
        if (el) { await page.click(sel); break; }
      } catch (e) { /* try next */ }
    }

    // Wait for navigation
    await page.waitForNavigation({ timeout: 15000, waitUntil: 'networkidle' });

    // Check if login succeeded
    const url = page.url();
    const bodyText = await page.textContent('body');
    const loginFailed = bodyText.toLowerCase().includes('invalid') ||
                        bodyText.toLowerCase().includes('incorrect') ||
                        url.includes('login');

    if (loginFailed) {
      await screenshotOnFailure(page, 'wttb', 'login-failed');
      throw new Error('WTTB login failed. Please check credentials in Settings.');
    }

    // Save session cookies (expire after 2 hours)
    savedCookies = await context.cookies();
    cookieExpiry = Date.now() + 2 * 60 * 60 * 1000;

    logger.info('[WTTB] Login successful');
    await page.close();
    return context;
  } catch (err) {
    await page.close();
    await context.close();
    throw err;
  }
}

/**
 * Invalidate cached session (call when credentials change)
 */
function clearSession() {
  savedCookies = null;
  cookieExpiry = null;
}

module.exports = { getAuthenticatedContext, clearSession };
