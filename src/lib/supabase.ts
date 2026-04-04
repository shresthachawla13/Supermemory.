import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type ContentItem = {
  id: string;
  user_id: string;
  url: string;
  title: string;
  original_text: string;
  summary: string;
  keywords: string[];
  topics: string[];
  content_type: string;
  embedding: number[] | null;
  status: 'pending' | 'processed' | 'failed';
  created_at: string;
  updated_at: string;
  metadata: Record<string, unknown>;
};
