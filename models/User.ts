import mongoose, { Schema, Document } from 'mongoose';

export interface ISalaryHistory {
  effectiveDate: Date;
  baseSalary: number;
  hourlyBillableRate: number;
}

export interface IUser extends Document {
  email: string;
  name: string;
  role: 'Admin' | 'Approver' | 'Preparer';
  status: 'Active' | 'OnLeave' | 'Terminated';
  salaryTable: ISalaryHistory[];
  createdAt: Date;
}

const SalaryHistorySchema = new Schema<ISalaryHistory>({
  effectiveDate: { type: Date, required: true },
  baseSalary: { type: Number, required: true },
  hourlyBillableRate: { type: Number, required: true },
});

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  role: {
    type: String,
    enum: ['Admin', 'Approver', 'Preparer'],
    default: 'Preparer',
    required: true,
  },
  status: {
    type: String,
    enum: ['Active', 'OnLeave', 'Terminated'],
    default: 'Active',
    required: true,
  },
  salaryTable: { type: [SalaryHistorySchema], default: [], select: false },
  createdAt: { type: Date, default: Date.now },
});

export const UserModel =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
