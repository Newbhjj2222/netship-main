import Head from "next/head";
import styles from "../styles/Netstory.module.css";
import { useI18n } from "@/i18n/I18nProvider";

const APK_URL =
  "https://apk.e-droid.net/apk/app3971751-61pg0y.apk?v=6";

const SITE_URL = "https://newtalentsg.co.rw";
const PAGE_URL = `${SITE_URL}/apk`;

export default function Netstory() {
  const { t } = useI18n();

  const handleInstall = () => {
    window.open(
      APK_URL,
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <>
      <Head>
        {/* Basic SEO */}
        <title>{t("Netstory - New Talents Stories Group")}</title>

        <meta
          name="description"
          content="Install Netstory, the official application of New Talents Stories Group. Discover, read and enjoy amazing stories in one place."
        />

        <meta
          name="keywords"
          content="Netstory, New Talents Stories Group, New Talents Stories, Kinyarwanda stories, inkuru nyarwanda, stories Rwanda, Rwanda stories, books Rwanda"
        />

        <meta
          name="author"
          content="New Talents Stories Group"
        />

        <meta
          name="robots"
          content="index, follow"
        />

        <meta
          name="googlebot"
          content="index, follow, max-image-preview:large"
        />

        <meta
          name="theme-color"
          content="#080b16"
        />

        <meta
          name="application-name"
          content="Netstory"
        />

        <meta
          name="apple-mobile-web-app-title"
          content="Netstory"
        />

        <meta
          name="mobile-web-app-capable"
          content="yes"
        />

        <meta
          name="apple-mobile-web-app-capable"
          content="yes"
        />

        <meta
          name="format-detection"
          content="telephone=no"
        />

        {/* Open Graph */}
        <meta
          property="og:type"
          content="website"
        />

        <meta
          property="og:title"
          content="Netstory - New Talents Stories Group"
        />

        <meta
          property="og:description"
          content="Install Netstory and discover amazing stories from New Talents Stories Group."
        />

        <meta
          property="og:site_name"
          content="New Talents Stories Group"
        />

        <meta
          property="og:url"
          content={PAGE_URL}
        />

        <meta
          property="og:image"
          content={`${SITE_URL}/logo.png`}
        />

        <meta
          property="og:image:alt"
          content="Netstory Logo"
        />

        {/* Twitter */}
        <meta
          name="twitter:card"
          content="summary"
        />

        <meta
          name="twitter:title"
          content="Netstory - New Talents Stories Group"
        />

        <meta
          name="twitter:description"
          content="Install Netstory, the official application of New Talents Stories Group."
        />

        <meta
          name="twitter:image"
          content={`${SITE_URL}/logo.png`}
        />

        {/* Canonical */}
        <link
          rel="canonical"
          href={PAGE_URL}
        />

        {/* App Icon */}
        <link
          rel="icon"
          href="/logo.png"
        />

        <link
          rel="apple-touch-icon"
          href="/logo.png"
        />
      </Head>

      <main className={styles.page}>
        {/* Decorative background */}
        <div className={styles.backgroundGlowOne} />
        <div className={styles.backgroundGlowTwo} />
        <div className={styles.backgroundGlowThree} />

        <section className={styles.container}>
          {/* App Header */}
          <div className={styles.appHeader}>
            <div className={styles.logoWrapper}>
              <img
                src="/logo.png"
                alt={t("Netstory Logo")}
                className={styles.logo}
              />
            </div>

            <div className={styles.verified}>
              <span className={styles.verifiedDot}>
                ✓
              </span>

              <span>{t("Official App")}</span>
            </div>
          </div>

          {/* Brand */}
          <div className={styles.brand}>
            <span className={styles.brandSmall}>{t("NEW TALENTS STORIES GROUP")}</span>

            <h1>{t("Net")}<span>{t("story")}</span>
            </h1>
          </div>

          {/* Description */}
          <p className={styles.tagline}>{t("Inkuru nziza. Abanditsi beza.")}<br />{t("Byose ahantu hamwe.")}</p>

          <p className={styles.description}>{t("Netstory ni application ya New Talents Stories Group igufasha gusoma no kuvumbura inkuru zitandukanye, ndetse no gukurikirana abanditsi n'inkuru ukunda.")}</p>

          {/* Rating */}
          <div className={styles.ratingCard}>
            <div className={styles.ratingMain}>
              <span className={styles.ratingNumber}>
                4.9
              </span>

              <div className={styles.ratingInfo}>
                <div className={styles.stars}>
                  <span>★</span>
                  <span>★</span>
                  <span>★</span>
                  <span>★</span>
                  <span>★</span>
                </div>

                <span className={styles.ratingText}>{t("Excellent rating")}</span>
              </div>
            </div>

            <div className={styles.ratingDivider} />

            <div className={styles.downloadStat}>
              <strong>{t("60K+")}</strong>

              <span>{t("Downloads")}</span>
            </div>
          </div>

          {/* Install Button */}
          <button
            type="button"
            className={styles.installButton}
            onClick={handleInstall}
            aria-label={t("Install Netstory")}
          >
            <span className={styles.installIcon}>
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  d="M12 3v11"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />

                <path
                  d="m7 10 5 5 5-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                <path
                  d="M5 21h14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </span>

            <span className={styles.installText}>
              <strong>{t("Install Netstory")}</strong>

              <small>{t("Android APK")}</small>
            </span>

            <span className={styles.arrow}>
              →
            </span>
          </button>

          <p className={styles.installNote}>{t("Tapping Install will open the APK download page in a new tab.")}</p>

          {/* Features */}
          <div className={styles.features}>
            <article
              className={`${styles.feature} ${styles.featurePurple}`}
            >
              <div className={styles.featureIcon}>
                📖
              </div>

              <div>
                <h2>{t("Read Stories")}</h2>

                <p>{t("Soma inkuru zitandukanye ahantu hamwe.")}</p>
              </div>
            </article>

            <article
              className={`${styles.feature} ${styles.featureBlue}`}
            >
              <div className={styles.featureIcon}>
                ✨
              </div>

              <div>
                <h2>{t("Discover")}</h2>

                <p>{t("Vumbura abanditsi n'inkuru nshya.")}</p>
              </div>
            </article>

            <article
              className={`${styles.feature} ${styles.featurePink}`}
            >
              <div className={styles.featureIcon}>
                ❤️
              </div>

              <div>
                <h2>{t("Your Favorites")}</h2>

                <p>{t("Kurikirana inkuru ukunda.")}</p>
              </div>
            </article>
          </div>

          {/* Bottom info */}
          <div className={styles.bottomInfo}>
            <div>
              <span className={styles.bottomIcon}>
                🔒
              </span>

              <span>{t("Safe & Secure")}</span>
            </div>

            <span className={styles.separator}>
              •
            </span>

            <div>
              <span className={styles.bottomIcon}>
                📱
              </span>

              <span>{t("Android")}</span>
            </div>

            <span className={styles.separator}>
              •
            </span>

            <div>
              <span className={styles.bottomIcon}>
                ⚡
              </span>

              <span>{t("Fast")}</span>
            </div>
          </div>

          <footer className={styles.footer}>
            <p>
              © {new Date().getFullYear()}{" "}{t("New Talents Stories Group")}</p>

            <span>{t("Netstory")}</span>
          </footer>
        </section>
      </main>
    </>
  );
}
