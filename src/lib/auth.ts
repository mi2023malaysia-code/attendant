import 'server-only';

import { cache } from 'react';
import { redirect } from 'next/navigation';

import { isAdminAuthBypassEnabled, testAdminSession } from '@/lib/admin/test-access';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type AdminSession = {
  userId: string;
  email: string | null;
  displayName: string | null;
};

export const getAdminSession = cache(async (): Promise<AdminSession | null> => {
  if (isAdminAuthBypassEnabled()) {
    return testAdminSession;
  }

  let supabase;

  try {
    supabase = await createSupabaseServerClient();
  } catch {
    return null;
  }

  let userResponse;

  try {
    userResponse = await supabase.auth.getUser();
  } catch {
    return null;
  }

  if (!userResponse) {
    return null;
  }

  const {
    data: { user },
  } = userResponse;

  if (!user) {
    return null;
  }

  let profileResult;

  try {
    profileResult = await supabase
      .from('117_admin_profiles')
      .select('user_id, display_name')
      .eq('user_id', user.id)
      .maybeSingle();
  } catch {
    return null;
  }

  const { data: profile, error } = profileResult;

  if (error || !profile) {
    return null;
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    displayName: profile.display_name ?? null,
  };
});

export async function requireAdminSession() {
  const session = await getAdminSession();

  if (!session) {
    redirect('/admin/sign-in');
  }

  return session;
}
