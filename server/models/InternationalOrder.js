import mongoose from 'mongoose';

const inquiryItemSchema = new mongoose.Schema(
  {
    productId: { type: String, trim: true },
    name: { type: String, trim: true },
    quantity: { type: Number, default: 1 },
    price: { type: Number, default: 0 },
  },
  { _id: false }
);

const internationalOrderSchema = new mongoose.Schema(
  {
    customerName: { type: String, required: [true, 'Full name is required'], trim: true },
    email: { type: String, required: [true, 'Email is required'], trim: true, lowercase: true },
    phone: { type: String, required: [true, 'Phone number is required'], trim: true },
    country: { type: String, required: [true, 'Country is required'], trim: true },
    addressLine: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    stateRegion: { type: String, trim: true, default: '' },
    postalCode: { type: String, trim: true, default: '' },
    message: { type: String, trim: true, default: '' },
    items: { type: [inquiryItemSchema], default: [] },
    estimatedTotal: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['New', 'Contacted', 'Closed', 'Cancelled'],
      default: 'New',
    },
  },
  { timestamps: true }
);

internationalOrderSchema.index({ createdAt: -1 });
internationalOrderSchema.index({ status: 1 });

export default mongoose.model('InternationalOrder', internationalOrderSchema);