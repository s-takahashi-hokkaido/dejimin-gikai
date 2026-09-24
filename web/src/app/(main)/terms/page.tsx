import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layouts/container";
import {
  LegalList,
  LegalPageLayout,
  LegalParagraph,
  LegalSectionTitle,
} from "@/components/layouts/legal-page-layout";
import { siteConfig } from "@/config/site.config";

export const metadata: Metadata = {
  title: `利用規約 | ${siteConfig.siteName}`,
  description: `${siteConfig.siteName}の利用規約`,
};

function PrivacyLink() {
  return (
    <Link href="/privacy" className="underline underline-offset-2">
      プライバシーポリシー
    </Link>
  );
}

export default function TermsPage() {
  return (
    <LegalPageLayout
      title="利用規約"
      description={`${siteConfig.siteName}をご利用いただくにあたっての基本的なルールを定めています。`}
      className="pt-24 md:pt-12"
    >
      <Container className="space-y-10">
        <LegalParagraph>
          {siteConfig.siteName}
          （以下「本サービス」といいます。）をご利用いただく場合、以下の規約に同意いただいたものとみなします。
        </LegalParagraph>

        <section className="space-y-4">
          <LegalSectionTitle>第1条（本サービスの位置づけ）</LegalSectionTitle>
          <LegalParagraph>
            本サービスは、{siteConfig.operator.name}
            （以下「運営者」といいます。）が個人として運営する非公式のサービスです。
            {siteConfig.cityName}、{siteConfig.councilName}
            その他の公的機関が運営・監修するものではなく、これらと提携・後援の関係にもありません。また、特定の政党、政治団体、候補者を支援・推薦するものではありません。
          </LegalParagraph>
        </section>

        <section className="space-y-4">
          <LegalSectionTitle>第2条（禁止事項）</LegalSectionTitle>
          <LegalParagraph>
            本サービスのユーザー（以下「ユーザー」といいます。）は以下の行為を行ってはなりません。
          </LegalParagraph>
          <LegalList
            items={[
              "法令または公序良俗に反する行為",
              "本サービスの運営を妨げる行為",
              "本サービスの情報を改ざん・加工し、誤解を招く形で利用する行為",
              "運営者または第三者の権利・利益を侵害する行為",
              "サーバへの過剰な負荷、システムへの妨害・改ざん・侵入行為",
              "自動化ツール、ボット等による操作",
              "その他、運営者が不適切と判断する一切の行為",
            ]}
          />

          <div className="space-y-3">
            <LegalParagraph>
              特に、ユーザーは、本サービスの提供するAIチャット機能を不正に利用してはならず、以下の行為を行ってはなりません。
            </LegalParagraph>
            <LegalList
              items={[
                "システムプロンプトその他の内部設定を改変、削除、またはこれを推測しようとする行為",
                `AIに対して「${siteConfig.siteName}」や市議会議案等の関連テーマ以外の応答を生成させようとする行為`,
                "プロンプトインジェクション等、AIモデルを意図的に誤動作させる行為",
                "運営者が設けた利用制限、レートリミット、安全制御、規制回避ポリシー、フィルタリング機能、ログ取得・監視機構を不正に回避または無効化しようとする行為",
                "出力させた応答を、あたかもユーザー自身が執筆したかのように偽装して表明する行為",
                "出力内容を利用して、法令違反、詐欺、誹謗中傷、わいせつ、差別、暴力助長等の有害行為を行うこと",
              ]}
            />
          </div>
        </section>

        <section className="space-y-4">
          <LegalSectionTitle>第3条（知的財産権）</LegalSectionTitle>
          <LegalParagraph>
            本サービスのソースコードは、GNU Affero General Public License
            version
            3（AGPL-3.0）のもとで公開しており、同ライセンスに従って利用できます。ソースコードはフッターのリンクから取得できます。
          </LegalParagraph>
          <LegalParagraph>
            本サービスに掲載する解説文・画像等のコンテンツの権利は、運営者または正当な権利者に帰属します。ユーザーは私的利用の範囲を超えて使用してはなりません。
          </LegalParagraph>
          <LegalParagraph>
            AIインタビューの回答の著作権は回答者に帰属します。運営者は、本サービスの目的の範囲内で回答を利用できるものとします。
          </LegalParagraph>
        </section>

        <section className="space-y-4">
          <LegalSectionTitle>第4条（無保証）</LegalSectionTitle>
          <LegalParagraph>
            運営者は、本サービスが継続して提供されること、掲載する議案の情報やAIが作成した解説・要約・応答が正確・最新・完全であることを保証しません。AIが作成した内容には事実と異なるものが含まれることがあります。議案について正確な情報が必要な場合は、
            <a
              href={siteConfig.councilBaseUrl}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
            >
              {siteConfig.councilName}の公式サイト
            </a>
            をご確認ください。
          </LegalParagraph>
          <LegalParagraph>
            AIへの入力内容は国外の事業者に送信されます（
            <PrivacyLink />
            第5条）。
          </LegalParagraph>
        </section>

        <section className="space-y-4">
          <LegalSectionTitle>
            第5条（インタビュー内容の取り扱い）
          </LegalSectionTitle>
          <LegalParagraph>
            AIインタビューの内容は、{siteConfig.councilName}
            の議員や議員選挙の候補者が参照する場合があります（
            <PrivacyLink />
            第4条）。
          </LegalParagraph>
        </section>

        <section className="space-y-4">
          <LegalSectionTitle>第6条（管理画面の利用）</LegalSectionTitle>
          <LegalParagraph>
            管理画面を利用する議員、立候補予定者および運営者は、アカウントのメールアドレス・役割・所属会派と、議案の情報・解説・会派見解を変更した記録（変更前後の内容を含む）が期間を定めずに保存されることに同意するものとします（
            <PrivacyLink />
            第11条）。
          </LegalParagraph>
        </section>

        <section className="space-y-4">
          <LegalSectionTitle>第7条（サービスの変更・停止）</LegalSectionTitle>
          <LegalParagraph>
            運営者は、ユーザーへの事前通知なく本サービスの内容を変更・停止できるものとし、それにより生じた損害について一切の責任を負いません。
          </LegalParagraph>
        </section>

        <section className="space-y-4">
          <LegalSectionTitle>第8条（規約の変更）</LegalSectionTitle>
          <LegalParagraph>
            運営者は必要に応じて本規約を変更することができ、変更後にユーザーが本サービスを利用した場合、当該変更に同意したものとみなします。
          </LegalParagraph>
        </section>

        <section className="space-y-4">
          <LegalSectionTitle>第9条（準拠法・管轄）</LegalSectionTitle>
          <LegalParagraph>
            本規約は日本法に準拠し、本サービスに関連して生じる一切の紛争については、
            {siteConfig.operator.jurisdiction}
            を第一審の専属的合意管轄裁判所とします。
          </LegalParagraph>
        </section>
      </Container>
    </LegalPageLayout>
  );
}
