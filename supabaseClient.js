import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// Dashboard → Project Settings → API → Project URL + anon/public key
const SUPABASE_URL = 'https://rzszxxiktmrrmatfmgol.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6c3p4eGlrdG1ycm1hdGZtZ29sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4ODQ3MTUsImV4cCI6MjA3ODQ2MDcxNX0.GJoOuuLLb2NPtEXaJPy3oWzwByUoRrtvN985tfcePj0';

// สร้าง client ตัวเดียวให้ทุกหน้า import ไปใช้
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
