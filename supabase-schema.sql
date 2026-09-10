-- Supabase projendeki SQL Editor'e yapıştırıp çalıştır.

create table if not exists entries (
  id uuid primary key default gen_random_uuid(),
  nickname text not null,
  odds numeric not null,
  matches integer not null,
  score integer not null,
  won boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists entries_score_idx on entries (score desc);

-- Herkesin okuyabildiği ama sadece backend'in (service key) yazabildiği bir tablo.
alter table entries enable row level security;

create policy "Herkes okuyabilir"
  on entries for select
  using (true);

-- Insert/update/delete sadece service key ile (backend API route'lar üzerinden) yapılabilir,
-- bu yüzden buraya ekstra bir "insert" policy EKLEMİYORUZ. Service key RLS'i zaten bypass eder.
