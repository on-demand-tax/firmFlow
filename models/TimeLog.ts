import mongoose, { Schema, Document } from 'mongoose';

export interface ITimeLog extends Document {
  userId: mongoose.Types.ObjectId;
  clientId: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  date: Date;
  hours: number;
  description: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  approvedBy?: mongoose.Types.ObjectId;
  lockedAt?: Date;
}

const TimeLogSchema = new Schema<ITimeLog>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  date: { type: Date, required: true, index: true },
  hours: { type: Number, required: true, min: 0.5, max: 24 },
  description: { type: String, required: true },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending',
    required: true,
  },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  lockedAt: { type: Date },
});

export const TimeLogModel =
  mongoose.models.TimeLog || mongoose.model<ITimeLog>('TimeLog', TimeLogSchema);
