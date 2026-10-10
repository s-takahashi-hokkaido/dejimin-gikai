import { LARGE_TEXT_CLASS, TEXT_SIZE_STORAGE_KEY } from "./storage";

/**
 * 保存済みの「文字を大きくする」設定を、描画前に <html> へ反映する。
 * React の描画後に反映すると一瞬小さい文字が見えるため、インラインスクリプトで行う。
 */
export function TextSizeInitializer() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `(function(){try{if(localStorage.getItem(${JSON.stringify(TEXT_SIZE_STORAGE_KEY)})==='true'){document.documentElement.classList.add(${JSON.stringify(LARGE_TEXT_CLASS)});}}catch(e){}})();`,
      }}
    />
  );
}
