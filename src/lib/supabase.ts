import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Browser Supabase client. URL + anon key are public and baked in at build time
// (vercel.json build.env, or .env.local for local testing). When absent, the
// app runs in local (localStorage) mode.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supa: SupabaseClient | null = url && anon ? createClient(url, anon) : null;
