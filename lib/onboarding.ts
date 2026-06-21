export function resolveNewUserRole(
  email: string,
  adminCount: number,
  initialAdminEmail: string,
): 'Admin' | 'Preparer' | null {
  const normalizedEmail = email.toLowerCase();
  const normalizedInitial = initialAdminEmail.toLowerCase();

  if (normalizedEmail === normalizedInitial) {
    return 'Admin';
  }

  if (adminCount === 0) {
    return null;
  }

  return 'Preparer';
}
