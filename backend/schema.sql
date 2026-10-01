create table if not exists restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  phone text,
  email text,
  gstin text,
  opening_time text,
  closing_time text,
  default_tax_rate numeric default 5,
  weekly_target numeric default 300000,
  preferred_report_day text default 'Monday',
  currency text default 'INR',
  fixed_expenses jsonb not null default '[]'::jsonb,
  staff_expenses jsonb not null default '[]'::jsonb,
  variable_expenses jsonb not null default '[]'::jsonb,
  acknowledged_milestones jsonb not null default '[]'::jsonb,
  fssai_license_number text default '',
  fssai_expiry_date date,
  other_licenses jsonb not null default '[]'::jsonb,
  last_notified jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  trigger_type text not null,
  dedup_key text not null,
  title text not null,
  message text not null,
  data jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  delivered_channels jsonb not null default '["in_app"]'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists notifications_rest_dedup_idx on notifications(restaurant_id, dedup_key);
create index if not exists notifications_rest_created_idx on notifications(restaurant_id, created_at desc);

create table if not exists bills (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  bill_number text,
  date date,
  time time,
  table_no text,
  subtotal numeric not null default 0,
  gst numeric not null default 0,
  total numeric not null default 0,
  payment_mode text,
  created_at timestamptz not null default now()
);

create table if not exists bill_items (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references bills(id) on delete cascade,
  item_name text not null,
  quantity numeric not null default 1,
  rate numeric not null default 0,
  amount numeric not null default 0
);

insert into restaurants (name, address, phone, email, gstin, fixed_expenses, staff_expenses, variable_expenses)
select 'Saffron Leaf Kitchen', 'Indiranagar, Bengaluru', '+91 98765 43210', 'arjun@saffronleaf.in', '29ABCDE1234F1Z5',
'["Restaurant rent", "Electricity & gas", "Subscriptions"]',
'["Kitchen team", "Front of house", "Staff meals"]',
'["Raw ingredients", "Packaging & delivery", "Cleaning supplies"]'
where not exists (select 1 from restaurants);

create index if not exists bills_restaurant_date_idx on bills(restaurant_id, date);
create index if not exists bill_items_bill_id_idx on bill_items(bill_id);
