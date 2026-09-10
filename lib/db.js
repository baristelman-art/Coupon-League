import { createClient } from '@supabase/supabase-js';

// Sunucu tarafında çalışır, service key ile tam yetkili erişim sağlar.
// Bu dosya SADECE API route'ları içinde import edilmeli, tarayıcıya asla gitmemeli.
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
