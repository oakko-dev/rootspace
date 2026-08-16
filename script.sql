-- Relational tables for personal financial planner data.
-- Run this in a fresh Supabase project, or migrate old public.financial_planner.data rows first.

create table public.financial_planner_cards (
  user_id uuid not null references auth.users on delete cascade,
  id text not null,
  name text not null,
  color text not null default '#65d9f2',
  updated_at timestamp with time zone not null default timezone('utc'::text, now()),
  primary key (user_id, id),
  unique (user_id, name)
);

create table public.financial_planner_income (
  user_id uuid not null references auth.users on delete cascade,
  id text not null,
  planner_year integer not null,
  name text not null,
  notes text not null default '',
  monthly numeric(12, 2) not null default 0,
  updated_at timestamp with time zone not null default timezone('utc'::text, now()),
  primary key (user_id, id)
);

create table public.financial_planner_deductions (
  user_id uuid not null references auth.users on delete cascade,
  id text not null,
  planner_year integer not null,
  name text not null,
  notes text not null default '',
  monthly numeric(12, 2) not null default 0,
  updated_at timestamp with time zone not null default timezone('utc'::text, now()),
  primary key (user_id, id)
);

create table public.financial_planner_expenses (
  user_id uuid not null references auth.users on delete cascade,
  id text not null,
  planner_year integer not null,
  name text not null,
  notes text not null default '',
  amount numeric(12, 2) not null default 0,
  expense_type text not null default 'essential',
  icon text not null default 'HelpCircle',
  updated_at timestamp with time zone not null default timezone('utc'::text, now()),
  primary key (user_id, id)
);

create table public.financial_planner_installments (
  user_id uuid not null references auth.users on delete cascade,
  id text not null,
  planner_year integer not null,
  card_id text not null,
  name text not null,
  notes text not null default '',
  monthly numeric(12, 2) not null default 0,
  start_month date not null,
  end_month date not null,
  updated_at timestamp with time zone not null default timezone('utc'::text, now()),
  primary key (user_id, id),
  foreign key (user_id, card_id)
    references public.financial_planner_cards (user_id, id)
    on delete cascade
);

create table public.financial_planner_income_actuals (
  user_id uuid not null references auth.users on delete cascade,
  income_id text not null,
  planner_year integer not null,
  planner_month smallint not null check (planner_month between 1 and 12),
  amount numeric(12, 2) not null default 0,
  updated_at timestamp with time zone not null default timezone('utc'::text, now()),
  primary key (user_id, income_id, planner_year, planner_month),
  foreign key (user_id, income_id)
    references public.financial_planner_income (user_id, id)
    on delete cascade
);

create table public.financial_planner_deduction_actuals (
  user_id uuid not null references auth.users on delete cascade,
  deduction_id text not null,
  planner_year integer not null,
  planner_month smallint not null check (planner_month between 1 and 12),
  amount numeric(12, 2) not null default 0,
  updated_at timestamp with time zone not null default timezone('utc'::text, now()),
  primary key (user_id, deduction_id, planner_year, planner_month),
  foreign key (user_id, deduction_id)
    references public.financial_planner_deductions (user_id, id)
    on delete cascade
);

-- One row per expense/month. Existing fixed expense amounts are used as the
-- initial planned value when this table is populated during migration.
create table public.financial_planner_expense_months (
  user_id uuid not null references auth.users on delete cascade,
  item_id text not null,
  planner_year integer not null,
  planner_month smallint not null check (planner_month between 1 and 12),
  planned_amount numeric(12, 2) not null default 0,
  actual_amount numeric(12, 2) not null default 0,
  updated_at timestamp with time zone not null default timezone('utc'::text, now()),
  primary key (user_id, item_id, planner_year, planner_month),
  foreign key (user_id, item_id)
    references public.financial_planner_expenses (user_id, id)
    on delete cascade
);

alter table public.financial_planner_cards enable row level security;
alter table public.financial_planner_income enable row level security;
alter table public.financial_planner_deductions enable row level security;
alter table public.financial_planner_expenses enable row level security;
alter table public.financial_planner_installments enable row level security;
alter table public.financial_planner_income_actuals enable row level security;
alter table public.financial_planner_deduction_actuals enable row level security;
alter table public.financial_planner_expense_months enable row level security;

create policy "Users can view their own planner cards"
  on public.financial_planner_cards for select
  using (auth.uid() = user_id);

create policy "Users can insert their own planner cards"
  on public.financial_planner_cards for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own planner cards"
  on public.financial_planner_cards for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own planner cards"
  on public.financial_planner_cards for delete
  using (auth.uid() = user_id);

