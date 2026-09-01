import mongoose, { Schema, Document } from 'mongoose';

export interface ICounter extends Document<string> {
  _id: string; // The name of the sequence
  sequence_value: number;
}

const counterSchema = new Schema<ICounter>({
  _id: { type: String, required: true },
  sequence_value: { type: Number, default: 0 }
});

const Counter = mongoose.model<ICounter>('Counter', counterSchema);

export default Counter;
