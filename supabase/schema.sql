-- =============================================
-- FLEX ROOM STUDIO — Supabase Schema
-- Run this in the Supabase SQL Editor
-- =============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- =============================================
-- PROFILES (extends Supabase auth.users)
-- =============================================
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text,
  avatar_url text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================
-- INSTRUCTORS
-- =============================================
create table public.instructors (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  bio text,
  photo_url text,
  specialties text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- =============================================
-- RECURRING TEMPLATES (weekly schedule)
-- =============================================
create table public.recurring_templates (
  id uuid primary key default uuid_generate_v4(),
  day_of_week smallint not null check (day_of_week between 0 and 6), -- 0=Sunday
  start_time time not null,
  duration_minutes integer not null default 50,
  class_type text not null,
  instructor_id uuid references public.instructors(id) on delete set null,
  capacity integer not null default 5,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- =============================================
-- CLASS SESSIONS (actual bookable instances)
-- =============================================
create table public.class_sessions (
  id uuid primary key default uuid_generate_v4(),
  date date not null,
  start_time time not null,
  duration_minutes integer not null default 50,
  class_type text not null,
  instructor_id uuid references public.instructors(id) on delete set null,
  capacity integer not null default 5,
  spots_booked integer not null default 0,
  status text not null default 'scheduled' check (status in ('scheduled', 'cancelled')),
  is_recurring boolean not null default false,
  recurring_template_id uuid references public.recurring_templates(id) on delete set null,
  created_at timestamptz not null default now()
);

create index on public.class_sessions(date);
create index on public.class_sessions(status);

-- =============================================
-- PACKAGES / MEMBERSHIPS
-- =============================================
create table public.packages (
  id uuid primary key default uuid_generate_v4(),
  name_es text not null,
  name_en text not null,
  description_es text not null default '',
  description_en text not null default '',
  price_mxn integer not null, -- in MXN (whole pesos)
  session_count integer, -- null = unlimited
  validity_days integer not null default 14,
  allowed_class_types text[], -- null = all types
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- =============================================
-- USER PACKAGES (purchased)
-- =============================================
create table public.user_packages (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  package_id uuid not null references public.packages(id) on delete restrict,
  sessions_remaining integer, -- null = unlimited
  expires_at timestamptz not null,
  purchased_at timestamptz not null default now(),
  stripe_payment_intent_id text
);

create index on public.user_packages(user_id);
create index on public.user_packages(expires_at);

-- =============================================
-- BOOKINGS
-- =============================================
create table public.bookings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete set null,
  guest_name text,
  guest_email text,
  session_id uuid not null references public.class_sessions(id) on delete cascade,
  user_package_id uuid references public.user_packages(id) on delete set null,
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled', 'waitlist')),
  booked_at timestamptz not null default now(),
  cancelled_at timestamptz
);

create index on public.bookings(user_id);
create index on public.bookings(session_id);
create index on public.bookings(status);

-- =============================================
-- CLASS REQUESTS (demand tracking)
-- =============================================
create table public.class_requests (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text not null,
  preferred_day text,
  preferred_time text,
  class_type text,
  message text,
  created_at timestamptz not null default now()
);

-- =============================================
-- GALLERY
-- =============================================
create table public.gallery_images (
  id uuid primary key default uuid_generate_v4(),
  url text not null,
  alt_es text not null default '',
  alt_en text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- =============================================
-- CANCELLATION POLICY
-- =============================================
create table public.cancellation_policy (
  id uuid primary key default uuid_generate_v4(),
  content_es text not null default '',
  content_en text not null default '',
  updated_at timestamptz not null default now()
);

-- Insert default policy
insert into public.cancellation_policy (content_es, content_en) values (
  'Las reservas pueden cancelarse hasta 12 horas antes del inicio de la clase. Pasado este tiempo, la sesión se descontará de tu membresía. Las reservas de clases individuales no son reembolsables.',
  'Bookings can be cancelled up to 12 hours before the class starts. After this time, the session will be deducted from your membership. Single class bookings are non-refundable.'
);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

alter table public.profiles enable row level security;
alter table public.instructors enable row level security;
alter table public.recurring_templates enable row level security;
alter table public.class_sessions enable row level security;
alter table public.packages enable row level security;
alter table public.user_packages enable row level security;
alter table public.bookings enable row level security;
alter table public.class_requests enable row level security;
alter table public.gallery_images enable row level security;
alter table public.cancellation_policy enable row level security;

-- Profiles: users can read their own, admins can read all
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Admins can view all profiles" on public.profiles for select using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);

-- Public reads
create policy "Anyone can view instructors" on public.instructors for select using (true);
create policy "Anyone can view active sessions" on public.class_sessions for select using (true);
create policy "Anyone can view active packages" on public.packages for select using (is_active = true);
create policy "Anyone can view gallery" on public.gallery_images for select using (true);
create policy "Anyone can view cancellation policy" on public.cancellation_policy for select using (true);
create policy "Anyone can view recurring templates" on public.recurring_templates for select using (true);

-- User packages: own only
create policy "Users can view own packages" on public.user_packages for select using (auth.uid() = user_id);
create policy "Service role can insert user_packages" on public.user_packages for insert with check (true);

-- Bookings: own only
create policy "Users can view own bookings" on public.bookings for select using (auth.uid() = user_id);
create policy "Anyone can insert bookings" on public.bookings for insert with check (true);
create policy "Users can update own bookings" on public.bookings for update using (auth.uid() = user_id);

-- Class requests: insert only
create policy "Anyone can insert class requests" on public.class_requests for insert with check (true);
create policy "Admins can view class requests" on public.class_requests for select using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);

-- Admin write policies
create policy "Admins can manage instructors" on public.instructors for all using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);
create policy "Admins can manage sessions" on public.class_sessions for all using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);
create policy "Admins can manage packages" on public.packages for all using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);
create policy "Admins can manage templates" on public.recurring_templates for all using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);
create policy "Admins can manage gallery" on public.gallery_images for all using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);
create policy "Admins can manage policy" on public.cancellation_policy for all using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);
create policy "Admins can view all user_packages" on public.user_packages for select using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);

