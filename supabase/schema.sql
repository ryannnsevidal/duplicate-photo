-- PIX DUPE DETECT - COMPLETE SUPABASE SCHEMA
-- Run this in Supabase SQL Editor

-- USERS TABLE (extends auth.users)
create table if not exists users (
  id uuid primary key references auth.users on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- USER ROLES TABLE
create table if not exists user_roles (
  user_id uuid references users(id) on delete cascade,
  role text check (role in ('admin', 'user')),
  assigned_by uuid references users(id),
  assigned_at timestamp default now(),
  primary key (user_id, role)
);

-- FILE UPLOAD LOG
create table if not exists file_upload_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  filename text not null,
  original_filename text,
  file_size bigint,
  mime_type text,
  file_path text,
  uploaded_at timestamp default now(),
  source text check (source in ('local', 'gdrive', 'dropbox')) default 'local',
  status text check (status in ('pending', 'processing', 'completed', 'failed')) default 'pending',
  metadata jsonb
);

-- DUPLICATE CHECKS
create table if not exists duplicate_checks (
  id uuid primary key default gen_random_uuid(),
  file_id uuid references file_upload_logs(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  phash text,
  dhash text,
  avghash text,
  colorhash text,
  match_count int default 0,
  similarity_score float,
  is_duplicate boolean default false,
  match_details jsonb,
  checked_at timestamp default now()
);

-- USER SESSIONS TABLE
create table if not exists user_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  session_token text,
  ip_address inet,
  user_agent text,
  device_info text,
  screen_size text,
  browser_info text,
  location_info jsonb,
  created_at timestamp default now(),
  last_activity timestamp default now(),
  expires_at timestamp,
  is_active boolean default true
);

-- AUDIT LOG TABLE
create table if not exists audit_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id),
  action text not null,
  resource_type text,
  resource_id uuid,
  details jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp default now()
);

-- SYSTEM SETTINGS TABLE
create table if not exists system_settings (
  key text primary key,
  value jsonb,
  description text,
  updated_by uuid references users(id),
  updated_at timestamp default now()
);

-- ENABLE ROW LEVEL SECURITY
alter table users enable row level security;
alter table user_roles enable row level security;
alter table file_upload_logs enable row level security;
alter table duplicate_checks enable row level security;
alter table user_sessions enable row level security;
alter table audit_logs enable row level security;
alter table system_settings enable row level security;

-- RLS POLICIES FOR USERS
create policy "Users can view own profile"
  on users for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on users for update
  using (auth.uid() = id);

create policy "Admin can view all users"
  on users for select
  using (exists (
    select 1 from user_roles 
    where user_id = auth.uid() and role = 'admin'
  ));

-- RLS POLICIES FOR USER ROLES
create policy "Users can view own roles"
  on user_roles for select
  using (auth.uid() = user_id);

create policy "Admin can manage all roles"
  on user_roles for all
  using (exists (
    select 1 from user_roles 
    where user_id = auth.uid() and role = 'admin'
  ));

-- RLS POLICIES FOR FILE UPLOADS
create policy "Users can view own uploads"
  on file_upload_logs for select
  using (auth.uid() = user_id);

create policy "Users can create own uploads"
  on file_upload_logs for insert
  with check (auth.uid() = user_id);

create policy "Users can update own uploads"
  on file_upload_logs for update
  using (auth.uid() = user_id);

create policy "Admin can view all uploads"
  on file_upload_logs for select
  using (exists (
    select 1 from user_roles 
    where user_id = auth.uid() and role = 'admin'
  ));

-- RLS POLICIES FOR DUPLICATE CHECKS
create policy "Users can view own duplicate checks"
  on duplicate_checks for select
  using (auth.uid() = user_id);

create policy "Users can create own duplicate checks"
  on duplicate_checks for insert
  with check (auth.uid() = user_id);

create policy "Admin can view all duplicate checks"
  on duplicate_checks for select
  using (exists (
    select 1 from user_roles 
    where user_id = auth.uid() and role = 'admin'
  ));

-- RLS POLICIES FOR USER SESSIONS
create policy "Users can view own sessions"
  on user_sessions for select
  using (auth.uid() = user_id);

create policy "Users can create own sessions"
  on user_sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own sessions"
  on user_sessions for update
  using (auth.uid() = user_id);

create policy "Admin can view all sessions"
  on user_sessions for select
  using (exists (
    select 1 from user_roles 
    where user_id = auth.uid() and role = 'admin'
  ));

