import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const isSupabaseConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL &&
    import.meta.env.VITE_SUPABASE_ANON_KEY &&
    import.meta.env.VITE_SUPABASE_URL.startsWith('http')
);

if (!isSupabaseConfigured) {
  console.warn(
    'Supabase configuration missing: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be provided in .env'
  );
}

// Fallback to a placeholder client if configuration is missing, preventing
// createClient from throwing an uncaught exception during startup that crashes the React tree.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: isSupabaseConfigured,
    autoRefreshToken: isSupabaseConfigured,
    detectSessionInUrl: isSupabaseConfigured,
  },
});

