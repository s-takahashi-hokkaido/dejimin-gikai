-- bills に議会での提出年月日・議決年月日を追加する
--
-- published_at はサイトでの公開日時で、議会の日付とは別物。
-- これまで札幌市の議案は published_at に本会議提出日を入れて「提出」と表示してきたため、
-- web は submitted_date が無ければ published_at を提出日として表示する（既存の表示は変わらない）。
-- 議決年月日は格納先が無かったので新設する。未議決なら null。
--
-- 福岡市版（mirai-gikai-fukuoka-city #113）の同名カラムに合わせている。
alter table bills
  add column if not exists submitted_date date,
  add column if not exists decided_date date;

comment on column bills.submitted_date is '議会への提出年月日（本会議提出日）。未設定なら published_at を提出日として表示する';
comment on column bills.decided_date is '議決年月日。未議決なら null';
