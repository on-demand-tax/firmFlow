import mongoose, { Schema, Document } from 'mongoose';

export interface IPeriodLock extends Document {
  startDate: Date;
  endDate: Date;
  lockedBy: mongoose.Types.ObjectId;
  lockedAt: Date;
  note?: string;
}

const PeriodLockSchema = new Schema<IPeriodLock>({
  startDate: { type: Date, required: true, index: true },
  endDate: { type: Date, required: true, index: true },
  lockedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  lockedAt: { type: Date, required: true, default: Date.now },
  note: { type: String },
});

export const PeriodLockModel =
  mongoose.models.PeriodLock ||
  mongoose.model<IPeriodLock>('PeriodLock', PeriodLockSchema);
