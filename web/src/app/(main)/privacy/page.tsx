import type { Metadata } from "next";
import { Container } from "@/components/layouts/container";
import {
  LegalList,
  LegalPageLayout,
  LegalParagraph,
  LegalSectionTitle,
} from "@/components/layouts/legal-page-layout";
import { siteConfig } from "@/config/site.config";

export const metadata: Metadata = {
  title: `プライバシーポリシー | ${siteConfig.siteName}`,
  description: `${siteConfig.siteName}のプライバシーポリシー`,
};

export default function PrivacyPage() {
  return (
    <LegalPageLayout
      className="bg-transparent pt-24 md:pt-12"
      title="プライバシーポリシー"
      description={`${siteConfig.siteName}（以下「本サービス」）における個人情報およびご入力いただいた内容の取り扱いについて説明します。`}
    >
      <Container className="space-y-8">
        <LegalParagraph>
          本サービスは、{siteConfig.cityName}および{siteConfig.councilName}
          の公式サービスではありません。個人が運営する非公式のサービスです。
        </LegalParagraph>

        <section className="space-y-4">
          <LegalSectionTitle>第1条（運営者）</LegalSectionTitle>
          <LegalParagraph>
            本サービスは {siteConfig.operator.name}{" "}
            が個人として運営しています。お問い合わせ窓口は第10条のとおりです。
          </LegalParagraph>
        </section>

        <section className="space-y-4">
          <LegalSectionTitle>第2条（取得する情報）</LegalSectionTitle>
          <LegalList
            items={[
              "AIインタビューでの質問と回答の内容",
              "AIチャットでのやり取りの内容",
              "AIがインタビュー内容から作成した要約・ご意見の整理・立場や属性の推定結果",
              "有識者リストへの登録情報（氏名、所属・肩書、メールアドレス。登録された方のみ）",
              "ブラウザに保存される匿名の利用者識別子（第12条）",
              "AI機能の利用量の記録（利用日時、モデル名、処理量、費用。会話の本文は含みません）",
              "アクセスに伴うサーバーの記録（IPアドレス、ブラウザの種類、アクセス日時等）",
            ]}
          />
          <LegalParagraph>
            会員登録は不要です。有識者リストへの登録を除き、氏名・住所・電話番号・メールアドレスは取得しません。管理画面を利用する方の情報は第11条のとおりです。
          </LegalParagraph>
          <LegalParagraph className="font-bold">
            AIインタビューとAIチャットには、氏名・住所・連絡先・勤務先など、ご自身や他人を特定できる情報を入力しないでください。入力された内容はそのまま保存され、個人情報を自動で取り除く処理は行っていません。
          </LegalParagraph>
        </section>

        <section className="space-y-4">
          <LegalSectionTitle>第3条（利用目的）</LegalSectionTitle>
          <LegalList
            items={[
              `市民の声を整理し、${siteConfig.councilName}の議員や議員選挙の候補者に届けるため`,
              "議案の解説やサービスを改善するため",
              "不具合の調査、不正利用・過剰な利用の防止のため",
              "AI機能の費用を把握し、利用の上限を管理するため",
              "個人を特定できない形に集計し、結果を公表するため",
            ]}
          />
        </section>

        <section className="space-y-4">
          <LegalSectionTitle>第4条（インタビュー内容の閲覧）</LegalSectionTitle>
          <LegalParagraph>
            AIインタビューの内容は、{siteConfig.councilName}
            の議員や議員選挙の候補者が参照する場合があります。AIチャットのやり取りは、運営者のみが閲覧します。
          </LegalParagraph>
        </section>

        <section className="space-y-4">
          <LegalSectionTitle>第5条（国外の事業者への送信）</LegalSectionTitle>
          <LegalParagraph>
            AIインタビューとAIチャットに入力された内容は、AIの応答を作るため、米国の
            OpenAI, L.L.C.
            に送信されます。同社での取り扱いは同社のAPI利用規約とプライバシーポリシーに従い、本サービスはこれを確認・保証できません。国内の事業者だけでAIの応答を作ることは現時点では難しいため、この点をお知らせしたうえでご利用いただいています。
          </LegalParagraph>
          <LegalParagraph>
            アクセス解析ツールや広告配信事業者への情報提供は行っていません。
          </LegalParagraph>
        </section>

        <section className="space-y-4">
          <LegalSectionTitle>第6条（第三者への提供）</LegalSectionTitle>
          <LegalParagraph>
            第4条・第5条のほか、次の場合を除き、ご入力いただいた内容を第三者に提供しません。
          </LegalParagraph>
          <LegalList
            items={[
              "ご本人の同意がある場合",
              "個人を特定できない形に集計・加工した場合",
              "法令に基づく場合",
              "人の生命・身体・財産の保護に必要で、ご本人の同意を得ることが難しい場合",
            ]}
          />
        </section>

        <section className="space-y-4">
          <LegalSectionTitle>第7条（インタビュー結果の公開）</LegalSectionTitle>
          <LegalParagraph>
            ご本人がAIインタビューの結果の公開を許可すると、結果ページ（要約・ご意見の整理・やり取りの全文）は、そのURLを知っている人が閲覧できるようになります。本サービス上の一覧に掲載するのは、そのうち運営者が確認したものに限ります。公開を許可しない場合も、第4条の閲覧は行われます。
          </LegalParagraph>
        </section>

        <section className="space-y-4">
          <LegalSectionTitle>第8条（保存期間）</LegalSectionTitle>
          <LegalList
            items={[
              "AIインタビューの内容と要約：削除のお申し出があるまで保存します。過去の議案へのご意見を後から参照できるようにするためです",
              "有識者リストへの登録情報：削除のお申し出があるまで保存します",
              "AI機能の利用量の記録：期間を定めずに保存します",
              "管理画面の操作の記録（第11条）：期間を定めずに保存します",
            ]}
          />
        </section>

        <section className="space-y-4">
          <LegalSectionTitle>第9条（開示・削除等のご依頼）</LegalSectionTitle>
          <LegalParagraph>
            ご自身の情報の開示・訂正・削除・利用停止をご希望の場合は、第10条の窓口までご連絡ください。対応は情報の種類によって異なります。
          </LegalParagraph>
          <LegalList
            items={[
              "AIインタビューの内容と要約：削除に応じます。会員登録がないため、インタビュー後に表示される結果ページのURLをお知らせください。このURLをお持ちであることで、ご本人からのご依頼として扱います",
              "有識者リストへの登録情報：開示・訂正・削除に応じます。登録時のメールアドレスでご本人を確認します",
              "AIチャットのやり取り：どなたのものかを特定する手段がないため、個別の削除はお受けできません",
              "AI機能の利用量の記録：会話の本文を含まず、個人を特定できる情報ではないため、対象外です",
              "管理画面の操作の記録：第11条のとおりです",
            ]}
          />
          <LegalParagraph>
            削除の前に第4条の範囲で閲覧された内容には、削除の効果が及びません。
          </LegalParagraph>
        </section>

        <section className="space-y-4">
          <LegalSectionTitle>第10条（お問い合わせ窓口）</LegalSectionTitle>
          <LegalParagraph>
            {siteConfig.operator.name}
            <br />
            <a
              href={siteConfig.operator.contactUrl}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
            >
              {siteConfig.operator.contactUrl}
            </a>
          </LegalParagraph>
        </section>

        <section className="space-y-4">
          <LegalSectionTitle>
            第11条（管理画面を利用する方の情報）
          </LegalSectionTitle>
          <LegalParagraph>
            {siteConfig.councilName}
            の議員、議員選挙の立候補予定者、運営者が管理画面を利用する場合、次の情報を記録します。一般の利用者には関係しません。
          </LegalParagraph>
          <LegalList
            items={[
              "アカウントのメールアドレス、役割、所属会派",
              "議案の情報・議案の解説・会派見解を変更した記録（実行した方のメールアドレス・役割・所属会派、日時、変更前後の内容）",
            ]}
          />
          <LegalParagraph>
            議案の解説は書き方で印象を左右できるため、誰が何をどう変えたかを後から確かめられるようにしています。この記録は期間を定めずに保存し、アカウントの削除後も残ります。閲覧できるのは運営者です。
          </LegalParagraph>
        </section>

        <section className="space-y-4">
          <LegalSectionTitle>第12条（Cookie）</LegalSectionTitle>
          <LegalList
            items={[
              "議案解説の難易度の設定を覚えておくため（保持期間 1年）",
              "AIチャット・AIインタビューで利用者を区別する匿名の識別子を保つため",
            ]}
          />
          <LegalParagraph>
            アクセス解析や広告のための Cookie は使用していません。
          </LegalParagraph>
          <LegalParagraph>
            ブラウザの設定でCookieを無効にすると、Cookieの保存を拒否できます。ただし、その場合はAIチャットとAIインタビューをご利用いただけず、難易度の設定も保存されません。
          </LegalParagraph>
        </section>

        <section className="space-y-4">
          <LegalSectionTitle>第13条（本ポリシーの変更）</LegalSectionTitle>
          <LegalParagraph>
            本ポリシーは必要に応じて変更します。重要な変更は本サービス上でお知らせし、変更後の内容は掲載した時点から適用します。
          </LegalParagraph>
        </section>
      </Container>
    </LegalPageLayout>
  );
}
