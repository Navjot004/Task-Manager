import { Request, Response } from 'express';
import SystemSetting from '../models/SystemSetting';

const DEFAULT_SETTINGS = {
  systemName: 'Task-Manage',
  logoUrl: null,
  logoShape: 'square', // 'circle' | 'square' | 'rectangle'
  logoSize: 'medium'   // 'small' | 'medium' | 'large'
};

// GET /api/settings
export const getSettings = async (req: Request, res: Response) => {
  try {
    const settingDocs = await SystemSetting.find();
    const settings: Record<string, any> = { ...DEFAULT_SETTINGS };

    settingDocs.forEach((doc) => {
      settings[doc.key] = doc.value;
    });

    return res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching settings' });
  }
};

// PATCH /api/settings
export const updateSettings = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user || user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Forbidden. Only Super Admin can change system settings.' });
    }

    const { systemName, logoUrl, logoShape, logoSize } = req.body;

    if (systemName !== undefined) {
      const trimmedName = String(systemName).trim();
      if (!trimmedName) {
        return res.status(400).json({ success: false, message: 'System name cannot be empty.' });
      }

      await SystemSetting.findOneAndUpdate(
        { key: 'systemName' },
        { value: trimmedName, updatedBy: user._id },
        { upsert: true, new: true }
      );
    }

    if (logoUrl !== undefined) {
      await SystemSetting.findOneAndUpdate(
        { key: 'logoUrl' },
        { value: logoUrl, updatedBy: user._id },
        { upsert: true, new: true }
      );
    }

    if (logoShape !== undefined) {
      const validShapes = ['circle', 'square', 'rectangle'];
      if (validShapes.includes(logoShape)) {
        await SystemSetting.findOneAndUpdate(
          { key: 'logoShape' },
          { value: logoShape, updatedBy: user._id },
          { upsert: true, new: true }
        );
      }
    }

    if (logoSize !== undefined) {
      const validSizes = ['small', 'medium', 'large'];
      if (validSizes.includes(logoSize)) {
        await SystemSetting.findOneAndUpdate(
          { key: 'logoSize' },
          { value: logoSize, updatedBy: user._id },
          { upsert: true, new: true }
        );
      }
    }

    // Return all updated settings
    const settingDocs = await SystemSetting.find();
    const settings: Record<string, any> = { ...DEFAULT_SETTINGS };
    settingDocs.forEach((doc) => {
      settings[doc.key] = doc.value;
    });

    return res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      data: settings
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    return res.status(500).json({ success: false, message: 'Server error updating settings' });
  }
};
