import { NextResponse } from 'next/server';

import { requireRole } from '@/lib/auth';
import {
  BILLING_MODELS,
  getBillingModelLabel,
  getProjectTypeLabel,
  getUserSelectableProjectTypes,
  getWorkSubtypesForType,
  PROJECT_TYPE_REGISTRY,
} from '@/lib/project-types';

export async function GET() {
  const auth = await requireRole('Preparer');
  if ('error' in auth) return auth.error;

  return NextResponse.json({
    types: getUserSelectableProjectTypes().map((id) => {
      const def = PROJECT_TYPE_REGISTRY[id];
      return {
        id,
        label: def.label,
        defaultBillingModel: def.defaultBillingModel,
        defaultBillingCycle: def.defaultBillingCycle ?? null,
        requiredFields: def.requiredFields,
        requiresWorkSubtype: def.requiresWorkSubtype,
        lifespan: def.lifespan,
        subtypes: getWorkSubtypesForType(id),
      };
    }),
    billingModels: BILLING_MODELS.map((id) => ({
      id,
      label: getBillingModelLabel(id),
    })),
    labels: {
      projectTypes: Object.fromEntries(
        getUserSelectableProjectTypes().map((id) => [id, getProjectTypeLabel(id)]),
      ),
    },
  });
}
