import mongoose, { Schema, Document } from 'mongoose';

export interface IStaffAssignment extends Document {
  adminId: mongoose.Types.ObjectId;
  staffId: mongoose.Types.ObjectId;
  assignedBy: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const staffAssignmentSchema = new Schema<IStaffAssignment>(
  {
    adminId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    staffId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// One staff member can have ONE active department admin at a time.
staffAssignmentSchema.index(
  { staffId: 1 },
  { unique: true, partialFilterExpression: { isActive: true } }
);

const StaffAssignment = mongoose.model<IStaffAssignment>('StaffAssignment', staffAssignmentSchema, 'staff_assignments');

export default StaffAssignment;
