import express from 'express';
const router = express.Router();
import {
  getBlogPosts,
  getBlogTags,
  getBlogPostBySlug,
  getAdminBlogPosts,
  getAdminBlogPostById,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  toggleBlogPublish,
} from '../controllers/blogController.js';
import { protect } from '../middleware/authMiddleware.js';
import { admin } from '../middleware/adminMiddleware.js';
import { createBlogPostValidator, updateBlogPostValidator } from '../validators/blogValidator.js';

// Public Routes
router.get('/', getBlogPosts);
router.get('/tags', getBlogTags);

// Admin Routes — placed above '/:slug' so literal routes resolve first
router.get('/admin/all', protect, admin, getAdminBlogPosts);
router.get('/admin/:id', protect, admin, getAdminBlogPostById);
router.post('/', protect, admin, createBlogPostValidator, createBlogPost);
router.put('/:id', protect, admin, updateBlogPostValidator, updateBlogPost);
router.delete('/:id', protect, admin, deleteBlogPost);
router.patch('/publish/:id', protect, admin, toggleBlogPublish);

// Public — kept at the bottom so it doesn't swallow the literal routes above
router.get('/:slug', getBlogPostBySlug);

export default router;