import Category from '../models/Category.js';
import Product from '../models/Product.js';
import slugify from 'slugify';
import { triggerFrontendRedeploy } from '../utils/deployTrigger.js';
import { deepStripMongoOperators } from '../middleware/sanitizeMiddleware.js';

// @desc    Get all active categories (Public)
// @route   GET /api/categories
export const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ active: true });
    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single category by slug (Public)
// @route   GET /api/categories/:slug
export const getCategoryBySlug = async (req, res) => {
  try {
    const category = await Category.findOne({ slug: req.params.slug, active: true });
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    res.status(200).json({ success: true, data: category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create category (Admin)
// @route   POST /api/categories
export const createCategory = async (req, res) => {
  try {
    // sanitizeMiddleware HTML-escapes req.body for defense-in-depth on
    // routes that render raw HTML. Category name/description are only ever
    // rendered as plain text on the frontend (React escapes automatically),
    // so we save from the pre-escape snapshot instead — this keeps stored
    // content matching exactly what the admin typed, while still stripping
    // any `$` Mongo-operator injection attempts. Same fix as blogController.js
    // and productController.js.
    const rawBody = req._rawBody ? deepStripMongoOperators(req._rawBody) : req.body;
    const { name, image, description } = rawBody;
    const slug = slugify(name, { lower: true, strict: true });

    const categoryExists = await Category.findOne({ slug });
    if (categoryExists) {
      return res.status(400).json({ success: false, message: 'Category already exists' });
    }

    const category = await Category.create({ name, slug, image, description });
    res.status(201).json({ success: true, data: category });
    triggerFrontendRedeploy(`category created: ${category.slug}`);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update category (Admin)
// @route   PUT /api/categories/:id
export const updateCategory = async (req, res) => {
  try {
    const rawBody = req._rawBody ? deepStripMongoOperators(req._rawBody) : req.body;
    const { name, image, active, description } = rawBody;
    const updateData = {};

    if (name) {
      updateData.name = name;
      updateData.slug = slugify(name, { lower: true, strict: true });
    }
    if (image !== undefined) updateData.image = image;
    if (active !== undefined) updateData.active = active;
    if (description !== undefined) updateData.description = description;

    const category = await Category.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    res.status(200).json({ success: true, data: category });
    triggerFrontendRedeploy(`category updated: ${category.slug}`);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete category (Admin)
// @route   DELETE /api/categories/:id
export const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    // Nullify the category reference on all linked products before deletion.
    // Without this, those products would hold a dangling ObjectId that breaks
    // populate calls and category filter queries across the entire catalog.
    await Product.updateMany(
      { category: category._id },
      { $set: { category: null } }
    );

    const deletedSlug = category.slug;
    await category.deleteOne();
    res.status(200).json({ success: true, message: 'Category deleted and linked products unlinked successfully' });
    triggerFrontendRedeploy(`category deleted: ${deletedSlug}`);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};