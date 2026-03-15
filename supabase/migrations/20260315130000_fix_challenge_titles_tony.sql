-- Fix old challenge titles that still use "tony"/"wizyt" instead of "podejść"
UPDATE weekly_challenges
SET title = 'Maszyna wysokich podejść',
    description = 'Najwięcej wysokich podejść (60-99, 100-139, 140-169, 170-180) w tygodniu'
WHERE challenge_type = 'most_tons'
  AND (title ILIKE '%ton%' OR description ILIKE '%ton%' OR title ILIKE '%wizyt%' OR description ILIKE '%wizyt%');
