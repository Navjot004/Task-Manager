import mongoose, { Schema, Document } from 'mongoose';

export interface ITask extends Document {
  title: string;
  description: string;
  createdBy: mongoose.Types.ObjectId;
  assignedTo: mongoose.Types.ObjectId | null;
  deadline: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'submitted_for_review' | 'approved' | 'rejected';
  parentTaskId: mongoose.Types.ObjectId | null;
  isSubtask: boolean;
  workflowType?: 'super_admin_direct' | 'department_admin';
  reviewStage: 'none' | 'department_admin' | 'super_admin';
  currentReviewer: mongoose.Types.ObjectId | null;
  reviewRequestedBy: mongoose.Types.ObjectId | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<ITask>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    deadline: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'submitted_for_review', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    parentTaskId: {
      type: Schema.Types.ObjectId,
      ref: 'Task',
      default: null,
    },
    isSubtask: {
      type: Boolean,
      default: false,
    },
    workflowType: {
      type: String,
      enum: ['super_admin_direct', 'department_admin'],
    },
    reviewStage: {
      type: String,
      enum: ['none', 'department_admin', 'super_admin'],
      default: 'none',
      index: true,
    },
    currentReviewer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    reviewRequestedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    rejectionReason: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const Task = mongoose.model<ITask>('Task', taskSchema, 'tasks');

export default Task;
