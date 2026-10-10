-- press_conference_items に配付資料（PDF）の URL を追加する
-- 発表項目（announcement）ごとに、市が公開している配付資料へのリンクを表示するために使う
alter table press_conference_items
  add column if not exists material_url text;

comment on column press_conference_items.material_url is '配付資料（PDF 等）の URL。主に announcement で使う。無い場合は null';
