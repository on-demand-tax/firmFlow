import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { jsonError } from '@/lib/api-error';
import { ClientModel } from '@/models/Client';
import { createClientFolder } from '@/lib/drive/folders';

const CLIENT_CODE_REGEX = /^[A-Z0-9]{2,10}$/;

function serializeClient(client: {
  _id: unknown;
  name: string;
  clientCode: string;
  businessRegistrationNumber: string;
  contactPerson: string;
  googleDriveFolderId: string;
  createdAt: Date;
}) {
  return {
    _id: String(client._id),
    name: client.name,
    clientCode: client.clientCode,
    businessRegistrationNumber: client.businessRegistrationNumber,
    contactPerson: client.contactPerson,
    googleDriveFolderId: client.googleDriveFolderId,
    createdAt: client.createdAt,
  };
}

export async function GET() {
  const auth = await requireRole('Approver');
  if ('error' in auth) return auth.error;

  await dbConnect();
  const clients = await ClientModel.find().sort({ name: 1 });
  return NextResponse.json(clients.map(serializeClient));
}

export async function POST(request: Request) {
  const auth = await requireRole('Approver');
  if ('error' in auth) return auth.error;

  const body = await request.json();
  const { name, clientCode, businessRegistrationNumber, contactPerson } = body;

  if (!name || !clientCode || !businessRegistrationNumber || !contactPerson) {
    return jsonError('필수 항목을 입력해 주세요', 400);
  }

  const normalizedCode = String(clientCode).toUpperCase();
  if (!CLIENT_CODE_REGEX.test(normalizedCode)) {
    return jsonError('고객 코드 형식이 올바르지 않습니다', 400);
  }

  await dbConnect();

  const existing = await ClientModel.findOne({ clientCode: normalizedCode });
  if (existing) {
    return jsonError('이미 사용 중인 고객 코드입니다', 409);
  }

  let folderId: string;
  try {
    const folder = await createClientFolder(String(name), normalizedCode);
    folderId = folder.id;
  } catch {
    return jsonError('파일 저장에 실패했습니다', 500);
  }

  try {
    const client = await ClientModel.create({
      name: String(name).trim(),
      clientCode: normalizedCode,
      businessRegistrationNumber: String(businessRegistrationNumber).trim(),
      contactPerson: String(contactPerson).trim(),
      googleDriveFolderId: folderId,
    });
    return NextResponse.json(serializeClient(client), { status: 201 });
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: number }).code === 11000
    ) {
      return jsonError('이미 사용 중인 고객 코드입니다', 409);
    }
    throw error;
  }
}
