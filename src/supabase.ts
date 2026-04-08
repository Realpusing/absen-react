import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://uqztsxlyiyaotsoxzlkz.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxenRzeGx5aXlhb3Rzb3h6bGt6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NDQ4NjUsImV4cCI6MjA5MTEyMDg2NX0.-Ubi6KxqtBO8Bg3oo9id6hcmKZDhZDkS945dBWhTME4";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);