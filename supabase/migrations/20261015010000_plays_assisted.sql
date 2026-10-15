-- Opt-in multiple choice for the last two guesses. Set by the server when a signed-in player
-- opens the options; leaderboards rank unassisted solves first.
alter table public.plays add column if not exists assisted boolean not null default false;
