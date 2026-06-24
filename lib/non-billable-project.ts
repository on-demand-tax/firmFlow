import { ClientModel } from '@/models/Client';
import { ProjectModel } from '@/models/Project';

export const INTERNAL_CLIENT_CODE = 'INTERNAL';
export const INTERNAL_CLIENT_NAME = '사무소 내부';
export const NON_BILLABLE_PROJECT_NAME = '비청구 시간';
const INTERNAL_DRIVE_FOLDER_ID = 'firmflow-internal';

export interface NonBillableProjectRef {
  clientId: string;
  projectId: string;
}

/** 타임시트 비청구 시간 입력용 내부 고객·프로젝트를 보장한다. */
export async function ensureNonBillableProject(): Promise<NonBillableProjectRef> {
  let client = await ClientModel.findOne({ clientCode: INTERNAL_CLIENT_CODE });
  if (!client) {
    client = await ClientModel.create({
      name: INTERNAL_CLIENT_NAME,
      clientCode: INTERNAL_CLIENT_CODE,
      businessRegistrationNumber: '0000000000',
      contactPerson: '—',
      googleDriveFolderId: INTERNAL_DRIVE_FOLDER_ID,
    });
  }

  let project = await ProjectModel.findOne({
    clientId: client._id,
    projectType: 'NonBillable',
  });
  if (!project) {
    project = await ProjectModel.create({
      clientId: client._id,
      projectName: NON_BILLABLE_PROJECT_NAME,
      projectType: 'NonBillable',
      billingModel: 'Manual',
      status: 'Active',
      currency: 'KRW',
      notes: '시스템 자동 생성 — 직원 비청구 시간 입력용',
    });
  }

  return {
    clientId: String(client._id),
    projectId: String(project._id),
  };
}
