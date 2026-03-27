create table public.jobs (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid references public.orders(id) on delete cascade not null,
  stage text not null default 'design'
    check (stage in ('design', 'proofing', 'printing', 'finishing', 'ready_for_pickup')),
  notes text,
  assigned_to uuid references auth.users(id),
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.jobs enable row level security;

create policy "Authenticated users can view jobs"
  on public.jobs for select using (public.is_authenticated());

create policy "Staff can create jobs"
  on public.jobs for insert with check (public.is_authenticated());

create policy "Staff can update jobs"
  on public.jobs for update
  using (public.is_authenticated())
  with check (public.is_authenticated());

create policy "Admins can delete jobs"
  on public.jobs for delete using (public.is_admin());

-- Enable Realtime on jobs table
alter publication supabase_realtime add table public.jobs;

create trigger jobs_updated_at
  before update on public.jobs
  for each row execute procedure public.set_updated_at();
