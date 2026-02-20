const express = require('express');
const router = express.Router();
const { readSettings, writeSettings } = require('../utils/database');
const { encrypt, decrypt } = require('../utils/encryption');
const logger = require('../utils/logger');

/**
 * GET /api/settings
 */
router.get('/', (req, res) => {
  const settings = readSettings();

  // Mask encrypted credentials before sending to frontend
  const sanitized = JSON.parse(JSON.stringify(settings));
  if (sanitized.suppliers?.wttb?.credentials) {
    const { email, password } = sanitized.suppliers.wttb.credentials;
    sanitized.suppliers.wttb.credentials = {
      email: email ? decrypt(email) : '',
      password: password ? '••••••••' : '',
    };
  }

  res.json(sanitized);
});

/**
 * PUT /api/settings
 */
router.put('/', (req, res) => {
  try {
    const current = readSettings();
    const updates = req.body;

    // Deep merge settings
    const merged = deepMerge(current, updates);

    // Handle WTTB credentials encryption
    if (updates.suppliers?.wttb?.credentials) {
      const { email, password } = updates.suppliers.wttb.credentials;
      if (email !== undefined) {
        merged.suppliers.wttb.credentials.email = email ? encrypt(email) : '';
      }
      if (password && password !== '••••••••') {
        merged.suppliers.wttb.credentials.password = encrypt(password);
      } else {
        // Keep existing encrypted password
        merged.suppliers.wttb.credentials.password = current.suppliers?.wttb?.credentials?.password || '';
      }
    }

    writeSettings(merged);
    logger.info('Settings updated');
    res.json({ success: true });
  } catch (err) {
    logger.error('Settings update error', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/settings/test/:supplierId
 * Test connection to a supplier
 */
router.post('/test/:supplierId', async (req, res) => {
  const { supplierId } = req.params;
  const settings = readSettings();
  const supplierConfig = settings.suppliers[supplierId];

  if (!supplierConfig) {
    return res.status(404).json({ error: 'Supplier not found' });
  }

  try {
    const scraper = require(`../suppliers/${supplierId}/scraper`);
    if (typeof scraper.testConnection === 'function') {
      const result = await scraper.testConnection(supplierConfig);
      res.json(result);
    } else {
      res.json({ success: true, message: 'No test method available for this supplier' });
    }
  } catch (err) {
    logger.error(`Test connection failed for ${supplierId}`, err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

module.exports = router;