-- =============================================
-- SEED DATA — Instructors from the schedule
-- =============================================
insert into public.instructors (name, specialties) values
  ('Steph', array['funcional']),
  ('Pris', array['pilates_reformer', 'barre']),
  ('Gaby', array['pilates_reformer', 'pilates_mat']),
  ('Andrea', array['funcional']),
  ('Viry', array['reformer_restaurativo']),
  ('Jhovana', array['barre']),
  ('Paola', array['pilates_reformer', 'barre', 'funcional']),
  ('Shayra', array['funcional']),
  ('Evelyn', array['pilates_reformer']);

-- =============================================
-- SEED DATA — Packages (from the requirements)
-- =============================================
insert into public.packages (name_es, name_en, description_es, description_en, price_mxn, session_count, validity_days, allowed_class_types, sort_order) values
  ('1 Sesión Pilates Reformer', '1 Pilates Reformer Session', '1 sesión de Pilates Reformer con duración de 50 min, que incluye calentamiento, trabajo y estiramiento relajante.', '1 Pilates Reformer session, 50 min including warm-up, workout and relaxing stretch.', 250, 1, 14, array['pilates_reformer'], 1),
  ('1 Sesión Pilates Mat', '1 Pilates Mat Session', '1 clase de Pilates Mat (en el tapete).', '1 Pilates Mat class (on the mat).', 150, 1, 14, array['pilates_mat'], 2),
  ('1 Sesión Barre', '1 Barre Session', '1 sesión de Barre de 50 min, que incluye calentamiento, trabajo y estiramiento relajante.', '1 Barre session, 50 min including warm-up, workout and relaxing stretch.', 180, 1, 7, array['barre'], 3),
  ('1 Sesión Funcional', '1 Functional Session', '1 sesión de Entrenamiento Funcional de 50 min, que incluye calentamiento, trabajo y estiramiento relajante.', '1 Functional Training session, 50 min including warm-up, workout and relaxing stretch.', 150, 1, 7, array['funcional'], 4),
  ('Reformer 4 Sesiones', 'Reformer 4 Sessions', '4 Sesiones de Pilates Reformer.', '4 Pilates Reformer sessions.', 750, 4, 14, array['pilates_reformer'], 5),
  ('Reformer 8 Sesiones', 'Reformer 8 Sessions', '8 Sesiones de Pilates Reformer con vigencia de 1 mes.', '8 Pilates Reformer sessions, valid for 1 month.', 1180, 8, 30, array['pilates_reformer'], 6),
  ('Reformer 12 Sesiones', 'Reformer 12 Sessions', '12 Sesiones de Pilates Reformer con vigencia de 1 mes.', '12 Pilates Reformer sessions, valid for 1 month.', 1550, 12, 30, array['pilates_reformer'], 7),
  ('Funcional 8 Sesiones', 'Functional 8 Sessions', '8 clases de Entrenamiento Funcional con vigencia de 1 mes.', '8 Functional Training classes, valid for 1 month.', 850, 8, 30, array['funcional'], 8),
  ('Funcional 12 Sesiones', 'Functional 12 Sessions', '12 sesiones de Entrenamiento Funcional con vigencia de 1 mes.', '12 Functional Training sessions, valid for 1 month.', 1000, 12, 30, array['funcional'], 9),
  ('Funcional 20 Sesiones', 'Functional 20 Sessions', '20 sesiones de Entrenamiento Funcional con vigencia de 35 días.', '20 Functional Training sessions, valid for 35 days.', 1400, 20, 35, array['funcional'], 10),
  ('Barre 8 Sesiones', 'Barre 8 Sessions', '8 clases de Barre con vigencia de 1 mes.', '8 Barre classes, valid for 1 month.', 950, 8, 30, array['barre'], 11),
  ('Mixto 4 Sesiones', 'Mixed 4 Sessions', '4 Sesiones a elegir entre Pilates Reformer, Funcional y Barre.', '4 sessions to choose between Pilates Reformer, Functional and Barre.', 600, 4, 14, array['pilates_reformer','funcional','barre','reformer_restaurativo'], 12),
  ('Mixto 8 Sesiones', 'Mixed 8 Sessions', '8 sesiones a elegir entre Pilates Reformer, Funcional y Barre.', '8 sessions to choose between Pilates Reformer, Functional and Barre.', 1000, 8, 30, array['pilates_reformer','funcional','barre','reformer_restaurativo'], 13),
  ('Mixto 12 Sesiones', 'Mixed 12 Sessions', '12 sesiones a elegir entre Pilates Reformer, Barre y Funcional.', '12 sessions to choose between Pilates Reformer, Barre and Functional.', 1300, 12, 30, array['pilates_reformer','funcional','barre','reformer_restaurativo'], 14),
  ('Mixto 20 Sesiones', 'Mixed 20 Sessions', '20 sesiones a elegir entre Pilates Reformer, Barre y Funcional.', '20 sessions to choose between Pilates Reformer, Barre and Functional.', 1800, 20, 35, array['pilates_reformer','funcional','barre','reformer_restaurativo'], 15),
  ('Full Premium', 'Full Premium', 'Paquete mixto ilimitado, acceso a las clases que quieras durante el día. Vigencia de 35 días. NO TRANSFERIBLE.', 'Unlimited mixed package, access to as many classes as you want per day. Valid for 35 days. NON-TRANSFERABLE.', 2800, null, 35, null, 16);

