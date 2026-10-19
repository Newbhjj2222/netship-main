import Head from "next/head";
import { useRouter } from "next/router";
import styles from "@/styles/umusomyi.module.css";
import {
  FaBookOpen,
  FaUserFriends,
  FaUsers,
  FaMobileAlt,
  FaBookReader,
  FaHeart,
  FaBrain,
  FaLock,
  FaGhost,
  FaHistory,
  FaLifeRing,
  FaGavel,
  FaSearch,
  FaGlasses,
  FaBalanceScale,
  FaHome,
  FaStar,
  FaBookmark,
  FaPlay,
  FaRocket,
  FaBell,
  FaComment,
  FaUser,
  FaCheckCircle,
  FaLayerGroup,
  FaThumbsUp,
  FaQuoteLeft,
  FaSun, // Added missing import
} from "react-icons/fa";
import { useI18n } from "@/i18n/I18nProvider";

export default function Umusomyi() {
  const { t } = useI18n();

  const router = useRouter();

  // Fixed: currentUrl is now safe for SSR
  const baseUrl = "https://newtalentsg.com";
  const currentUrl = `${baseUrl}${router.asPath || ""}`;

  // FAQ Data
  const faqs = [
    {
      question: "NewTalentsG n'iki?",
      answer:
        "NewTalentsG ni urubuga rwo gusoma no gusohora inkuru z'ikinyarwanda. Uru rubuga ruha abasomyi uburyo bwo gusoma inkuru z'ubwoko bwose, mu buryo bworoshye kandi bwihuta.",
    },
    {
      question: "Ni gute nashobora gutangira gusoma kuri NewTalentsG?",
      answer:
        "Kugira ngo utangire gusoma kuri NewTalentsG, ugomba gukora konti, hanyuma uhitamo inkuru ushaka gusoma. Ushobora gusoma inkuru z'ubuntu cyangwa gukoresha NES kugira ngo usome Premium Stories.",
    },
    {
      question: "NES n'iki kandi ikoreshwa iki?",
      answer:
        "NES ni ifaranga ry'imigambi rya NewTalentsG. Rifasha abasomyi kwishyura inkuru zishyurwa (Premium Stories) no guhemba abanditsi. NES ishobora kuboneka binyuze mu kwishyura cyangwa ibikorwa bitandukanye ku rubuga.",
    },
    {
      question: "Ni izihe nkuru nshobora gusoma kuri NewTalentsG?",
      answer:
        "NewTalentsG ifite inkuru z'ubwoko bwinshi harimo: inkuru ndende z'urukundo, inkuru z'ubwenge, inkuru z'ibanga, inkuru z'ubwoba, inkuru z'amateka, inkuru z'ubuzima, inkuru z'ibyaha, n'izindi nyinshi. Buri kwezi habonekamo inkuru nshya.",
    },
    {
      question: "Mbese gusoma kuri NewTalentsG birahenze?",
      answer:
        "Gusoma inkuru z'ubuntu kuri NewTalentsG ni ubuntu. Ariko, iyo ushaka gusoma Premium Stories (inkuru zishyurwa), ugomba kwishyura ukoresheje NES. NES ishobora kuboneka mu buryo butandukanye.",
    },
    {
      question: "Ni gute nshobora kubona NES?",
      answer:
        "NES ishobora kuboneka binyuze mu kwishyura, mu bihembo by'urubuga, cyangwa mu bikorwa bitandukanye nko gusangira inkuru, gusubiramo inkuru, no kwitabira ibikorwa by'urubuga.",
    },
    {
      question: "Premium Stories ni iki?",
      answer:
        "Premium Stories ni inkuru zishyurwa zisaba umusomyi kwishyura mbere yo kuzisoma. Izi nkuru zanditswe n'abanditsi bahabwa umugabane w'amafaranga yinjijwe. Premium Stories zifite ubwiza bwihariye.",
    },
    {
      question: "Ni gute nshobora kubika inkuru nkunda?",
      answer:
        "Ushobora kubika inkuru ukoresheje feature ya save offline. Iyi feature ifasha kubika inkuru ushaka gusoma nyuma nta interineti ikoresha, no gukurikira inkuru ukunda.",
    },
    {
      question: "Continue Reading ni iki?",
      answer:
        "Continue Reading ni feature igufasha gusubira aho wari uhariye mu nkuru wasomaga. Iyi feature ikora neza ku bikoresho byose, ikagufasha gusubira aho wari ugeze ze usoma inkuru",
    },
    {
      question: "Community ni iki?",
      answer:
        "Community ni itsinda ry'abasomyi n'abanditsi bakorana n'urubuga. Ushobora gusangira ibitekerezo, gusubiramo inkuru, no kugirana ibiganiro n'abandi basomyi n'abanditsi.",
    },
    {
      question: "Ni gute nshobora gusangira inkuru?",
      answer:
        "Ushobora gusangira inkuru binyuze mu button ya Share. Ushobora kuyisangira kuri WhatsApp, Twitter, Facebook, cyangwa binyuze mu link.",
    },
    {
      question: "Gutanga comment byamfasha iki?",
      answer:
        "Iyo utanze comment ku nkuru, ufasha umwanditsi kumenya ibyo abasomyi batekereza. Ibi bituma umwanditsi yandika inkuru nziza kurushaho, kandi ushobora no gutsindira ibihembo by'urubuga, harimo na NeS wakoresha usoma inkuru..",
    },
    {
      question: "Membership ni iki?",
      answer:
        "Membership ni gahunda yihariye iha abasomyi uburyo bwo kubona ibinyaburanga byihariye, nko gusoma Premium Stories ku giciro gito, kubona bonus, no kwitabira ibikorwa by'urubuga.",
    },
    {
      question: "Author Profiles ni iki?",
      answer:
        "Author Profiles ni pages z'abanditsi. Ushobora kureba inkuru zanditswe n'umwanditsi runaka, amakuru ye, no gukurikira inkuru ze nshya.",
    },
    {
      question: "Ni iki Episode zikomeza?",
      answer:
        "Episode zikomeza ni inkuru zisohoka buri gihe mu bice. Ibi bishobora kuba inkuru ndende zisohoka buri cyumweru cyangwa buri kwezi, zikomeza amateka y'inkuru.",
    },
    {
      question: "Ni iki Notifications?",
      answer:
        "Notifications ni ubutumwa bwo kumenya iyo habonetse inkuru nshya, iyo hari episode nshya y'inkuru ukurikira, cyangwa iyo hari ibintu bishya ku rubuga.",
    },
    {
      question: "Ni iki Ratings?",
      answer:
        "Ratings ni uburyo abasomyi bashyira amanota ku nkuru. Ibi bifasha abandi basomyi kumenya inkuru nziza, kandi bifasha abanditsi kumenya ibyo bakora neza.",
    },
    {
      question: "Ni iki Comments?",
      answer:
        "Comments ni uburyo abasomyi bashobora gusubiza ku nkuru, gusangira ibitekerezo, no kugirana ibiganiro n'abandi basomyi n'abanditsi.",
    },
    {
      question: "Mbese nshobora gusoma inkuru nta interineti?",
      answer:
        "Kugira ngo usome inkuru kuri NewTalentsG, ugomba kuba ufite interineti. Ariko, ushobora kubika inkuru ukoresheje feature ya Offline Reading, ikagufasha gusoma nta interineti.",
    },
    {
      question: "Ni iki story reading experience?",
      answer:
        "Story reading experience ni uburyo NewTalentsG yubatswe kugira ngo gusoma inkuru bibe byoroshye kandi bishimishije. Ibi birimo: font nziza, spacing nziza, dark mode, no responsive design.",
    },
  ];

  const categories = [
    { name: "Inkuru ndende z'urukundo", icon: <FaHeart /> },
    { name: "Inkuru ndende z'ubwenge", icon: <FaBrain /> },
    { name: "Inkuru ndende z'ibanga", icon: <FaLock /> },
    { name: "Inkuru z'ubwoba", icon: <FaGhost /> },
    { name: "Inkuru z'amateka", icon: <FaHistory /> },
    { name: "Inkuru z'ubuzima", icon: <FaLifeRing /> },
    { name: "Inkuru z'ibyaha", icon: <FaGavel /> },
    { name: "Inkuru z'iperereza", icon: <FaSearch /> },
    { name: "Inkuru z'ishyari", icon: <FaBalanceScale /> },
    { name: "Inkuru z'urwenya", icon: <FaGlasses /> },
    { name: "Inkuru za fantasy", icon: <FaStar /> },
    { name: "Inkuru z'abana", icon: <FaBookReader /> },
    { name: "Inkuru z'ishuri", icon: <FaHome /> },
    { name: "Inkuru z'ubucuruzi", icon: <FaRocket /> },
    { name: "Inkuru z'iterambere", icon: <FaLayerGroup /> },
    { name: "Inkuru z'imiryango", icon: <FaUsers /> },
    { name: "Inkuru z'amarangamutima", icon: <FaHeart /> },
    { name: "Inkuru z'ubuzima busanzwe", icon: <FaSun /> },
  ];

  const features = [
    { name: "Bookmark", icon: <FaBookmark />, desc: "Bika inkuru ukunda" },
    {
      name: "Continue Reading",
      icon: <FaPlay />,
      desc: "Subira aho wari uhariye",
    },
    { name: "Fast Loading", icon: <FaRocket />, desc: "Soma vuba" },
    {
      name: "Responsive",
      icon: <FaMobileAlt />,
      desc: "Soma kuri buri gikoresho ukoresha",
    },
    { name: "Premium Stories", icon: <FaStar />, desc: "Inkuru zishyurwa" },
    {
      name: "Membership",
      icon: <FaUserFriends />,
      desc: "Umunyamuryango",
    },
    { name: "Notifications", icon: <FaBell />, desc: "Menya inkuru nshya" },
    { name: "Ratings", icon: <FaThumbsUp />, desc: "Shyira amanota ku nkuru yagushimishije" },
    { name: "Comments", icon: <FaComment />, desc: "Ganira n'abandi" },
    { name: "Author Profiles", icon: <FaUser />, desc: "Menya abanditsi" },
  ];

  const benefits = [
    {
      title: "Inkuru nyinshi",
      desc: "Hari inkuru nyinshi z'ubwoko bwose wifuza",
    },
    {
      title: "Abanditsi benshi",
      desc: "Zanditswe n'abanditsi baturuka mu bice bitandukanye",
    },
    {
      title: "Inkuru nshya buri gihe",
      desc: "Buri kwezi habonekamo inkuru nshya",
    },
    {
      title: "Episode zikomeza",
      desc: "Komeza amateka y'inkuru mu bice",
    },
    {
      title: "Community",
      desc: "Ganira n'abandi basomyi n'abanditsi",
    },
    {
      title: "Mobile Friendly",
      desc: "Soma kuri buri gikoresho ukoresha aho uri hose",
    },
    {
      title: "Reading Experience",
      desc: "Ubunararibonye bwiza bwo gusoma",
    },
    {
      title: "Easy Navigation",
      desc: "Kwinjira mu nkuru byoroshye",
    },
  ];

  return (
    <>
      <Head>
        <title>{t("Umusomyi | Soma Inkuru Nziza Kuri NewTalentsG")}</title>
        <meta
          name="description"
          content="Soma inkuru nziza z'ikinyarwanda kuri NewTalentsG. Menya uburyo bwo gusoma inkuru z'ubwoko bwose, gukurikira abanditsi, no kugira ubunararibonye bwiza bwo gusoma."
        />
        <meta
          name="keywords"
          content="inkuru ndende z'urukundo, inkuru ndende z'ubwenge, inkuru ndende ziryoshye, inkuru z'urukundo, inkuru z'ibanga, inkuru z'ubuzima, inkuru z'ubwoba, Kinyarwanda stories, online stories, reading stories, Rwanda stories, serialized stories, best stories, story reading, novels, fiction, romance, mystery, thriller, drama, family stories"
        />
        <meta
          name="robots"
          content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"
        />
        <meta name="author" content="NewTalentsG Team" />
        <link rel="canonical" href={currentUrl} />
        <meta httpEquiv="Content-Language" content="rw" />
        <meta name="theme-color" content="#0f172a" />

        {/* Open Graph */}
        <meta
          property="og:title"
          content="Umusomyi | Soma Inkuru Nziza Kuri NewTalentsG"
        />
        <meta
          property="og:description"
          content="Soma inkuru nziza z'ikinyarwanda kuri NewTalentsG. Menya uburyo bwo gusoma inkuru z'ubwoko bwose, gukurikira abanditsi, no kugira ubunararibonye bwiza bwo gusoma."
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
          content="Umusomyi | Soma Inkuru Nziza Kuri NewTalentsG"
        />
        <meta
          name="twitter:description"
          content="Soma inkuru nziza z'ikinyarwanda kuri NewTalentsG. Menya uburyo bwo gusoma inkuru z'ubwoko bwose, gukurikira abanditsi, no kugira ubunararibonye bwiza bwo gusoma."
        />
        <meta
          name="twitter:image"
          content="https://newtalentsg.com/og-image.jpg"
        />
        <meta name="twitter:site" content="@NewTalentsG" />
        <meta name="twitter:creator" content="@NewTalentsG" />

        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              {
                "@context": "https://schema.org",
                "@type": "WebSite",
                name: "NewTalentsG",
                url: "https://newtalentsg.com",
                description:
                  "Urubuga rwo gusoma no gusohora inkuru z'ikinyarwanda",
                inLanguage: "rw",
              },
              {
                "@context": "https://schema.org",
                "@type": "Organization",
                name: "NewTalentsG",
                description:
                  "Urubuga rwo gusoma no gusohora inkuru z'ikinyarwanda",
                url: "https://newtalentsg.com",
                logo: "https://newtalentsg.com/logo.png",
                sameAs: [
                  "https://facebook.com/newtalentsg",
                  "https://twitter.com/newtalentsg",
                  "https://instagram.com/newtalentsg",
                ],
              },
              {
                "@context": "https://schema.org",
                "@type": "WebPage",
                name: "Umusomyi | Soma Inkuru Nziza Kuri NewTalentsG",
                description:
                  "Soma inkuru nziza z'ikinyarwanda kuri NewTalentsG",
                url: currentUrl,
                inLanguage: "rw",
                isPartOf: {
                  "@type": "WebSite",
                  name: "NewTalentsG",
                },
              },
              {
                "@context": "https://schema.org",
                "@type": "CollectionPage",
                name: "Inkuru za NewTalentsG",
                description: "Inkuru z'ubwoko bwose zanditswe mu Kinyarwanda",
                url: currentUrl,
                about: {
                  "@type": "Thing",
                  name: "Kinyarwanda Stories",
                },
              },
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
                    name: "Umusomyi",
                    item: currentUrl,
                  },
                ],
              },
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
            ]),
          }}
        />
      </Head>

      <main className={styles.container}>
        {/* ===== HERO SECTION ===== */}
        <section className={styles.hero} aria-label={t("Hero section")}>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>{t("Soma Inkuru Nziza")}{" "}<br />
              <span className={styles.heroHighlight}>{t("Mu Kinyarwanda")}</span>
            </h1>
            <p className={styles.heroSubtitle}>{t("NewTalentsG ni urubuga rwo gusoma no gusohora inkuru z'ikinyarwanda. Tangira gusoma inkuru z'ubwoko bwose, ube mu bandi basomyi benshi.")}</p>
            <div className={styles.heroButtons}>
              <button
                className={styles.primaryBtn}
                onClick={() => router.push("/")}
              >
                <FaBookOpen />{" "}{t("Tangira Gusoma")}</button>
              <button
                className={styles.secondaryBtn}
                onClick={() => router.push("/")}
              >
                <FaSearch />{" "}{t("Reba Inkuru")}</button>
            </div>
          </div>
          <div className={styles.heroImage}>
            <FaBookReader className={styles.heroIcon} />
          </div>
        </section>

        {/* ===== ABOUT SECTION ===== */}
        <section className={styles.about} aria-label={t("About NewTalentsG")}>
          <div className={styles.sectionHeader}>
            <h2>{t("NewTalentsG ni iki?")}</h2>
            <p>{t("Menya byinshi kuri NewTalentsG")}</p>
          </div>
          <div className={styles.aboutGrid}>
            <div className={styles.aboutCard}>
              <FaBookOpen className={styles.aboutIcon} />
              <h3>{t("Icyo ikora")}</h3>
              <p>{t("NewTalentsG ni urubuga rwo gusoma no gusohora inkuru z'ikinyarwanda. Urubuga ruha abasomyi uburyo bwo gusoma inkuru z'ubwoko bwose, mu buryo bworoshye kandi bwihuta.")}</p>
            </div>
            <div className={styles.aboutCard}>
              <FaUsers className={styles.aboutIcon} />
              <h3>{t("Icyo itanga")}</h3>
              <p>{t("Itanga inkuru z'ubwoko bwinshi, abanditsi benshi, n'ubunararibonye bwiza bwo gusoma. Abasomyi bashobora gusoma inkuru z'ubuntu cyangwa gukoresha NES kugira ngo basome Premium Stories.")}</p>
            </div>
            <div className={styles.aboutCard}>
              <FaStar className={styles.aboutIcon} />
              <h3>{t("Impamvu yihariye")}</h3>
              <p>{t("NewTalentsG ni urubuga rwa mbere mu Rwanda rutanga inkuru z'ikinyarwanda mu buryo bwo gukurikirana. Ushobora gusoma inkuru zishyushye, zishishikaye, kandi zikomeye.")}</p>
            </div>
          </div>
        </section>

        {/* ===== WHY READ SECTION ===== */}
        <section className={styles.benefits} aria-label={t("Why read on NewTalentsG")}>
          <div className={styles.sectionHeader}>
            <h2>{t("Kuki usoma kuri NewTalentsG?")}</h2>
            <p>{t("Impamvu abasomyi bakunda NewTalentsG")}</p>
          </div>
          <div className={styles.benefitsGrid}>
            {benefits.map((benefit, index) => (
              <div key={index} className={styles.benefitCard}>
                <FaCheckCircle className={styles.benefitIcon} />
                <h3>{benefit.title}</h3>
                <p>{benefit.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ===== CATEGORIES SECTION ===== */}
        <section className={styles.categories} aria-label={t("Story categories")}>
          <div className={styles.sectionHeader}>
            <h2>{t("Inkuru z'ubwoko bwose")}</h2>
            <p>{t("Hitamo inkuru ukunda")}</p>
          </div>
          <div className={styles.categoriesGrid}>
            {categories.map((category, index) => (
              <div key={index} className={styles.categoryCard}>
                <span className={styles.categoryIcon}>{category.icon}</span>
                <span>{category.name}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ===== READING GUIDE ===== */}
        <section className={styles.guide} aria-label={t("Reading guide")}>
          <div className={styles.sectionHeader}>
            <h2>{t("Uburyo bwo gusoma")}</h2>
            <p>{t("Intambwe z'uburyo bwo gusoma kuri NewTalentsG")}</p>
          </div>
          <div className={styles.guideSteps}>
            <div className={styles.step}>
              <div className={styles.stepNumber}>1</div>
              <h3>{t("Fungura konti")}</h3>
              <p>{t("Kora konti kuri NewTalentsG kugira ngo utangire gusoma")}</p>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>2</div>
              <h3>{t("Hitamo inkuru")}</h3>
              <p>{t("Hitamo inkuru ushaka gusoma mu bwoko bwinshi")}</p>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>3</div>
              <h3>{t("Soma episodes z'ubuntu")}</h3>
              <p>{t("Tangira gusoma episode za mbere z'ubuntu")}</p>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>4</div>
              <h3>{t("Koresha NES")}</h3>
              <p>{t("Koresha NES kugira ngo usome Premium Stories")}</p>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>5</div>
              <h3>{t("Komeza episode")}</h3>
              <p>{t("Komeza gusoma episode zikurikira z'inkuru")}</p>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>6</div>
              <h3>{t("Bika inkuru")}</h3>
              <p>{t("Bika inkuru ukunda kugira ngo uzisome nyuma")}</p>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>7</div>
              <h3>{t("Sangira inkuru")}</h3>
              <p>{t("Sangira inkuru n'inshuti zawe")}</p>
            </div>
          </div>
        </section>

        {/* ===== FEATURES SECTION ===== */}
        <section className={styles.features} aria-label={t("Features")}>
          <div className={styles.sectionHeader}>
            <h2>{t("Ibinyaburanga")}</h2>
            <p>{t("Ibikoresho bigufasha gusoma neza")}</p>
          </div>
          <div className={styles.featuresGrid}>
            {features.map((feature, index) => (
              <div key={index} className={styles.featureCard}>
                <span className={styles.featureIcon}>{feature.icon}</span>
                <h3>{feature.name}</h3>
                <p>{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ===== POPULAR SEARCHES ===== */}
        <section className={styles.popular} aria-label={t("Popular searches")}>
          <div className={styles.sectionHeader}>
            <h2>{t("Inkuru zikunzwe gushakishwa")}</h2>
            <p>{t("Inkuru zikunzwe gushakishwa n'abasomyi")}</p>
          </div>
          <div className={styles.popularContent}>
            <p className={styles.popularText}>{t("Abasomyi bakunda gushakisha")}{" "}
              <strong>{t("inkuru ndende z'urukundo")}</strong>{" "}{t("n'")}<strong>{t("inkuru ndende z'ubwenge")}</strong>{t(". Hari n'")}<strong>{t("inkuru ndende ziryoshye")}</strong>{" "}{t("zishimisha abasomyi benshi.")}{" "}<strong>{t("Inkuru z'urukundo")}</strong>{" "}{t("n'")}<strong>{t("inkuru z'ibanga")}</strong>{" "}{t("ni zo zikunzwe cyane. Abasomyi bashakisha")}{" "}<strong>{t("inkuru z'ubuzima")}</strong>{" "}{t("n'")}<strong>{t("inkuru z'ubwoba")}</strong>{" "}{t("kugira ngo bagire ubunararibonye butandukanye.")}{" "}<strong>{t("Kinyarwanda stories")}</strong>{" "}{t("na")}{" "}
              <strong>{t("online stories")}</strong>{" "}{t("ni bimwe mu bintu byakunzwe cyane.")}{" "}<strong>{t("Reading stories")}</strong>{" "}{t("mu Kinyarwanda biri kwiyongera, kuko abasomyi benshi bashakisha")}<strong>{t("Rwanda stories")}</strong>{" "}{t("n'")}<strong>{t("serialized stories")}</strong>
              . <strong>{t("Best stories")}</strong>{" "}{t("zirimo inkuru z'urukundo, inkuru z'ibanga, n'inkuru z'ubuzima.")}{" "}<strong>{t("Story reading")}</strong>{" "}{t("ni uburyo bwo kwidagadura no kwiga.")}{" "}<strong>{t("Novels")}</strong>,
              <strong>{t("fiction")}</strong>, <strong>{t("romance")}</strong>,{" "}
              <strong>{t("mystery")}</strong>, <strong>{t("thriller")}</strong>,{" "}
              <strong>{t("drama")}</strong>{t(", n'")}<strong>{t("family stories")}</strong>{" "}{t("ni byo bishimisha abasomyi benshi kuri NewTalentsG.")}</p>
          </div>
        </section>

        {/* ===== BENEFITS DETAIL ===== */}
        <section className={styles.detailedBenefits} aria-label={t("Benefits")}>
          <div className={styles.sectionHeader}>
            <h2>{t("Impamvu abasomyi bakunda NewTalentsG")}</h2>
            <p>{t("Ibyiza byo gusoma kuri NewTalentsG")}</p>
          </div>
          <div className={styles.benefitsDetailedGrid}>
            <div className={styles.benefitDetailedCard}>
              <FaQuoteLeft className={styles.benefitDetailedIcon} />
              <h3>{t("Inkuru nyinshi")}</h3>
              <p>{t("Hari inkuru nyinshi z'ubwoko bwose wifuza Ushobora gusoma inkuru nshya buri gihe.")}</p>
            </div>
            <div className={styles.benefitDetailedCard}>
              <FaQuoteLeft className={styles.benefitDetailedIcon} />
              <h3>{t("Ubunararibonye bwiza")}</h3>
              <p>{t("Gusoma kuri NewTalentsG nibintu byoroshye kandi bishimishije. Font nziza, spacing nziza, no dark mode.")}</p>
            </div>
            <div className={styles.benefitDetailedCard}>
              <FaQuoteLeft className={styles.benefitDetailedIcon} />
              <h3>{t("Community ikomeye")}</h3>
              <p>{t("Ganira n'abandi basomyi n'abanditsi. Sangira ibitekerezo, usubire inkuru, ube mu muryango ukomeye.")}</p>
            </div>
            <div className={styles.benefitDetailedCard}>
              <FaQuoteLeft className={styles.benefitDetailedIcon} />
              <h3>{t("Mobile Friendly")}</h3>
              <p>{t("Soma kuri buri gikoresho ukoresha: telephone, tablet, cyangwa ordinateur. Ushobora gusoma aho uri hose.")}</p>
            </div>
          </div>
        </section>

        {/* ===== COMMUNITY SECTION ===== */}
        <section className={styles.community} aria-label={t("Reader community")}>
          <div className={styles.sectionHeader}>
            <h2>{t("Umusomyi Community")}</h2>
            <p>{t("Icyo community ikora")}</p>
          </div>
          <div className={styles.communityContent}>
            <div className={styles.communityCard}>
              <FaUsers className={styles.communityIcon} />
              <h3>{t("Ganira n'abandi")}</h3>
              <p>{t("Ushobora kugirana ibiganiro n'abandi basomyi, gusangira ibitekerezo, no kwiga ku bandi.")}</p>
            </div>
            <div className={styles.communityCard}>
              <FaComment className={styles.communityIcon} />
              <h3>{t("Gusubiza inkuru")}</h3>
              <p>{t("Ushobora gusubiza ku nkuru, gufasha abanditsi, no gutsindira ibihembo.")}</p>
            </div>
            <div className={styles.communityCard}>
              <FaThumbsUp className={styles.communityIcon} />
              <h3>{t("Gushima abanditsi")}</h3>
              <p>{t("Ushobora gushima abanditsi, kubaha amanota, no kubafasha kwandika inkuru nziza.")}</p>
            </div>
          </div>
        </section>

        {/* ===== FAQ SECTION ===== */}
        <section className={styles.faq} aria-label={t("Frequently asked questions")}>
          <div className={styles.sectionHeader}>
            <h2>{t("Ibibazo bikunze kubazwa")}</h2>
            <p>{t("Ibisubizo by'ibibazo bikunze kubazwa")}</p>
          </div>
          <div className={styles.faqGrid}>
            {faqs.map((faq, index) => (
              <div key={index} className={styles.faqItem}>
                <h3 className={styles.faqQuestion}>{faq.question}</h3>
                <p className={styles.faqAnswer}>{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ===== SUMMARY SECTION ===== */}
        <section className={styles.summary} aria-label={t("Summary")}>
          <div className={styles.sectionHeader}>
            <h2>{t("Incamake")}</h2>
            <p>{t("Ubusobanuro ku gusoma kuri NewTalentsG")}</p>
          </div>
          <div className={styles.summaryContent}>
            <p>{t("NewTalentsG ni urubuga rwo gusoma no gusohora inkuru z'ikinyarwanda. Urubuga ruha abasomyi uburyo bwo gusoma inkuru z'ubwoko bwose, mu buryo bworoshye kandi bwigenga. Abasomyi bashobora gusoma inkuru z'ubuntu cyangwa gukoresha NES kugira ngo basome Premium Stories.")}</p>
            <p>{t("NewTalentsG ifite inkuru nyinshi z'ubwoko bwinshi, abanditsi benshi, n'ubunararibonye bwiza bwo gusoma. Ushobora gusoma inkuru zishyushye, zishishikaye, kandi zikomeye. Urubuga rufasha abasomyi gukura mu bumenyi no kugira ubunararibonye bwiza bwo gusoma.")}</p>
            <p>{t("Niba ushaka gusoma inkuru nziza z'ikinyarwanda, NewTalentsG ni ahantu heza cyane. Urubuga rufasha abasomyi gukura mu bumenyi, kugira ubunararibonye bwiza, no kugirana ibiganiro n'abandi basomyi.")}</p>
          </div>
        </section>

        {/* ===== CTA SECTION ===== */}
        <section className={styles.cta} aria-label={t("Call to action")}>
          <div className={styles.ctaContent}>
            <h2>{t("Ubu ni bwo gihe cyo gutangira!")}</h2>
            <p>{t("Tangira gusoma inkuru nziza z'ikinyarwanda kuri NewTalentsG")}</p>
            <div className={styles.ctaButtons}>
              <button
                className={styles.primaryBtn}
                onClick={() => router.push("/stories")}
              >
                <FaBookOpen />{" "}{t("Tangira Gusoma")}</button>
              <button
                className={styles.secondaryBtn}
                onClick={() => router.push("/explore")}
              >
                <FaSearch />{" "}{t("Reba Inkuru")}</button>
              <button
                className={styles.primaryBtn}
                onClick={() => router.push("/auth/signup")}
              >
                <FaUser />{" "}{t("Fungura Konti")}</button>
            </div>
          </div>
        </section>

        {/* ===== RELATED PAGES ===== */}
        <section className={styles.relatedPages} aria-label={t("Related pages")}>
          <div className={styles.sectionHeader}>
            <h2>{t("Ibindi bintu birebana")}</h2>
            <p>{t("Pages zifitanye isano")}</p>
          </div>
          <div className={styles.relatedPagesGrid}>
            <a href="/">{t("Home")}</a>
            <a href="/explore">{t("Explore")}</a>
            <a href="/join">{t("Membership")}</a>
            <a href="/authors">{t("Authors")}</a>
            <a href="/">{t("Stories")}</a>
            <a href="/dashboard/injiza">{t("Uko Winjiza Amafaranga")}</a>
            <a href="/support">{t("Support")}</a>
            <a href="/privacy">{t("Privacy")}</a>
            <a href="/terms">{t("Terms")}</a>
            <a href="/license">{t("Content Licensing")}</a>
          </div>
        </section>
      </main>
    </>
  );
}
