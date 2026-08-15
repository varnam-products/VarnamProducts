import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      unique: true,
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: [true, 'Product description is required'],
    },
    shortDescription: {
      type: String,
      required: [true, 'Short description is required'],
      maxlength: [160, 'Short description cannot exceed 160 characters'],
    },
    // A product is always sold through one or more variants — even a product that only
    // comes in a single size/pack has exactly one variant. This keeps a single code path
    // everywhere downstream (cart, orders, listings) instead of branching on "does this
    // product have variants or not".
    //
    // The variant label is free text chosen by the admin (e.g. "500ml", "1kg", "Gift Box",
    // "Combo of 2") — it is NOT constrained to a unit/quantity system. Only price and
    // discountPrice differ per variant; stock stays a single shared pool at the product level
    // (see `stock` below) since the admin explicitly does not want per-variant inventory.
    variants: {
      type: [
        {
          label: {
            type: String,
            required: [true, 'Variant label is required'],
            trim: true,
            maxlength: [60, 'Variant label cannot exceed 60 characters'],
          },
          price: {
            type: Number,
            required: [true, 'Variant price is required'],
            min: [0, 'Price cannot be negative'],
          },
          discountPrice: {
            type: Number,
            default: 0,
            validate: {
              validator: function (value) {
                // `this` here is the variant subdocument itself.
                if (value === 0) return true;
                return value < this.price;
              },
              message: 'Discount price ({VALUE}) must be lower than the variant price',
            },
          },
        },
      ],
      validate: {
        validator: function (value) {
          return Array.isArray(value) && value.length > 0;
        },
        message: 'At least one variant is required',
      },
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Product must belong to a category'],
    },
    images: {
      type: [String],
      required: [true, 'At least one product image is required'],
    },
    stock: {
      type: Number,
      required: [true, 'Inventory stock quantity is required'],
      min: [0, 'Stock cannot be negative'],
      default: 0,
    },
    ingredients: {
      type: [String],
      default: [],
    },
    benefits: {
      type: [String],
      default: [],
    },
    featured: {
      type: Boolean,
      default: false,
    },
    bestSeller: {
      type: Boolean,
      default: false,
    },
    active: {
      type: Boolean,
      default: true,
    },
    ratings: {
      type: Number,
      default: 0,
    },
    totalSales: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compounded index for lightning-fast catalog search queries
productSchema.index({ name: 'text', description: 'text', shortDescription: 'text' });

export default mongoose.model('Product', productSchema);