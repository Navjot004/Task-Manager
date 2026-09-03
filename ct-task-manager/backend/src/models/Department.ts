import mongoose, { Document, Schema } from 'mongoose';

export interface IDepartment extends Document {
  name: string;
  verifiedUserAccess: 'none' | 'staff' | 'student' | 'both';
  canAddVerifiedUsers: boolean;
  canUploadVerifiedUsers: boolean;
}

const DepartmentSchema: Schema = new Schema({
  name: { type: String, required: true, unique: true, trim: true },
  verifiedUserAccess: {
    type: String,
    enum: ['none', 'staff', 'student', 'both'],
    default: 'none',
  },
  canAddVerifiedUsers: {
    type: Boolean,
    default: true,
  },
  canUploadVerifiedUsers: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

export default mongoose.model<IDepartment>('Department', DepartmentSchema);
