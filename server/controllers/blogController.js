import BlogPost from '../models/BlogPost.js';
import slugify from 'slugify';
import { deepStripMongoOperators } from '../middleware/sanitizeMiddleware.js';

// @desc    Get published blog posts, paginated, with optional tag/search filters (Public)
// @route   GET /api/blog
export const getBlogPosts = async (req, res) => {
  try {
    const { page = 1, limit = 9, tag, q } = req.query;

    const filter = { published: true };
    if (tag) filter.tags = tag;
    if (q) filter.$text = { $search: q };

    const skipIndex = (Number(page) - 1) * Number(limit);

    const [total, posts] = await Promise.all([
      BlogPost.countDocuments(filter),
      BlogPost.find(filter, q ? { score: { $meta: 'textScore' } } : {})
        .select('-content')
        .sort(q ? { score: { $meta: 'textScore' } } : { publishedAt: -1 })
        .skip(skipIndex)
        .limit(Number(limit)),
    ]);

    res.status(200).json({
      success: true,
      pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) },
      data: posts,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get distinct tags across published posts, for filter UI (Public)
// @route   GET /api/blog/tags
export const getBlogTags = async (req, res) => {
  try {
    const tags = await BlogPost.distinct('tags', { published: true });
    res.status(200).json({ success: true, data: tags.sort() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single published post by slug, increments view count (Public)
// @route   GET /api/blog/:slug
export const getBlogPostBySlug = async (req, res) => {
  try {
    const post = await BlogPost.findOneAndUpdate(
      { slug: req.params.slug, published: true },
      { $inc: { views: 1 } },
      { new: true }
    );

    if (!post) {
      return res.status(404).json({ success: false, message: 'Blog post not found' });
    }

    res.status(200).json({ success: true, data: post });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all posts including drafts, paginated, with optional search/status filters (Admin)
// @route   GET /api/blog/admin/all
export const getAdminBlogPosts = async (req, res) => {
  try {
    const { page = 1, limit = 10, q, status } = req.query;

    const filter = {};
    if (status === 'published') filter.published = true;
    if (status === 'draft') filter.published = false;
    if (q) filter.$text = { $search: q };

    const skipIndex = (Number(page) - 1) * Number(limit);

    const [total, posts] = await Promise.all([
      BlogPost.countDocuments(filter),
      BlogPost.find(filter, q ? { score: { $meta: 'textScore' } } : {})
        .select('-content')
        .sort(q ? { score: { $meta: 'textScore' } } : { createdAt: -1 })
        .skip(skipIndex)
        .limit(Number(limit)),
    ]);

    res.status(200).json({
      success: true,
      pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) },
      data: posts,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single post by id, including drafts, with full content (Admin)
// @route   GET /api/blog/admin/:id
export const getAdminBlogPostById = async (req, res) => {
  try {
    const post = await BlogPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Blog post not found' });
    }
    res.status(200).json({ success: true, data: post });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create blog post (Admin)
// @route   POST /api/blog
export const createBlogPost = async (req, res) => {
  try {
    // sanitizeMiddleware HTML-escapes req.body for defense-in-depth on
    // routes that render raw HTML (e.g. email templates). Blog content is
    // only ever rendered as plain text on the frontend (React escapes
    // automatically), so we save from the pre-escape snapshot instead —
    // this keeps stored content matching exactly what the admin typed
    // (correct length, no literal "&amp;"/"&#x27;" in the DB), while still
    // stripping any `$` Mongo-operator injection attempts.
    const rawBody = req._rawBody ? deepStripMongoOperators(req._rawBody) : req.body;
    const { title, published } = rawBody;
    const slug = slugify(title, { lower: true, strict: true });

    const slugExists = await BlogPost.findOne({ slug });
    if (slugExists) {
      return res.status(400).json({ success: false, message: 'A post with this title already exists' });
    }

    const post = await BlogPost.create({
      ...rawBody,
      slug,
      publishedAt: published ? new Date() : null,
    });

    res.status(201).json({ success: true, data: post });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Update blog post (Admin)
// @route   PUT /api/blog/:id
export const updateBlogPost = async (req, res) => {
  try {
    const rawBody = req._rawBody ? deepStripMongoOperators(req._rawBody) : req.body;
    const updateData = { ...rawBody };

    if (updateData.title) {
      updateData.slug = slugify(updateData.title, { lower: true, strict: true });
    }

    // If this update is the one flipping published false → true, stamp publishedAt.
    // Handled via a pre-fetch since findByIdAndUpdate can't see the prior value otherwise.
    if (updateData.published === true) {
      const existing = await BlogPost.findById(req.params.id).select('published');
      if (existing && !existing.published) {
        updateData.publishedAt = new Date();
      }
    } else if (updateData.published === false) {
      updateData.publishedAt = null;
    }

    const post = await BlogPost.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!post) {
      return res.status(404).json({ success: false, message: 'Blog post not found' });
    }

    res.status(200).json({ success: true, data: post });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete blog post (Admin)
// @route   DELETE /api/blog/:id
export const deleteBlogPost = async (req, res) => {
  try {
    const post = await BlogPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Blog post not found' });
    }

    await post.deleteOne();
    res.status(200).json({ success: true, message: 'Blog post deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle publish state (Admin)
// @route   PATCH /api/blog/publish/:id
export const toggleBlogPublish = async (req, res) => {
  try {
    const post = await BlogPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Blog post not found' });
    }

    post.published = !post.published;
    post.publishedAt = post.published ? new Date() : null;
    await post.save();

    res.status(200).json({ success: true, data: post });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};