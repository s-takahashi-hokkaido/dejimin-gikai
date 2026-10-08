-- 管理画面のアカウント運用（招待・ロール変更・パスワード再設定）
--
-- 設計: docs/20260912_1736_管理画面ロール権限設計.md §7・§8・§9 C-4
--
--   1. アカウント一覧の DB 関数を admin_profiles から引くものに置き換える
--   2. is_admin() を admin_profiles で判定する
--   3. メールアドレスでのサインアップを塞ぐ Auth Hook（before_user_created）
--   4. admin_profiles の変更を監査ログに残す

-- ---------------------------------------------------------------------------
-- 1. アカウント一覧
--
-- get_admin_users() は app_metadata.roles に 'admin' を持つユーザーだけを返していた。
-- 利用資格の正は admin_profiles（C-1）なので、議員・出馬者も含めて admin_profiles から引く。
-- 戻り値の列が変わるため置き換えではなく作り直す
-- ---------------------------------------------------------------------------
drop function public.get_admin_users();

create function public.get_admin_accounts()
returns table (
  user_id uuid,
  email text,
  display_name text,
  role text,
  faction_id uuid,
  faction_name text,
  invited_at timestamptz,
  email_confirmed_at timestamptz,
  last_sign_in_at timestamptz,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.user_id,
    u.email::text,
    p.display_name,
    p.role,
    p.faction_id,
    f.display_name,
    u.invited_at,
    u.email_confirmed_at,
    u.last_sign_in_at,
    p.created_at
  from public.admin_profiles p
  join auth.users u on u.id = p.user_id
  left join public.factions f on f.id = p.faction_id
  order by p.created_at desc;
$$;

comment on function public.get_admin_accounts() is
  '管理画面のアカウント一覧（admin_profiles に auth.users のメールアドレス・招待・ログイン日時と会派名を付けたもの）';

-- 管理画面（Service Role）からのみ呼ぶ
revoke execute on function public.get_admin_accounts() from public;
revoke execute on function public.get_admin_accounts() from anon;
revoke execute on function public.get_admin_accounts() from authenticated;
grant execute on function public.get_admin_accounts() to service_role;

-- ---------------------------------------------------------------------------
-- 2. is_admin()
--
-- Storage の bill-thumbnails のポリシーが使う（ブラウザから直接アップロードするため）。
-- これまでは JWT の app_metadata.roles を見ていたので、admin_profiles だけを作った運営者
-- （本番の最初の管理者など）はアップロードできず、ロールを変えても app_metadata を
-- 合わせ直さない限り権限が残っていた。admin_profiles を見ればロールの変更がそのまま効く
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_profiles
    where user_id = auth.uid()
      and role = 'admin'
  );
$$;

comment on function public.is_admin() is 'ログイン中のユーザーが運営者（admin_profiles.role = admin）かどうか';

