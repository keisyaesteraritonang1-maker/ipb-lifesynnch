create table public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  filename text not null,
  size_bytes integer not null,
  mime text,
  extracted_text text not null,
  summary text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.documents to authenticated;
grant all on public.documents to service_role;
alter table public.documents enable row level security;
create policy "own documents" on public.documents for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  document_id uuid references public.documents(id) on delete cascade,
  config jsonb not null,
  questions jsonb not null,
  answers jsonb,
  score numeric,
  evaluation jsonb,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.quizzes to authenticated;
grant all on public.quizzes to service_role;
alter table public.quizzes enable row level security;
create policy "own quizzes" on public.quizzes for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.grade_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  course_name text not null default 'Mata Kuliah',
  components jsonb not null default '[]',
  thresholds jsonb not null default '[]',
  target_grade text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.grade_plans to authenticated;
grant all on public.grade_plans to service_role;
alter table public.grade_plans enable row level security;
create policy "own grade plans" on public.grade_plans for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);