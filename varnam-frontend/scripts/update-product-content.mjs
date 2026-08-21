// scripts/update-product-content.mjs
//
// TEMPORARY / one-off script — not part of the app, delete after use.
//
// Pushes new bilingual (English + Tamil) name / shortDescription / description
// content into specific existing products by _id. Connects to MongoDB directly
// via Mongoose (bypassing the HTTP API entirely), so there is no sanitizeMiddleware
// HTML-escaping step to worry about here — content is saved exactly as written
// below, Tamil script included.
//
// Uses Product.findByIdAndUpdate(..., { runValidators: true }) so the existing
// schema limits (shortDescription max 160, variants[].label max 60, etc.) are
// still enforced — if something's too long it'll fail loudly instead of saving
// truncated/broken content.
//
// Usage:
//   node scripts/update-product-content.mjs            # dry run — prints what would change
//   node scripts/update-product-content.mjs --apply     # actually saves

import 'dotenv/config';
import mongoose from 'mongoose';
import Product from '../models/Product.js';

const APPLY = process.argv.includes('--apply');

// ── Content to push ──────────────────────────────────────────────────────
// Format: name is "English Title (Tamil Title)". shortDescription and
// description are "English copy" followed by the Tamil translation.
// shortDescription is kept comfortably under the 160-char hard limit even
// with both languages included; description has no hard limit.
//
// Only 2 of the 5 products are filled in below (Ghee, Dry Dates Powder) —
// the _id/name/category for the remaining 3 weren't provided yet. Add them
// as additional entries in this same array once you share those details.
const updates = [
  {
    _id: '6a4e1d936f90ba9cfd856f0b', // Ghee
    name: 'Pure A2 Ghee (தூய ஏ2 நெய்)',
    shortDescription:
      'Traditionally hand-churned, aromatic pure ghee with a rich granular texture. | பாரம்பரிய முறையில் கையால் தயாரிக்கப்பட்ட நறுமண நெய்.',
    description:
      `Our Pure Ghee is made the traditional way — fresh milk is churned into butter, then slow-cooked over a low flame until the moisture evaporates and the natural milk solids caramelise, leaving behind a golden, grainy ghee packed with authentic aroma and flavour. No shortcuts, no additives, no preservatives — just what your grandmother would recognise as real ghee.

எங்கள் தூய நெய் பாரம்பரிய முறையில் தயாரிக்கப்படுகிறது — புதிய பாலில் இருந்து வெண்ணெய் எடுத்து, குறைந்த தீயில் மெதுவாகக் காய்ச்சி, நீர்ப்பகுதி முழுவதும் ஆவியாகும் வரை காய்ச்சப்படுகிறது. இதன் விளைவாக இயற்கையான மணமும், மணற்பாங்கான அமைப்பும் கொண்ட தூய நெய் கிடைக்கிறது. கலவைப் பொருட்களோ, பதப்படுத்திகளோ இல்லை.`,
  },
  {
    _id: '6a4e1ea7c21aaf6c35354451', // Dry Dates Powder
    name: 'Dry Dates Powder (உலர் பேரீச்சம் தூள்)',
    shortDescription:
      '100% sun-dried dates, stone-ground into a fine natural sweetener. | சூரிய வெளிச்சத்தில் உலர்த்திய பேரீச்சம்பழத் தூள்.',
    description:
      `Say goodbye to refined white sugar and chemical sweeteners. Our Dry Dates Powder is made from sun-dried dates, stone-ground into a fine, naturally sweet powder — perfect for milk, laddus, porridge, and baking. A wholesome, chemical-free way to sweeten everyday food, rich in natural fibre and minerals.

சுத்திகரிக்கப்பட்ட வெள்ளை சர்க்கரைக்கும் இரசாயன இனிப்பூட்டிகளுக்கும் விடைபெறுங்கள். எங்கள் உலர் பேரீச்சம் தூள் சூரிய ஒளியில் உலர்த்தப்பட்ட பேரீச்சம்பழங்களிலிருந்து அரைக்கப்பட்டு, இயற்கையான இனிப்புள்ள மென்மையான தூளாக தயாரிக்கப்படுகிறது — பால், லட்டு, கஞ்சி, பேக்கிங் ஆகியவற்றிற்கு ஏற்றது.`,
  },

  // Add the remaining 3 products here, same shape:
  // {
  //   _id: '...',
  //   name: 'English Title (Tamil Title)',
  //   shortDescription: 'English... | Tamil...',   // keep total under 160 chars
  //   description: `English paragraph...\n\nTamil paragraph...`,
  // },
];

async function run() {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not set — check your .env file.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log(`Connected. Mode: ${APPLY ? 'APPLY (writing changes)' : 'DRY RUN (no writes — pass --apply to save)'}`);

  for (const update of updates) {
    const { _id, ...fields } = update;
    const existing = await Product.findById(_id);
    if (!existing) {
      console.log(`\n[SKIP] No product found for _id ${_id}`);
      continue;
    }

    console.log(`\n[${APPLY ? 'UPDATING' : 'WOULD UPDATE'}] ${existing.name}  (${_id})`);
    console.log(`  name: "${existing.name}" -> "${fields.name}"  (${fields.name.length} chars)`);
    console.log(`  shortDescription (${fields.shortDescription.length}/160 chars):\n    "${fields.shortDescription}"`);
    console.log(`  description (${fields.description.length} chars, no hard limit)`);

    if (fields.shortDescription.length > 160) {
      console.log(`  ⚠️  shortDescription exceeds 160 chars — this update will be REJECTED by the schema. Fix before --apply.`);
      continue;
    }

    if (APPLY) {
      try {
        await Product.findByIdAndUpdate(_id, fields, { runValidators: true });
        console.log('  ✅ saved');
      } catch (err) {
        console.log(`  ❌ failed: ${err.message}`);
      }
    }
  }

  console.log('\nDone.');
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});
