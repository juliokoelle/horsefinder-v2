import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
// Supabase renamed anon key to "publishable key" in the dashboard
const supabaseKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY) as string;

if (!supabaseUrl || !supabaseKey) {
  console.error('[HorseFinder] VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY must be set');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
