-- Metered pay-as-you-go billing for developer API (after free tier included calls).
alter table public.developer_api_keys
  add column if not exists metered_billing_enabled boolean not null default false,
  add column if not exists overage_calls_this_month integer not null default 0,
  add column if not exists stripe_meter_subscription_id text;
