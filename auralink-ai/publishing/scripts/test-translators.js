/**
 * Unit test: run universal listing through each translator.
 * Does NOT make real API calls.
 */
import { toShopify } from '../src/translators/shopify.js';
import { toTikTok } from '../src/translators/tiktok.js';
import { toEbay } from '../src/translators/ebay.js';
import { toEtsy } from '../src/translators/etsy.js';
import { toAmazon } from '../src/translators/amazon.js';
import { toDepopText } from '../src/translators/depop.js';
import { toVintedText } from '../src/translators/vinted.js';

const mockListing = {
  photos: ['https://example.com/1.jpg', 'https://example.com/2.jpg'],
  video_url: null,
  title: 'Sony WH-1000XM5 Wireless Headphones',
  description: 'Industry-leading noise cancelling. LDAC, 30hr battery.',
  brand: 'Sony',
  model: 'WH-1000XM5',
  category: 'Electronics',
  subcategory: 'Audio',
  condition: 'new',
  condition_notes: 'Minor box wear',
  price: 2999,
  rrp: 3499,
  min_price: 2500,
  accepts_offers: true,
  currency: 'GBP',
  colour: 'Black',
  colour_secondary: '',
  material: 'Plastic, metal',
  size: 'One size',
  weight_kg: 0.25,
  dimensions: { length: 20, width: 18, height: 8 },
  age_group: 'adult',
  gender: 'unisex',
  upc: '45487361234',
  ean: '45487361234',
  asin: 'B09XS7JWHH',
  sku: 'SONY-XM5-001',
  shipping_type: 'free',
  shipping_amount: 0,
  dispatch_days: 1,
  ships_from_postcode: 'SW1A 1AA',
  ships_from_country: 'GB',
  international_shipping: false,
  returns_accepted: true,
  return_window_days: 30,
  return_shipping_paid_by: 'buyer',
  tags: ['headphones', 'noise cancel', 'sony', 'wireless', 'bluetooth'],
  platforms: ['shopify', 'tiktok', 'ebay', 'etsy', 'amazon'],
  schedule_at: null,
  auto_relist: false,
  quantity: 1,
};

function run(name, fn) {
  try {
    const out = fn(mockListing);
    console.log(`\n--- ${name} ---`);
    console.log(typeof out === 'string' ? out : JSON.stringify(out, null, 2));
    return true;
  } catch (e) {
    console.error(`\n--- ${name} FAILED ---`, e.message);
    return false;
  }
}

console.log('Running translator tests (no API calls)...');
const results = {
  shopify: run('Shopify', toShopify),
  tiktok: run('TikTok', toTikTok),
  ebay: run('eBay', toEbay),
  etsy: run('Etsy', toEtsy),
  amazon: run('Amazon', toAmazon),
  depop: run('Depop (text)', toDepopText),
  vinted: run('Vinted (text)', toVintedText),
};
const passed = Object.values(results).filter(Boolean).length;
const total = Object.keys(results).length;
console.log(`\n${passed}/${total} passed`);
process.exit(passed === total ? 0 : 1);
