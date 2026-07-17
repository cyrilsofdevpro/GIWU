-- Supabase database schema for GiwuLogStore
-- Run this in your Supabase SQL editor.

-- Enable required PostgreSQL extensions
create extension if not exists pgcrypto;
create extension if not exists citext;

-- 1) Profiles table for authenticated users
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on profiles(role);

-- 2) Admin login table (server-side validation using service role key)
create table if not exists admins (
  id uuid primary key default gen_random_uuid(),
  email citext not null unique,
  password_hash text not null,
  full_name text not null default 'Giwu Admin',
  created_at timestamptz not null default now()
);

insert into admins (email, password_hash)
select 'admin@giwu.com', crypt('Giwu123@#$', gen_salt('bf', 10))
where not exists (select 1 from admins where email = 'admin@giwu.com');

-- 3) Support sessions / chat rooms
create table if not exists support_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  guest_id text not null,
  subject text,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table support_sessions add column if not exists guest_id text not null default 'anonymous';

create index if not exists support_sessions_guest_id_idx on support_sessions(guest_id);
create index if not exists support_sessions_status_idx on support_sessions(status);

-- 4) Chat messages
create table if not exists support_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references support_sessions(id) on delete cascade,
  guest_id text not null,
  sender_type text not null check (sender_type in ('customer','admin','guest')),
  sender_id uuid references auth.users(id),
  sender_name text,
  content text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table support_messages add column if not exists guest_id text not null default 'anonymous';

create index if not exists support_messages_session_id_idx on support_messages(session_id);
create index if not exists support_messages_guest_id_idx on support_messages(guest_id);
create index if not exists support_messages_created_at_idx on support_messages(created_at);

-- 5) Customer reviews
create table if not exists customer_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  rating smallint not null check (rating between 1 and 5),
  review text not null,
  created_at timestamptz not null default now()
);

-- 6) Optional services catalog table
create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text,
  description text,
  price text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 7) Helpful helper function for admin policy checks
create or replace function public.is_admin() returns boolean stable language sql as $$
  select exists (
    select 1 from admins
    where email = auth.jwt() ->> 'email'
  );
$$;

-- 8) Row Level Security policies
alter table profiles enable row level security;
drop policy if exists "Profiles: user may view own profile" on profiles;
create policy "Profiles: user may view own profile" on profiles for select using (
  auth.uid() = id
);
drop policy if exists "Profiles: user may insert own profile" on profiles;
create policy "Profiles: user may insert own profile" on profiles for insert with check (
  auth.uid() = id
);
drop policy if exists "Profiles: user may update own profile" on profiles;
create policy "Profiles: user may update own profile" on profiles for update with check (
  auth.uid() = id
);
drop policy if exists "Profiles: admin may manage" on profiles;
create policy "Profiles: admin may manage" on profiles for all using (
  public.is_admin()
);

alter table support_sessions enable row level security;
drop policy if exists "Support sessions: public select" on support_sessions;
create policy "Support sessions: public select" on support_sessions for select using (
  auth.role() in ('anon', 'authenticated') OR public.is_admin()
);
drop policy if exists "Support sessions: public insert" on support_sessions;
create policy "Support sessions: public insert" on support_sessions for insert with check (
  auth.role() in ('anon', 'authenticated') OR public.is_admin()
);
drop policy if exists "Support sessions: public update" on support_sessions;
create policy "Support sessions: public update" on support_sessions for update with check (
  auth.role() in ('anon', 'authenticated') OR public.is_admin()
);

alter table support_messages enable row level security;
drop policy if exists "Support messages: public select" on support_messages;
create policy "Support messages: public select" on support_messages for select using (
  auth.role() in ('anon', 'authenticated') OR public.is_admin()
);
drop policy if exists "Support messages: public insert" on support_messages;
create policy "Support messages: public insert" on support_messages for insert with check (
  auth.role() in ('anon', 'authenticated') OR public.is_admin()
);
drop policy if exists "Support messages: public update" on support_messages;
create policy "Support messages: public update" on support_messages for update with check (
  auth.role() in ('anon', 'authenticated') OR public.is_admin()
);

alter table customer_reviews enable row level security;
drop policy if exists "Customer reviews: anyone can insert" on customer_reviews;
create policy "Customer reviews: anyone can insert" on customer_reviews for insert with check (
  auth.role() = 'authenticated'
);
drop policy if exists "Customer reviews: public select" on customer_reviews;
create policy "Customer reviews: public select" on customer_reviews for select using (true);

-- 9) Optional trigger to keep updated_at current
create or replace function public.updated_timestamp() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_updated_at on profiles;
create trigger profiles_updated_at before update on profiles for each row execute function public.updated_timestamp();

drop trigger if exists support_sessions_updated_at on support_sessions;
create trigger support_sessions_updated_at before update on support_sessions for each row execute function public.updated_timestamp();