-- =============================================
-- SEED DATA — Recurring weekly schedule
-- =============================================
-- We'll need instructor IDs — run this after the instructors are inserted
-- This is a helper to get the IDs:
-- select id, name from instructors order by name;
-- Then replace the UUIDs below, or use subqueries:

insert into public.recurring_templates (day_of_week, start_time, duration_minutes, class_type, instructor_id, capacity)
select 1, '06:00', 50, 'funcional', id, 5 from instructors where name = 'Steph';
insert into public.recurring_templates (day_of_week, start_time, duration_minutes, class_type, instructor_id, capacity)
select 1, '07:00', 50, 'barre', id, 5 from instructors where name = 'Pris';
insert into public.recurring_templates (day_of_week, start_time, duration_minutes, class_type, instructor_id, capacity)
select 1, '08:10', 50, 'pilates_reformer', id, 5 from instructors where name = 'Gaby';
insert into public.recurring_templates (day_of_week, start_time, duration_minutes, class_type, instructor_id, capacity)
select 1, '08:10', 50, 'funcional', id, 5 from instructors where name = 'Andrea';
insert into public.recurring_templates (day_of_week, start_time, duration_minutes, class_type, instructor_id, capacity)
select 1, '09:10', 50, 'pilates_reformer', id, 5 from instructors where name = 'Gaby';
insert into public.recurring_templates (day_of_week, start_time, duration_minutes, class_type, instructor_id, capacity)
select 1, '10:10', 50, 'reformer_restaurativo', id, 5 from instructors where name = 'Viry';
insert into public.recurring_templates (day_of_week, start_time, duration_minutes, class_type, instructor_id, capacity)
select 1, '17:00', 50, 'pilates_mat', id, 5 from instructors where name = 'Gaby';
insert into public.recurring_templates (day_of_week, start_time, duration_minutes, class_type, instructor_id, capacity)
select 1, '18:10', 50, 'barre', id, 5 from instructors where name = 'Jhovana';

