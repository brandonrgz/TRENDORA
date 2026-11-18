-- TRENDORA: esquema inicial para Supabase (PostgreSQL)
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'customer' check (role in ('customer','admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  category text not null default 'Otros',
  price numeric(12,2) not null check (price > 0),
  image_url text,
  stock integer not null default 0 check (stock >= 0),
  supplier_reference text, -- Dato privado; nunca se consulta desde la tienda pública.
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  shipping_address jsonb not null,
  total numeric(12,2) not null check (total >= 0),
  payment_status text not null default 'pending' check (payment_status in ('pending','approved','rejected','cancelled','refunded','in_process')),
  fulfillment_status text not null default 'awaiting_purchase' check (fulfillment_status in ('awaiting_purchase','processing','shipped','delivered','cancelled')),
  mp_preference_id text,
  mp_payment_id text unique,
  tracking_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  unit_price numeric(12,2) not null,
  quantity integer not null check (quantity > 0),
  line_total numeric(12,2) not null
);

create index if not exists orders_created_at_idx on public.orders(created_at desc);
create index if not exists orders_email_idx on public.orders(customer_email);
create index if not exists products_active_idx on public.products(active);

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Rol público: solo ve productos activos; no puede ver referencias privadas de proveedores.
-- Se recomienda exponer una vista pública en vez de la tabla completa.
create or replace view public.store_products as
select id,name,description,category,price,image_url,stock,created_at
from public.products where active = true and stock > 0;

grant select on public.store_products to anon, authenticated;

-- Admins leen y editan su propio perfil; la asignación inicial de admin se hace manualmente en SQL.
create policy "profile self read" on public.profiles for select to authenticated using (id = auth.uid());
create policy "admin manage products" on public.products for all to authenticated
using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'))
with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));
create policy "admin read orders" on public.orders for select to authenticated
using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));
create policy "admin update orders" on public.orders for update to authenticated
using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'))
with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));
create policy "admin read order items" on public.order_items for select to authenticated
using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));

-- No se conceden permisos públicos de INSERT/UPDATE a orders ni order_items.
-- create-checkout y webhook usan SUPABASE_SERVICE_ROLE_KEY solo en Edge Functions.
