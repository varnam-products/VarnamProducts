import mongoose from 'mongoose';

// Single-document collection — there is always exactly one Settings document.
// All business logic values that were previously hardcoded in controllers live here.
// Admin can update them via the API without a code deploy.
const settingsSchema = new mongoose.Schema(
  {
    // Shipping
    freeShippingThreshold: {
      type: Number,
      required: true,
      min: [0, 'Free shipping threshold cannot be negative'],
      default: 499,
    },
    flatShippingFee: {
      type: Number,
      required: true,
      min: [0, 'Shipping fee cannot be negative'],
      default: 60,
    },

    // COD
    codLimit: {
      type: Number,
      required: true,
      min: [0, 'COD limit cannot be negative'],
      default: 2000,
    },
    codEnabled: {
      type: Boolean,
      default: true,
    },

    // Store info (useful for email footers and admin panel)
    storeName: {
      type: String,
      default: 'Varnam Organic',
      trim: true,
    },
    storeEmail: {
      type: String,
      default: '',
      trim: true,
    },
    storePhone: {
      type: String,
      default: '',
      trim: true,
    },

    // Social links (used on Contact page + Footer)
    socialLinks: {
      facebook: { type: String, default: '', trim: true },
      instagram: { type: String, default: '', trim: true },
      // Accepts either a full wa.me / whatsapp link, or just a phone number
      // (with or without country code) — the frontend normalizes it.
      whatsapp: { type: String, default: '', trim: true },
    },

    // Store address (used on Contact page + Footer)
    address: {
      line1: { type: String, default: '', trim: true },
      line2: { type: String, default: '', trim: true },
      city: { type: String, default: '', trim: true },
      state: { type: String, default: '', trim: true },
      pincode: { type: String, default: '', trim: true },
      country: { type: String, default: 'India', trim: true },
    },

    // Free-text working hours, one line per entry (e.g. "Monday – Saturday: 10 AM – 6 PM IST")
    workingHours: {
      type: String,
      default: 'Monday – Saturday: 10 AM – 6 PM IST\nSunday: Closed',
      trim: true,
    },

    // Coupon codes, entered at checkout only (not tied to a persistent cart - once an
    // order is placed or the checkout is abandoned, the code isn't remembered anywhere).
    // Percentage-based, applied to the item subtotal only, never to shipping.
    coupons: {
      type: [
        {
          name: { type: String, required: true, trim: true },
          code: { type: String, required: true, trim: true, uppercase: true },
          discountPercentage: {
            type: Number,
            required: true,
            min: [1, 'Discount percentage must be at least 1'],
            max: [100, 'Discount percentage cannot exceed 100'],
          },
          active: { type: Boolean, default: true },
        },
      ],
      validate: {
        validator: (arr) => arr.length <= 3,
        message: 'You can only have up to 3 coupon codes',
      },
      default: [],
    },
  },
  {
    timestamps: true,
  }
);


export default mongoose.model('Settings', settingsSchema);