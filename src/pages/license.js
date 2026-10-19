import Head from "next/head";
import Link from "next/link";
import {
  FaHeadphones,
  FaFilm,
  FaBroadcastTower,
  FaCogs,
} from "react-icons/fa";
import styles from "../styles/license.module.css";
import { useI18n } from "@/i18n/I18nProvider";

export default function Licensing() {
  const { t } = useI18n();

  return (
    <>
      <Head>
        <title>{t("Content Licensing | NewTalentsG")}</title>

        <meta
          name="description"
          content="Gura uburenganzira bwo gukoresha inkuru za NewTalentsG muri audio, film, radio cyangwa indi project."
        />

        <meta
          name="keywords"
          content="content licensing, licensing, copyright, NewTalentsG"
        />

        <meta name="author" content="NewTalentsG" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className={styles.page}>
        <div className={styles.container}>
          <div className={styles.hero}>
            <h1 className={styles.title}>{t("Content Licensing")}</h1>

            <p className={styles.subtitle}>{t("Hitamo uburenganzira wifuza ku nkuru za NewTalentsG bitewe n'uburyo ushaka kuzikoresha.")}</p>

            <Link href="/contract" className={styles.applyBtn}>{t("APPLICATION OF CONTENT LICENSING")}</Link>
          </div>

          <section className={styles.explanation}>
            <h2>{t("Itandukaniro rya Exclusive na Non-Exclusive License")}</h2>

            <div className={styles.exGrid}>
              <div className={styles.exBox}>
                <h3>{t("Non-Exclusive License")}</h3>

                <p>{t("Wemerewe gukoresha inkuru ariko NewTalentsG ikagumana uburenganzira bwo kuyitanga no ku bandi bantu.")}</p>

                <ul>
                  <li>{t("Igiciro kiri hasi")}</li>
                  <li>{t("Abandi nabo bashobora kuyikoresha")}</li>
                  <li>{t("Ntabwo uba ufite uburenganzira bwihariye")}</li>
                </ul>
              </div>

              <div className={styles.exBox}>
                <h3>{t("Exclusive License")}</h3>

                <p>{t("Uba uguze uburenganzira bwihariye kandi inkuru ntizongera guhabwa undi muntu.")}</p>

                <ul>
                  <li>{t("Igiciro kiri hejuru")}</li>
                  <li>{t("Ni wowe wenyine uyikoresha")}</li>
                  <li>{t("Bikwiriye film, series n'imishinga minini")}</li>
                </ul>
              </div>
            </div>
          </section>

          <section className={styles.grid}>
            <div className={styles.card}>
              <FaHeadphones className={styles.icon} />

              <h2>{t("Audio Rights")}</h2>

              <p>{t("Gukoresha inkuru mu buryo bwa audio.")}</p>

              <ul>
                <li>{t("Non-Exclusive: 50,000 RWF")}</li>
                <li>{t("Exclusive: 120,000 RWF")}</li>
              </ul>
            </div>

            <div className={styles.card}>
              <FaFilm className={styles.icon} />

              <h2>{t("Film / Series Rights")}</h2>

              <p>{t("Gukoresha inkuru mu gukora film cyangwa series.")}</p>

              <ul>
                <li>{t("Short Film: 150,000 RWF")}</li>
                <li>{t("Full Movie: 300,000+ RWF")}</li>
              </ul>
            </div>

            <div className={styles.card}>
              <FaBroadcastTower className={styles.icon} />

              <h2>{t("Radio Rights")}</h2>

              <p>{t("Gukoresha inkuru kuri radio cyangwa broadcast.")}</p>

              <ul>
                <li>{t("Local Radio: 40,000 RWF")}</li>
                <li>{t("National Radio: 80,000 RWF")}</li>
              </ul>
            </div>

            <div className={styles.card}>
              <FaCogs className={styles.icon} />

              <h2>{t("Custom License")}</h2>

              <p>{t("Niba ufite indi project yihariye twavugana tugakora amasezerano akwiranye nayo.")}</p>

              <p className={styles.contact}>{t("WhatsApp: +250 722 319 367")}</p>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
