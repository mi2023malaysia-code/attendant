import 'server-only';

// Temporary test-only access path for preview deployments.
// Disable this before production release.
export const TEST_ADMIN_USER_ID = '11111111-1111-1111-1111-111111111117';
export const TEST_ADMIN_EMAIL = 'admin@webinar.local';
export const TEST_ADMIN_DISPLAY_NAME = 'Initial Admin';

export function isAdminAuthBypassEnabled() {
  return (
    process.env.ADMIN_AUTH_BYPASS === 'true' ||
    process.env.VERCEL_ENV === 'preview'
  );
}

export const testAdminSession = {
  userId: TEST_ADMIN_USER_ID,
  email: TEST_ADMIN_EMAIL,
  displayName: TEST_ADMIN_DISPLAY_NAME,
};
