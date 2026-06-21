import mongoose, { Schema, Document } from 'mongoose';

export interface IExpense extends Document {
  userId: mongoose.Types.ObjectId;
  clientId?: mongoose.Types.ObjectId | null;
  projectId?: mongoose.Types.ObjectId | null;
  expenseType: 'Core' | 'Overhead';
  amount: number;
  date: Date;
  receiptUrl?: string;
  googleDriveFileId?: string;
  description: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  lockedAt?: Date;
  approvedBy?: mongoose.Types.ObjectId;
}

const ExpenseSchema = new Schema<IExpense>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  clientId: { type: Schema.Types.ObjectId, ref: 'Client', default: null },
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', default: null },
  expenseType: {
    type: String,
    enum: ['Core', 'Overhead'],
    required: true,
    index: true,
  },
  amount: { type: Number, required: true, min: 0 },
  date: { type: Date, required: true, index: true },
  receiptUrl: { type: String },
  googleDriveFileId: { type: String },
  description: { type: String, required: true },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending',
    required: true,
  },
  lockedAt: { type: Date },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
});

export const ExpenseModel =
  mongoose.models.Expense || mongoose.model<IExpense>('Expense', ExpenseSchema);
