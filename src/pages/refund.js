import Head from "next/head";
import styles from "../styles/refund.module.css";
import { useI18n } from "@/i18n/I18nProvider";

export default function RefundPolicy() {
  const { t } = useI18n();

  return (
    <>
      <Head>
        <title>{t("Amabwiriza yo Gusubizwa Amafaranga | NewTalentsG")}</title>

        <meta
          name="description"
          content="Amabwiriza ya NewTalentsG ajyanye no gusubizwa amafaranga ku banyamuryango n'abakoresha serivisi zacu."
        />

        <meta
          name="keywords"
          content="refund policy, gusubizwa amafaranga, NewTalentsG, NES"
        />

        <meta name="author" content="NewTalentsG" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className={styles.refundPage}>
        <div className={styles.container}>
          <div className={styles.hero}>
            <h1>{t("Amabwiriza yo Gusubizwa Amafaranga")}</h1>

            <p>{t("Soma aya mabwiriza mbere yo kugura NES, membership cyangwa indi serivisi iyo ari yo yose itangwa na NewTalentsG.")}</p>

            <span className={styles.updated}>{t("Byavuguruwe bwa nyuma: Kamena 2026")}</span>
          </div>

          <article className={styles.card}>
            <section>
              <h2>{t("1. Amakuru Rusange")}</h2>

              <p>{t("Aya mabwiriza asobanura uburyo NewTalentsG yakira cyangwa yanga ubusabe bwo gusubizwa amafaranga yishyuwe kuri platform yacu.")}</p>

              <p>{t("Ukoresheje cyangwa ugura serivisi zacu uba wemeye aya mabwiriza yose.")}</p>
            </section>

            <section>
              <h2>{t("2. Serivisi Zitagarurwaho Amafaranga")}</h2>

              <ul>
                <li>{t("Kugura NES")}</li>
                <li>{t("Membership zose")}</li>
                <li>{t("Daily Membership")}</li>
                <li>{t("Weekly Membership")}</li>
                <li>{t("Best Reader Membership")}</li>
                <li>{t("Serivisi zitangwa ako kanya")}</li>
              </ul>

              <div className={styles.warning}>{t("Nyuma y'uko izi serivisi zimaze gutangwa, amafaranga ntashobora gusubizwa.")}</div>
            </section>

            <section>
              <h2>{t("3. Ibihe Refund Ishobora Kwemerwa")}</h2>

              <ul>
                <li>{t("Iyo wishyuwe inshuro ebyiri ku ikosa rya system")}</li>
                <li>{t("Iyo wishyuye ariko serivisi ntuyihabwe")}</li>
                <li>{t("Iyo wishyuwe amafaranga atari yo")}</li>
                <li>{t("Iyo habaye ikibazo cya tekiniki cyatewe na NewTalentsG")}</li>
              </ul>
            </section>

            <section>
              <h2>{t("4. Igihe cyo Gusaba Refund")}</h2>

              <p>{t("Ubusabe bwo gusubizwa amafaranga bugomba gutangwa mu masaha")}<strong> 24 </strong>{t("nyuma yo kwishyura.")}</p>

              <p>{t("Nyuma y'ayo masaha ubusabe bushobora kutemerwa.")}</p>
            </section>

            <section>
              <h2>{t("5. Uko Wasaba Refund")}</h2>

              <p>{t("Tanga amakuru akurikira:")}</p>

              <ul>
                <li>{t("Username yawe")}</li>
                <li>{t("Itariki n'isaha wishyuriyeho")}</li>
                <li>{t("Amafaranga wishyuye")}</li>
                <li>{t("Impamvu usaba refund")}</li>
              </ul>

              <div className={styles.contactBox}>
                <p>
                  <strong>{t("Email:")}</strong>
                  <br />
                  admin@newtalentsg.co.rw
                </p>

                <p>
                  <strong>{t("Website:")}</strong>
                  <br />{t("www.newtalentsg.co.rw")}</p>
              </div>
            </section>

            <section>
              <h2>{t("6. Igihe Amafaranga Asubirizwamo")}</h2>

              <p>{t("Iyo refund yemewe, amafaranga asubizwa mu minsi")}<strong>{" "}{t("2 kugeza kuri 7 y'akazi")}{" "}</strong>{t("bitewe n'uburyo bwo kwishyura bwakoreshejwe.")}</p>
            </section>

            <section>
              <h2>{t("7. Guhindura Aya Mabwiriza")}</h2>

              <p>{t("NewTalentsG ifite uburenganzira bwo guhindura aya mabwiriza igihe icyo ari cyo cyose.")}</p>

              <p>{t("Impinduka zitangira gukurikizwa zikimara gushyirwa kuri website.")}</p>
            </section>
          </article>
        </div>
      </main>
    </>
  );
}
