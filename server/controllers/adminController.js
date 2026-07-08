import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { ORDER_STATUS } from '../constants/orderStatus.js';
import { PAYMENT_STATUS } from '../constants/paymentStatus.js';
import { ROLES } from '../constants/roles.js';

export const getDashboard = async (req, res) => {
  try {
    const confirmedStatuses = [ORDER_STATUS.ORDERED, ORDER_STATUS.PACKED, ORDER_STATUS.SHIPPED, ORDER_STATUS.OUT_FOR_DELIVERY, ORDER_STATUS.DELIVERED];
    const excludedStatuses = [ORDER_STATUS.PENDING_PAYMENT, ORDER_STATUS.CANCELLED];

    const [totalOrders, salesResult, totalCustomers, recentOrders, lowStockProducts, ordersByStatus, todayResult, pendingCancelRequests] = await Promise.all([
      Order.countDocuments({ orderStatus: { $in: confirmedStatuses } }),
      Order.aggregate([{ $match: { orderStatus: { $nin: excludedStatuses }, paymentStatus: { $in: [PAYMENT_STATUS.PAID, PAYMENT_STATUS.PENDING] }, $and: [{ paymentStatus: { $ne: PAYMENT_STATUS.REFUNDED } }] } }, { $group: { _id: null, total: { $sum: '$totalPrice' } } }]),
      User.countDocuments({ role: ROLES.CUSTOMER }),
      Order.find({ orderStatus: { $nin: [ORDER_STATUS.PENDING_PAYMENT] } }).sort({ createdAt: -1 }).limit(10).select('orderNumber customerName totalPrice orderStatus paymentMethod paymentStatus createdAt').lean(),
      Product.find({ active: true, stock: { $lte: 10 } }).sort({ stock: 1 }).limit(10).select('name stock price discountPrice images').lean(),
      Order.aggregate([{ $match: { orderStatus: { $nin: [ORDER_STATUS.PENDING_PAYMENT] } } }, { $group: { _id: '$orderStatus', count: { $sum: 1 } } }]),
      Order.aggregate([{ $match: { createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)), $lte: new Date(new Date().setHours(23, 59, 59, 999)) }, orderStatus: { $nin: excludedStatuses }, paymentStatus: { $in: [PAYMENT_STATUS.PAID, PAYMENT_STATUS.PENDING] }, $and: [{ paymentStatus: { $ne: PAYMENT_STATUS.REFUNDED } }] } }, { $group: { _id: null, revenue: { $sum: '$totalPrice' }, orders: { $sum: 1 } } }]),
      Order.countDocuments({ 'cancellationRequest.status': 'Pending' }),
    ]);

    const statusMap = {};
    ordersByStatus.forEach(({ _id, count }) => { statusMap[_id] = count; });

    return res.status(200).json({
      success: true,
      data: {
        stats: { totalOrders, totalSales: salesResult[0]?.total || 0, totalCustomers, todayRevenue: todayResult[0]?.revenue || 0, todayOrders: todayResult[0]?.orders || 0, pendingCancelRequests },
        ordersByStatus: statusMap, recentOrders, lowStockProducts
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getSalesAnalytics = async (req, res) => {
  try {
    const days = Math.min(Math.max(Number(req.query.days) || 30, 7), 365);
    const startDate = new Date(); startDate.setDate(startDate.getDate() - (days - 1)); startDate.setHours(0, 0, 0, 0);
    const excludedStatuses = [ORDER_STATUS.PENDING_PAYMENT, ORDER_STATUS.CANCELLED];

    const [dailySales, topProducts, paymentMethodSplit, monthlySales] = await Promise.all([
      Order.aggregate([{ $match: { createdAt: { $gte: startDate }, orderStatus: { $nin: excludedStatuses }, paymentStatus: { $in: [PAYMENT_STATUS.PAID, PAYMENT_STATUS.PENDING] }, $and: [{ paymentStatus: { $ne: PAYMENT_STATUS.REFUNDED } }] } }, { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' }, day: { $dayOfMonth: '$createdAt' } }, revenue: { $sum: '$totalPrice' }, orders: { $sum: 1 } } }, { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }]),
      Order.aggregate([{ $match: { orderStatus: { $nin: excludedStatuses }, paymentStatus: { $in: [PAYMENT_STATUS.PAID, PAYMENT_STATUS.PENDING] }, $and: [{ paymentStatus: { $ne: PAYMENT_STATUS.REFUNDED } }] } }, { $unwind: '$orderItems' }, { $group: { _id: '$orderItems.product', name: { $first: '$orderItems.name' }, totalRevenue: { $sum: { $multiply: ['$orderItems.price', '$orderItems.quantity'] } }, totalQuantity: { $sum: '$orderItems.quantity' } } }, { $sort: { totalRevenue: -1 } }, { $limit: 5 }]),
      Order.aggregate([{ $match: { orderStatus: { $nin: excludedStatuses } } }, { $group: { _id: '$paymentMethod', count: { $sum: 1 }, revenue: { $sum: '$totalPrice' } } }]),
      Order.aggregate([{ $match: { createdAt: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 5, 1)) }, orderStatus: { $nin: excludedStatuses }, paymentStatus: { $in: [PAYMENT_STATUS.PAID, PAYMENT_STATUS.PENDING] }, $and: [{ paymentStatus: { $ne: PAYMENT_STATUS.REFUNDED } }] } }, { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, revenue: { $sum: '$totalPrice' }, orders: { $sum: 1 } } }, { $sort: { '_id.year': 1, '_id.month': 1 } }]),
    ]);
    return res.status(200).json({ success: true, data: { dailySales, topProducts, paymentMethodSplit, monthlySales } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getLowStockProducts = async (req, res) => {
  try {
    const threshold = Math.max(Number(req.query.threshold) || 10, 0);
    const products = await Product.find({ active: true, stock: { $lte: threshold } }).sort({ stock: 1 }).populate('category', 'name slug').select('name slug stock price discountPrice images category').lean();
    return res.status(200).json({ success: true, threshold, count: products.length, data: products });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getCustomers = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;
    const filter = { role: ROLES.CUSTOMER };

    if (req.query.blocked === 'true') filter.isBlocked = true;
    if (req.query.blocked === 'false') filter.isBlocked = false;
    if (req.query.search && req.query.search.trim()) {
      const q = req.query.search.trim();
      filter.$or = [{ name: { $regex: q, $options: 'i' } }, { email: { $regex: q, $options: 'i' } }, { phone: { $regex: q, $options: 'i' } }];
    }

    const [customers, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).select('-password').lean(),
      User.countDocuments(filter),
    ]);

    const stats = await Order.aggregate([{ $match: { user: { $in: customers.map(c => c._id) }, orderStatus: { $nin: [ORDER_STATUS.PENDING_PAYMENT, ORDER_STATUS.CANCELLED] }, paymentStatus: { $ne: PAYMENT_STATUS.REFUNDED } } }, { $group: { _id: '$user', orderCount: { $sum: 1 }, totalSpend: { $sum: '$totalPrice' }, lastOrderAt: { $max: '$createdAt' } } }]);
    const statsMap = {}; stats.forEach(s => { statsMap[s._id.toString()] = s; });

    const enriched = customers.map(c => ({
      ...c,
      orderCount: statsMap[c._id.toString()]?.orderCount || 0,
      totalSpend: statsMap[c._id.toString()]?.totalSpend || 0,
      lastOrderAt: statsMap[c._id.toString()]?.lastOrderAt || null,
    }));
    return res.status(200).json({ success: true, pagination: { total, page, pages: Math.ceil(total / limit) }, data: enriched });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getCustomerById = async (req, res) => {
  try {
    const customer = await User.findById(req.params.id).select('-password').lean();
    if (!customer || customer.role !== ROLES.CUSTOMER) return res.status(404).json({ success: false, message: 'Customer not found' });

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const [orders, totalOrders, spendResult] = await Promise.all([
      Order.find({ user: customer._id }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Order.countDocuments({ user: customer._id }),
      Order.aggregate([{ $match: { user: customer._id, orderStatus: { $nin: [ORDER_STATUS.PENDING_PAYMENT, ORDER_STATUS.CANCELLED] }, paymentStatus: { $ne: PAYMENT_STATUS.REFUNDED } } }, { $group: { _id: null, totalSpend: { $sum: '$totalPrice' } } }])
    ]);

    return res.status(200).json({ success: true, data: { customer, orders, pagination: { total: totalOrders, page, pages: Math.ceil(totalOrders / limit) }, stats: { orderCount: totalOrders, totalSpend: spendResult[0]?.totalSpend || 0 } } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const toggleBlockCustomer = async (req, res) => {
  try {
    const customer = await User.findById(req.params.id);
    if (!customer || customer.role !== ROLES.CUSTOMER) return res.status(404).json({ success: false, message: 'Customer not found' });
    customer.isBlocked = !customer.isBlocked;
    await customer.save();
    return res.status(200).json({ success: true, message: `Customer account updated successfully.` });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getCancelRequests = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;
    const statusFilter = req.query.status || 'Pending';
    const query = statusFilter === 'all' ? { 'cancellationRequest.status': { $exists: true } } : { 'cancellationRequest.status': statusFilter };

    const [orders, total] = await Promise.all([
      Order.find(query).sort({ 'cancellationRequest.requestedAt': -1 }).skip(skip).limit(limit).populate('user', 'name email phone').select('orderNumber customerName customerEmail customerPhone orderStatus paymentMethod totalPrice cancellationRequest createdAt user').lean(),
      Order.countDocuments(query),
    ]);

    return res.status(200).json({ success: true, pagination: { total, page, pages: Math.ceil(total / limit) }, data: orders });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};