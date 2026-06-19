-- Teachflow database schema

create table if not exists public.workspaces (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text not null,
  mission text,
  context_summary text,
  summary_message_count integer default 0,
  created_at timestamptz default now() not null
);

create index if not exists idx_workspaces_user_id on public.workspaces(user_id);

create table if not exists public.lessons (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null,
  slug text not null,
  content text not null,
  "order" integer not null default 0,
  version integer not null default 1,
  created_at timestamptz default now() not null
);

create index if not exists idx_lessons_workspace_id on public.lessons(workspace_id);
create unique index if not exists idx_lessons_workspace_slug on public.lessons(workspace_id, slug);

create table if not exists public.chat_messages (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz default now() not null
);

create index if not exists idx_chat_messages_workspace_id on public.chat_messages(workspace_id);

create table if not exists public.references_doc (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null,
  slug text not null,
  content text not null,
  created_at timestamptz default now() not null
);

create index if not exists idx_references_doc_workspace_id on public.references_doc(workspace_id);
create unique index if not exists idx_references_doc_workspace_slug on public.references_doc(workspace_id, slug);

create table if not exists public.learning_records (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null,
  content text not null,
  created_at timestamptz default now() not null
);

create index if not exists idx_learning_records_workspace_id on public.learning_records(workspace_id);

create table if not exists public.roadmaps (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade unique,
  title text not null,
  goal text,
  steps jsonb not null default '[]'::jsonb,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists public.lesson_versions (
  id uuid default gen_random_uuid() primary key,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  version integer not null,
  title text not null,
  content text not null,
  created_at timestamptz default now() not null
);

create index if not exists idx_lesson_versions_lesson_id on public.lesson_versions(lesson_id);

-- Enable Row Level Security
alter table public.workspaces enable row level security;
alter table public.lessons enable row level security;
alter table public.chat_messages enable row level security;
alter table public.references_doc enable row level security;
alter table public.learning_records enable row level security;
alter table public.roadmaps enable row level security;
alter table public.lesson_versions enable row level security;

-- RLS Policies: users can only access their own data via workspace ownership
create policy "Users can view own workspaces" on public.workspaces
  for select using (auth.uid() = user_id);
create policy "Users can insert own workspaces" on public.workspaces
  for insert with check (auth.uid() = user_id);
create policy "Users can update own workspaces" on public.workspaces
  for update using (auth.uid() = user_id);
create policy "Users can delete own workspaces" on public.workspaces
  for delete using (auth.uid() = user_id);

create policy "Users can view own lessons" on public.lessons
  for select using (exists (select 1 from public.workspaces where workspaces.id = lessons.workspace_id and workspaces.user_id = auth.uid()));
create policy "Users can insert lessons" on public.lessons
  for insert with check (exists (select 1 from public.workspaces where workspaces.id = lessons.workspace_id and workspaces.user_id = auth.uid()));
create policy "Users can update own lessons" on public.lessons
  for update using (exists (select 1 from public.workspaces where workspaces.id = lessons.workspace_id and workspaces.user_id = auth.uid()));
create policy "Users can delete own lessons" on public.lessons
  for delete using (exists (select 1 from public.workspaces where workspaces.id = lessons.workspace_id and workspaces.user_id = auth.uid()));

create policy "Users can view own chat messages" on public.chat_messages
  for select using (exists (select 1 from public.workspaces where workspaces.id = chat_messages.workspace_id and workspaces.user_id = auth.uid()));
create policy "Users can insert chat messages" on public.chat_messages
  for insert with check (exists (select 1 from public.workspaces where workspaces.id = chat_messages.workspace_id and workspaces.user_id = auth.uid()));
create policy "Users can delete own chat messages" on public.chat_messages
  for delete using (exists (select 1 from public.workspaces where workspaces.id = chat_messages.workspace_id and workspaces.user_id = auth.uid()));

create policy "Users can view own references" on public.references_doc
  for select using (exists (select 1 from public.workspaces where workspaces.id = references_doc.workspace_id and workspaces.user_id = auth.uid()));
create policy "Users can insert references" on public.references_doc
  for insert with check (exists (select 1 from public.workspaces where workspaces.id = references_doc.workspace_id and workspaces.user_id = auth.uid()));
create policy "Users can update own references" on public.references_doc
  for update using (exists (select 1 from public.workspaces where workspaces.id = references_doc.workspace_id and workspaces.user_id = auth.uid()));
create policy "Users can delete own references" on public.references_doc
  for delete using (exists (select 1 from public.workspaces where workspaces.id = references_doc.workspace_id and workspaces.user_id = auth.uid()));

create policy "Users can view own learning records" on public.learning_records
  for select using (exists (select 1 from public.workspaces where workspaces.id = learning_records.workspace_id and workspaces.user_id = auth.uid()));
create policy "Users can insert learning records" on public.learning_records
  for insert with check (exists (select 1 from public.workspaces where workspaces.id = learning_records.workspace_id and workspaces.user_id = auth.uid()));
create policy "Users can update own learning records" on public.learning_records
  for update using (exists (select 1 from public.workspaces where workspaces.id = learning_records.workspace_id and workspaces.user_id = auth.uid()));
create policy "Users can delete own learning records" on public.learning_records
  for delete using (exists (select 1 from public.workspaces where workspaces.id = learning_records.workspace_id and workspaces.user_id = auth.uid()));

create policy "Users can view own roadmaps" on public.roadmaps
  for select using (exists (select 1 from public.workspaces where workspaces.id = roadmaps.workspace_id and workspaces.user_id = auth.uid()));
create policy "Users can insert roadmaps" on public.roadmaps
  for insert with check (exists (select 1 from public.workspaces where workspaces.id = roadmaps.workspace_id and workspaces.user_id = auth.uid()));
create policy "Users can update own roadmaps" on public.roadmaps
  for update using (exists (select 1 from public.workspaces where workspaces.id = roadmaps.workspace_id and workspaces.user_id = auth.uid()));
create policy "Users can delete own roadmaps" on public.roadmaps
  for delete using (exists (select 1 from public.workspaces where workspaces.id = roadmaps.workspace_id and workspaces.user_id = auth.uid()));

create policy "Users can view own lesson versions" on public.lesson_versions
  for select using (exists (select 1 from public.lessons join public.workspaces on workspaces.id = lessons.workspace_id where lessons.id = lesson_versions.lesson_id and workspaces.user_id = auth.uid()));
create policy "Users can insert lesson versions" on public.lesson_versions
  for insert with check (exists (select 1 from public.lessons join public.workspaces on workspaces.id = lessons.workspace_id where lessons.id = lesson_versions.lesson_id and workspaces.user_id = auth.uid()));
