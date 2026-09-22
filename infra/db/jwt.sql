-- 公式の supabase/supabase docker/volumes/db/jwt.sql のコピー
\set jwt_exp `echo "$JWT_EXP"`

ALTER DATABASE postgres SET "app.settings.jwt_exp" TO :'jwt_exp';
