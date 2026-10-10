-- Unit 09: WhatsApp Sync

create type public.message_direction as enum ('inbound', 'outbound');

create table public.messages (
    id uuid default gen_random_uuid() primary key,
    profile_id uuid references public.profiles(id) on delete set null,
    phone_number text not null,
    direction message_direction not null,
    raw_text text not null,
    parsed_intent text,
    parsed_json jsonb,
    created_at timestamptz not null default now()
);

-- RLS
alter table public.messages enable row level security;

-- Policies
create policy "Users can read their own messages" on public.messages
for select using (auth.uid() = profile_id);

-- Webhook will write to messages using the service role, so we don't necessarily need insert policies for users.
-- But just in case:
create policy "Users can insert their own messages" on public.messages
for insert with check (auth.uid() = profile_id);
