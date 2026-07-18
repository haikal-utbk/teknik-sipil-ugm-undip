-- Jalankan skrip ini SEKALI di Supabase: Project > SQL Editor > New query > paste > Run
-- (Dijalankan SETELAH supabase-setup.sql). Ini menambahkan sistem role
-- admin/student: akun admin bisa MELIHAT (read-only) progres semua akun
-- student, tapi tidak bisa mengubah datanya.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'student' check (role in ('admin', 'student')),
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

-- Fungsi bantu (security definer) supaya kebijakan RLS bisa cek "apakah saya
-- admin?" tanpa memicu rekursi pada tabel profiles itu sendiri.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

create policy "Lihat profil sendiri atau semua kalau admin"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

create policy "Buat profil sendiri"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Otomatis buat baris profil (role default 'student') setiap ada akun baru daftar.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'student')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Isi profil untuk akun-akun yang sudah lebih dulu terdaftar sebelum skrip ini ada.
insert into public.profiles (id, email, role)
select id, email, 'student' from auth.users
on conflict (id) do nothing;

-- Izinkan admin membaca (SELECT saja, bukan INSERT/UPDATE) data belajar semua akun.
create policy "Admin bisa lihat semua data user"
  on public.user_data for select
  using (public.is_admin());

-- ============================================================
-- LANGKAH TERAKHIR (wajib, jalankan manual satu baris ini):
-- Ganti email di bawah dengan email akun kamu (yang dipakai login di web),
-- lalu jalankan baris ini SENDIRIAN supaya akun kamu jadi admin.
-- ============================================================
-- update public.profiles set role = 'admin' where email = 'email-kamu@contoh.com';
