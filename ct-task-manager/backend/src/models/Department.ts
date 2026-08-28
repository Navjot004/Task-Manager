import mongoose, { Document, Schema } from 'mongoose';

export interface IDepartment extends Document {
  name: string;
}

const DepartmentSchema: Schema = new Schema({
  name: { type: String, required: true, unique: true, trim: true },
}, { timestamps: true });

export default mongoose.model<IDepartment>('Department', DepartmentSchema);
