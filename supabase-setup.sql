-- Jalankan skrip ini sekali di Supabase: Project > SQL Editor > New query > paste > Run

create table if not exists public.user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

alter table public.user_data enable row level security;

create policy "Pengguna bisa lihat data sendiri"
  on public.user_data for select
  using (auth.uid() = user_id);

create policy "Pengguna bisa buat data sendiri"
  on public.user_data for insert
  with check (auth.uid() = user_id);

create policy "Pengguna bisa ubah data sendiri"
  on public.user_data for update
  using (auth.uid() = user_id);
