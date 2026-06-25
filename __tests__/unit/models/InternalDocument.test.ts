/**
 * @jest-environment node
 */
import mongoose from 'mongoose';

import { dbConnect, dbDisconnect } from '@/lib/testDbHelper';
import {
  InternalDocumentModel,
  normalizeDocumentTags,
} from '@/models/InternalDocument';

beforeAll(async () => {
  await dbConnect();
});

afterAll(async () => {
  await dbDisconnect();
});

describe('InternalDocumentModel', () => {
  const userId = new mongoose.Types.ObjectId();

  it('creates link document with required fields', async () => {
    const doc = await InternalDocumentModel.create({
      title: '노무 가이드',
      category: 'HR',
      entryType: 'Link',
      externalUrl: 'https://example.com/guide',
      createdBy: userId,
      tags: ['노무', '가이드'],
    });

    expect(doc.entryType).toBe('Link');
    expect(doc.tags).toEqual(['노무', '가이드']);
    expect(doc.versions).toEqual([]);
  });

  it('creates file document with embedded version', async () => {
    const doc = await InternalDocumentModel.create({
      title: '취업규칙',
      category: 'HR',
      entryType: 'File',
      createdBy: userId,
      currentVersion: 1,
      versions: [
        {
          version: 1,
          googleDriveFileId: 'drive-1',
          fileUrl: 'https://drive.google.com/file/d/drive-1/view',
          fileName: 'rules.pdf',
          mimeType: 'application/pdf',
          uploadedBy: userId,
          uploadedAt: new Date('2026-06-01'),
        },
      ],
    });

    expect(doc.currentVersion).toBe(1);
    expect(doc.versions).toHaveLength(1);
  });

  it('normalizeDocumentTags trims, lowercases, dedupes', () => {
    expect(normalizeDocumentTags([' HR ', 'hr', 'Admin', ''])).toEqual(['hr', 'admin']);
  });
});
