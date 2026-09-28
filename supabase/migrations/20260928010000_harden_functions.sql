-- Supabase security advisor (lints 0028/0029): trigger functions must not be
-- callable via /rest/v1/rpc. Triggers keep working without EXECUTE for API roles.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.touch_updated_at() from public, anon, authenticated;

-- Performance advisor (lint 0001): cover the device_codes.user_id foreign key.
create index if not exists device_codes_user_idx on public.device_codes (user_id);
