/**
 * Base scraper with shared price extraction and quote building logic
 * Each supplier scraper extends or uses this functionality
 */

const { launchBrowser, createContext, screenshotOnFailure, extractPrice } = require('./browser');
const logger = require('./logger');

/**
 * Generic product URL lookup
 */
function getProductUrl(productUrls, productType) {
  return productUrls[productType] || null;
}

/**
 * Generic quote result template
 */
function buildResult(spec, overrides = {}) {
  return {
    specId: spec.id || null,
    productType: spec.product_type,
    quantity: spec.quantity,
    size: spec.size,
    status: 'available',
    printPrice: null,
    deliveryCost: null,
    turnaround: null,
    productUrl: null,
    notes: [],
    ...overrides,
  };
}

/**
 * Try to extract price from a page using common selectors
 */
async function tryExtractPrice(page) {
  const priceSelectors = [
    '.price', '.product-price', '[class*="price"]', '[class*="total-price"]',
    '.calculator-price', '.quote-price', '#price', '[data-price]',
    '.grand-total', '.order-total', '.cart-total',
  ];

  for (const sel of priceSelectors) {
    try {
      const el = await page.$(sel);
      if (el) {
        const text = await el.textContent();
        const price = extractPrice(text);
        if (price && price > 1) return price;
      }
    } catch (e) { /* try next */ }
  }

  // Fall back to page-wide scan
  const pageText = await page.textContent('body').catch(() => '');
  const priceMatches = pageText.match(/£\s*[\d,]+\.?\d*/g);
  if (priceMatches) {
    for (const match of priceMatches) {
      const price = extractPrice(match);
      if (price && price > 5) return price;
    }
  }

  return null;
}

/**
 * Try to extract delivery cost from page
 */
async function tryExtractDelivery(page) {
  const deliverySelectors = [
    '.delivery-cost', '.shipping-cost', '[class*="delivery"]',
    '[class*="shipping"]', '.postage', '[class*="postage"]',
  ];
  for (const sel of deliverySelectors) {
    try {
      const el = await page.$(sel);
      if (el) {
        const text = await el.textContent();
        if (text.toLowerCase().includes('free')) return 0;
        const price = extractPrice(text);
        if (price != null) return price;
      }
    } catch (e) { /* try next */ }
  }
  return null;
}

/**
 * Try to extract turnaround from page
 */
async function tryExtractTurnaround(page) {
  const selectors = ['.turnaround', '.delivery-time', '[class*="turnaround"]', '[class*="dispatch"]'];
  for (const sel of selectors) {
    try {
      const el = await page.$(sel);
      if (el) return (await el.textContent()).trim();
    } catch (e) { /* try next */ }
  }
  return null;
}

/**
 * Generic scraper factory
 * Creates a getQuotes function for a supplier given config
 */
function createGenericScraper(supplierConfig) {
  const { id: supplierId, products } = supplierConfig;

  async function getQuotes(specs, config) {
    const browser = await launchBrowser();
    const results = [];
    try {
      for (const spec of specs) {
        const productUrl = products[spec.product_type]?.url || null;
        if (!productUrl) {
          results.push(buildResult(spec, {
            status: 'not_available',
            notes: [`${spec.product_type} not listed on ${supplierId}`],
          }));
          continue;
        }

        const context = await createContext(browser);
        const page = await context.newPage();
        try {
          logger.info(`[${supplierId}] Fetching quote for ${spec.product_type} x${spec.quantity}`);
          await page.goto(productUrl, { waitUntil: 'networkidle', timeout: 20000 });
          await page.waitForTimeout(2000);

          // Try quantity
          const quantitySelectors = ['select[name="quantity"]', 'input[name="quantity"]', '#quantity', '.quantity-select'];
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

          results.push(buildResult(spec, {
            status: printPrice ? 'available' : 'partial',
            printPrice,
            deliveryCost: deliveryCost ?? 0,
            turnaround: turnaround || spec.turnaround || 'Standard',
            productUrl,
            notes: printPrice ? [] : ['Price not extracted — may need selector update'],
          }));
        } catch (err) {
          logger.error(`[${supplierId}] Error`, err.message);
          await screenshotOnFailure(page, supplierId, 'error');
          results.push(buildResult(spec, {
            status: 'error',
            productUrl,
            error: err.message,
            notes: [`Error: ${err.message}`],
          }));
        } finally {
          await context.close();
        }
      }
    } finally {
      await browser.close();
    }
    return results;
  }

  async function testConnection(config) {
    const browser = await launchBrowser();
    try {
      const context = await createContext(browser);
      const page = await context.newPage();
      await page.goto(supplierConfig.baseUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      const title = await page.title();
      await context.close();
      return { success: true, message: `Connected to ${supplierConfig.name}. Page: ${title}` };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      await browser.close();
    }
  }

  return { getQuotes, testConnection };
}

module.exports = { buildResult, tryExtractPrice, tryExtractDelivery, tryExtractTurnaround, createGenericScraper };
