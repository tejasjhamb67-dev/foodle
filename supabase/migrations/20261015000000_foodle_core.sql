-- Foodle core schema (design system §13.5).
-- Content (items, clues, ingredients) is served from the app's server bundle, so clues never
-- reach the client before a puzzle ends. These tables hold accounts, plays and social data.
-- All writes go through the app's API (service role) after it validates the guess flow (§13.6);
-- row-level security limits what a signed-in client could read directly.

create table public.profiles (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 20),
  friend_code  text not null unique check (friend_code ~ '^[A-Z0-9]{6}$'),
  created_at   timestamptz not null default now()
);

create table public.plays (
  user_id     uuid not null references auth.users (id) on delete cascade,
  mode        text not null check (mode in ('dish', 'drink', 'cuisine')),
  edition     text not null check (edition in ('global', 'india')),
  number      integer not null check (number > 0),
  guesses     jsonb not null default '[]'::jsonb,
  squares     text[],
  clues_seen  smallint,
  guess_count smallint not null default 0 check (guess_count between 0 and 6),
  won         boolean not null default false,
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  solve_ms    integer,
  primary key (user_id, mode, edition, number)
);
create index plays_puzzle_idx on public.plays (mode, edition, number) where finished_at is not null;

create table public.friendships (
  user_a       uuid not null references auth.users (id) on delete cascade,
  user_b       uuid not null references auth.users (id) on delete cascade,
  status       text not null check (status in ('pending', 'accepted')),
  requested_by uuid not null references auth.users (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (user_a, user_b),
  check (user_a < user_b)
);
create index friendships_b_idx on public.friendships (user_b);

create table public.groups (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) between 2 and 30),
  owner      uuid not null references auth.users (id) on delete cascade,
  code       text not null unique check (code ~ '^[A-Z0-9]{6}$'),
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id  uuid not null references public.groups (id) on delete cascade,
  user_id   uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index group_members_user_idx on public.group_members (user_id);

-- Row-level security -----------------------------------------------------------------------

alter table public.profiles      enable row level security;
alter table public.plays         enable row level security;
alter table public.friendships   enable row level security;
alter table public.groups        enable row level security;
alter table public.group_members enable row level security;

-- Membership check that does not recurse through group_members' own policy.
create or replace function public.is_group_member(gid uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (select 1 from public.group_members m where m.group_id = gid and m.user_id = (select auth.uid()));
$$;
revoke all on function public.is_group_member(uuid) from public;
grant execute on function public.is_group_member(uuid) to authenticated;

-- Profiles: everyone signed in can read display names; you can edit your own name.
create policy "profiles readable" on public.profiles for select to authenticated using (true);
create policy "profiles update own" on public.profiles for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Plays: own rows only. Results are written by the server after validation.
create policy "plays read own" on public.plays for select to authenticated using (user_id = (select auth.uid()));

-- Friendships: own rows only.
create policy "friendships read own" on public.friendships for select to authenticated
  using ((select auth.uid()) in (user_a, user_b));

-- Groups: members read; owner writes.
create policy "groups members read" on public.groups for select to authenticated using (public.is_group_member(id));
create policy "groups owner update" on public.groups for update to authenticated
  using (owner = (select auth.uid())) with check (owner = (select auth.uid()));
create policy "groups owner delete" on public.groups for delete to authenticated using (owner = (select auth.uid()));
create policy "group members read" on public.group_members for select to authenticated using (public.is_group_member(group_id));

-- Never expose the friend code of other players through the API role.
revoke select on public.profiles from anon, authenticated;
grant select (user_id, display_name, created_at) on public.profiles to authenticated;
