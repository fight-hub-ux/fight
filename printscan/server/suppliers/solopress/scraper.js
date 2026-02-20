/**
 * Solopress scraper module
 * Note: Selectors are based on Solopress site structure as of 2024.
 * Sites change — update selectors in config.json if this breaks.
 */

const { launchBrowser, createContext, screenshotOnFailure, extractPrice } = require('../../utils/browser');
const mapper = require('./mapper');
const logger = require('../../utils/logger');

const SUPPLIER_NAME = 'solopress';

/**
 * Get quotes for all specs from Solopress
 * @param {Array} specs - Array of print specifications
 * @param {Object} config - Supplier configuration
 * @returns {Array} - Array of quote results
 */
async function getQuotes(specs, config) {
  const browser = await launchBrowser();
  const results = [];

  try {
    for (const spec of specs) {
      const result = await getQuoteForSpec(browser, spec, config);
      results.push(result);
    }
  } finally {
    await browser.close();
  }

  return results;
}

async function getQuoteForSpec(browser, spec, config) {
  const baseResult = {
    specId: spec.id || null,
    productType: spec.product_type,
    quantity: spec.quantity,
    size: spec.size,
    status: 'available',
    notes: [],
  };

  if (!mapper.isProductAvailable(spec.product_type)) {
    return {
      ...baseResult,
      status: 'not_available',
      printPrice: null,
      deliveryCost: null,
      turnaround: null,
      productUrl: null,
      notes: [`${spec.product_type} not available on Solopress`],
    };
  }

  const productUrl = mapper.getProductUrl(spec.product_type);
  const context = await createContext(browser);
  const page = await context.newPage();

  try {
    logger.info(`[Solopress] Fetching quote for ${spec.product_type} x${spec.quantity}`);

    await page.goto(productUrl, { waitUntil: 'networkidle', timeout: 20000 });

    // Try to interact with the product configurator
    // Solopress uses a dynamic calculator — we need to set options and wait for price
    let priceFound = false;
    let printPrice = null;
    let deliveryCost = null;
    let turnaround = null;

    // Wait for the page to load its configurator
    await page.waitForTimeout(2000);

    // Try to find and set quantity
    const quantitySelectors = [
      'select[name="quantity"]',
      'input[name="quantity"]',
      '#quantity',
      '[data-testid="quantity"]',
      '.quantity-select',
    ];

    for (const sel of quantitySelectors) {
      try {
        const el = await page.$(sel);
        if (el) {
          const tagName = await el.evaluate(node => node.tagName.toLowerCase());
          if (tagName === 'select') {
            // Try to select closest quantity
            const options = await page.$$eval(sel + ' option', opts =>
              opts.map(o => ({ value: o.value, text: o.textContent.trim() }))
            );
            const target = spec.quantity;
            const closest = options.reduce((prev, curr) => {
              const prevDiff = Math.abs(parseInt(prev.value) - target);
              const currDiff = Math.abs(parseInt(curr.value) - target);
              return currDiff < prevDiff ? curr : prev;
            }, options[0]);
            if (closest) {
              await page.selectOption(sel, closest.value);
              logger.debug(`[Solopress] Set quantity to ${closest.value}`);
            }
          } else {
            await page.fill(sel, String(spec.quantity));
          }
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }

    // Wait for price to update
    await page.waitForTimeout(2000);

    // Try to extract price from various common price selectors
    const priceSelectors = [
      '.price',
      '.product-price',
      '[class*="price"]',
      '[class*="total"]',
      '.calculator-price',
      '.quote-price',
      '#price',
      '[data-price]',
    ];

    for (const sel of priceSelectors) {
      try {
        const el = await page.$(sel);
        if (el) {
          const text = await el.textContent();
          const price = extractPrice(text);
          if (price && price > 0) {
            printPrice = price;
            priceFound = true;
            logger.info(`[Solopress] Found price: £${price} via selector ${sel}`);
            break;
          }
        }
      } catch (e) {
        // Try next
      }
    }

    // If no price found via selectors, try scraping the page for a price pattern
    if (!priceFound) {
      const pageText = await page.textContent('body');
      const priceMatches = pageText.match(/£\s*[\d,]+\.?\d*/g);
      if (priceMatches && priceMatches.length > 0) {
        // Take the first meaningful price (filter out very small amounts that might be per-unit)
        for (const match of priceMatches) {
          const price = extractPrice(match);
          if (price && price > 5) {
            printPrice = price;
            priceFound = true;
            logger.info(`[Solopress] Found price via text scan: £${price}`);
            break;
          }
        }
      }
    }

    // Attempt to get delivery cost
    const deliverySelectors = [
      '.delivery-cost',
      '.shipping-cost',
      '[class*="delivery"]',
      '[class*="shipping"]',
    ];
    for (const sel of deliverySelectors) {
      try {
        const el = await page.$(sel);
        if (el) {
          const text = await el.textContent();
          const price = extractPrice(text);
          if (price != null) {
            deliveryCost = price;
            break;
          }
        }
      } catch (e) {
        // Try next
      }
    }

    // Default delivery estimate if not found
    if (deliveryCost === null) deliveryCost = 0;

    // Try to get turnaround time
    const turnaroundSelectors = [
      '.turnaround',
      '.delivery-time',
      '[class*="turnaround"]',
      '[class*="days"]',
    ];
    for (const sel of turnaroundSelectors) {
      try {
        const el = await page.$(sel);
        if (el) {
          turnaround = (await el.textContent()).trim();
          break;
        }
      } catch (e) {
        // Try next
      }
    }

    return {
      ...baseResult,
      status: priceFound ? 'available' : 'partial',
      printPrice,
      deliveryCost,
      turnaround: turnaround || spec.turnaround || 'Standard',
      productUrl,
      notes: priceFound ? [] : ['Could not extract price from page — may need selector update'],
    };
  } catch (err) {
    logger.error(`[Solopress] Error getting quote`, err.message);
    await screenshotOnFailure(page, SUPPLIER_NAME, 'quote-error');
    return {
      ...baseResult,
      status: 'error',
      printPrice: null,
      deliveryCost: null,
      turnaround: null,
      productUrl,
      error: err.message,
      notes: [`Error: ${err.message}`],
    };
  } finally {
    await context.close();
  }
}

async function testConnection(config) {
  const browser = await launchBrowser();
  try {
    const context = await createContext(browser);
    const page = await context.newPage();
    await page.goto('https://www.solopress.com', { waitUntil: 'domcontentloaded', timeout: 15000 });
    const title = await page.title();
    await context.close();
    return { success: true, message: `Connected to Solopress. Page title: ${title}` };
  } catch (err) {
    return { success: false, error: err.message };
  } finally {
    await browser.close();
  }
}

module.exports = { getQuotes, testConnection };
