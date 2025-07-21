import { createClient } from '@supabase/supabase-js'

// Environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // We don't need auth for this use case
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-application': 'tipn-leaderboard',
    },
  },
})

// Database types
export interface Database {
  public: {
    Tables: {
      tipn_stakers: {
        Row: {
          address: string
          amount: string
          rank: number
          updated_at: string
        }
        Insert: {
          address: string
          amount: string
          rank: number
          updated_at?: string
        }
        Update: {
          address?: string
          amount?: string
          rank?: number
          updated_at?: string
        }
      }
    }
  }
}

// Typed Supabase client
export type SupabaseClient = typeof supabase