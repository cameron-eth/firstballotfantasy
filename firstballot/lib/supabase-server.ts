import { createClient } from "@supabase/supabase-js"

const supabaseUrl = "https://aanoqbjauukcczrlnxka.supabase.co"
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhbm9xYmphdXVrY2N6cmxueGthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA1MzM1NjQsImV4cCI6MjA1NjEwOTU2NH0.5QMnDzOI-y_XiIRGTmnLfzZ6i8vDbBXfO5sHuxqd0EU"

// Server-side Supabase client without auth handling
export const supabaseServer = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
}) 