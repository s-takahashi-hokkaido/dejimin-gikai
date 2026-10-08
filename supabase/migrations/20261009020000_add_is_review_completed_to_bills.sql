-- bills に解説の確認済みフラグを追加する
--
-- 議案の解説（bill_contents）は AI が下書きし、人が議案の原文と照らし合わせて確認してから載せる。
-- 確認を終えた議案は web でタイトル横に確認済みの印を出し、未確認の議案には
-- 「内容を確認しているところ」のお知らせを出す。
--
-- 本家（team-mirai/mirai-gikai #735）の同名カラムを移植したもの。
alter table bills
  add column if not exists is_review_completed boolean not null default false;

-- これまで公開してきた議案は、解説を確認してから公開する運用だったので確認済みとする
update bills set is_review_completed = true where publish_status = 'published';

comment on column bills.is_review_completed is '解説の内容確認が済んでいるか。false の議案は web に「確認中」のお知らせを出す';
