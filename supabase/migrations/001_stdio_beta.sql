create extension if not exists pgcrypto;

create type public.content_status as enum (
  'draft',
  'processing',
  'review',
  'verified',
  'published',
  'archived',
  'failed'
);

create type public.team_role as enum ('admin', 'editor', 'reviewer');

create table public.team_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role public.team_role not null default 'editor',
  created_at timestamptz not null default now()
);

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  semester smallint not null check (semester between 1 and 8),
  name text not null,
  code text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (semester, name)
);

create table public.units (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  unit_number smallint not null,
  title text not null,
  unique (subject_id, unit_number)
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  semester smallint not null default 3,
  subject_id uuid not null references public.subjects(id),
  title text not null,
  document_type text not null check (document_type in ('question_paper', 'faculty_material', 'notes', 'presentation')),
  exam_type text check (exam_type in ('CT1', 'CT2', 'SEMESTER')),
  exam_year smallint,
  storage_path text not null unique,
  mime_type text,
  page_count integer,
  status public.content_status not null default 'draft',
  uploaded_by uuid references auth.users(id),
  verified_by uuid references auth.users(id),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  semester smallint not null default 3,
  subject_id uuid not null references public.subjects(id),
  unit_id uuid references public.units(id),
  source_document_id uuid references public.documents(id) on delete set null,
  question_text text not null,
  normalized_concept text,
  marks smallint,
  page_number integer,
  status public.content_status not null default 'draft',
  verified_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.question_appearances (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  page_number integer,
  unique (question_id, document_id)
);

create table public.answers (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id),
  unit_id uuid references public.units(id),
  source_document_id uuid references public.documents(id) on delete set null,
  answer_text text not null,
  answer_type text not null default 'verified' check (answer_type in ('verified', 'generated_from_materials', 'general_ai')),
  marks smallint,
  source_page_start integer,
  source_page_end integer,
  status public.content_status not null default 'draft',
  verified_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.question_answer_mappings (
  question_id uuid not null references public.questions(id) on delete cascade,
  answer_id uuid not null references public.answers(id) on delete cascade,
  match_type text not null check (match_type in ('exact', 'semantic', 'rag')),
  confidence numeric(4,3) check (confidence between 0 and 1),
  primary key (question_id, answer_id)
);

insert into storage.buckets (id, name, public)
values ('academic-materials', 'academic-materials', false)
on conflict (id) do nothing;

create or replace function public.is_stdio_team()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.team_members where user_id = auth.uid()
  );
$$;

create or replace function public.can_publish()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.team_members
    where user_id = auth.uid() and role in ('admin', 'reviewer')
  );
$$;

create or replace function public.is_stdio_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.team_members
    where user_id = auth.uid() and role = 'admin'
  );
$$;

alter table public.team_members enable row level security;
alter table public.subjects enable row level security;
alter table public.units enable row level security;
alter table public.documents enable row level security;
alter table public.questions enable row level security;
alter table public.question_appearances enable row level security;
alter table public.answers enable row level security;
alter table public.question_answer_mappings enable row level security;

create policy "Published subjects are readable" on public.subjects
for select using (is_active or public.is_stdio_team());
create policy "Team manages subjects" on public.subjects
for all to authenticated using (public.is_stdio_team()) with check (public.is_stdio_team());

create policy "Units are readable" on public.units
for select using (true);
create policy "Team manages units" on public.units
for all to authenticated using (public.is_stdio_team()) with check (public.is_stdio_team());

create policy "Published documents are readable" on public.documents
for select using (status = 'published' or public.is_stdio_team());
create policy "Team creates documents" on public.documents
for insert to authenticated with check (public.is_stdio_team());
create policy "Team updates documents" on public.documents
for update to authenticated using (public.is_stdio_team()) with check (public.is_stdio_team());

create policy "Published questions are readable" on public.questions
for select using (status = 'published' or public.is_stdio_team());
create policy "Team manages questions" on public.questions
for all to authenticated using (public.is_stdio_team()) with check (public.is_stdio_team());

create policy "Published appearances are readable" on public.question_appearances
for select using (exists (
  select 1 from public.questions q
  where q.id = question_id and (q.status = 'published' or public.is_stdio_team())
));
create policy "Team manages appearances" on public.question_appearances
for all to authenticated using (public.is_stdio_team()) with check (public.is_stdio_team());

create policy "Published answers are readable" on public.answers
for select using (status = 'published' or public.is_stdio_team());
create policy "Team manages answers" on public.answers
for all to authenticated using (public.is_stdio_team()) with check (public.is_stdio_team());

create policy "Published mappings are readable" on public.question_answer_mappings
for select using (exists (
  select 1 from public.questions q
  join public.answers a on a.id = answer_id
  where q.id = question_id and q.status = 'published' and a.status = 'published'
) or public.is_stdio_team());
create policy "Team manages mappings" on public.question_answer_mappings
for all to authenticated using (public.is_stdio_team()) with check (public.is_stdio_team());

create policy "Team reads team membership" on public.team_members
for select to authenticated using (public.is_stdio_team());
create policy "Admins manage team membership" on public.team_members
for all to authenticated
using (public.is_stdio_admin())
with check (public.is_stdio_admin());

create policy "Published academic files are readable" on storage.objects
for select using (
  bucket_id = 'academic-materials' and exists (
    select 1 from public.documents d
    where d.storage_path = name and (d.status = 'published' or public.is_stdio_team())
  )
);

create policy "Team uploads academic files" on storage.objects
for insert to authenticated with check (
  bucket_id = 'academic-materials' and public.is_stdio_team()
);

insert into public.subjects (semester, name, code) values
  (3, 'Operating Systems', 'OS'),
  (3, 'Computer Organisation & Architecture', 'COA'),
  (3, 'Data Structures & Algorithms', 'DSA'),
  (3, 'Probability & Statistics', 'PS')
on conflict (semester, name) do nothing;

