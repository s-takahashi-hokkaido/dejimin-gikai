-- 公式の supabase/supabase docker/volumes/db/roles.sql を元にしている。
-- supabase_functions_admin は webhooks.sql（functions 用、本構成では使わない）が作るロールなので外した。
\set pgpass `echo "$POSTGRES_PASSWORD"`

ALTER USER authenticator WITH PASSWORD :'pgpass';
ALTER USER pgbouncer WITH PASSWORD :'pgpass';
ALTER USER supabase_auth_admin WITH PASSWORD :'pgpass';
ALTER USER supabase_storage_admin WITH PASSWORD :'pgpass';
