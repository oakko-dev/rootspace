-- Monthly overrides and payment status for the installment dashboard.
create table if not exists public.financial_planner_installment_months (
  user_id uuid not null references auth.users on delete cascade,
  installment_id text not null,
  planner_year integer not null,
  planner_month smallint not null check (planner_month between 1 and 12),
  amount numeric(12, 2) not null default 0,
  paid boolean not null default false,
  updated_at timestamp with time zone not null default timezone('utc'::text, now()),
  primary key (user_id, installment_id, planner_year, planner_month),
  foreign key (user_id, installment_id) references public.financial_planner_installments (user_id, id) on delete cascade
);
alter table public.financial_planner_installment_months enable row level security;
create policy "Users can manage their own installment dashboard months"
  on public.financial_planner_installment_months for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