-- ---------------------------------------------------------------------------
-- 3. メールアドレスでのサインアップを塞ぐ
--
-- SMTP を設定すると確認メールが実際に届くため、メールを受け取れる人なら誰でも
-- 確認済みのアカウントを作れてしまう（docs/20260922_2100_ローカルdocker-compose検証結果.md §4-3）。
-- GOTRUE_DISABLE_SIGNUP は匿名ログイン（web の利用者）まで止めるので使えない。
--
-- GoTrue の before_user_created フックは、サインアップ・匿名ログイン・新規ユーザーへの招待で
-- ユーザーを作る直前に呼ばれ、admin API のユーザー作成（auth.admin.createUser）では呼ばれない。
-- 匿名ユーザーだけを通し、それ以外を拒否する。
-- 管理画面のアカウントは createUser で作ってから招待メールを送るので、このフックを通らない。
--
-- 有効にする設定: supabase/config.toml の [auth.hook.before_user_created]、
-- infra/compose.yml の GOTRUE_HOOK_BEFORE_USER_CREATED_*。
-- 関数が無い状態でフックを有効にすると匿名ログインまで失敗するので、先にこのマイグレーションを当てる
-- ---------------------------------------------------------------------------
create function public.hook_before_user_created(event jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select case
    when coalesce((event -> 'user' ->> 'is_anonymous')::boolean, false)
      then '{}'::jsonb
    else jsonb_build_object(
      'error', jsonb_build_object(
        'http_code', 403,
        'message', 'メールアドレスでの新規登録は受け付けていません'
      )
    )
  end;
$$;

comment on function public.hook_before_user_created(jsonb) is
  'GoTrue の before_user_created フック。匿名ユーザー以外の作成（メールでのサインアップなど）を拒否する';

-- GoTrue（supabase_auth_admin）だけが呼べるようにする
grant usage on schema public to supabase_auth_admin;
grant execute on function public.hook_before_user_created(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_before_user_created(jsonb) from public;
revoke execute on function public.hook_before_user_created(jsonb) from anon;
revoke execute on function public.hook_before_user_created(jsonb) from authenticated;

-- ---------------------------------------------------------------------------
-- 4. admin_profiles の変更を監査ログに残す
--
-- 議員のロールと所属会派は「誰がどの会派の見解を書けるか」を決める。
-- 会派見解の履歴に「A会派の議員が編集」と残っても、そのアカウントを誰がいつ作ったかを
-- 示せなければ「運営者が議員のアカウントを作って書いたのでは」に答えられない。
-- 運営者の操作（招待・ロール変更・削除）を他の変更と同じ監査ログに記録する
-- ---------------------------------------------------------------------------

-- admin_profiles には id 列が無いので、target_id は user_id で埋める
-- （ほかの記録対象のテーブルは user_id 列を持たないので結果は変わらない）
create or replace function public.record_admin_audit_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  headers jsonb;
  actor_header text;
  actor jsonb;
  before_row jsonb;
  after_row jsonb;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    before_row := to_jsonb(old);
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    after_row := to_jsonb(new);
  end if;

  -- updated_at だけが変わった更新（内容の変わらない保存）は記録しない
  if tg_op = 'UPDATE'
    and (before_row - 'updated_at') = (after_row - 'updated_at') then
    return null;
  end if;

  -- PostgREST 経由でなければ request.headers は未設定（直接操作）
  headers := nullif(current_setting('request.headers', true), '')::jsonb;
  actor_header := headers ->> 'x-audit-actor';
  if actor_header is not null then
    actor := convert_from(decode(actor_header, 'base64'), 'UTF8')::jsonb;
  end if;

  insert into public.admin_audit_logs (
    actor_user_id,
    actor_email,
    actor_role,
    actor_faction_id,
    action,
    target_table,
    target_id,
    before_data,
    after_data
  ) values (
    (actor ->> 'id')::uuid,
    actor ->> 'email',
    actor ->> 'role',
    (actor ->> 'factionId')::uuid,
    tg_table_name || '.' || lower(tg_op),
    tg_table_name,
    coalesce(
      after_row ->> 'id',
      before_row ->> 'id',
      after_row ->> 'user_id',
      before_row ->> 'user_id'
    )::uuid,
    before_row,
    after_row
  );

  return null;
end;
$$;

comment on function public.record_admin_audit_log() is
  '議案・議案コンテンツ・会派見解・付託委員会・管理画面のアカウントの変更を admin_audit_logs に記録するトリガー関数';

create trigger admin_profiles_audit_log
  after insert or update or delete on public.admin_profiles
  for each row execute function public.record_admin_audit_log();

-- ロール変更の時刻を残す（監査ログの「updated_at だけの更新は記録しない」もこれに合わせて働く）
create trigger update_admin_profiles_updated_at
  before update on public.admin_profiles
  for each row execute function public.update_updated_at_column();

comment on table public.admin_audit_logs is
  '管理画面からの変更履歴（議案・議案コンテンツ・会派見解・付託委員会・管理画面のアカウント）';
