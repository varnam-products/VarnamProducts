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