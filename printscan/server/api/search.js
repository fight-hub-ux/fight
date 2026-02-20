const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const { readSettings, addToHistory } = require('../utils/database');

// In-memory search state (sufficient for single user)
const searches = new Map();

// Import supplier scrapers
const scrapers = {
  solopress: require('../suppliers/solopress/scraper'),
  wttb: require('../suppliers/wttb/scraper'),
  'printed-easy': require('../suppliers/printed-easy/scraper'),
  instantprint: require('../suppliers/instantprint/scraper'),
  helloprint: require('../suppliers/helloprint/scraper'),
  route1print: require('../suppliers/route1print/scraper'),
  printuk: require('../suppliers/printuk/scraper'),
};

/**
 * POST /api/search
 * Start a new price search for confirmed specs
 */
router.post('/', async (req, res) => {
  const { specs } = req.body;

  if (!specs || !Array.isArray(specs) || specs.length === 0) {
    return res.status(400).json({ error: 'No specs provided' });
  }

  const searchId = uuidv4();
  const settings = readSettings();

  // Initialize search state
  const searchState = {
    id: searchId,
    specs,
    status: 'running',
    startedAt: new Date().toISOString(),
    completedAt: null,
    supplierStatus: {},
    results: [],
  };

  // Initialize per-supplier status
  const enabledSuppliers = Object.entries(settings.suppliers)
    .filter(([, s]) => s.enabled)
    .map(([id, s]) => ({ id, ...s }));

  enabledSuppliers.forEach(supplier => {
    searchState.supplierStatus[supplier.id] = { status: 'pending', name: supplier.name };
  });

  searches.set(searchId, searchState);

  // Return searchId immediately
  res.json({ searchId, suppliers: enabledSuppliers.map(s => s.id) });

  // Run all supplier queries in parallel (async, non-blocking)
  runSupplierQueries(searchId, specs, enabledSuppliers, settings).catch(err => {
    logger.error('Search orchestration error', err.message);
  });
});

/**
 * GET /api/search/:id/status
 */
router.get('/:id/status', (req, res) => {
  const search = searches.get(req.params.id);
  if (!search) return res.status(404).json({ error: 'Search not found' });
  res.json({
    id: search.id,
    status: search.status,
    startedAt: search.startedAt,
    completedAt: search.completedAt,
    supplierStatus: search.supplierStatus,
  });
});

/**
 * GET /api/search/:id/results
 */
router.get('/:id/results', (req, res) => {
  const search = searches.get(req.params.id);
  if (!search) return res.status(404).json({ error: 'Search not found' });
  res.json({
    id: search.id,
    status: search.status,
    results: search.results,
    specs: search.specs,
  });
});

/**
 * GET /api/search/history
 */
router.get('/history', (req, res) => {
  const { readHistory } = require('../utils/database');
  res.json(readHistory());
});

async function runSupplierQueries(searchId, specs, enabledSuppliers, settings) {
  const search = searches.get(searchId);

  const supplierPromises = enabledSuppliers.map(async supplier => {
    const scraper = scrapers[supplier.id];
    if (!scraper) {
      updateSupplierStatus(searchId, supplier.id, 'error', 'Scraper not found');
      return;
    }

    updateSupplierStatus(searchId, supplier.id, 'running');
    broadcastProgress(searchId, { type: 'supplier_update', supplierId: supplier.id, status: 'running', name: supplier.name });

    try {
      // Run with 30s timeout
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout after 30 seconds')), 30000)
      );

      const supplierConfig = settings.suppliers[supplier.id];
      const resultsPromise = scraper.getQuotes(specs, supplierConfig);

      const supplierResults = await Promise.race([resultsPromise, timeoutPromise]);

      // Apply discount
      const discount = supplierConfig.discount || 0;
      const processedResults = supplierResults.map(r => ({
        ...r,
        supplierId: supplier.id,
        supplierName: supplier.name,
        supplierUrl: supplier.url,
        discountApplied: discount,
        printPriceAfterDiscount: r.printPrice != null
          ? parseFloat((r.printPrice * (1 - discount / 100)).toFixed(2))
          : null,
        totalCost: r.printPrice != null && r.deliveryCost != null
          ? parseFloat(((r.printPrice * (1 - discount / 100)) + r.deliveryCost).toFixed(2))
          : null,
      }));

      search.results.push(...processedResults);
      updateSupplierStatus(searchId, supplier.id, 'complete', null, processedResults.length);
      broadcastProgress(searchId, { type: 'supplier_update', supplierId: supplier.id, status: 'complete', name: supplier.name, resultCount: processedResults.length });
    } catch (err) {
      const isTimeout = err.message.includes('Timeout');
      const status = isTimeout ? 'timeout' : 'error';
      logger.error(`Supplier ${supplier.id} failed`, err.message);
      updateSupplierStatus(searchId, supplier.id, status, err.message);
      broadcastProgress(searchId, { type: 'supplier_update', supplierId: supplier.id, status, name: supplier.name, error: err.message });

      // Add a "not available" result for this supplier
      search.results.push({
        supplierId: supplier.id,
        supplierName: supplier.name,
        supplierUrl: supplier.url,
        status: isTimeout ? 'timeout' : 'error',
        error: err.message,
        printPrice: null,
        deliveryCost: null,
        totalCost: null,
      });
    }
  });

  await Promise.allSettled(supplierPromises);

  // Sort results: available first (by totalCost), then errors
  search.results.sort((a, b) => {
    if (a.totalCost != null && b.totalCost != null) return a.totalCost - b.totalCost;
    if (a.totalCost != null) return -1;
    if (b.totalCost != null) return 1;
    return 0;
  });

  search.status = 'complete';
  search.completedAt = new Date().toISOString();

  // Save to history
  addToHistory({
    id: searchId,
    specs,
    completedAt: search.completedAt,
    resultCount: search.results.filter(r => r.totalCost != null).length,
    topResult: search.results[0] || null,
  });

  broadcastProgress(searchId, { type: 'complete', searchId });
  logger.info(`Search ${searchId} complete. ${search.results.length} results.`);
}

function updateSupplierStatus(searchId, supplierId, status, error = null, resultCount = null) {
  const search = searches.get(searchId);
  if (search) {
    search.supplierStatus[supplierId] = {
      ...search.supplierStatus[supplierId],
      status,
      ...(error ? { error } : {}),
      ...(resultCount != null ? { resultCount } : {}),
    };
  }
}

function broadcastProgress(searchId, data) {
  if (global.broadcastProgress) {
    global.broadcastProgress(searchId, data);
  }
}

module.exports = router;
