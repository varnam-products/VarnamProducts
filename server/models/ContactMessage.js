import mongoose from 'mongoose';

const contactMessageSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true },
    email: { type: String, required: [true, 'Email is required'], trim: true, lowercase: true },
    phone: { type: String, trim: true, default: '' },
    subject: { type: String, trim: true, default: 'General Inquiry' },
    message: { type: String, required: [true, 'Message is required'], trim: true },
    status: {
      type: String,
      enum: ['New', 'Read', 'Responded', 'Closed'],
      default: 'New',
    },
  },
  { timestamps: true }
);

contactMessageSchema.index({ createdAt: -1 });
contactMessageSchema.index({ status: 1 });

export default mongoose.model('ContactMessage', contactMessageSchema);
