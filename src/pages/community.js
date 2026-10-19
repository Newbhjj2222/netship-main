import Head from "next/head";
import CommunityChat from "../components/CommunityChat";
import { useI18n } from "@/i18n/I18nProvider";

export default function CommunityPage() {
  const { t } = useI18n();

  return (
    <>
      <Head>
        <title>{t("Community | New Talents Stories Group")}</title>

        <meta
          name="description"
          content="Ganira n'abandi basomyi ba New Talents Stories Group, muganire ku nkuru, abanditsi n'ibice bishya."
        />

        <meta
          name="keywords"
          content="New Talents Stories, Community, Rwanda Stories, Kinyarwanda Stories, Inkuru Nyarwanda, Abasomyi, Abanditsi"
        />

        <meta
          name="robots"
          content="index, follow"
        />

        <meta
          property="og:title"
          content="Community | New Talents Stories Group"
        />

        <meta
          property="og:description"
          content="Ahantu abasomyi ba New Talents Stories Group bahurira bakaganira ku nkuru."
        />

        <meta
          property="og:type"
          content="website"
        />

        <meta
          property="og:url"
          content="https://newtalentsg.co.rw/community"
        />

        <meta
          property="og:image"
          content="https://newtalentsg.co.rw/logo.png"
        />

        <meta
          name="twitter:card"
          content="summary_large_image"
        />

        <meta
          name="twitter:title"
          content="Community | New Talents Stories Group"
        />

        <meta
          name="twitter:description"
          content="Ganira n'abandi basomyi ba New Talents Stories Group."
        />

        <link
          rel="canonical"
          href="https://newtalentsg.co.rw/community"
        />
      </Head>

      <main>
        <CommunityChat />
      </main>
    </>
  );
}
