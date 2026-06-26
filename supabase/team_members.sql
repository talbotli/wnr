create table team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique
);

alter table team_members enable row level security;
create policy "Allow all access to team_members" on team_members for all using (true) with check (true);

insert into team_members (name, email) values
  ('Lisa T', 'ldtalb@gmail.com'),
  ('Barbara', 'barbara@functionaireux.com'),
  ('Eliana', 'eliana@functionaireux.com'),
  ('Dylan', 'dylan@digitalmammoth.ca'),
  ('Kevin', 'kevin@weinersltd.com'),
  ('Mel', 'melanie@functionaireux.com'),
  ('Gabie', 'gabie@functionaireux.com');
