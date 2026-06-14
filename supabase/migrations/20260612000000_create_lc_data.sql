create table if not exists lc_data (
  key text primary key,
  value jsonb not null default '[]'::jsonb
);