create policy "Users can view their own planner income"
  on public.financial_planner_income for select
  using (auth.uid() = user_id);

create policy "Users can insert their own planner income"
  on public.financial_planner_income for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own planner income"
  on public.financial_planner_income for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own planner income"
  on public.financial_planner_income for delete
  using (auth.uid() = user_id);

create policy "Users can view their own planner deductions"
  on public.financial_planner_deductions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own planner deductions"
  on public.financial_planner_deductions for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own planner deductions"
  on public.financial_planner_deductions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own planner deductions"
  on public.financial_planner_deductions for delete
  using (auth.uid() = user_id);

create policy "Users can view their own planner expenses"
  on public.financial_planner_expenses for select
  using (auth.uid() = user_id);

create policy "Users can insert their own planner expenses"
  on public.financial_planner_expenses for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own planner expenses"
  on public.financial_planner_expenses for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own planner expenses"
  on public.financial_planner_expenses for delete
  using (auth.uid() = user_id);

create policy "Users can view their own planner installments"
  on public.financial_planner_installments for select
  using (auth.uid() = user_id);

create policy "Users can insert their own planner installments"
  on public.financial_planner_installments for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own planner installments"
  on public.financial_planner_installments for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own planner installments"
  on public.financial_planner_installments for delete
  using (auth.uid() = user_id);

create policy "Users can view their own planner income actuals"
  on public.financial_planner_income_actuals for select
  using (auth.uid() = user_id);

create policy "Users can insert their own planner income actuals"
  on public.financial_planner_income_actuals for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own planner income actuals"
  on public.financial_planner_income_actuals for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own planner income actuals"
  on public.financial_planner_income_actuals for delete
  using (auth.uid() = user_id);

create policy "Users can view their own planner deduction actuals"
  on public.financial_planner_deduction_actuals for select
  using (auth.uid() = user_id);

create policy "Users can insert their own planner deduction actuals"
  on public.financial_planner_deduction_actuals for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own planner deduction actuals"
  on public.financial_planner_deduction_actuals for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own planner deduction actuals"
  on public.financial_planner_deduction_actuals for delete
  using (auth.uid() = user_id);

create policy "Users can view their own planner expense months"
  on public.financial_planner_expense_months for select
  using (auth.uid() = user_id);

create policy "Users can insert their own planner expense months"
  on public.financial_planner_expense_months for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own planner expense months"
  on public.financial_planner_expense_months for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own planner expense months"
  on public.financial_planner_expense_months for delete
  using (auth.uid() = user_id);

-- Relational tables for the Rootspace bookmark start page.

create table public.rootspace_bookmark_collections (
  user_id uuid not null references auth.users on delete cascade,
  id text not null,
  name text not null,
  description text not null default '',
  position integer not null default 0,
  color text not null default '#7dd3fc',
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now()),
  primary key (user_id, id)
);

create table public.rootspace_bookmarks (
  user_id uuid not null references auth.users on delete cascade,
  id text not null,
  collection_id text not null,
  title text not null,
  url text not null,
  favicon_url text not null default '',
  description text not null default '',
  position integer not null default 0,
  is_favorite boolean not null default false,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now()),
  primary key (user_id, id),
  foreign key (user_id, collection_id)
    references public.rootspace_bookmark_collections (user_id, id)
    on delete cascade
);

-- Safe migration for databases created before bookmark favicons were persisted.
alter table public.rootspace_bookmarks
  add column if not exists favicon_url text not null default '';

create index rootspace_bookmark_collections_user_position_idx
  on public.rootspace_bookmark_collections (user_id, position);

create index rootspace_bookmarks_user_collection_position_idx
  on public.rootspace_bookmarks (user_id, collection_id, position);

alter table public.rootspace_bookmark_collections enable row level security;
alter table public.rootspace_bookmarks enable row level security;

create policy "Users can view their own bookmark collections"
  on public.rootspace_bookmark_collections for select
  using (auth.uid() = user_id);

create policy "Users can insert their own bookmark collections"
  on public.rootspace_bookmark_collections for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own bookmark collections"
  on public.rootspace_bookmark_collections for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own bookmark collections"
  on public.rootspace_bookmark_collections for delete
  using (auth.uid() = user_id);

create policy "Users can view their own bookmarks"
  on public.rootspace_bookmarks for select
  using (auth.uid() = user_id);

create policy "Users can insert their own bookmarks"
  on public.rootspace_bookmarks for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own bookmarks"
  on public.rootspace_bookmarks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own bookmarks"
  on public.rootspace_bookmarks for delete
  using (auth.uid() = user_id);
