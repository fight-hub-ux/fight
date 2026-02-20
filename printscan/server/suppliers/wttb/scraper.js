/**
 * WTTB (Where The Trade Buys) scraper
 * Requires authenticated trade account
 */

const { launchBrowser, screenshotOnFailure, extractPrice } = require('../../utils/browser');
const { getAuthenticatedContext, clearSession } = require('./auth');
const { buildResult, tryExtractPrice, tryExtractDelivery, tryExtractTurnaround } = require('../../utils/baseScraper');
const config = require('./config.json');
const logger = require('../../utils/logger');

const SUPPLIER_ID = 'wttb';

async function getQuotes(specs, supplierConfig) {
  const browser = await launchBrowser();
  const results = [];

  let context;
  try {
    context = await getAuthenticatedContext(browser, supplierConfig);

    for (const spec of specs) {
      const productUrl = config.products[spec.product_type]?.url || null;

      if (!productUrl) {
        results.push(buildResult(spec, {
          status: 'not_available',
          notes: [`${spec.product_type} not listed on WTTB`],
        }));
        continue;
      }

      const page = await context.newPage();
      try {
        logger.info(`[WTTB] Fetching quote for ${spec.product_type} x${spec.quantity}`);
        await page.goto(productUrl, { waitUntil: 'networkidle', timeout: 20000 });
        await page.waitForTimeout(2000);

        // Try to set quantity
        const quantitySelectors = ['select[name="quantity"]', 'input[name="quantity"]', '#quantity', '.qty', '[data-qty]'];
        for (const sel of quantitySelectors) {
          try {
            const el = await page.$(sel);
            if (el) {
              const tagName = await el.evaluate(n => n.tagName.toLowerCase());
              if (tagName === 'select') {
                const options = await page.$$eval(sel + ' option', opts =>
                  opts.map(o => ({ value: o.value, text: o.textContent.trim() }))
                ).catch(() => []);
                if (options.length > 0) {
                  const target = spec.quantity;
                  const closest = options.reduce((prev, curr) => {
                    const pd = Math.abs(parseInt(prev.value || 0) - target);
                    const cd = Math.abs(parseInt(curr.value || 0) - target);
                    return cd < pd ? curr : prev;
                  });
                  if (closest) await page.selectOption(sel, closest.value);
                }
              } else {
                await page.fill(sel, String(spec.quantity));
              }
              break;
            }
          } catch (e) { /* try next */ }
        }

        await page.waitForTimeout(2000);

        const printPrice = await tryExtractPrice(page);
        const deliveryCost = await tryExtractDelivery(page);
        const turnaround = await tryExtractTurnaround(page);

        // Check if we landed on a login page (session expired)
        const url = page.url();
        if (url.includes('login')) {
          clearSession();
          throw new Error('WTTB session expired. Please re-test connection in Settings.');
        }

        results.push(buildResult(spec, {
          status: printPrice ? 'available' : 'partial',
          printPrice,
          deliveryCost: deliveryCost ?? 0,
          turnaround: turnaround || spec.turnaround || 'Standard',
          productUrl,
          notes: printPrice ? ['Trade pricing applied'] : ['Price not extracted — may need selector update'],
        }));
      } catch (err) {
        logger.error(`[WTTB] Error`, err.message);
        await screenshotOnFailure(page, SUPPLIER_ID, 'error');
        results.push(buildResult(spec, {
          status: 'error',
          productUrl,
          error: err.message,
          notes: [`Error: ${err.message}`],
        }));
      } finally {
        await page.close();
      }
    }
  } catch (err) {
    logger.error(`[WTTB] Fatal error`, err.message);
    for (const spec of specs) {
      results.push(buildResult(spec, {
        status: 'error',
        error: err.message,
        notes: [err.message],
      }));
    }
  } finally {
    if (context) await context.close();
    await browser.close();
  }

  return results;
}

async function testConnection(config) {
  const browser = await launchBrowser();
  try {
    const context = await getAuthenticatedContext(browser, config);
    const page = await context.newPage();
    await page.goto('https://www.wttb.com', { waitUntil: 'domcontentloaded', timeout: 15000 });
    const title = await page.title();
    await context.close();
    return { success: true, message: `WTTB login successful. Page: ${title}` };
  } catch (err) {
    return { success: false, error: err.message };
  } finally {
    await browser.close();
  }
}

module.exports = { getQuotes, testConnection };
