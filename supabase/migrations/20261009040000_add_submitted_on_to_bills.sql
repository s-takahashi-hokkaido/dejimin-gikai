-- 議案の「提出日」の並び替えキー submitted_on を生成列で持つ
--
-- web は submitted_date が無い議案では published_at（日本時間の日付）を提出日として表示する。
-- DB の order と画面の表示がずれないよう、同じ規則の日付を生成列にして並び替えに使う。
alter table bills
  add column if not exists submitted_on date
  generated always as (
    coalesce(submitted_date, (published_at at time zone 'Asia/Tokyo')::date)
  ) stored;

comment on column bills.submitted_on is '並び替え用の提出日（生成列）。submitted_date、無ければ published_at の日本時間の日付';
