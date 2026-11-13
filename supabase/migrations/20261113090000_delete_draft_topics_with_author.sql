-- AIインタビュー広場: 作成者のアカウントを削除したら、その人の下書きの議題を消す
--
-- 設計: docs/20261112_2019_AIインタビュー広場_実装タスク分割.md（P2 で決めたこと）
--
-- interview_topics.author_user_id は on delete set null で、公開した議題（open / closed）は
-- オープン時点の写しで表示して残す（K7）。一方、下書きは作成者がいなくなると誰も編集もオープンもできないので、
-- 作成者の admin_profiles を消すときに一緒に消す。
--
-- アプリ（アカウント削除の Server Action）で消すのではなく DB のトリガーで行うのは、
--   - プロフィールの削除と同じトランザクションで消すため（片方だけ失敗して下書きだけが消える、
--     消している間に作られた下書きが作成者なしで残る、といったことが起きない）
--   - auth.users の削除からのカスケード（Supabase のダッシュボードやスクリプト）でも同じ規則が効くようにするため
--
-- 監査ログ（interview_topics.delete）の実行者は、admin_profiles を消したリクエストのもの（x-audit-actor）が残る。

create function public.delete_draft_interview_topics_of_author()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  delete from public.interview_topics
  where author_user_id = old.user_id
    and status = 'draft';
  return old;
end;
$$;

comment on function public.delete_draft_interview_topics_of_author() is
  '管理画面のアカウント（admin_profiles）を削除するとき、その人の下書きの議題（interview_topics）を消すトリガー関数。公開した議題は残す';

-- 外部キーの on delete set null より先に消す（BEFORE）。set null の後では誰の下書きか分からなくなる
create trigger admin_profiles_delete_draft_interview_topics
  before delete on public.admin_profiles
  for each row execute function public.delete_draft_interview_topics_of_author();
