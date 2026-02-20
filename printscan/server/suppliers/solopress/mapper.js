/**
 * Maps standardised spec fields to Solopress-specific options
 */

const PRODUCT_URLS = {
  'Business Cards': 'https://www.solopress.com/business-cards/',
  'Flyers/Leaflets': 'https://www.solopress.com/flyers/',
  'Folded Leaflets': 'https://www.solopress.com/folded-leaflets/',
  'Brochures/Booklets': 'https://www.solopress.com/booklets/',
  'Posters': 'https://www.solopress.com/posters/',
  'Postcards': 'https://www.solopress.com/postcards/',
  'Compliment Slips': 'https://www.solopress.com/compliment-slips/',
  'Letterheads': 'https://www.solopress.com/letterheads/',
  'Roller Banners': 'https://www.solopress.com/roller-banners/',
};

function getProductUrl(productType) {
  return PRODUCT_URLS[productType] || null;
}

function mapSize(size) {
  const sizeMap = {
    'A6': 'A6',
    'A5': 'A5',
    'A4': 'A4',
    'A3': 'A3',
    'A2': 'A2',
    'A1': 'A1',
    'DL': 'DL',
    '85x55mm': '85x55mm',
  };
  return sizeMap[size] || size;
}

function mapPaperStock(stock, weightGsm) {
  // Combines stock type and weight
  const stockLower = (stock || '').toLowerCase();
  const weight = weightGsm || 170;

  if (stockLower.includes('gloss')) return `${weight}gsm Gloss`;
  if (stockLower.includes('uncoated') || stockLower.includes('offset')) return `${weight}gsm Uncoated`;
  return `${weight}gsm Silk`;
}

function mapLamination(lamination) {
  const lamMap = {
    'None': 'No Lamination',
    'Matt Lamination (one side)': 'Matt One Side',
    'Matt Lamination (both sides)': 'Matt Both Sides',
    'Gloss Lamination (one side)': 'Gloss One Side',
    'Gloss Lamination (both sides)': 'Gloss Both Sides',
    'Soft Touch Lamination': 'Soft Touch',
    'Spot UV': 'Spot UV',
  };
  return lamMap[lamination] || 'No Lamination';
}

function isProductAvailable(productType) {
  return productType in PRODUCT_URLS;
}

module.exports = {
  getProductUrl,
  mapSize,
  mapPaperStock,
  mapLamination,
  isProductAvailable,
};
