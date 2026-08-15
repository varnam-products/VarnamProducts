import mongoose from 'mongoose';

const blogPostSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Blog title is required'],
      unique: true,
      trim: true,
      maxlength: [140, 'Title cannot exceed 140 characters'],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    excerpt: {
      type: String,
      required: [true, 'A short excerpt is required'],
      trim: true,
      maxlength: [200, 'Excerpt cannot exceed 200 characters'],
    },
    content: {
      type: String,
      required: [true, 'Blog content is required'],
    },
    coverImage: {
      type: String,
      required: [true, 'Cover image URL is required'],
    },
    // Cloudinary public_id for coverImage, when uploaded via /api/upload/blog.
    // Lets the admin UI purge the asset from storage on replace/delete —
    // same pattern as Banner. Optional since older posts may have been
    // created with an external image URL instead.
    coverImagePublicId: {
      type: String,
      default: null,
    },
    author: {
      type: String,
      trim: true,
      default: 'Varnam Foods',
    },
    tags: {
      type: [String],
      default: [],
    },
    metaTitle: {
      type: String,
      trim: true,
      maxlength: [70, 'Meta title cannot exceed 70 characters'],
    },
    metaDescription: {
      type: String,
      trim: true,
      maxlength: [160, 'Meta description cannot exceed 160 characters'],
    },
    published: {
      type: Boolean,
      default: false,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    readTimeMinutes: {
      type: Number,
      default: 1,
    },
    views: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-estimate reading time from content length (~200 words/min) so the
// admin never has to fill this in manually or keep it in sync by hand.
// Mongoose 9 no longer passes a next() callback to pre('save') hooks — the
// hook just needs to run to completion (sync or via a returned promise).
blogPostSchema.pre('save', function () {
  if (this.isModified('content')) {
    const wordCount = this.content.trim().split(/\s+/).filter(Boolean).length;
    this.readTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));
  }
});

// Text index for the same lightweight search pattern used on Product
blogPostSchema.index({ title: 'text', excerpt: 'text', content: 'text', tags: 'text' });

export default mongoose.model('BlogPost', blogPostSchema);