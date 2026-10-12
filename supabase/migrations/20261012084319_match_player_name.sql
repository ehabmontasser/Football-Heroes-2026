-- The player's chosen display name at the time of the match.
alter table public.matches
  add column player_name text check (char_length(player_name) between 2 and 16);
