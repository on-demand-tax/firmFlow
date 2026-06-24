import mongoose, { Schema, Document } from 'mongoose';

import type {
  BillingCycle,
  BillingModel,
  LegacyProjectType,
  ProjectType,
  WorkSubtype,
} from '@/lib/project-types';

export type { ProjectType, BillingModel, BillingCycle, WorkSubtype, LegacyProjectType };

const PROJECT_TYPE_ENUM: string[] = [
  'General',
  'FeeCycleAdmin',
  'BookkeepingAgency',
  'FilingAgency',
  'PropertyTaxFiling',
  'ExternalAudit',
  'Consulting',
  'BusinessDiagnosis',
  'TaxAuditRepresentation',
  'OtherWork',
  'NonBillable',
  // legacy (하위 호환 읽기)
  'MonthlyBookkeeping',
  'AnnualTaxAdjustment',
  'EstateGiftTransferTax',
  'TaxAmendment',
  'TaxConsulting',
  'Audit',
  'AdHoc',
];

export interface IProject extends Document {
  clientId: mongoose.Types.ObjectId;
  projectName: string;
  projectType: ProjectType | LegacyProjectType;
  workSubtype?: WorkSubtype;
  billingModel: BillingModel;
  status: 'Active' | 'Completed';
  billingCycle?: BillingCycle;
  currency: 'KRW' | 'USD';
  contractAmount?: number;
  baseFeeAmount?: number;
  successFeeRate?: number;
  hourlyRate?: number;
  eventDate?: Date;
  fiscalYearStart?: Date;
  fiscalYearEnd?: Date;
  billingAnchorDay?: number;
  notes?: string;
  createdAt: Date;
}

const ProjectSchema = new Schema<IProject>({
  clientId: {
    type: Schema.Types.ObjectId,
    ref: 'Client',
    required: true,
    index: true,
  },
  projectName: { type: String, required: true },
  projectType: {
    type: String,
    enum: PROJECT_TYPE_ENUM,
    default: 'General',
    required: true,
    index: true,
  },
  workSubtype: { type: String },
  billingModel: {
    type: String,
    enum: ['Hourly', 'Retainer', 'FixedPerEvent', 'BasePlusSuccess', 'PerFiscalPeriod', 'Manual'],
    default: 'Hourly',
    required: true,
  },
  status: {
    type: String,
    enum: ['Active', 'Completed'],
    default: 'Active',
    required: true,
  },
  billingCycle: {
    type: String,
    enum: ['Monthly', 'Quarterly', 'SemiAnnual', 'Annual', 'OnCompletion'],
  },
  currency: { type: String, enum: ['KRW', 'USD'], default: 'KRW', required: true },
  contractAmount: { type: Number, min: 0 },
  baseFeeAmount: { type: Number, min: 0 },
  successFeeRate: { type: Number, min: 0, max: 100 },
  hourlyRate: { type: Number, min: 0 },
  eventDate: { type: Date },
  fiscalYearStart: { type: Date },
  fiscalYearEnd: { type: Date },
  billingAnchorDay: { type: Number, min: 1, max: 28 },
  notes: { type: String },
  createdAt: { type: Date, default: Date.now },
});

ProjectSchema.index({ clientId: 1, projectType: 1, status: 1 });

// Next.js dev HMR keeps the first compiled schema; re-register after enum changes.
if (process.env.NODE_ENV !== 'production' && mongoose.models.Project) {
  mongoose.deleteModel('Project');
}

export const ProjectModel = mongoose.model<IProject>('Project', ProjectSchema);
