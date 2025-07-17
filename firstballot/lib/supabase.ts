import { createClient } from "@supabase/supabase-js"

/**
 * NOTE:
 * • In the v0 preview, build-time env replacement is not guaranteed.
 * • Hard-coding the public values keeps the demo working while still
 *   relying on the same keys you provided.
 * • In production, you can safely swap back to
 *   `process.env.NEXT_PUBLIC_PROJECT_URL` / `NEXT_PUBLIC_ANON_KEY`.
 */

const supabaseUrl = "https://aanoqbjauukcczrlnxka.supabase.co"
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhbm9xYmphdXVrY2N6cmxueGthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA1MzM1NjQsImV4cCI6MjA1NjEwOTU2NH0.5QMnDzOI-y_XiIRGTmnLfzZ6i8vDbBXfO5sHuxqd0EU"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
