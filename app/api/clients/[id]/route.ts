import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { jsonError } from '@/lib/api-error';
import { ClientModel } from '@/models/Client';

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

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireRole('Approver');
  if ('error' in auth) return auth.error;

  const { id } = await context.params;
  await dbConnect();

  const client = await ClientModel.findById(id);
  if (!client) {
    return jsonError('고객을 찾을 수 없습니다', 404);
  }

  return NextResponse.json(serializeClient(client));
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireRole('Approver');
  if ('error' in auth) return auth.error;

  const { id } = await context.params;
  const body = await request.json();

  await dbConnect();

  const client = await ClientModel.findById(id);
  if (!client) {
    return jsonError('고객을 찾을 수 없습니다', 404);
  }

  if (body.name !== undefined) client.name = String(body.name).trim();
  if (body.businessRegistrationNumber !== undefined) {
    client.businessRegistrationNumber = String(body.businessRegistrationNumber).trim();
  }
  if (body.contactPerson !== undefined) {
    client.contactPerson = String(body.contactPerson).trim();
  }

  await client.save();
  return NextResponse.json(serializeClient(client));
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireRole('Approver');
  if ('error' in auth) return auth.error;

  const { id } = await context.params;
  await dbConnect();

  const client = await ClientModel.findByIdAndDelete(id);
  if (!client) {
    return jsonError('고객을 찾을 수 없습니다', 404);
  }

  return NextResponse.json({ success: true });
}
