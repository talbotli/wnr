-- Epics table
create table epics (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  priority text not null default 'Medium' check (priority in ('High', 'Medium', 'Low')),
  status text not null default 'Backlog' check (status in ('Backlog', 'Selected', 'Requirements', 'Dev', 'QA', 'Approval', 'Awaiting Release', 'Done')),
  site text check (site in ('WNR', 'ATS')),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tasks table (belongs to one Epic)
create table tasks (
  id uuid primary key default gen_random_uuid(),
  epic_id uuid not null references epics(id) on delete cascade,
  title text not null,
  description text,
  assignee_name text,
  assignee_email text,
  due_date date,
  completed boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Comments table (belongs to one Task)
create table comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  author text not null,
  body text not null,
  created_at timestamptz not null default now()
);

-- Auto-update updated_at on epics
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger epics_updated_at
  before update on epics
  for each row execute function update_updated_at();

create trigger tasks_updated_at
  before update on tasks
  for each row execute function update_updated_at();

-- Indexes for common queries
create index idx_epics_status on epics(status);
create index idx_epics_site on epics(site);
create index idx_tasks_epic_id on tasks(epic_id);
create index idx_tasks_assignee_email on tasks(assignee_email);
create index idx_comments_task_id on comments(task_id);

-- Enable Row Level Security (permissive for v1 — no auth)
alter table epics enable row level security;
alter table tasks enable row level security;
alter table comments enable row level security;

create policy "Allow all access to epics" on epics for all using (true) with check (true);
create policy "Allow all access to tasks" on tasks for all using (true) with check (true);
create policy "Allow all access to comments" on comments for all using (true) with check (true);
