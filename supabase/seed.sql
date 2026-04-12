insert into public.residents (full_name, room_no, gender, family_contact)
values
  ('陳美玉', '201', 'female', '王小姐 0912-000-001'),
  ('林阿財', '202', 'male', '林先生 0912-000-002'),
  ('張秀蘭', '203', 'female', '張太太 0912-000-003')
on conflict do nothing;

-- 建立 auth.users 後，請把對應 UUID 補進 profiles
-- insert into public.profiles (id, full_name, role) values
--   ('護理師 UUID', '王護理師', 'nurse'),
--   ('社工 UUID', '李社工', 'social_worker'),
--   ('主管 UUID', '周主任', 'supervisor');
