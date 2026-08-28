import { Request, Response } from 'express';
import Department from '../models/Department';
import User from '../models/User';

// GET /api/departments
export const getDepartments = async (req: Request, res: Response) => {
  try {
    const departments = await Department.find().sort({ name: 1 });
    res.json({ success: true, data: { departments } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/departments
export const createDepartment = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, message: 'Department name is required' });
    }

    const existing = await Department.findOne({ name: name.trim() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Department already exists' });
    }

    const newDepartment = new Department({ name: name.trim() });
    await newDepartment.save();

    res.status(201).json({ success: true, message: 'Department created', data: { department: newDepartment } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/departments/:id
export const deleteDepartment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const department = await Department.findById(id);

    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    // Optional: check if users are assigned to this department
    const usersInDept = await User.countDocuments({ department: department.name });
    if (usersInDept > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot delete department because ${usersInDept} users are assigned to it.` 
      });
    }

    await Department.findByIdAndDelete(id);
    res.json({ success: true, message: 'Department deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