-- Tuesday
insert into public.recurring_templates (day_of_week, start_time, duration_minutes, class_type, instructor_id, capacity)
select 2, '07:00', 50, 'pilates_reformer', id, 5 from instructors where name = 'Pris';
insert into public.recurring_templates (day_of_week, start_time, duration_minutes, class_type, instructor_id, capacity)
select 2, '08:10', 50, 'pilates_reformer', id, 5 from instructors where name = 'Paola';
insert into public.recurring_templates (day_of_week, start_time, duration_minutes, class_type, instructor_id, capacity)
select 2, '08:10', 50, 'funcional', id, 5 from instructors where name = 'Shayra';
insert into public.recurring_templates (day_of_week, start_time, duration_minutes, class_type, instructor_id, capacity)
select 2, '09:10', 50, 'funcional', id, 5 from instructors where name = 'Shayra';
insert into public.recurring_templates (day_of_week, start_time, duration_minutes, class_type, instructor_id, capacity)
select 2, '17:00', 50, 'funcional', id, 5 from instructors where name = 'Andrea';
insert into public.recurring_templates (day_of_week, start_time, duration_minutes, class_type, instructor_id, capacity)
select 2, '18:10', 50, 'pilates_reformer', id, 5 from instructors where name = 'Evelyn';
insert into public.recurring_templates (day_of_week, start_time, duration_minutes, class_type, instructor_id, capacity)
select 2, '19:10', 50, 'pilates_reformer', id, 5 from instructors where name = 'Evelyn';

-- Wednesday
insert into public.recurring_templates (day_of_week, start_time, duration_minutes, class_type, instructor_id, capacity)
select 3, '06:00', 50, 'funcional', id, 5 from instructors where name = 'Steph';
insert into public.recurring_templates (day_of_week, start_time, duration_minutes, class_type, instructor_id, capacity)
select 3, '07:00', 50, 'pilates_reformer', id, 5 from instructors where name = 'Pris';
insert into public.recurring_templates (day_of_week, start_time, duration_minutes, class_type, instructor_id, capacity)
select 3, '08:10', 50, 'funcional', id, 5 from instructors where name = 'Shayra';
insert into public.recurring_templates (day_of_week, start_time, duration_minutes, class_type, instructor_id, capacity)
select 3, '09:10', 50, 'barre', id, 5 from instructors where name = 'Jhovana';
insert into public.recurring_templates (day_of_week, start_time, duration_minutes, class_type, instructor_id, capacity)
select 3, '10:10', 50, 'reformer_restaurativo', id, 5 from instructors where name = 'Viry';
insert into public.recurring_templates (day_of_week, start_time, duration_minutes, class_type, instructor_id, capacity)
select 3, '17:00', 50, 'pilates_mat', id, 5 from instructors where name = 'Gaby';
insert into public.recurring_templates (day_of_week, start_time, duration_minutes, class_type, instructor_id, capacity)
select 3, '18:10', 50, 'barre', id, 5 from instructors where name = 'Pris';

