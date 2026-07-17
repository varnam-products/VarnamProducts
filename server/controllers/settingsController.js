import Settings from '../models/Settings.js';

export const getSettingsDocument = async () => {
  let settings = await Settings.findOne().lean();
  if (!settings) {
    const created = await Settings.create({});
    settings = created.toObject();
  }
  return settings;
};

export const getPublicSettings = async (req, res) => {
  try {
    const settings = await getSettingsDocument();

    return res.status(200).json({
      success: true,
      data: {
        freeShippingThreshold: settings.freeShippingThreshold,
        flatShippingFee: settings.flatShippingFee,
        codLimit: settings.codLimit,
        codEnabled: settings.codEnabled,
        storeName: settings.storeName,
        storeEmail: settings.storeEmail,
        storePhone: settings.storePhone,
        socialLinks: settings.socialLinks,
        address: settings.address,
        workingHours: settings.workingHours,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
};

// Public — checkout page calls this when the customer enters a code. Only ever returns
// info for the ONE code being checked, never the full coupons list, so this endpoint
// can't be used to enumerate/scrape every active coupon.
export const validateCoupon = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code || !String(code).trim()) {
      return res.status(400).json({ success: false, message: 'Coupon code is required' });
    }

    const settings = await getSettingsDocument();
    const normalized = String(code).trim().toUpperCase();
    const matched = (settings.coupons || []).find((c) => c.code === normalized && c.active);

    if (!matched) {
      return res.status(404).json({ success: false, message: 'Invalid or expired coupon code' });
    }

    return res.status(200).json({
      success: true,
      data: {
        name: matched.name,
        code: matched.code,
        discountPercentage: matched.discountPercentage,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
};

export const getSettings = async (req, res) => {
  try {
    const settings = await getSettingsDocument();
    return res.status(200).json({ success: true, data: settings });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
};

export const updateSettings = async (req, res) => {
  try {
    const {
      freeShippingThreshold,
      flatShippingFee,
      codLimit,
      codEnabled,
      storeName,
      storeEmail,
      storePhone,
      socialLinks,
      address,
      workingHours,
      coupons,
    } = req.body;

    const updates = {};
    if (freeShippingThreshold !== undefined) updates.freeShippingThreshold = Number(freeShippingThreshold);
    if (flatShippingFee !== undefined) updates.flatShippingFee = Number(flatShippingFee);
    if (codLimit !== undefined) updates.codLimit = Number(codLimit);
    if (codEnabled !== undefined) updates.codEnabled = Boolean(codEnabled);
    if (storeName !== undefined) updates.storeName = storeName;
    if (storeEmail !== undefined) updates.storeEmail = storeEmail;
    if (storePhone !== undefined) updates.storePhone = storePhone;

    if (socialLinks !== undefined && typeof socialLinks === 'object') {
      updates.socialLinks = {
        facebook: socialLinks.facebook?.trim?.() || '',
        instagram: socialLinks.instagram?.trim?.() || '',
        whatsapp: socialLinks.whatsapp?.trim?.() || '',
      };
    }

    if (address !== undefined && typeof address === 'object') {
      updates.address = {
        line1: address.line1?.trim?.() || '',
        line2: address.line2?.trim?.() || '',
        city: address.city?.trim?.() || '',
        state: address.state?.trim?.() || '',
        pincode: address.pincode?.trim?.() || '',
        country: address.country?.trim?.() || 'India',
      };
    }

    if (workingHours !== undefined) updates.workingHours = String(workingHours);

    if (coupons !== undefined) {
      if (!Array.isArray(coupons)) {
        return res.status(400).json({ success: false, message: 'coupons must be an array' });
      }
      if (coupons.length > 3) {
        return res.status(400).json({ success: false, message: 'You can only have up to 3 coupon codes' });
      }

      const seenCodes = new Set();
      const normalizedCoupons = [];
      for (const coupon of coupons) {
        const name = coupon?.name?.trim?.();
        const code = coupon?.code?.trim?.().toUpperCase?.();
        const discountPercentage = Number(coupon?.discountPercentage);
        const active = coupon?.active !== undefined ? Boolean(coupon.active) : true;

        if (!name) return res.status(400).json({ success: false, message: 'Every coupon needs a name' });
        if (!code) return res.status(400).json({ success: false, message: 'Every coupon needs a code' });
        if (isNaN(discountPercentage) || discountPercentage < 1 || discountPercentage > 100) {
          return res.status(400).json({
            success: false,
            message: `Coupon "${code}" must have a discount percentage between 1 and 100`,
          });
        }
        if (seenCodes.has(code)) {
          return res.status(400).json({ success: false, message: `Duplicate coupon code: ${code}` });
        }
        seenCodes.add(code);
        normalizedCoupons.push({ name, code, discountPercentage, active });
      }
      updates.coupons = normalizedCoupons;
    }

    const numericFields = ['freeShippingThreshold', 'flatShippingFee', 'codLimit'];
    for (const field of numericFields) {
      if (updates[field] !== undefined && (isNaN(updates[field]) || updates[field] < 0)) {
        return res.status(400).json({
          success: false,
          message: `${field} must be a non-negative number`,
        });
      }
    }

    const needsCrossCheck =
      updates.flatShippingFee !== undefined || updates.freeShippingThreshold !== undefined;

    if (needsCrossCheck) {
      const current = await getSettingsDocument();

      const finalFlatFee = updates.flatShippingFee ?? current.flatShippingFee;
      const finalThreshold = updates.freeShippingThreshold ?? current.freeShippingThreshold;

      if (finalFlatFee > finalThreshold) {
        return res.status(400).json({
          success: false,
          message: `flatShippingFee (₹${finalFlatFee}) cannot exceed freeShippingThreshold (₹${finalThreshold}). Orders below the threshold would be charged more than the free shipping cutoff.`,
        });
      }
    }

    const settings = await Settings.findOneAndUpdate(
      {},
      { $set: updates },
      { new: true, upsert: true, runValidators: true }
    );

    return res.status(200).json({ success: true, data: settings });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
};