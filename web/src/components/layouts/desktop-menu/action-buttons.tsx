import { LinkButton } from "@/components/top/link-button";
import { siteConfig } from "@/config/site.config";

/**
 * デスクトップメニュー: アクションボタン（サイドバー内）
 */
export function DesktopMenuActionButtons() {
  return (
    <div className="flex flex-col gap-3">
      {siteConfig.externalLinks.aboutNote && (
        <LinkButton
          href={siteConfig.externalLinks.aboutNote}
          icon={{
            src: "/icons/note-icon.png",
            alt: "note",
            width: 20,
            height: 20,
          }}
        >
          {siteConfig.siteName}とは
        </LinkButton>
      )}
    </div>
  );
}
