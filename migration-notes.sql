-- Personal markdown notes.
create table if not exists public.rootspace_notes (
  user_id uuid not null references auth.users on delete cascade,
  id text not null,
  title text not null default '',
  body text not null default '',
  updated_at timestamp with time zone not null default timezone('utc'::text, now()),
  primary key (user_id, id)
);
alter table public.rootspace_notes enable row level security;
create policy "Users can manage their own notes"
  on public.rootspace_notes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
