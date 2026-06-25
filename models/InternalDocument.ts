import mongoose, { Schema, Document } from 'mongoose';

import { DOCUMENT_CATEGORIES } from '@/lib/document-categories';

export interface IDocumentVersion {
  version: number;
  googleDriveFileId: string;
  fileUrl: string;
  fileName: string;
  mimeType: string;
  uploadedBy: mongoose.Types.ObjectId;
  uploadedAt: Date;
  note?: string;
}

export interface IInternalDocument extends Document {
  title: string;
  description?: string;
  category: (typeof DOCUMENT_CATEGORIES)[number];
  tags: string[];
  entryType: 'File' | 'Link';
  externalUrl?: string;
  expiresAt?: Date | null;
  createdBy: mongoose.Types.ObjectId;
  versions: IDocumentVersion[];
  currentVersion?: number;
  createdAt: Date;
  updatedAt: Date;
}

const VersionSchema = new Schema<IDocumentVersion>(
  {
    version: { type: Number, required: true },
    googleDriveFileId: { type: String, required: true },
    fileUrl: { type: String, required: true },
    fileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    uploadedAt: { type: Date, required: true },
    note: { type: String },
  },
  { _id: false },
);

const InternalDocumentSchema = new Schema<IInternalDocument>(
  {
    title: { type: String, required: true },
    description: { type: String },
    category: {
      type: String,
      enum: DOCUMENT_CATEGORIES,
      required: true,
      index: true,
    },
    tags: { type: [String], default: [] },
    entryType: { type: String, enum: ['File', 'Link'], required: true },
    externalUrl: { type: String },
    expiresAt: { type: Date, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    versions: { type: [VersionSchema], default: [] },
    currentVersion: { type: Number },
  },
  { timestamps: true },
);

export function normalizeDocumentTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const tag of tags) {
    const value = tag.trim().toLowerCase();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    normalized.push(value);
  }

  return normalized;
}

export const InternalDocumentModel =
  mongoose.models.InternalDocument ??
  mongoose.model<IInternalDocument>('InternalDocument', InternalDocumentSchema);
