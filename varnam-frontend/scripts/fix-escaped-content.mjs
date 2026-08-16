// scripts/fix-escaped-content.mjs
//
// One-off cleanup for the double-HTML-escaping bug: before this fix,
// productController.js / categoryController.js saved straight from
// req.body, which sanitizeMiddleware.js had already HTML-escaped
// (& -> &amp;, ' -> &#x27;, etc). Every create/update round-trip added
// another layer of escaping, so some documents ended up with garbage like
// "&amp;amp;" or worse in name/description/shortDescription/ingredients/
// benefits/variant labels.
//
// This script walks every Product and Category, repeatedly un-escapes
// those text fields until they stop changing (undoes however many layers
// got baked in), and reports what it would change. It writes nothing
// unless you pass --apply.
//
// Usage:
//   node scripts/fix-escaped-content.mjs            # dry run — prints a diff, writes nothing
//   node scripts/fix-escaped-content.mjs --apply     # actually saves the fixes
//
// Safe to run more than once — once content is clean, further runs report
// zero changes.

import 'dotenv/config';
import mongoose from 'mongoose';
import Product from '../models/Product.js';
import Category from '../models/Category.js';

const APPLY = process.argv.includes('--apply');
const MAX_PASSES = 5; // guards against pathological/unbounded input; 2-3 layers is the realistic worst case here

function unescapeOnce(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'");
}

// Repeatedly un-escape until stable, so multi-layer garbage like
// "&amp;amp;" (originally "&", escaped twice) fully resolves back to "&"
// instead of stopping one layer short at "&amp;".
function deepUnescape(str) {
  if (typeof str !== 'string') return str;
  let current = str;
  for (let i = 0; i < MAX_PASSES; i++) {
    const next = unescapeOnce(current);
    if (next === current) break;
    current = next;
  }
  return current;
}

function unescapeStringArray(arr) {
  if (!Array.isArray(arr)) return arr;
  return arr.map((item) => (typeof item === 'string' ? deepUnescape(item) : item));
}

let totalChecked = 0;
let totalChanged = 0;

function logFieldDiff(label, before, after) {
  if (before === after) return;
  console.log(`    ${label}:`);
  console.log(`      before: ${JSON.stringify(before)}`);
  console.log(`      after:  ${JSON.stringify(after)}`);
}

async function fixProducts() {
  console.log('\n── Products ─────────────────────────────────────────');
  const products = await Product.find({});

  for (const product of products) {
    totalChecked++;
    const updates = {};
    let changed = false;

    const fixedName = deepUnescape(product.name);
    const fixedDescription = deepUnescape(product.description);
    const fixedShortDescription = deepUnescape(product.shortDescription);
    const fixedIngredients = unescapeStringArray(product.ingredients);
    const fixedBenefits = unescapeStringArray(product.benefits);
    const fixedVariants = Array.isArray(product.variants)
      ? product.variants.map((v) => ({ ...v.toObject?.() ?? v, label: deepUnescape(v.label) }))
      : product.variants;

    if (fixedName !== product.name) { updates.name = fixedName; changed = true; }
    if (fixedDescription !== product.description) { updates.description = fixedDescription; changed = true; }
    if (fixedShortDescription !== product.shortDescription) { updates.shortDescription = fixedShortDescription; changed = true; }
    if (JSON.stringify(fixedIngredients) !== JSON.stringify(product.ingredients)) { updates.ingredients = fixedIngredients; changed = true; }
    if (JSON.stringify(fixedBenefits) !== JSON.stringify(product.benefits)) { updates.benefits = fixedBenefits; changed = true; }
    if (JSON.stringify(fixedVariants.map(v => v.label)) !== JSON.stringify((product.variants || []).map(v => v.label))) {
      updates.variants = fixedVariants;
      changed = true;
    }

    if (!changed) continue;

    totalChanged++;
    console.log(`\n  [${APPLY ? 'FIXING' : 'WOULD FIX'}] Product ${product._id} (${product.slug})`);
    logFieldDiff('name', product.name, fixedName);
    logFieldDiff('description', product.description, fixedDescription);
    logFieldDiff('shortDescription', product.shortDescription, fixedShortDescription);
    logFieldDiff('ingredients', product.ingredients, fixedIngredients);
    logFieldDiff('benefits', product.benefits, fixedBenefits);
    (product.variants || []).forEach((v, i) => logFieldDiff(`variants[${i}].label`, v.label, fixedVariants[i]?.label));

    if (APPLY) {
      await Product.updateOne({ _id: product._id }, { $set: updates });
    }
  }
}

async function fixCategories() {
  console.log('\n── Categories ───────────────────────────────────────');
  const categories = await Category.find({});

  for (const category of categories) {
    totalChecked++;
    const updates = {};
    let changed = false;

    const fixedName = deepUnescape(category.name);
    const fixedDescription = deepUnescape(category.description);

    if (fixedName !== category.name) { updates.name = fixedName; changed = true; }
    if (fixedDescription !== category.description) { updates.description = fixedDescription; changed = true; }

    if (!changed) continue;

    totalChanged++;
    console.log(`\n  [${APPLY ? 'FIXING' : 'WOULD FIX'}] Category ${category._id} (${category.slug})`);
    logFieldDiff('name', category.name, fixedName);
    logFieldDiff('description', category.description, fixedDescription);

    if (APPLY) {
      await Category.updateOne({ _id: category._id }, { $set: updates });
    }
  }
}

async function run() {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not set — check your .env file.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log(`Connected. Mode: ${APPLY ? 'APPLY (writing changes)' : 'DRY RUN (no writes — pass --apply to save)'}`);

  await fixProducts();
  await fixCategories();

  console.log(`\n── Done ─────────────────────────────────────────────`);
  console.log(`Checked ${totalChecked} documents, ${totalChanged} needed fixing.`);
  if (!APPLY && totalChanged > 0) {
    console.log('Re-run with --apply to write these changes.');
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Cleanup script failed:', err);
  process.exit(1);
});
