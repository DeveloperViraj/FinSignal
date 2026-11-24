-- Give the backend's service role explicit privileges on every FinSignal table.
--
-- The persistence model is unchanged: the only client is the FastAPI backend,
-- which connects with the service-role key; anon and authenticated stay locked
-- out (RLS on, no policies, privileges revoked in the earlier migrations).
--
-- Why this exists: Supabase projects created before 2025 granted new public
-- tables to anon, authenticated and service_role automatically, so the earlier
-- migrations only had to revoke the first two. Newer projects grant nothing by
-- default ("expose new tables" off). On such a project every table here answered
-- the backend with `42501 permission denied`, and watchlists, alerts, saved
-- research and paper orders all failed. Granting to service_role alone keeps the
-- browser roles closed on both kinds of project. On an older project the grants
-- already exist and this is a no-op.

grant usage on schema public to service_role;

grant select, insert, update, delete on table
  public.profiles,
  public.watchlists,
  public.watchlist_items,
  public.analysis_history,
  public.saved_reports,
  public.portfolio_positions,
  public.user_preferences,
  public.research_sessions,
  public.session_notes,
  public.price_alerts,
  public.alert_events,
  public.notifications,
  public.paper_orders
to service_role;

-- PostgREST caches the schema; make it see the new privileges immediately.
notify pgrst, 'reload schema';
