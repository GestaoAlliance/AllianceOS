# AllianceOS — Auth + Tasks V10

## Authentication
- Login and signup use the same black/white/gray Alliance identity as the Cilo references.
- Signup is invite-only through `public.convite_de(email)`.
- A valid Supabase session is required before the application is released.
- The client never contains an administrator password or service-role key.
- Authorization is server/data-driven through `profiles`, `profile_brands` and RLS.

## Administrator bootstrap
`supabase/migrations/20260917_admin_bootstrap.sql`:
- explicitly invites the designated global administrator;
- removes the unsafe “first signup becomes admin” behavior;
- grants all active brands to the global admin;
- repairs/promotes the profile if the Auth user already exists.

## Task visual language
- Cool gray workspace (`#f1f2f3`), never beige/cream.
- White task workspace separated from the navigation rail with real margins.
- Thin neutral borders, strong black typography and compact controls.
- Liquid glass only for toolbar/context surfaces, never for long reading areas.
- The collaborator sees execution first: briefing, received material, delivery, conclude.
- Flow/dependencies remain available on demand and never compete with execution.
- Dark mode is the same system inverted, not a separate visual language.
