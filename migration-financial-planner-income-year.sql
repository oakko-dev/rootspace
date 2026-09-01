-- Scope financial planner income IDs by year on an existing database.
-- Run this once after the original script.sql schema has been created.

begin;

alter table public.financial_planner_income
  alter column monthly drop default,
  alter column monthly type jsonb using to_jsonb(monthly),
  alter column monthly set default '0'::jsonb;

alter table public.financial_planner_deductions
  alter column monthly drop default,
  alter column monthly type jsonb using to_jsonb(monthly),
  alter column monthly set default '0'::jsonb;

alter table public.financial_planner_income_actuals
  drop constraint if exists financial_planner_income_actuals_user_id_income_id_fkey;

alter table public.financial_planner_income
  drop constraint if exists financial_planner_income_pkey;

alter table public.financial_planner_income
  add constraint financial_planner_income_pkey
  primary key (user_id, id, planner_year);

alter table public.financial_planner_income_actuals
  add constraint financial_planner_income_actuals_user_id_income_id_planner_year_fkey
  foreign key (user_id, income_id, planner_year)
  references public.financial_planner_income (user_id, id, planner_year)
  on delete cascade;

commit;
