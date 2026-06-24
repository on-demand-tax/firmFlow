import mongoose, { Schema, Document } from 'mongoose';

import type { ExpenseFilingPeriod } from '@/lib/expense-filing-periods';
import { EXPENSE_FILING_PERIODS } from '@/lib/expense-filing-periods';
import type { ExpensePaymentMethod } from '@/lib/expense-payment-methods';
import { EXPENSE_PAYMENT_METHODS } from '@/lib/expense-payment-methods';
import type { ExpensePurpose } from '@/lib/expense-purposes';
import { EXPENSE_PURPOSES } from '@/lib/expense-purposes';

export type ExpenseCurrency = 'KRW' | 'USD';

export interface IExpense extends Document {
  userId: mongoose.Types.ObjectId;
  clientId?: mongoose.Types.ObjectId | null;
  projectId?: mongoose.Types.ObjectId | null;
  expenseType: 'Core' | 'Overhead';
  paymentMethod: ExpensePaymentMethod;
  expensePurpose: ExpensePurpose;
  filingPeriod?: ExpenseFilingPeriod | null;
  amount: number;
  currency: ExpenseCurrency;
  date: Date;
  receiptUrl?: string;
  googleDriveFileId?: string;
  description: string;
  notes?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  lockedAt?: Date;
  approvedBy?: mongoose.Types.ObjectId;
  rejectionReason?: string;
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
  paymentMethod: {
    type: String,
    enum: EXPENSE_PAYMENT_METHODS,
    required: true,
    index: true,
  },
  expensePurpose: {
    type: String,
    enum: EXPENSE_PURPOSES,
    required: true,
    index: true,
  },
  filingPeriod: {
    type: String,
    enum: EXPENSE_FILING_PERIODS.map((period) => period.id),
    default: null,
  },
  amount: { type: Number, required: true, min: 0 },
  currency: {
    type: String,
    enum: ['KRW', 'USD'],
    default: 'KRW',
    required: true,
  },
  date: { type: Date, required: true, index: true },
  receiptUrl: { type: String },
  googleDriveFileId: { type: String },
  description: { type: String, required: true },
  notes: { type: String },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending',
    required: true,
  },
  lockedAt: { type: Date },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  rejectionReason: { type: String },
});

if (process.env.NODE_ENV !== 'production' && mongoose.models.Expense) {
  mongoose.deleteModel('Expense');
}

export const ExpenseModel = mongoose.model<IExpense>('Expense', ExpenseSchema);
