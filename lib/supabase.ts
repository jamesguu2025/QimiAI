// lib/supabase.ts - Supabase Client Configuration
// SECURITY: Never expose service_role key to the client

import { createClient } from '@supabase/supabase-js';

// Environment variables validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
}

if (!supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable');
}

/**
 * Supabase client for browser/client-side use
 * Uses anon key - safe to expose in browser
 * RLS policies will restrict access
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

/**
 * Supabase admin client for server-side use ONLY
 * Uses service_role key - NEVER expose to client
 * Bypasses RLS - use with caution
 */
export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

/**
 * Get server-side Supabase client
 * For use in API routes only
 */
export function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY - required for server operations');
  }
  return supabaseAdmin;
}

// Database types (will be generated from schema)
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          avatar_url: string | null;
          provider: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          name?: string | null;
          avatar_url?: string | null;
          provider: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          email?: string;
          name?: string | null;
          avatar_url?: string | null;
          updated_at?: string;
        };
      };
      conversations: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          folder_key: string | null;
          message_count: number;
          last_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string;
          folder_key?: string | null;
          message_count?: number;
          last_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          folder_key?: string | null;
          message_count?: number;
          last_message?: string | null;
          updated_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          role: 'user' | 'assistant';
          content: string;
          sources: unknown | null;
          attachments: unknown | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          role: 'user' | 'assistant';
          content: string;
          sources?: unknown | null;
          attachments?: unknown | null;
          created_at?: string;
        };
        Update: {
          content?: string;
          sources?: unknown | null;
          attachments?: unknown | null;
        };
      };
    };
  };
}
