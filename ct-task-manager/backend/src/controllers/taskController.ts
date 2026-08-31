import { Request, Response } from 'express';
import Task from '../models/Task';
import User from '../models/User';
import StaffAssignment from '../models/StaffAssignment';
import mongoose from 'mongoose';

/** Helper to check if a Department Admin can assign/manage a specific staff member */
const checkAdminStaffPermission = async (adminId: string, staffId: string) => {
  if (adminId === staffId) return true; // Can assign to self
  
  const assignment = await StaffAssignment.findOne({
    adminId,
    staffId,
    isActive: true
  });
  return !!assignment;
};

// POST /api/tasks
export const createTask = async (req: Request, res: Response) => {
  try {
    const { title, description, deadline, assignedTo } = req.body;
    let { requiredCompletionExtensions, isSubtask, parentTaskId } = req.body;
    const user = req.user;

    // Staff cannot create tasks
    if (user.role === 'staff') {
      return res.status(403).json({ success: false, message: 'Forbidden. Staff cannot create tasks.' });
    }

    if (!title || !description || !deadline) {
      return res.status(400).json({ success: false, message: 'Title, description, and deadline are required.' });
    }

    const parsedDeadline = new Date(deadline);
    if (isNaN(parsedDeadline.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid deadline date.' });
    }

    let parsedExtensions: string[] = [];
    if (requiredCompletionExtensions) {
      try {
        parsedExtensions = JSON.parse(requiredCompletionExtensions);
      } catch (e) {
        // If not a JSON string, it might just be a comma-separated string or array
        if (Array.isArray(requiredCompletionExtensions)) {
          parsedExtensions = requiredCompletionExtensions;
        } else if (typeof requiredCompletionExtensions === 'string') {
          parsedExtensions = requiredCompletionExtensions.split(',').map(s => s.trim());
        }
      }
    }

    let workflowType = undefined;
    let finalAssignee = null;
    let parsedIsSubtask = isSubtask === 'true' || isSubtask === true;

    if (parsedIsSubtask) {
      if (!parentTaskId) {
        return res.status(400).json({ success: false, message: 'Parent Task is required for subtasks.' });
      }
      const parent = await Task.findById(parentTaskId);
      if (!parent || parent.isSubtask) {
        return res.status(400).json({ success: false, message: 'Invalid Parent Task.' });
      }
    }

    if (assignedTo) {
      const targetUser = await User.findById(assignedTo);
      if (!targetUser || !targetUser.isActive) {
        return res.status(400).json({ success: false, message: 'Target assigned user is invalid or inactive.' });
      }

      if (user.role === 'super_admin') {
        finalAssignee = assignedTo;
        if (targetUser.role === 'department_admin') {
          workflowType = 'department_admin';
        } else {
          workflowType = 'super_admin_direct';
        }
      } else if (user.role === 'department_admin') {
        const hasPermission = await checkAdminStaffPermission(user._id.toString(), assignedTo);
        if (!hasPermission) {
          return res.status(403).json({ success: false, message: 'Forbidden. You can only assign tasks to yourself or your active staff.' });
        }
        finalAssignee = assignedTo;
        workflowType = 'department_admin';
      }
    } else {
      // Unassigned
      if (user.role === 'department_admin') {
        workflowType = 'department_admin';
      }
    }

    // Handle File Uploads via GridFSBucket
    const attachmentIds: mongoose.Types.ObjectId[] = [];
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      const db = mongoose.connection.db;
      if (db) {
        const bucket = new mongoose.mongo.GridFSBucket(db, {
          bucketName: 'attachments'
        });
        
        for (const file of req.files) {
          await new Promise<void>((resolve, reject) => {
            const uploadStream = bucket.openUploadStream(file.originalname, {
              contentType: file.mimetype
            });
            uploadStream.end(file.buffer);
            uploadStream.on('finish', () => {
              attachmentIds.push(uploadStream.id as mongoose.Types.ObjectId);
              resolve();
            });
            uploadStream.on('error', reject);
          });
        }
      }
    }

    const task = new Task({
      title,
      description,
      deadline: parsedDeadline,
      createdBy: user._id,
      assignedTo: finalAssignee,
      workflowType,
      attachments: attachmentIds,
      requiredCompletionExtensions: parsedExtensions,
      isSubtask: parsedIsSubtask,
      parentTaskId: parsedIsSubtask ? parentTaskId : null
    });

    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate('createdBy', 'name role')
      .populate('assignedTo', 'name role department')
      .populate('parentTaskId', 'taskId title');

    return res.status(201).json({ success: true, data: { task: populatedTask } });
  } catch (error) {
    console.error('Error creating task:', error);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// GET /api/tasks
export const getTasks = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const status = req.query.status as string;
    const assignee = req.query.assignee as string;

    const workflow = req.query.workflow as string;
    const reviewStage = req.query.reviewStage as string;
    const taskType = req.query.taskType as string; // 'All', 'main', 'subtask'

    const query: any = {};
    const user = req.user;

    // Build visibility query based on role
    if (user.role === 'staff') {
      // Staff can only see tasks assigned to them
      query.assignedTo = user._id;
    } else if (user.role === 'department_admin') {
      // Department admin sees tasks they created, assigned to them, or assigned to their staff
      const myStaffAssignments = await StaffAssignment.find({ adminId: user._id, isActive: true });
      const myStaffIds = myStaffAssignments.map(a => a.staffId);
      
      query.$or = [
        { createdBy: user._id },
        { assignedTo: user._id },
        { assignedTo: { $in: myStaffIds } }
      ];
    }
    // super_admin sees all by default

    // Filters
    if (status && status !== 'All') {
      query.status = status;
    }
    
    if (workflow && workflow !== 'All') {
      query.workflowType = workflow;
    }
    
    if (reviewStage && reviewStage !== 'All') {
      if (reviewStage === 'Pending Review') {
        query.status = 'submitted_for_review';
      } else {
        query.reviewStage = reviewStage;
      }
    }
    
    if (taskType === 'main') {
      query.isSubtask = false;
    } else if (taskType === 'subtask') {
      query.isSubtask = true;
    }

    if (assignee) {
      if (assignee === 'Unassigned') {
        query.assignedTo = null;
      } else if (assignee !== 'All') {
        // Only apply if it doesn't conflict with visibility constraints
        if (query.$or) {
          query.$and = [{ $or: query.$or }, { assignedTo: assignee }];
          delete query.$or;
        } else {
          query.assignedTo = assignee;
        }
      }
    }

    // Search
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      const searchCond = {
        $or: [{ title: searchRegex }, { description: searchRegex }]
      };
      
      if (query.$and) {
        query.$and.push(searchCond);
      } else if (query.$or) {
        query.$and = [{ $or: query.$or }, searchCond];
        delete query.$or;
      } else {
        Object.assign(query, searchCond);
      }
    }

    const total = await Task.countDocuments(query);
    const tasks = await Task.find(query)
      .populate('createdBy', 'name role')
      .populate('assignedTo', 'name role department')
      .populate('parentTaskId', 'taskId title')
      .sort({ deadline: 1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return res.status(200).json({
      success: true,
      data: {
        tasks,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
      }
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// GET /api/tasks/:id
export const getTaskById = async (req: Request, res: Response) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('createdBy', 'name role')
      .populate('assignedTo', 'name role department')
      .populate('parentTaskId', 'taskId title');
      
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    // Enforce visibility
    const user = req.user;
    let allowed = false;

    if (user.role === 'super_admin') {
      allowed = true;
    } else if (user.role === 'staff') {
      allowed = !!(task.assignedTo && task.assignedTo._id.toString() === user._id.toString());
    } else if (user.role === 'department_admin') {
      if (task.createdBy._id.toString() === user._id.toString()) allowed = true;
      else if (task.assignedTo && task.assignedTo._id.toString() === user._id.toString()) allowed = true;
      else if (task.assignedTo) {
        const hasPerm = await checkAdminStaffPermission(user._id.toString(), task.assignedTo._id.toString());
        if (hasPerm) allowed = true;
      }
    }

    if (!allowed) {
      return res.status(403).json({ success: false, message: 'Forbidden. You do not have access to this task.' });
    }

    return res.status(200).json({ success: true, data: { task } });
  } catch (error) {
    console.error('Error fetching task:', error);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// PATCH /api/tasks/:id
export const updateTask = async (req: Request, res: Response) => {
  try {
    const { title, description, deadline } = req.body;
    const user = req.user;

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    // Authorization
    if (user.role === 'staff') {
      return res.status(403).json({ success: false, message: 'Forbidden. Staff cannot edit task content.' });
    } else if (user.role === 'department_admin') {
      if (task.createdBy.toString() !== user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Forbidden. Department Admin can only edit tasks they created.' });
      }
    }

    if (title) task.title = title;
    if (description) task.description = description;
    if (deadline) {
      const pd = new Date(deadline);
      if (!isNaN(pd.getTime())) task.deadline = pd;
    }

    await task.save();

    return res.status(200).json({ success: true, data: { task } });
  } catch (error) {
    console.error('Error updating task:', error);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// PATCH /api/tasks/:id/assign
export const assignTask = async (req: Request, res: Response) => {
  try {
    const { assignedTo } = req.body;
    const user = req.user;

    if (user.role === 'staff') {
      return res.status(403).json({ success: false, message: 'Forbidden. Staff cannot assign tasks.' });
    }

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    if (assignedTo === null) {
      // Unassign
      if (user.role === 'department_admin') {
        const canUnassign = 
          task.createdBy.toString() === user._id.toString() ||
          (task.assignedTo && task.assignedTo.toString() === user._id.toString()) ||
          (task.assignedTo && await checkAdminStaffPermission(user._id.toString(), task.assignedTo.toString()));
          
        if (!canUnassign) {
          return res.status(403).json({ success: false, message: 'Forbidden. Cannot unassign this task.' });
        }
      }
      task.assignedTo = null;
    } else {
      // Assign
      const targetUser = await User.findById(assignedTo);
      if (!targetUser || !targetUser.isActive) {
        return res.status(400).json({ success: false, message: 'Target user is invalid or inactive.' });
      }

      if (user.role === 'department_admin') {
        const hasPermission = await checkAdminStaffPermission(user._id.toString(), assignedTo);
        if (!hasPermission) {
          return res.status(403).json({ success: false, message: 'Forbidden. Can only assign to yourself or your active staff.' });
        }
        
        // Ensure dept admin can actually touch this task
        const canTouch = 
          task.createdBy.toString() === user._id.toString() ||
          (task.assignedTo && task.assignedTo.toString() === user._id.toString()) ||
          (task.assignedTo && await checkAdminStaffPermission(user._id.toString(), task.assignedTo.toString()));
          
        if (!canTouch && task.assignedTo !== null) {
            return res.status(403).json({ success: false, message: 'Forbidden. Cannot manipulate a task outside your permission scope.' });
        }
      } else if (user.role === 'super_admin') {
        // If workflowType is missing (migration) or it's unassigned, figure it out
        if (!task.workflowType) {
          if (targetUser.role === 'department_admin') {
            task.workflowType = 'department_admin';
          } else {
            task.workflowType = 'super_admin_direct';
          }
        }
      }

      // If workflowType is missing for a Dept Admin created task, assume it's department_admin
      if (!task.workflowType && (user.role === 'department_admin' || task.createdBy.toString() === user._id.toString())) {
        task.workflowType = 'department_admin';
      }

      task.assignedTo = assignedTo;
    }

    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate('createdBy', 'name role')
      .populate('assignedTo', 'name role department')
      .populate('parentTaskId', 'taskId title');

    return res.status(200).json({ success: true, data: { task: populatedTask } });
  } catch (error) {
    console.error('Error assigning task:', error);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// PATCH /api/tasks/:id/status
export const updateTaskStatus = async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const user = req.user;

    const validStatuses = ['pending', 'in_progress', 'completed']; // Expandable later
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    // Authorization
    if (user.role === 'staff') {
      if (!task.assignedTo || task.assignedTo.toString() !== user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Forbidden. Can only change status of your assigned tasks.' });
      }
    } else if (user.role === 'department_admin') {
      const canChange = 
        task.createdBy.toString() === user._id.toString() ||
        (task.assignedTo && task.assignedTo.toString() === user._id.toString()) ||
        (task.assignedTo && await checkAdminStaffPermission(user._id.toString(), task.assignedTo.toString()));
        
      if (!canChange) {
        return res.status(403).json({ success: false, message: 'Forbidden. Cannot change status of this task.' });
      }
    }
    
    // Subtask check: If marking completed, check if all subtasks are approved
    if (status === 'completed' && !task.isSubtask) {
      const unapprovedSubtasks = await Task.countDocuments({
        parentTaskId: task._id,
        isSubtask: true,
        status: { $ne: 'approved' }
      });
      if (unapprovedSubtasks > 0) {
        return res.status(400).json({ success: false, message: 'All subtasks must be approved before completing the main task.' });
      }
    }

    task.status = status;
    await task.save();

    return res.status(200).json({ success: true, data: { task } });
  } catch (error) {
    console.error('Error updating task status:', error);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// PATCH /api/tasks/:id/submit-review
export const submitReview = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    const task = await Task.findById(req.params.id);
    
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    
    if (!task.assignedTo || task.assignedTo.toString() !== user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden. Only the assignee can submit a task for review.' });
    }

    if (task.status !== 'completed' && task.status !== 'in_progress') {
      return res.status(400).json({ success: false, message: 'Task must be in progress or completed before submission.' });
    }

    // Validate required extensions if any
    if (task.requiredCompletionExtensions && task.requiredCompletionExtensions.length > 0) {
      const files = req.files as Express.Multer.File[] || [];
      const fileExts = files.map(f => {
        const parts = f.originalname.split('.');
        return '.' + parts[parts.length - 1].toLowerCase();
      });

      // Check if all required extensions are met, OR at least the files provided match the required extensions.
      // Usually, it means "If there are required extensions, the uploaded files must have those extensions."
      // Let's ensure every uploaded file has an allowed extension (if restricted) and maybe at least one file is uploaded if required.
      if (files.length === 0) {
        return res.status(400).json({ success: false, message: `Attachments required with formats: ${task.requiredCompletionExtensions.join(', ')}` });
      }

      for (const ext of fileExts) {
        if (!task.requiredCompletionExtensions.includes(ext)) {
          return res.status(400).json({ 
            success: false, 
            message: `Invalid file format: ${ext}. Allowed formats are: ${task.requiredCompletionExtensions.join(', ')}` 
          });
        }
      }
    }

    // Handle File Uploads via GridFSBucket for completionAttachments
    const attachmentIds: mongoose.Types.ObjectId[] = [];
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      const db = mongoose.connection.db;
      if (db) {
        const bucket = new mongoose.mongo.GridFSBucket(db, {
          bucketName: 'attachments'
        });
        
        for (const file of req.files) {
          await new Promise<void>((resolve, reject) => {
            const uploadStream = bucket.openUploadStream(file.originalname, {
              contentType: file.mimetype
            });
            uploadStream.end(file.buffer);
            uploadStream.on('finish', () => {
              attachmentIds.push(uploadStream.id as mongoose.Types.ObjectId);
              resolve();
            });
            uploadStream.on('error', reject);
          });
        }
      }
    }

    task.completionAttachments = [...(task.completionAttachments || []), ...attachmentIds];
    task.status = 'submitted_for_review';
    task.reviewRequestedBy = user._id;

    if (task.workflowType === 'super_admin_direct') {
      task.reviewStage = 'super_admin';
      task.currentReviewer = task.createdBy; 
    } else if (task.workflowType === 'department_admin') {
      const creator = await User.findById(task.createdBy);
      task.reviewStage = (creator && creator.role === 'super_admin') ? 'super_admin' : 'department_admin';
      task.currentReviewer = task.createdBy;
    } else {
      // Fallback
      task.reviewStage = 'super_admin';
      task.currentReviewer = task.createdBy;
    }

    await task.save();

    return res.status(200).json({ success: true, data: { task } });
  } catch (error) {
    console.error('Error submitting review:', error);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// PATCH /api/tasks/:id/review
export const reviewTask = async (req: Request, res: Response) => {
  try {
    const { decision, reason } = req.body;
    const user = req.user;

    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({ success: false, message: 'Invalid decision.' });
    }

    if (decision === 'rejected' && !reason) {
      return res.status(400).json({ success: false, message: 'Reason is required for rejection.' });
    }

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    if (task.status !== 'submitted_for_review') {
      return res.status(400).json({ success: false, message: 'Task is not pending review.' });
    }

    // Authorization
    if (user.role !== 'super_admin') {
      if (task.reviewStage === 'super_admin') {
        return res.status(403).json({ success: false, message: 'Forbidden. Only Super Admin can perform final review.' });
      } else if (task.reviewStage === 'department_admin') {
        if (!task.currentReviewer || task.currentReviewer.toString() !== user._id.toString()) {
          return res.status(403).json({ success: false, message: 'Forbidden. You are not the reviewer for this task.' });
        }
      } else {
        return res.status(400).json({ success: false, message: 'Invalid review stage.' });
      }
    }
    
    // Subtask check: If approving a parent task, check if all subtasks are approved
    if (decision === 'approved' && !task.isSubtask) {
      const unapprovedSubtasks = await Task.countDocuments({
        parentTaskId: task._id,
        isSubtask: true,
        status: { $ne: 'approved' }
      });
      if (unapprovedSubtasks > 0) {
        return res.status(400).json({ success: false, message: 'All subtasks must be approved before completing the main task.' });
      }
    }

    if (decision === 'approved') {
      if (user.role === 'super_admin') {
        task.status = 'approved';
        task.reviewStage = 'none';
        task.currentReviewer = null;
        task.rejectionReason = null;
      } else if (task.reviewStage === 'department_admin') {
        task.reviewStage = 'super_admin';
        task.status = 'submitted_for_review'; // Stays in review, but moved to super admin
        task.currentReviewer = null; 
        task.rejectionReason = null;
      } else if (task.reviewStage === 'super_admin') {
        task.status = 'approved';
        task.reviewStage = 'none';
        task.currentReviewer = null;
        task.rejectionReason = null;
      }
    } else if (decision === 'rejected') {
      task.status = 'rejected';
      task.rejectionReason = reason;
      // assignedTo remains the same.
    }

    await task.save();

    return res.status(200).json({ success: true, data: { task } });
  } catch (error) {
    console.error('Error reviewing task:', error);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// POST /api/tasks/:id/subtasks
export const createSubtask = async (req: Request, res: Response) => {
  try {
    const { title, description, deadline, assignedTo } = req.body;
    const user = req.user;

    if (user.role === 'staff') {
      return res.status(403).json({ success: false, message: 'Forbidden. Staff cannot create subtasks.' });
    }

    if (!title || !description || !deadline || !assignedTo) {
      return res.status(400).json({ success: false, message: 'Title, description, deadline, and assignedTo are required.' });
    }

    const parentTask = await Task.findById(req.params.id);
    if (!parentTask) {
      return res.status(404).json({ success: false, message: 'Parent task not found.' });
    }

    if (parentTask.isSubtask) {
      return res.status(400).json({ success: false, message: 'Subtasks cannot contain other subtasks.' });
    }

    if (parentTask.status === 'approved') {
      return res.status(400).json({ success: false, message: 'Cannot add subtasks to an approved task.' });
    }

    const parsedDeadline = new Date(deadline);
    if (isNaN(parsedDeadline.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid deadline date.' });
    }

    if (parsedDeadline.getTime() > new Date(parentTask.deadline).getTime()) {
      return res.status(400).json({ success: false, message: 'Subtask deadline cannot exceed parent task deadline.' });
    }

    const targetUser = await User.findById(assignedTo);
    if (!targetUser || !targetUser.isActive) {
      return res.status(400).json({ success: false, message: 'Target assigned user is invalid or inactive.' });
    }

    let workflowType = undefined;
    
    // Auth Check
    if (user.role === 'super_admin') {
      if (targetUser.role === 'department_admin') {
        workflowType = 'department_admin';
      } else {
        workflowType = 'super_admin_direct';
      }
    } else if (user.role === 'department_admin') {
      // Check if Dept Admin can create subtasks on this parent
      const canManageParent = 
        parentTask.createdBy.toString() === user._id.toString() ||
        (parentTask.assignedTo && parentTask.assignedTo.toString() === user._id.toString()) ||
        (parentTask.assignedTo && await checkAdminStaffPermission(user._id.toString(), parentTask.assignedTo.toString()));
        
      if (!canManageParent) {
        return res.status(403).json({ success: false, message: 'Forbidden. You do not manage this parent task.' });
      }

      // Check if Dept Admin can assign to this specific targetUser
      const hasPermission = await checkAdminStaffPermission(user._id.toString(), assignedTo);
      if (!hasPermission) {
        return res.status(403).json({ success: false, message: 'Forbidden. Can only assign to yourself or your active staff.' });
      }
      
      workflowType = 'department_admin';
    }

    const subtask = new Task({
      title,
      description,
      deadline: parsedDeadline,
      createdBy: user._id,
      assignedTo: assignedTo,
      workflowType,
      isSubtask: true,
      parentTaskId: parentTask._id
    });

    await subtask.save();

    const populatedSubtask = await Task.findById(subtask._id)
      .populate('createdBy', 'name role')
      .populate('assignedTo', 'name role department')
      .populate('parentTaskId', 'taskId title');

    return res.status(201).json({ success: true, data: { task: populatedSubtask } });
  } catch (error) {
    console.error('Error creating subtask:', error);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// GET /api/tasks/:id/subtasks
export const getSubtasks = async (req: Request, res: Response) => {
  try {
    const parentTaskId = req.params.id;
    const user = req.user;

    const query: any = { parentTaskId, isSubtask: true };

    if (user.role === 'staff') {
      query.assignedTo = user._id;
    } else if (user.role === 'department_admin') {
      // To see subtasks, Dept Admin can see subtasks on parents they manage.
      // But instead of complex parent query, it's easier to say: Dept Admin sees subtasks they created or assigned to them or their staff.
      // The requirement says "Only subtasks within their permitted task hierarchy". 
      // Subtasks they manage fall under: created by them, assigned to them, or assigned to their staff.
      const myStaffAssignments = await StaffAssignment.find({ adminId: user._id, isActive: true });
      const myStaffIds = myStaffAssignments.map(a => a.staffId);
      
      query.$or = [
        { createdBy: user._id },
        { assignedTo: user._id },
        { assignedTo: { $in: myStaffIds } }
      ];
    }
    // Super Admin sees all

    const subtasks = await Task.find(query)
      .populate('createdBy', 'name role')
      .populate('assignedTo', 'name role department')
      .populate('parentTaskId', 'taskId title')
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, data: { subtasks } });
  } catch (error) {
    console.error('Error fetching subtasks:', error);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// GET /api/tasks/:id/progress
export const getTaskProgress = async (req: Request, res: Response) => {
  try {
    const parentTaskId = req.params.id;
    const subtasks = await Task.find({ parentTaskId, isSubtask: true });

    let total = subtasks.length;
    let pending = 0, inProgress = 0, completed = 0, submittedForReview = 0, rejected = 0, approved = 0;

    subtasks.forEach(st => {
      if (st.status === 'pending') pending++;
      else if (st.status === 'in_progress') inProgress++;
      else if (st.status === 'completed') completed++;
      else if (st.status === 'submitted_for_review') submittedForReview++;
      else if (st.status === 'rejected') rejected++;
      else if (st.status === 'approved') approved++;
    });

    const percentage = total === 0 ? 0 : Math.round((approved / total) * 100);
    const allApproved = total > 0 && total === approved;

    return res.status(200).json({
      success: true,
      data: {
        total,
        pending,
        inProgress,
        completed,
        submittedForReview,
        rejected,
        approved,
        percentage,
        allApproved
      }
    });
  } catch (error) {
    console.error('Error fetching task progress:', error);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};
