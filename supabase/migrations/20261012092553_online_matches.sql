-- Online 2-player matches: record them as difficulty 'online' with the opponent's name.
alter table public.matches drop constraint if exists matches_difficulty_check;
alter table public.matches
  add constraint matches_difficulty_check check (difficulty in ('easy', 'normal', 'hard', 'online'));
alter table public.matches
  add column opponent_name text check (char_length(opponent_name) between 2 and 16);
