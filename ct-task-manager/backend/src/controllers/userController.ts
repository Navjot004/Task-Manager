import { Request, Response } from 'express';
import User from '../models/User';
import StaffAssignment from '../models/StaffAssignment';

// GET /api/users
export const getUsers = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const role = req.query.role as string;
    const status = req.query.status as string;
    const unassignedOnly = req.query.unassignedOnly === 'true';

    const query: any = {};

    // Search
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { universityId: searchRegex },
      ];
    }

    // Role filter
    if (role && role !== 'All') {
      if (role.includes(',')) {
        query.role = { $in: role.split(',') };
      } else {
        query.role = role;
      }
    }

    // Status filter
    if (status && status !== 'All') {
      query.isActive = status === 'Active';
    }

    // Unassigned only filter
    if (unassignedOnly) {
      const activeAssignments = await StaffAssignment.find({ isActive: true }).select('staffId');
      const assignedStaffIds = activeAssignments.map(a => a.staffId);
      query._id = { $nin: assignedStaffIds };
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    console.log('GET /api/users query:', query);
    console.log('GET /api/users result length:', users.length);

    return res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// GET /api/users/stats
export const getUserStats = async (req: Request, res: Response) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const inactiveUsers = await User.countDocuments({ isActive: false });
    const superAdmins = await User.countDocuments({ role: 'super_admin' });
    const departmentAdmins = await User.countDocuments({ role: 'department_admin' });
    const staff = await User.countDocuments({ role: 'staff' });

    return res.status(200).json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        inactiveUsers,
        superAdmins,
        departmentAdmins,
        staff,
      },
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// GET /api/users/:id
export const getUserById = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    return res.status(200).json({ success: true, data: { user } });
  } catch (error) {
    console.error('Error fetching user by id:', error);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// PATCH /api/users/:id/role
export const updateUserRole = async (req: Request, res: Response) => {
  try {
    const { role, department } = req.body;
    const userId = req.params.id;

    // Validate role
    const validRoles = ['super_admin', 'department_admin', 'staff'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role.' });
    }

    const userToUpdate = await User.findById(userId);
    if (!userToUpdate) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Safety: Prevent removing the last super admin
    if (userToUpdate.role === 'super_admin' && role !== 'super_admin') {
      const superAdminCount = await User.countDocuments({ role: 'super_admin' });
      if (superAdminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: 'At least one Super Admin must remain.',
        });
      }
    }

    const oldRole = userToUpdate.role;
    userToUpdate.role = role;
    
    // Update department if provided (useful for promoting staff to department_admin)
    if (department !== undefined) {
      userToUpdate.department = department;
    }
    
    await userToUpdate.save();

    // Handle Single Admin Per Department rule
    if (role === 'department_admin' && userToUpdate.department) {
      // Find if there's already an admin for this department
      const existingAdmin = await User.findOne({
        role: 'department_admin',
        department: userToUpdate.department,
        _id: { $ne: userToUpdate._id }
      });

      if (existingAdmin) {
        // Demote existing admin to staff
        existingAdmin.role = 'staff';
        await existingAdmin.save();

        // Transfer their team (active staff assignments) to the new admin
        await StaffAssignment.updateMany(
          { adminId: existingAdmin._id, isActive: true },
          { $set: { adminId: userToUpdate._id } }
        );
      }
    }

    // Cascading side-effects for Staff Assignment
    if (oldRole === 'department_admin' && role !== 'department_admin') {
      // Deactivate all staff assignments where this user was the admin
      // Note: If they were demoted because someone else was promoted, their team was already transferred above.
      // This mainly applies to manual demotions by Super Admin.
      await StaffAssignment.updateMany(
        { adminId: userId, isActive: true },
        { $set: { isActive: false } }
      );
    } else if (oldRole === 'staff' && role !== 'staff') {
      // Deactivate any active staff assignment for this staff
      await StaffAssignment.updateMany(
        { staffId: userId, isActive: true },
        { $set: { isActive: false } }
      );
    }

    return res.status(200).json({
      success: true,
      message: 'User role updated successfully.',
      data: { user: await User.findById(userId).select('-passwordHash') },
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// PATCH /api/users/:id/status
export const updateUserStatus = async (req: Request, res: Response) => {
  try {
    const { isActive } = req.body;
    const userId = req.params.id;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ success: false, message: 'Invalid status value.' });
    }

    const userToUpdate = await User.findById(userId);
    if (!userToUpdate) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Optional safety: Prevent super admin from deactivating themselves? 
    // The prompt does not explicitly forbid it, but says we cannot delete. 
    // Usually a good idea to prevent deactivating the last super_admin as well.
    if (userToUpdate.role === 'super_admin' && !isActive) {
      const superAdminCount = await User.countDocuments({ role: 'super_admin', isActive: true });
      if (superAdminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: 'At least one active Super Admin must remain.',
        });
      }
    }

    userToUpdate.isActive = isActive;
    await userToUpdate.save();

    // Cascading side-effects
    if (!isActive) {
      if (userToUpdate.role === 'department_admin') {
        await StaffAssignment.updateMany(
          { adminId: userId, isActive: true },
          { $set: { isActive: false } }
        );
      } else if (userToUpdate.role === 'staff') {
        await StaffAssignment.updateMany(
          { staffId: userId, isActive: true },
          { $set: { isActive: false } }
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully.`,
      data: { user: await User.findById(userId).select('-passwordHash') },
    });
  } catch (error) {
    console.error('Error updating user status:', error);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};
