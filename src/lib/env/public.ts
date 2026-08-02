import { z } from 'zod';

const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url('NEXT_PUBLIC_APP_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
});

const defaultPublicAppUrl = 'http://localhost:3000';
const defaultSupabaseUrl = 'https://wvinhpgmkqdnrydddulo.supabase.co';
const defaultSupabaseAnonKey = 'sb_publishable_QNicA8t4kjGAlPnHg6GohA_B4_3DLKr';

export type PublicEnv = z.infer<typeof publicEnvSchema>;

export function getPublicEnv() {
  const nextPublicAppUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : defaultPublicAppUrl);

  return publicEnvSchema.parse({
    NEXT_PUBLIC_APP_URL: nextPublicAppUrl,
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? defaultSupabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? defaultSupabaseAnonKey,
  });
}

export { publicEnvSchema };
