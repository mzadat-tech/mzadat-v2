-- Enable Supabase Realtime for the notifications table
-- This is required for the frontend's postgres_changes subscription to work
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
