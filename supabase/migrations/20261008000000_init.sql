-- Create extension for PostGIS
create extension if not exists postgis with schema extensions;

-- Function for automatically updating the updated_at column
create or replace function handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;
