import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      unique: true,
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    image: {
      type: String,
      required: [true, 'Category image URL is required'],
    },
    // Optional on-page/SEO copy for the category. Not required so existing
    // categories (created before this field existed) stay valid. When empty,
    // the frontend prerender script falls back to a templated sentence —
    // see scripts/prerender-static-routes.mjs (categoryToRoute).
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Category', categorySchema);