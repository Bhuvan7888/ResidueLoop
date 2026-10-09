-- Unit 09: every WhatsApp message in and out, shown in the farmer's activity timeline.
-- Full phone numbers live in profiles only, so only a masked form is kept here.

create table public.messages (
  id uuid default gen_random_uuid() primary key,
  provider_message_id text,
  profile_id uuid references public.profiles(id) on delete set null,
  phone_masked text not null,
  direction text not null check (direction in ('in', 'out')),
  raw_text text not null,
  parsed_json jsonb,
  intent text,
  linked_record_type text,
  linked_record_id uuid,
  created_at timestamptz not null default now()
);

-- Replay protection: the same provider message id can be stored once.
create unique index messages_provider_message_id_key
  on public.messages (provider_message_id) where provider_message_id is not null;
create index messages_profile_created_idx on public.messages (profile_id, created_at desc);

alter table public.messages enable row level security;

-- A farmer reads only their own conversation. All writes come from the API (service role).
create policy "Users read own messages" on public.messages
  for select using (profile_id = auth.uid());

revoke insert, update, delete on public.messages from anon, authenticated;
