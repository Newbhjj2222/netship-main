import Head from "next/head";
import styles from "@/styles/injiza.module.css";
import {
  FaMoneyBillWave,
  FaEye,
  FaGift,
  FaShareAlt,
  FaArrowLeft,
  FaInfoCircle,
  FaCheckCircle,
  FaStar,
  FaTrophy,
} from "react-icons/fa";
import { useRouter } from "next/router";
import LinkComponent from "@/components/Link";
import { useI18n } from "@/i18n/I18nProvider";

export default function Injiza() {
  const { t } = useI18n();

  const router = useRouter();

  const baseUrl = "https://newtalentsg.com";
  const currentUrl = `${baseUrl}${router.asPath}`;

  // FAQ Data
  const faqs = [
    {
      question: "Ni buryo ki umwanditsi yinjiza amafaranga kuri NewTalentsG?",
      answer:
        "Umwanditsi yinjiza amafaranga binyuze mu buryo butandukanye: Premium Stories (inkuru zishyurwa), views z'inkuru, bonus buri kwezi, ndetse no muri Revenue Sharing. Umwanditsi yinjiza amafaranga bitewe n'uko inkuru ze zisomwa ndetse n'ubwiza bwazo.",
    },
    {
      question: "Ni iyihe gahunda y'ishyirwa ry'amafaranga ikoreshwa kuri NewTalentsG?",
      answer:
        "NewTalentsG ikoresha gahunda ya Revenue Sharing n'ishyirwa ry'amafaranga akurikije views. Umwanditsi yinjiza amafaranga akurikije umubare w'abasomyi b'inkuru ze ndetse n'umugabane w'amafaranga yinjijwe kuri Premium Stories.",
    },
    {
      question: "Ni iki Premium Stories kandi bigira iki ku nyungu y'umwanditsi?",
      answer:
        "Premium Stories ni inkuru zishyurwa zisabwa umusomyi kwishyura mbere yo kuzisoma. Umwanditsi yinjiza amafaranga akurikije umubare w'abishyuriye gusoma inkuru ye, agahabwa umugabane w'amafaranga yinjijwe.",
    },
    {
      question: "Ni gute Revenue Sharing ikora kuri NewTalentsG?",
      answer:
        "Revenue Sharing ni gahunda umwanditsi yinjiza amafaranga akurikije umugabane w'inyungu z'urubuga. Abanditsi bakomeye bahabwa umugabane munini, kandi biyubaha hakurikijwe amabwiriza ya gahunda.",
    },
    {
      question: "Ni angahe amafaranga umwanditsi yinjiza ku nkuru isomwa 500 views?",
      answer:
        "Ku nkuru isomwa 500 views, umwanditsi yinjiza amafaranga angana na 100 NES. Iyo inkuru ibonye views nyinshi, umwanditsi yinjiza amafaranga menshi, akagera ku 800 NES ku nkuru zisomwa 10,000+ views.",
    },
    {
      question: "Ni iki NES kandi gikoreshwa iki?",
      answer:
        "NES ni ifaranga ry'imigambi ry'urubuga rwa NewTalentsG. Umwanditsi yinjiza amafaranga mu NES, hanyuma ashobora kuyahindurira amafaranga nyayo cyangwa kuyakoresha mu byiciro bitandukanye by'urubuga.",
    },
    {
      question: "Ni iyihe bonus umwanditsi ashobora kwitega buri kwezi?",
      answer:
        "Umwanditsi yinjiza amafaranga ya bonus akurikije imikorere ye. Bonus iri hagati ya 500-2,000 NES buri kwezi, ishingiye ku bwiza bw'inkuru, umubare w'abasomyi, n'uruhare rw'umwanditsi mu guteza imbere urubuga.",
    },
    {
      question: "Ni iyihe gahunda yo kwishyura umwanditsi ikoreshwa?",
      answer:
        "NewTalentsG ikoresha uburyo butandukanye bwo kwishyura umwanditsi: binyuze mu NES, Mobile Money, bank, cyangwa uburyo bw'ikoranabuhanga. Umwanditsi yinjiza amafaranga akurikije amabwiriza ya gahunda ya Monetization.",
    },
  ];

  // Summary Section Content
  const summaryContent =
    "NewTalentsG ni urubuga rw'ikinyarwanda ruha abanditsi n'abashakashatsi uburyo bwo kwandika no gusohora inkuru zabo ku isi hose. Uru rubuga rufasha abanditsi kwinjiza amafaranga binyuze mu nzira zitandukanye nka Premium Stories, views, bonus, na Revenue Sharing. Ibyiza byo kwandika kuri NewTalentsG ni uko urubuga rutanga imfashanyo nyinshi n'ibikoresho bigufasha gukura nk'umwanditsi. Abanditsi bashobora kwandika inkuru z'ubwoko bwose, zikaba zishobora gusomwa n'abantu benshi ku isi hose, bigatuma bakwinjizamo amafaranga akomeye. NewTalentsG itanga kandi amahugurwa n'amakosa yo gukora n'ikoranabuhanga rigezweho. Niba ushaka kuba umwanditsi ukomeye, NewTalentsG ni ahantu heza cyane.";

  return (
    <>
      <LinkComponent />
      <Head>
        {/* Primary SEO */}
        <title>{t("Uko Winjiza Amafaranga kuri NewTalentsG | Monetize Stories | Inkuru zishyurwa")}</title>
        <meta
          name="description"
          content="Sobanukirwa uburyo umwanditsi yinjiza amafaranga kuri NewTalentsG. Menya uko Revenue Sharing, Premium Stories, views, na bonus bikora. Andika inkuru ukwinjizamo amafaranga."
        />
        <meta
          name="keywords"
          content="NewTalentsG, writing platform Rwanda, earn money writing stories, monetize stories, online publishing, Kinyarwanda stories, digital storytelling, author earnings, premium stories, revenue sharing, writing community, online writers, publishing platform, story monetization, content creators Rwanda, amafaranga online, uburyo bwo kwinjiza amafaranga, online income, passive income for writers"
        />
        <meta
          name="robots"
          content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"
        />
        <meta name="author" content="NewTalentsG Team" />
        <link rel="canonical" href={currentUrl} />
        <meta httpEquiv="Content-Language" content="rw" />

        {/* Open Graph */}
        <meta
          property="og:title"
          content="Uko Winjiza Amafaranga kuri NewTalentsG | Monetize Stories"
        />
        <meta
          property="og:description"
          content="Sobanukirwa uburyo umwanditsi yinjiza amafaranga kuri NewTalentsG. Menya uko Revenue Sharing, Premium Stories, views, na bonus bikora. Andika inkuru ukwinjizamo amafaranga."
        />
        <meta
          property="og:image"
          content="https://newtalentsg.com/og-image.jpg"
        />
        <meta property="og:url" content={currentUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="rw_RW" />
        <meta property="og:site_name" content="NewTalentsG" />

        {/* Twitter Cards */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content="Uko Winjiza Amafaranga kuri NewTalentsG"
        />
        <meta
          name="twitter:description"
          content="Sobanukirwa uburyo umwanditsi yinjiza amafaranga kuri NewTalentsG. Menya uko Revenue Sharing, Premium Stories, views, na bonus bikora."
        />
        <meta
          name="twitter:image"
          content="https://newtalentsg.com/og-image.jpg"
        />
        <meta name="twitter:site" content="@NewTalentsG" />
        <meta name="twitter:creator" content="@NewTalentsG" />

        {/* Theme Color */}
        <meta name="theme-color" content="#1a1a2e" />
        <meta name="msapplication-TileColor" content="#1a1a2e" />

        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              // Article Schema
              {
                "@context": "https://schema.org",
                "@type": "Article",
                headline: "Uko Winjiza Amafaranga kuri NewTalentsG",
                description:
                  "Sobanukirwa uburyo umwanditsi yinjiza amafaranga kuri NewTalentsG. Menya uko Revenue Sharing, Premium Stories, views, na bonus bikora.",
                author: {
                  "@type": "Organization",
                  name: "NewTalentsG Team",
                },
                publisher: {
                  "@type": "Organization",
                  name: "NewTalentsG",
                  logo: {
                    "@type": "ImageObject",
                    url: "https://newtalentsg.com/logo.png",
                  },
                },
                datePublished: "2026-01-01",
                dateModified: "2026-07-22",
                mainEntityOfPage: {
                  "@type": "WebPage",
                  "@id": currentUrl,
                },
                image: {
                  "@type": "ImageObject",
                  url: "https://newtalentsg.com/og-image.jpg",
                },
              },
              // WebPage Schema
              {
                "@context": "https://schema.org",
                "@type": "WebPage",
                name: "Uko Winjiza Amafaranga kuri NewTalentsG",
                description:
                  "Sobanukirwa uburyo umwanditsi yinjiza amafaranga kuri NewTalentsG. Menya uko Revenue Sharing, Premium Stories, views, na bonus bikora.",
                url: currentUrl,
                inLanguage: "rw",
                about: {
                  "@type": "Thing",
                  name: "Monetization for Writers",
                },
                isPartOf: {
                  "@type": "WebSite",
                  name: "NewTalentsG",
                },
                primaryImageOfPage: {
                  "@type": "ImageObject",
                  url: "https://newtalentsg.com/og-image.jpg",
                },
              },
              // BreadcrumbList Schema
              {
                "@context": "https://schema.org",
                "@type": "BreadcrumbList",
                itemListElement: [
                  {
                    "@type": "ListItem",
                    position: 1,
                    name: "Home",
                    item: "https://newtalentsg.com/",
                  },
                  {
                    "@type": "ListItem",
                    position: 2,
                    name: "Injiza Amafaranga",
                    item: currentUrl,
                  },
                ],
              },
              // FAQPage Schema
              {
                "@context": "https://schema.org",
                "@type": "FAQPage",
                mainEntity: faqs.map((faq) => ({
                  "@type": "Question",
                  name: faq.question,
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: faq.answer,
                  },
                })),
              },
              // Organization Schema
              {
                "@context": "https://schema.org",
                "@type": "Organization",
                name: "NewTalentsG",
                description:
                  "Urubuga rw'ikinyarwanda rwo kwandika no gukwirakwiza inkuru.",
                url: "https://newtalentsg.com",
                logo: "https://newtalentsg.com/logo.png",
                sameAs: [
                  "https://www.facebook.com/profile.php?id=61586794786482",
                
                ],
                contactPoint: {
                  "@type": "ContactPoint",
                  telephone: "+250-722-319-367",
                  contactType: "Customer Service",
                  availableLanguage: ["Kinyarwanda", "English"],
                },
                address: {
                  "@type": "PostalAddress",
                  addressCountry: "Rwanda",
                  addressLocality: "Kigali",
                },
              },
              // WebSite Schema
              {
                "@context": "https://schema.org",
                "@type": "WebSite",
                name: "NewTalentsG",
                url: "https://newtalentsg.com",
                description:
                  "Urubuga rw'ikinyarwanda rwo kwandika no gukwirakwiza inkuru.",
                inLanguage: "rw",
                potentialAction: {
                  "@type": "SearchAction",
                  target: {
                    "@type": "EntryPoint",
                    urlTemplate:
                      "https://newtalentsg.com/search?q={search_term_string}",
                  },
                  "query-input": "required name=search_term_string",
                },
                about: {
                  "@type": "Thing",
                  name: "Content Creation and Publishing",
                },
              },
            ]),
          }}
        />
      </Head>

      <div className={styles.container}>
        <div className={styles.card}>
          {/* Back Button */}
          <button onClick={() => router.back()} className={styles.backBtn}>
            <FaArrowLeft />{" "}{t("Subira")}</button>

          {/* Header */}
          <div className={styles.header}>
            <h1 className={styles.title}>
              <FaMoneyBillWave className={styles.headerIcon} />{" "}{t("Uko Winjiza Amafaranga kuri NewTalentsG")}</h1>
            <p className={styles.subtitle}>{t("Menya uburyo umwanditsi yinjiza amafaranga kuri NewTalentsG binyuze mu nzira zitandukanye nka Premium Stories, views, bonus, na Revenue Sharing. Andika inkuru ukwinjizamo amafaranga mu buryo bworoshye kandi bwihuse.")}</p>
          </div>

          {/* ===== SUMMARY SECTION ===== */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>{t("Incamake: NewTalentsG ni iki?")}</h2>
            </div>
            <div className={styles.sectionContent}>
              <p>{summaryContent}</p>
            </div>
          </section>

          {/* ===== SECTION 1: Premium ===== */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <FaMoneyBillWave
                className={styles.sectionIcon}
                style={{ color: "#f59e0b" }}
              />
              <h2 className={styles.sectionTitle}>{t("1. Amafaranga ava ku nkuru zishyurwa (Premium Stories)")}</h2>
            </div>
            <div className={styles.sectionContent}>
              <p>{t("Umwanditsi yinjiza amafaranga aturutse ku nkuru ze zishyurwa (")}<strong>{t("Premium Stories")}</strong>{t("). Umusomyi abanza kwishyura mbere yo gusoma inkuru, hanyuma umwanditsi agahabwa umugabane w'amafaranga yinjijwe kuri iyo nkuru. Iyi ni imwe mu nzira nyinshi umwanditsi yinjiza amafaranga kuri NewTalentsG.")}</p>
              <p>{t("Uburyo umwanditsi yinjiza amafaranga binyuze muri Premium Stories bukora neza cyane, kuko buri nkuru ishobora kwinjiza amafaranga akomeye bitewe n'ubwiza bwayo n'uburyo yanditswe.")}</p>
              <div className={styles.infoBox}>
                <FaInfoCircle className={styles.infoIcon} />
                <span>
                  <strong>{t("Uburyo:")}</strong>{" "}{t("Iyo inkuru ishyirwa mu kiciro cya Premium, umwanditsi ahabwa ibice by’amafaranga yose yakozwe n’abasomyi bayo. Ibi bishobora gutuma umwanditsi yinjiza amafaranga menshi cyane.")}</span>
              </div>
            </div>
          </section>

          {/* ===== SECTION 2: Views ===== */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <FaEye
                className={styles.sectionIcon}
                style={{ color: "#3b82f6" }}
              />
              <h2 className={styles.sectionTitle}>{t("2. Kwinjiza bitewe n'uko inkuru zisomwa (Views)")}</h2>
            </div>
            <div className={styles.sectionContent}>
              <p>{t("Umwanditsi ashobora guhembwa bitewe n'umubare w'abasomye buri nkuru. Buri nkuru ibarwa ukwihariye. Ibihembo byuzuye bihabwa abanditsi bafite")}{" "}<strong>{t("Monetization")}</strong>{t(". Uko umwanditsi yinjiza amafaranga binyuze mu views, ni uburyo bworoshye kandi bukoreshwa cyane n'abanditsi benshi.")}</p>
              <p>{t("Niba ushaka kumenya uburyo umwanditsi yinjiza amafaranga menshi, ugomba kwandika inkuru nziza zisomwa n'abantu benshi. Views ni kimwe mu bintu by'ingenzi bigira uruhare mu nzira umwanditsi yinjiza amafaranga.")}</p>

              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>{t("Views")}</th>
                      <th>{t("Ihembo (NES)")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>500</td>
                      <td>100</td>
                    </tr>
                    <tr>
                      <td>1,000</td>
                      <td>250</td>
                    </tr>
                    <tr>
                      <td>5,000</td>
                      <td>400</td>
                    </tr>
                    <tr className={styles.highlightRow}>
                      <td>10,000+</td>
                      <td>800</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className={styles.noteBox}>
                <FaInfoCircle className={styles.noteIcon} />
                <p>
                  <strong>{t("Icyitonderwa:")}</strong>{" "}{t("Abatari Monetized bashobora guhembwa n'urubuga hakurikijwe igenamigambi n'ubushobozi bwarwo. Ariko, kugira ngo umwanditsi yinjiza amafaranga byuzuye, ni byiza kuba yarafunguye Monetization.")}</p>
              </div>
            </div>
          </section>

          {/* ===== SECTION 3: Bonus ===== */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <FaGift
                className={styles.sectionIcon}
                style={{ color: "#8b5cf6" }}
              />
              <h2 className={styles.sectionTitle}>{t("3. Bonus y'ukwezi")}</h2>
            </div>
            <div className={styles.sectionContent}>
              <p>{t("Urubuga rushobora guhemba umwanditsi")}{" "}
                <strong>{t("bonus yihariye")}</strong>{" "}{t("buri kwezi bitewe n'imikorere ye (")}<em>{t("Performance")}</em>{t("), harimo:")}</p>
              <ul className={styles.bonusList}>
                <li>
                  <FaCheckCircle className={styles.bonusIcon} />{" "}{t("Ubuziranenge bw'inkuru")}</li>
                <li>
                  <FaCheckCircle className={styles.bonusIcon} />{" "}{t("Umubare w'abasomyi")}</li>
                <li>
                  <FaCheckCircle className={styles.bonusIcon} />{" "}{t("Uruhare yagize mu guteza imbere urubuga")}</li>
              </ul>
              <p>{t("Kugira ngo umwanditsi yinjiza amafaranga ya bonus, agomba gukora neza mu nkuru ze n'umubare w'abasomyi. Ibi ni byo bintu by'ingenzi bituma umwanditsi yinjiza amafaranga menshi buri kwezi.")}</p>
              <div className={styles.bonusExample}>
                <FaStar className={styles.bonusStar} />
                <span>
                  <strong>{t("Urugero:")}</strong>{" "}{t("Umwanditsi w’inkuru nziza kandi zisomwa cyane ashobora guhabwa bonus ikoze mu NES 500 – 2,000 buri kwezi. Ibi ni uburyo umwanditsi yinjiza amafaranga byongera.")}</span>
              </div>
            </div>
          </section>

          {/* ===== SECTION 4: Revenue Sharing ===== */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <FaShareAlt
                className={styles.sectionIcon}
                style={{ color: "#10b981" }}
              />
              <h2 className={styles.sectionTitle}>{t("4. Revenue Sharing")}</h2>
            </div>
            <div className={styles.sectionContent}>
              <p>{t("Urubuga rushobora kandi guhemba umwanditsi binyuze muri")}{" "}
                <strong>{t("Revenue Sharing")}</strong>{t(", aho umwanditsi ahabwa umugabane w'amafaranga urubuga rwinjije mu gihe cy'ukwezi. Iyi ni imwe mu nzira z'ingenzi umwanditsi yinjiza amafaranga kuri NewTalentsG.")}</p>
              <ul className={styles.revenueList}>
                <li>
                  <FaTrophy className={styles.revenueIcon} />{t("Umugabane ugenwa hakurikijwe amabwiriza ya gahunda ya Revenue Sharing.")}</li>
                <li>
                  <FaTrophy className={styles.revenueIcon} />{t("Ubusanzwe, abanditsi bakomeye (top performers) bahabwa umugabane munini.")}</li>
              </ul>
              <p>{t("Kugira ngo umwanditsi yinjiza amafaranga binyuze muri Revenue Sharing, agomba kuba yarafunguye konti ya Monetization kandi akagira uruhare rukomeye mu mikorere y'urubuga.")}</p>
              <div className={styles.noteBox}>
                <FaInfoCircle className={styles.noteIcon} />
                <p>
                  <strong>{t("N.B.:")}</strong>{" "}{t("Ibihembo byose byubahirizwa 100% ku banditsi bafite konti ya Monetization. Niba utarayihabwa, urubuga rushobora kuguhemba hakurikijwe impamvu, ubushobozi bwarwo n'igenamigambi ririho icyo gihe. Ariko, kugira ngo umwanditsi yinjiza amafaranga byuzuye, ni byiza kuba yarafunguye Monetization.")}</p>
              </div>
            </div>
          </section>

          {/* ===== WHY WRITE ON NEWTALENTSG? ===== */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>{t("Kuki wandika kuri NewTalentsG?")}</h2>
            </div>
            <div className={styles.sectionContent}>
              <ul className={styles.bonusList}>
                <li>
                  <FaCheckCircle className={styles.bonusIcon} />{" "}{t("Ushobora kwandika inkuru z'ubwoko bwose no kuzisohora ku isi hose.")}</li>
                <li>
                  <FaCheckCircle className={styles.bonusIcon} />{" "}{t("Ushobora kwinjiza amafaranga binyuze mu nzira zitandukanye nka Premium Stories, views, bonus, na Revenue Sharing.")}</li>
                <li>
                  <FaCheckCircle className={styles.bonusIcon} />{" "}{t("Urubuga rutanga imfashanyo n'ibikoresho by'ikoranabuhanga byihariye bigufasha gukura nk'umwanditsi.")}</li>
                <li>
                  <FaCheckCircle className={styles.bonusIcon} />{" "}{t("Ushobora kwiga no kwagura ubumenyi bwawe bwo kwandika binyuze mu makosa n'amahugurwa atangwa.")}</li>
              </ul>
            </div>
          </section>

          {/* ===== HOW MONETIZATION WORKS ===== */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>{t("Uburyo Monetization ikora ku buryo burambuye")}</h2>
            </div>
            <div className={styles.sectionContent}>
              <ol className={styles.bonusList}>
                <li>
                  <strong>{t("Icyiciro cya 1:")}</strong>{" "}{t("Wandika inkuru nziza kandi ikomeje kurubuga.")}</li>
                <li>
                  <strong>{t("Icyiciro cya 2:")}</strong>{" "}{t("Iyo inkuru ibonye views nyinshi, umwanditsi yinjiza amafaranga akurikije umubare w'abasomyi.")}</li>
                <li>
                  <strong>{t("Icyiciro cya 3:")}</strong>{" "}{t("Niba inkuru ari Premium, umwanditsi yinjiza amafaranga akurikije umubare w'abishyuriye kuyisoma.")}</li>
                <li>
                  <strong>{t("Icyiciro cya 4:")}</strong>{" "}{t("Buri kwezi, umwanditsi ashobora kubona bonus ishingiye ku mikorere ye.")}</li>
                <li>
                  <strong>{t("Icyiciro cya 5:")}</strong>{" "}{t("Nyuma y'ukwezi, umwanditsi ahabwa umugabane w'inyungu z'urubuga binyuze muri Revenue Sharing.")}</li>
              </ol>
            </div>
          </section>

          {/* ===== FAQ SECTION ===== */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>{t("Ibibazo bikunze kubazwa (FAQ)")}</h2>
            </div>
            <div className={styles.sectionContent}>
              {faqs.map((faq, index) => (
                <div key={index} className={styles.faqItem}>
                  <h3 className={styles.faqQuestion}>{faq.question}</h3>
                  <p className={styles.faqAnswer}>{faq.answer}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ===== RELATED TOPICS ===== */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>{t("Ibindi bintu birebana n'ibi")}</h2>
            </div>
            <div className={styles.sectionContent}>
              <ul className={styles.relatedTopicsList}>
                <li>
                  <a href="/membership">{t("Membership")}</a>
                </li>
                <li>
                  <a href="/explore">{t("Explore")}</a>
                </li>
                <li>
                  <a href="/support">{t("Support")}</a>
                </li>
                <li>
                  <a href="/terms">{t("Terms")}</a>
                </li>
                <li>
                  <a href="/privacy">{t("Privacy")}</a>
                </li>
                <li>
                  <a href="/licensing">{t("Licensing")}</a>
                </li>
                <li>
                  <a href="/authors">{t("Authors")}</a>
                </li>
                <li>
                  <a href="/">{t("Stories")}</a>
                </li>
              </ul>
            </div>
          </section>

          {/* ===== CONCLUSION ===== */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>{t("Ubusobanuro ku nzira umwanditsi yinjiza amafaranga")}</h2>
            </div>
            <div className={styles.sectionContent}>
              <p>{t("NewTalentsG ni urubuga rw'ikinyarwanda ruha abanditsi n'abashakashatsi uburyo bwo kwandika no gusohora inkuru zabo ku isi hose. Umwanditsi yinjiza amafaranga binyuze mu nzira zitandukanye nka Premium Stories, views, bonus, na Revenue Sharing. Ibyiza byo kwandika kuri NewTalentsG ni uko urubuga rutanga imfashanyo nyinshi n'ibikoresho bigufasha gukura nk'umwanditsi.")}</p>
              <p>{t("Niba ushaka kwandika inkuru nziza kandi ukwinjizamo amafaranga, NewTalentsG ni ahantu heza cyane. Urubuga rufasha abanditsi gukura mu bumenyi n'ubushobozi, kandi rutanga amahirwe yo kwinjiza amafaranga menshi binyuze mu nkuru zishyurwa n'ibindi.")}</p>
            </div>
          </section>

          {/* ===== CTA ===== */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>{t("Ubu ni bwo gihe cyo gutangira!")}</h2>
            </div>
            <div className={styles.sectionContent}>
              <p>{t("Niba ushaka kuba umwanditsi ukomeye kuri NewTalentsG, tangira ubu! Andika inkuru nziza, zishishikaye, kandi zinjiza amafaranga. Urubuga rutanga imfashanyo n'ibikoresho byose ukeneye kugira ngo ukure neza nk'umwanditsi. Ntutegereze, tangira ubu ukwinjizamo amafaranga binyuze mu nkuru zawe!")}</p>
              <div style={{ marginTop: "20px" }}>
                <button
                  onClick={() => router.push("/dashboard/create")}
                  className={styles.ctaButton}
                >{t("Tangira Kwandika Ubu")}</button>
              </div>
            </div>
          </section>

          {/* Footer */}
          <div className={styles.footer}>
            <p>{t("✅ Iyi gahunda ishyirwa mu bikorwa hakurikijwe amabwiriza ya NewTalentsG.")}<br />
              <span className={styles.footerNote}>{t("Niba ufite ikibazo, twandikire kuri")}{" "}<strong>{t("WhatsApp")}</strong>{" "}{t("cyangwa")}{" "}<strong>{t("Email")}</strong>.
              </span>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
