-- =====================================================================
-- ReturnLoad — Supabase (PostgreSQL) schema & Row Level Security
-- =====================================================================
-- Applies to the Supabase backend path (APP_MODE="supabase"). The product
-- also has a fully functional browser-local Demo Mode that needs no SQL.
--
-- How to apply:
--   1. Create a project at https://supabase.com
--   2. Project Settings -> Database -> click "Run" (or use the SQL editor)
--      and paste this file.
--   3. Copy the project URL + anon/publishable key into .env.local as
--      NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY.
--
-- Column names mirror src/lib/data.ts exactly (snake_case in Postgres).
-- Arrays (via_cities, goods_restrictions) are real Postgres text[] and
-- round-trip natively through the Supabase JS client.
-- =====================================================================

begin;

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Helper: is the current user an administrator?
-- Used by RLS policies so only admins can verify/suspend/modernate.
-- ---------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

grant execute on function public.is_admin() to anon, authenticated;

-- =====================================================================
-- Tables
-- =====================================================================

create table if not exists public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  user_id           uuid not null,           -- mirror of auth.users.id
  role              text not null default 'shipper'
                    check (role in ('transporter','shipper','admin')),
  full_name         text not null default '',
  email             text not null,
  phone             text,
  verification_status text not null default 'unverified'
                    check (verification_status in ('unverified','pending','verified')),
  company_id        uuid,
  city              text,
  is_suspended      boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists public.companies (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null references public.profiles(id) on delete cascade,
  name              text not null,
  legal_type        text not null,
  city              text,
  description       text,
  gstin             text,                    -- validated format by the app
  verified          boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists public.vehicles (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null references public.profiles(id) on delete cascade,
  company_id        uuid references public.companies(id) on delete set null,
  registration_number text not null,
  vehicle_type      text not null check (vehicle_type in
                    ('mini-truck','truck','container-20','container-40','trailer','tanker')),
  capacity_tons     numeric not null check (capacity_tons > 0),
  capacity_volume_m3 numeric,
  status            text not null default 'available'
                    check (status in ('available','on-trip','maintenance')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists public.trips (
  id                uuid primary key default gen_random_uuid(),
  transporter_id    uuid not null references public.profiles(id) on delete cascade,
  company_id        uuid references public.companies(id) on delete set null,
  vehicle_id        uuid references public.vehicles(id) on delete set null,
  origin_city       text not null,
  destination_city  text not null,
  via_cities        text[] not null default '{}',
  departure_at      timestamptz not null,
  expected_return_at timestamptz not null,
  vehicle_type      text not null,
  max_capacity      numeric not null check (max_capacity > 0),
  available_capacity numeric not null default 0
                    check (available_capacity >= 0 and available_capacity <= max_capacity),
  capacity_unit     text not null default 'tons' check (capacity_unit in ('tons','kg','m3')),
  goods_restrictions text[] not null default '{}',
  notes             text,
  status            text not null default 'active'
                    check (status in ('active','completed','cancelled','archived')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists public.loads (
  id                uuid primary key default gen_random_uuid(),
  shipper_id        uuid not null references public.profiles(id) on delete cascade,
  company_id        uuid references public.companies(id) on delete set null,
  pickup_city       text not null,
  delivery_city     text not null,
  goods_type        text not null,
  goods_category    text not null check (goods_category in
                    ('general','perishable','fragile','hazardous','oversized','frozen','live-animal','pharma')),
  weight            numeric not null check (weight > 0),   -- tonnes
  volume_m3         numeric,
  dimensions        text,
  pickup_window_start timestamptz not null,
  pickup_window_end   timestamptz not null,
  delivery_deadline   timestamptz not null,
  special_handling  text,
  status            text not null default 'open'
                    check (status in ('open','booked','completed','cancelled','archived')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (pickup_window_end >= pickup_window_start)
);

create table if not exists public.bookings (
  id                uuid primary key default gen_random_uuid(),
  trip_id           uuid not null references public.trips(id) on delete cascade,
  load_id           uuid not null references public.loads(id) on delete cascade,
  shipper_id        uuid not null references public.profiles(id),
  transporter_id    uuid not null references public.profiles(id),
  status            text not null default 'requested'
                    check (status in ('requested','accepted','rejected','cancelled','completed')),
  quantity_tons     numeric not null check (quantity_tons > 0),
  price_quote       numeric check (price_quote >= 0),      -- illustrative
  estimated_earnings numeric,                              -- illustrative estimate
  message           text,
  cancellation_reason text,
  cancelled_by_id   uuid references public.profiles(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists public.reviews (
  id                uuid primary key default gen_random_uuid(),
  booking_id        uuid not null references public.bookings(id) on delete cascade,
  author_id         uuid not null references public.profiles(id),
  subject_id        uuid not null references public.profiles(id),
  author_role       text not null,
  subject_role      text not null,
  rating            int not null check (rating between 1 and 5),
  comment           text,
  created_at        timestamptz not null default now(),
  unique (booking_id, author_id)           -- one review per party per booking
);

create table if not exists public.notifications (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  type              text not null check (type in
                    ('booking-request','booking-accepted','booking-rejected',
                     'booking-cancelled','booking-completed','new-review',
                     'new-match','verification','issue')),
  title             text not null,
  body              text,
  link              text,
  read              boolean not null default false,
  created_at        timestamptz not null default now()
);

create table if not exists public.reported_issues (
  id                uuid primary key default gen_random_uuid(),
  reporter_id       uuid not null references public.profiles(id),
  subject_type      text not null check (subject_type in ('user','trip','load','booking')),
  subject_id        uuid not null,
  reason            text not null,
  details           text,
  status            text not null default 'open' check (status in ('open','resolved','dismissed')),
  created_at        timestamptz not null default now(),
  resolved_at       timestamptz
);

-- =====================================================================
-- notify functions (called from triggers below)
-- =====================================================================

create or replace function public.notify_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, user_id, role, full_name, email, verification_status, created_at, updated_at)
  values (
    new.id,
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'shipper'),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    'unverified',
    now(),
    now()
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.notify_new_user();

-- A shipper requests a booking -> tell the transporter.
create or replace function public.notify_booking_requested()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  _pickup text; _delivery text; _goods text;
begin
  select l.pickup_city, l.delivery_city, l.goods_type
    into _pickup, _delivery, _goods
    from public.loads l where l.id = new.load_id;
  insert into public.notifications (user_id, type, title, body, link, created_at)
  values (
    new.transporter_id,
    'booking-request',
    'New booking request',
    format('%s · %s → %s', _goods, _pickup, _delivery),
    '/dashboard/transporter/bookings',
    now()
  );
  return new;
end;
$$;

create trigger bookings_notify_requested
  after insert on public.bookings
  for each row when (new.status = 'requested')
  execute function public.notify_booking_requested();

-- Transporter accepts/rejects/completes, or either party cancels
-- -> tell the other participant.
create or replace function public.notify_booking_status()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  _type        text;
  _title       text;
  _body        text;
  _link        text;
  _recipient   uuid;
begin
  if old.status = new.status then return new; end if;
  case new.status
    when 'accepted' then
      _type := 'booking-accepted'; _title := 'Booking accepted';
      _body := 'A transporter accepted your request.'; _link := '/dashboard/shipper/bookings';
      _recipient := new.shipper_id;
    when 'rejected' then
      _type := 'booking-rejected'; _title := 'Booking declined';
      _body := 'A transporter declined your booking request.'; _link := '/dashboard/shipper/bookings';
      _recipient := new.shipper_id;
    when 'completed' then
      _type := 'booking-completed'; _title := 'Delivery completed';
      _body := 'The delivery was marked complete — you can now review the experience.';
      _link := '/dashboard/shipper/bookings';
      _recipient := new.shipper_id;
    when 'cancelled' then
      _type := 'booking-cancelled'; _title := 'Booking cancelled';
      _body := 'A booking on your load was cancelled.'; _link := '/dashboard/bookings';
      -- notify the party that did NOT cancel
      _recipient := case when new.cancelled_by_id = new.shipper_id then new.transporter_id else new.shipper_id end;
    else
      return new;
  end case;
  if _recipient is not null then
    insert into public.notifications (user_id, type, title, body, link, created_at)
    values (_recipient, _type, _title, _body, _link, now());
  end if;
  return new;
end;
$$;

create trigger bookings_notify_status
  after update of status on public.bookings
  for each row execute function public.notify_booking_status();

-- A review is left -> notify the reviewed party.
create or replace function public.notify_review()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, type, title, body, link, created_at)
  values (new.subject_id, 'new-review', 'You received a review',
          format('Someone rated you %s/5 on a completed booking.', new.rating),
          '/dashboard/profile', now());
  return new;
end;
$$;

create trigger reviews_notify
  after insert on public.reviews
  for each row execute function public.notify_review();

-- An issue is reported -> tell every admin.
create or replace function public.notify_issue_reported()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, type, title, body, link, created_at)
  select p.id, 'issue', 'New reported issue',
         format('%s reported: %s', new.reason, coalesce(new.details, '')),
         '/dashboard/admin/issues', now()
    from public.profiles p
   where p.role = 'admin';
  return new;
end;
$$;

create trigger issues_notify_admins
  after insert on public.reported_issues
  for each row execute function public.notify_issue_reported();

-- Guard: booking statuses may only move through the workflow, and only
-- capacity that exists can be consumed. Client code enforces the same
-- rules; this is the database backstop.
create or replace function public.guard_booking_transitions()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if old.status = new.status then return new; end if;
  -- 'requested' is the only state that can be accepted or rejected
  if new.status in ('accepted','rejected') and old.status <> 'requested' then
    raise exception 'Booking may only be accepted or rejected from ''requested''';
  end if;
  if new.status = 'completed' and old.status <> 'accepted' then
    raise exception 'Booking may only be completed from ''accepted''';
  end if;
  if new.status = 'cancelled' and old.status not in ('requested','accepted') then
    raise exception 'Booking may only be cancelled from ''requested'' or ''accepted''';
  end if;
  return new;
end;
$$;

create trigger bookings_guard_transitions
  before update of status on public.bookings
  for each row execute function public.guard_booking_transitions();

-- =====================================================================
-- Row Level Security
-- =====================================================================

alter table public.profiles         enable row level security;
alter table public.companies        enable row level security;
alter table public.vehicles         enable row level security;
alter table public.trips            enable row level security;
alter table public.loads            enable row level security;
alter table public.bookings         enable row level security;
alter table public.reviews          enable row level security;
alter table public.notifications    enable row level security;
alter table public.reported_issues  enable row level security;

-- profiles -------------------------------------------------------------
create policy "profiles read own or admin"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());
create policy "profiles update own or admin"
  on public.profiles for update
  using (id = auth.uid() or public.is_admin());
create policy "profiles insert own"
  on public.profiles for insert
  with check (id = auth.uid());

-- companies (readable so names show up in matches; writable by owner) ---
create policy "companies read all authenticated"
  on public.companies for select
  using (auth.role() = 'authenticated');
create policy "companies insert owner"
  on public.companies for insert
  with check (owner_id = auth.uid());
create policy "companies update owner or admin"
  on public.companies for update
  using (owner_id = auth.uid() or public.is_admin());

-- vehicles -------------------------------------------------------------
create policy "vehicles read owner"
  on public.vehicles for select
  using (owner_id = auth.uid() or public.is_admin());
create policy "vehicles insert owner"
  on public.vehicles for insert
  with check (owner_id = auth.uid());
create policy "vehicles update owner"
  on public.vehicles for update
  using (owner_id = auth.uid() or public.is_admin());
create policy "vehicles delete owner"
  on public.vehicles for delete
  using (owner_id = auth.uid());

-- trips (marketplace listing = readable; insert/update by owner/admin) --
create policy "trips read all authenticated"
  on public.trips for select
  using (auth.role() = 'authenticated');
create policy "trips insert transporter"
  on public.trips for insert
  with check (transporter_id = auth.uid());
create policy "trips update transporter or admin"
  on public.trips for update
  using (transporter_id = auth.uid() or public.is_admin());

-- loads -----------------------------------------------------------------
create policy "loads read all authenticated"
  on public.loads for select
  using (auth.role() = 'authenticated');
create policy "loads insert shipper"
  on public.loads for insert
  with check (shipper_id = auth.uid());
create policy "loads update shipper or admin"
  on public.loads for update
  using (shipper_id = auth.uid() or public.is_admin());

-- bookings (read/write by the two participants only) ---------------------
create policy "bookings read participants"
  on public.bookings for select
  using (shipper_id = auth.uid() or transporter_id = auth.uid() or public.is_admin());
create policy "bookings insert shipper"
  on public.bookings for insert
  with check (shipper_id = auth.uid());
create policy "bookings update participants"
  on public.bookings for update
  using (shipper_id = auth.uid() or transporter_id = auth.uid() or public.is_admin());

-- reviews (public ratings; only the author writes, once per booking) -----
create policy "reviews read all authenticated"
  on public.reviews for select
  using (auth.role() = 'authenticated');
create policy "reviews insert author"
  on public.reviews for insert
  with check (author_id = auth.uid());

-- notifications (strictly per-user) --------------------------------------
create policy "notifications read own"
  on public.notifications for select
  using (user_id = auth.uid());
create policy "notifications update own"
  on public.notifications for update
  using (user_id = auth.uid());

-- reported issues (reporter submits; reporter + admins read; admin acts) --
create policy "issues insert reporter"
  on public.reported_issues for insert
  with check (reporter_id = auth.uid());
create policy "issues read reporter or admin"
  on public.reported_issues for select
  using (reporter_id = auth.uid() or public.is_admin());
create policy "issues update admin"
  on public.reported_issues for update
  using (public.is_admin());

-- =====================================================================
-- Indexes for the hot paths (matching scans, dashboards, notifications)
-- =====================================================================

create index if not exists idx_trips_transporter   on public.trips(transporter_id);
create index if not exists idx_trips_open          on public.trips(status, available_capacity);
create index if not exists idx_trips_return        on public.trips(expected_return_at);
create index if not exists idx_loads_shipper       on public.loads(shipper_id);
create index if not exists idx_loads_open          on public.loads(status) where status = 'open';
create index if not exists idx_loads_pickup        on public.loads(pickup_window_start);
create index if not exists idx_bookings_transporter on public.bookings(transporter_id);
create index if not exists idx_bookings_shipper    on public.bookings(shipper_id);
create index if not exists idx_bookings_load       on public.bookings(load_id);
create index if not exists idx_reviews_subject     on public.reviews(subject_id);
create index if not exists idx_reviews_booking     on public.reviews(booking_id);
create index if not exists idx_notif_user          on public.notifications(user_id, read);
create index if not exists idx_companies_owner     on public.companies(owner_id);
create index if not exists idx_vehicles_owner      on public.vehicles(owner_id);
create index if not exists idx_issues_status       on public.reported_issues(status);

commit;