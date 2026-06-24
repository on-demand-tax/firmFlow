import mongoose, { Schema, Document } from 'mongoose';

import { TIMELOG_HOURS_MIN, TIMELOG_HOURS_MAX } from '@/lib/timelog-hours';

export interface ITimeLog extends Document {
  userId: mongoose.Types.ObjectId;
  clientId: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  date: Date;
  hours: number;
  /** 프로젝트 유형별 업무 액티비티 (예: 기장대리 전표입력) */
  activity?: string;
  description: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  approvedBy?: mongoose.Types.ObjectId;
  rejectionReason?: string;
  lockedAt?: Date;
}

const TimeLogSchema = new Schema<ITimeLog>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  date: { type: Date, required: true, index: true },
  hours: { type: Number, required: true, min: TIMELOG_HOURS_MIN, max: TIMELOG_HOURS_MAX },
  activity: { type: String },
  description: { type: String, required: true },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending',
    required: true,
  },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  rejectionReason: { type: String },
  lockedAt: { type: Date },
});

if (process.env.NODE_ENV !== 'production' && mongoose.models.TimeLog) {
  mongoose.deleteModel('TimeLog');
}

export const TimeLogModel = mongoose.model<ITimeLog>('TimeLog', TimeLogSchema);
