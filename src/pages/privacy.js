import Head from "next/head";
import styles from "../styles/privacy.module.css";
import { useI18n } from "@/i18n/I18nProvider";

export default function PrivacyPolicy() {
  const { t } = useI18n();

  return (
    <>
      <Head>
        <title>{t("Politiki y'Ubwiru | NewTalentsG")}</title>

        <meta
          name="description"
          content="Politiki y'Ubwiru ya NewTalentsG isobanura uburyo dukusanya, dukoresha kandi turinda amakuru yawe."
        />

        <meta
          name="keywords"
          content="privacy policy, politiki y'ubwiru, NewTalentsG, amakuru bwite"
        />

        <meta name="author" content="NewTalentsG" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className={styles.privacyPage}>
        <div className={styles.container}>
          <div className={styles.hero}>
            <h1>{t("Politiki y'Ubwiru")}</h1>

            <p>{t("Menya uburyo NewTalentsG ikusanya, ikoresha kandi irinda amakuru yawe bwite igihe ukoresha urubuga rwacu.")}</p>

            <span className={styles.updated}>{t("Itariki yo kuvugurura system: Ugushyingo 23, 2025")}</span>
          </div>

          <article className={styles.card}>
            <section>
              <h2>{t("1. Intangiriro")}</h2>

              <p>{t("Tukugirira ibanga ku makuru yawe kandi twiyemeje kuyarinda mu buryo bwizewe kandi bwubahiriza amategeko.")}</p>

              <p>{t("Amakuru dukusanya, dukoresha cyangwa tubika amenywa nawe nyirayo ndetse na system iyacunga gusa.")}</p>

              <p>{t("Nta wundi muntu wemerewe kubona amakuru yawe bwite atabifitiye uburenganzira.")}</p>

              <p>{t("Ni yo mpamvu ushobora kwizera")}<strong>{" "}{t("newtalentsg.co.rw")}{" "}</strong>{t("mu kubika amakuru yawe.")}</p>
            </section>

            <section>
              <h2>{t("2. Amakuru Dukusanya")}</h2>

              <ul>
                <li>{t("Amakuru uduha nk'izina, email na nimero ya telefone.")}</li>

                <li>{t("Amakuru dukusanya mu buryo bwikora nka cookies, IP address n'ubwoko bwa browser.")}</li>

                <li>{t("Amakuru aturuka ku zindi serivisi cyangwa konti ushobora guhuza n'urubuga rwacu.")}</li>
              </ul>
            </section>

            <section>
              <h2>{t("3. Uko Dukoresha Amakuru Yawe")}</h2>

              <ul>
                <li>{t("Kugufasha kwiyandikisha no gukoresha serivisi zacu.")}</li>

                <li>{t("Kwemeza ko ushobora gusoma, kwandika cyangwa gukoresha ibice bitandukanye by'urubuga.")}</li>

                <li>{t("Kuvugana nawe ku bijyanye na raporo, promotions cyangwa ubufasha.")}</li>

                <li>{t("Gusesengura uburyo urubuga rukoreshwa kugira ngo tururusheho kunoza.")}</li>
              </ul>
            </section>

            <section>
              <h2>{t("4. Gusangira Amakuru Yawe")}</h2>

              <p>{t("Ntidugurisha amakuru yawe bwite ku bandi bantu cyangwa ibigo.")}</p>

              <p>{t("Hari igihe dushobora gusangira amakuru n'abatanga serivisi badufasha gucunga urubuga cyangwa kubahiriza amategeko igihugu gisaba.")}</p>

              <div className={styles.infoBox}>{t("Amakuru yawe akoreshwa gusa ku mpamvu zemewe kandi zijyanye na serivisi dutanga.")}</div>
            </section>

            <section>
              <h2>{t("5. Umutekano w'Amakuru")}</h2>

              <p>{t("Turinda amakuru yawe twifashishije uburyo butandukanye bw'umutekano harimo password yawe ndetse n'ubundi buryo bwo kurinda konti.")}</p>

              <p>{t("System yacu ikumira abantu bashobora kugerageza kwinjirira konti z'abandi cyangwa gukora ibikorwa bitemewe.")}</p>
            </section>

            <section>
              <h2>{t("6. Impinduka kuri Politiki y'Ubwiru")}</h2>

              <p>{t("Dushobora kuvugurura iyi Politiki y'Ubwiru igihe icyo ari cyo cyose bitewe n'impinduka za system cyangwa amategeko.")}</p>

              <p>{t("Impinduka zose zizashyirwa kuri uru rubuga kandi zizajya zigaragaza itariki zavugururiweho.")}</p>
            </section>

            <section>
              <h2>{t("7. Twandikire")}</h2>

              <div className={styles.contactBox}>
                <p>{t("Niba ufite ikibazo cyangwa igitekerezo ku bijyanye n'iyi Politiki y'Ubwiru twandikire kuri:")}</p>

                <a href="mailto:admin@newtalentsg.co.rw">
                  admin@newtalentsg.co.rw
                </a>
              </div>
            </section>
          </article>
        </div>
      </main>
    </>
  );
}