-- RLS POLICIES FOR AUDIT LOGS
create policy "Admin can view all audit logs"
  on audit_logs for select
  using (exists (
    select 1 from user_roles 
    where user_id = auth.uid() and role = 'admin'
  ));

create policy "System can insert audit logs"
  on audit_logs for insert
  with check (true);

-- RLS POLICIES FOR SYSTEM SETTINGS
create policy "Admin can manage system settings"
  on system_settings for all
  using (exists (
    select 1 from user_roles 
    where user_id = auth.uid() and role = 'admin'
  ));

-- CREATE FUNCTIONS

-- Function to automatically create user profile
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  
  -- Assign default user role
  insert into public.user_roles (user_id, role)
  values (new.id, 'user');
  
  -- Check if this is an admin user (based on email)
  if new.email in ('admin@example.com', 'admin@pixdupedetect.com') then
    insert into public.user_roles (user_id, role)
    values (new.id, 'admin')
    on conflict do nothing;
  end if;
  
  return new;
end;
$$ language plpgsql security definer;

-- Function to update user activity
create or replace function public.update_user_activity()
returns trigger as $$
begin
  update public.user_sessions
  set last_activity = now()
  where user_id = auth.uid() and is_active = true;
  
  return new;
end;
$$ language plpgsql security definer;

-- Function to log audit events
create or replace function public.log_audit_event(
  p_action text,
  p_resource_type text default null,
  p_resource_id uuid default null,
  p_details jsonb default null
)
returns void as $$
begin
  insert into public.audit_logs (
    user_id,
    action,
    resource_type,
    resource_id,
    details,
    ip_address,
    user_agent
  ) values (
    auth.uid(),
    p_action,
    p_resource_type,
    p_resource_id,
    p_details,
    inet_client_addr(),
    current_setting('request.headers')::json->>'user-agent'
  );
end;
$$ language plpgsql security definer;

-- CREATE TRIGGERS

-- Trigger for new user registration
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Trigger for updating timestamps
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_users_updated_at on users;
create trigger update_users_updated_at
  before update on users
  for each row execute procedure update_updated_at_column();

-- CREATE INDEXES FOR PERFORMANCE
create index if not exists idx_file_upload_logs_user_id on file_upload_logs(user_id);
create index if not exists idx_file_upload_logs_status on file_upload_logs(status);
create index if not exists idx_file_upload_logs_source on file_upload_logs(source);
create index if not exists idx_duplicate_checks_file_id on duplicate_checks(file_id);
create index if not exists idx_duplicate_checks_user_id on duplicate_checks(user_id);
create index if not exists idx_duplicate_checks_is_duplicate on duplicate_checks(is_duplicate);
create index if not exists idx_user_sessions_user_id on user_sessions(user_id);
create index if not exists idx_user_sessions_is_active on user_sessions(is_active);
create index if not exists idx_audit_logs_user_id on audit_logs(user_id);
create index if not exists idx_audit_logs_action on audit_logs(action);

-- INSERT DEFAULT SYSTEM SETTINGS
insert into system_settings (key, value, description) values
('max_file_size', '10485760', 'Maximum file size in bytes (10MB)'),
('allowed_file_types', '["image/jpeg", "image/png", "image/gif", "image/webp"]', 'Allowed MIME types for uploads'),
('duplicate_threshold', '0.85', 'Similarity threshold for duplicate detection'),
('session_timeout', '1800', 'Session timeout in seconds (30 minutes)'),
('max_uploads_per_user', '100', 'Maximum uploads per user'),
('enable_cloud_storage', 'true', 'Enable Google Drive and Dropbox integration')
on conflict (key) do nothing;

-- CREATE STORAGE BUCKETS (if using Supabase Storage)
insert into storage.buckets (id, name, public) values ('uploads', 'uploads', false) on conflict do nothing;

-- STORAGE POLICIES
create policy "Users can upload own files"
  on storage.objects for insert
  with check (bucket_id = 'uploads' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can view own files"
  on storage.objects for select
  using (bucket_id = 'uploads' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Admin can view all files"
  on storage.objects for select
  using (bucket_id = 'uploads' and exists (
    select 1 from user_roles 
    where user_id = auth.uid() and role = 'admin'
  ));

-- GRANT PERMISSIONS
grant usage on schema public to authenticated;
grant all on all tables in schema public to authenticated;
grant all on all sequences in schema public to authenticated;
grant execute on all functions in schema public to authenticated;

-- FINAL MESSAGE
select 'PIX DUPE DETECT SCHEMA SETUP COMPLETE! 🎉' as status;
