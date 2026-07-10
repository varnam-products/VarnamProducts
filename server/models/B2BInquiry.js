import mongoose from 'mongoose';

const inquiryProductSchema = new mongoose.Schema(
  {
    productId: { type: String, trim: true },
    name: { type: String, trim: true },
    quantity: { type: String, trim: true },
  },
  { _id: false }
);

const b2bInquirySchema = new mongoose.Schema(
  {
    businessName: { type: String, required: [true, 'Business name is required'], trim: true },
    contactName: { type: String, required: [true, 'Contact person name is required'], trim: true },
    email: { type: String, trim: true, lowercase: true, default: '' },
    phone: { type: String, required: [true, 'Phone number is required'], trim: true },
    businessType: { type: String, trim: true, default: 'Other' },
    city: { type: String, trim: true, default: '' },
    monthlyQuantity: { type: String, trim: true, default: '' },
    message: { type: String, trim: true, default: '' },
    products: { type: [inquiryProductSchema], default: [] },
    status: {
      type: String,
      enum: ['New', 'Contacted', 'Closed'],
      default: 'New',
    },
  },
  { timestamps: true }
);

b2bInquirySchema.index({ createdAt: -1 });
b2bInquirySchema.index({ status: 1 });

export default mongoose.model('B2BInquiry', b2bInquirySchema);
