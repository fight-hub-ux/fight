const { createGenericScraper } = require('../../utils/baseScraper');
const config = require('./config.json');
module.exports = createGenericScraper(config);
