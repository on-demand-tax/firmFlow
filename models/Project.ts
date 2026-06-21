import mongoose, { Schema, Document } from 'mongoose';

export interface IProject extends Document {
  clientId: mongoose.Types.ObjectId;
  projectName: string;
  status: 'Active' | 'Completed';
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
  status: {
    type: String,
    enum: ['Active', 'Completed'],
    default: 'Active',
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
});

export const ProjectModel =
  mongoose.models.Project || mongoose.model<IProject>('Project', ProjectSchema);
