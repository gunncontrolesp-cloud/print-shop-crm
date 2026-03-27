-- Pricing config: single-row JSON config, admin-managed
create table public.pricing_config (
  id uuid primary key default uuid_generate_v4(),
  config jsonb not null default '{}',
  updated_at timestamptz default now(),
  updated_by uuid references auth.users(id)
);

alter table public.pricing_config enable row level security;

-- Everyone can read pricing config (needed for quote builder)
create policy "Authenticated users can read pricing config"
  on public.pricing_config for select
  using (auth.uid() in (select id from public.users));

-- Only admins can update pricing config
create policy "Admins can update pricing config"
  on public.pricing_config for update
  using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));

create policy "Admins can insert pricing config"
  on public.pricing_config for insert
  with check (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));

-- Seed default pricing config
insert into public.pricing_config (config) values ('{
  "product_types": [
    {"id": "business_cards", "label": "Business Cards", "base_price": 0.05},
    {"id": "flyers_half", "label": "Flyers (Half Page)", "base_price": 0.08},
    {"id": "flyers_full", "label": "Flyers (Full Page)", "base_price": 0.12},
    {"id": "brochures", "label": "Brochures", "base_price": 0.25},
    {"id": "banners", "label": "Banners", "base_price": 15.00},
    {"id": "custom", "label": "Custom", "base_price": 0.00}
  ],
  "qty_breaks": [
    {"min": 1, "max": 99, "multiplier": 1.00},
    {"min": 100, "max": 249, "multiplier": 0.90},
    {"min": 250, "max": 499, "multiplier": 0.85},
    {"min": 500, "max": 999, "multiplier": 0.80},
    {"min": 1000, "max": null, "multiplier": 0.75}
  ],
  "materials": [
    {"id": "standard", "label": "Standard", "multiplier": 1.00},
    {"id": "glossy", "label": "Glossy", "multiplier": 1.20},
    {"id": "matte", "label": "Matte", "multiplier": 1.15},
    {"id": "recycled", "label": "Recycled", "multiplier": 1.10}
  ],
  "finishing": [
    {"id": "none", "label": "None", "multiplier": 1.00},
    {"id": "lamination", "label": "Lamination", "multiplier": 1.30},
    {"id": "uv_coating", "label": "UV Coating", "multiplier": 1.25},
    {"id": "foil", "label": "Foil Stamping", "multiplier": 1.50}
  ]
}');

-- Quotes table
create table public.quotes (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid references public.customers(id) on delete cascade not null,
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'approved', 'rejected')),
  line_items jsonb not null default '[]',
  subtotal numeric(10,2) not null default 0,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.quotes enable row level security;

-- All authenticated users can view quotes
create policy "Authenticated users can view quotes"
  on public.quotes for select
  using (auth.uid() in (select id from public.users));

-- Staff + admin can create quotes
create policy "Staff can create quotes"
  on public.quotes for insert
  with check (auth.uid() in (select id from public.users));

-- Staff can update quotes
create policy "Staff can update quotes"
  on public.quotes for update
  using (auth.uid() in (select id from public.users))
  with check (auth.uid() in (select id from public.users));

-- Only admin can delete quotes
create policy "Admins can delete quotes"
  on public.quotes for delete
  using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));

create trigger quotes_updated_at
  before update on public.quotes
  for each row execute procedure public.set_updated_at();
