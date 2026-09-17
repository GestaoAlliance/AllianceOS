# Admin bootstrap execution note

The administrator password must never be stored in Git, source code, migrations, or deployment variables.

Apply `supabase/migrations/20260917_admin_bootstrap.sql` to the AllianceOS Supabase project. Then create/sign up the invited administrator through the AllianceOS auth screen (or Supabase Auth). The migration makes that invited account active admin and grants all active brands.
