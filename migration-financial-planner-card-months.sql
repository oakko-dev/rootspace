-- Card-level payment status for the financial planner dashboard.
create table if not exists public.financial_planner_card_months (
  user_id uuid not null references auth.users on delete cascade,
  card_id text not null,
  planner_year integer not null,
  planner_month smallint not null check (planner_month between 1 and 12),
  paid boolean not null default false,
  updated_at timestamp with time zone not null default timezone('utc'::text, now()),
  primary key (user_id, card_id, planner_year, planner_month),
  foreign key (user_id, card_id)
    references public.financial_planner_cards (user_id, id)
    on delete cascade
);

alter table public.financial_planner_card_months enable row level security;

create policy "Users can manage their own card payment months"
  on public.financial_planner_card_months for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Preserve legacy payment history only when every installment on a card was paid.
insert into public.financial_planner_card_months (user_id, card_id, planner_year, planner_month, paid)
select installment_rows.user_id,
  installment_rows.card_id,
  installment_rows.planner_year,
  installment_rows.planner_month,
  true
from (
  select expected.user_id, expected.card_id,
    extract(year from expected.month_start)::integer as planner_year,
    extract(month from expected.month_start)::smallint as planner_month,
    bool_and(coalesce(legacy.paid, false)) as all_paid
  from (
    select i.user_id, i.card_id, i.id,
      generate_series(
        date_trunc('month', i.start_month),
        date_trunc('month', i.end_month),
        interval '1 month'
      ) as month_start
    from public.financial_planner_installments i
  ) expected
  left join public.financial_planner_installment_months legacy
    on legacy.user_id = expected.user_id
    and legacy.installment_id = expected.id
    and legacy.planner_year = extract(year from expected.month_start)::integer
    and legacy.planner_month = extract(month from expected.month_start)::smallint
  group by expected.user_id, expected.card_id, expected.month_start
) installment_rows
where installment_rows.all_paid
on conflict (user_id, card_id, planner_year, planner_month) do nothing;
