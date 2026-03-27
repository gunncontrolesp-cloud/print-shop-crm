-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Role enum
create type user_role as enum ('admin', 'staff');

-- Users table (extends Supabase auth.users)
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  name text,
  role user_role not null default 'staff',
  created_at timestamptz default now()
);

-- RLS: users can only read their own record; admin can read all
alter table public.users enable row level security;

create policy "Users can view own record"
  on public.users for select
  using (auth.uid() = id);

create policy "Admins can view all users"
  on public.users for select
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

-- Auto-insert user record on auth signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, role)
  values (new.id, new.email, 'staff');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