-- Thursday
insert into public.recurring_templates (day_of_week, start_time, duration_minutes, class_type, instructor_id, capacity)
select 4, '07:00', 50, 'pilates_reformer', id, 5 from instructors where name = 'Gaby';
insert into public.recurring_templates (day_of_week, start_time, duration_minutes, class_type, instructor_id, capacity)
select 4, '08:10', 50, 'pilates_reformer', id, 5 from instructors where name = 'Paola';
insert into public.recurring_templates (day_of_week, start_time, duration_minutes, class_type, instructor_id, capacity)
select 4, '08:10', 50, 'funcional', id, 5 from instructors where name = 'Shayra';
insert into public.recurring_templates (day_of_week, start_time, duration_minutes, class_type, instructor_id, capacity)
select 4, '09:10', 50, 'funcional', id, 5 from instructors where name = 'Shayra';
insert into public.recurring_templates (day_of_week, start_time, duration_minutes, class_type, instructor_id, capacity)
select 4, '17:00', 50, 'funcional', id, 5 from instructors where name = 'Andrea';
insert into public.recurring_templates (day_of_week, start_time, duration_minutes, class_type, instructor_id, capacity)
select 4, '18:10', 50, 'pilates_reformer', id, 5 from instructors where name = 'Paola';
insert into public.recurring_templates (day_of_week, start_time, duration_minutes, class_type, instructor_id, capacity)
select 4, '19:10', 50, 'pilates_reformer', id, 5 from instructors where name = 'Paola';

-- Friday
insert into public.recurring_templates (day_of_week, start_time, duration_minutes, class_type, instructor_id, capacity)
select 5, '06:00', 50, 'funcional', id, 5 from instructors where name = 'Steph';
insert into public.recurring_templates (day_of_week, start_time, duration_minutes, class_type, instructor_id, capacity)
select 5, '07:00', 50, 'barre', id, 5 from instructors where name = 'Pris';
insert into public.recurring_templates (day_of_week, start_time, duration_minutes, class_type, instructor_id, capacity)
select 5, '08:10', 50, 'funcional', id, 5 from instructors where name = 'Andrea';
insert into public.recurring_templates (day_of_week, start_time, duration_minutes, class_type, instructor_id, capacity)
select 5, '09:10', 50, 'funcional', id, 5 from instructors where name = 'Andrea';
insert into public.recurring_templates (day_of_week, start_time, duration_minutes, class_type, instructor_id, capacity)
select 5, '09:10', 50, 'pilates_reformer', id, 5 from instructors where name = 'Gaby';
insert into public.recurring_templates (day_of_week, start_time, duration_minutes, class_type, instructor_id, capacity)
select 5, '10:10', 50, 'reformer_restaurativo', id, 5 from instructors where name = 'Viry';
insert into public.recurring_templates (day_of_week, start_time, duration_minutes, class_type, instructor_id, capacity)
select 5, '17:00', 50, 'barre', id, 5 from instructors where name = 'Paola';

-- Saturday
insert into public.recurring_templates (day_of_week, start_time, duration_minutes, class_type, instructor_id, capacity)
select 6, '09:10', 50, 'pilates_reformer', id, 5 from instructors where name = 'Paola';
insert into public.recurring_templates (day_of_week, start_time, duration_minutes, class_type, instructor_id, capacity)
select 6, '09:10', 50, 'pilates_mat', id, 5 from instructors where name = 'Gaby';
