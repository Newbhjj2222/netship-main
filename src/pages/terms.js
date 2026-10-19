import Head from "next/head";
import Link from "next/link";
import styles from "../styles/terms.module.css";
import { useI18n } from "@/i18n/I18nProvider";

export default function Terms() {
  const { t } = useI18n();

  return (
    <>
      <Head>
        <title>{t("Amategeko n'Amabwiriza | NewTalentsG")}</title>

        <meta
          name="description"
          content="Soma amategeko n'amabwiriza agenga ikoreshwa rya NewTalentsG."
        />

        <meta
          name="keywords"
          content="terms, conditions, amategeko, amabwiriza, NewTalentsG"
        />

        <meta name="author" content="NewTalentsG" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className={styles.termsPage}>
        <div className={styles.container}>
          <div className={styles.hero}>
            <h1>{t("Amategeko n'Amabwiriza")}</h1>

            <p>{t("Aya mategeko agenga uburyo bwo gukoresha urubuga rwa NewTalentsG. Ukoresheje uru rubuga uba wemeye gukurikiza aya mabwiriza yose.")}</p>

            <span className={styles.updated}>{t("Itariki yo kuvugurura: Ugushyingo 24, 2025")}</span>
          </div>

          <article className={styles.card}>
            <section>
              <h2>{t("1. Intangiriro")}</h2>

              <p>{t("Kwinjira no gukoresha urubuga")}<strong>{" "}{t("newtalentsg.co.rw")}{" "}</strong>{t("bisobanura ko wemeye gukurikiza aya mategeko n'amabwiriza. Niba utayemera, turagusaba kudakoresha uru rubuga.")}</p>
            </section>

            <section>
              <h2>{t("2. Uburyo bwo Gukoresha Urubuga")}</h2>

              <ul>
                <li>{t("Ntugomba gukoresha urubuga mu bikorwa binyuranyije n'amategeko.")}</li>

                <li>{t("Ntugomba kugerageza kwinjirira cyangwa guhungabanya umutekano w'urubuga.")}</li>

                <li>{t("Konti ishobora guhagarikwa igihe wishe aya mategeko kandi wanabiregerwa mu nyiko.")}</li>
              </ul>
            </section>

            <section>
              <h2>{t("3. Uburenganzira ku Mutungo na Copyright")}</h2>

              <p>{t("Ibiri ku rubuga birimo logo, inyandiko, amafoto, amashusho, software n'ibindi byose ni umutungo wa NewTalentsG cyangwa abafatanyabikorwa bayo.")}</p>

              <p>{t("Kubikoresha, kubikoporora cyangwa kubisakaza bisaba uburenganzira bwanditse butanzwe na Admin.")}</p>
            </section>

            <section>
              <h2>{t("4. Amasezerano y'Ubwishyu")}</h2>

              <p>{t("Niba hari serivisi zisaba kwishyurwa, urasabwa kwishyura neza kandi ku gihe.")}</p>

              <p>{t("Politiki yo gusubizwa amafaranga (Refund Policy) igengwa n'amabwiriza yayo yihariye.")}</p>
            </section>

            <section>
              <h2>{t("5. Kwirengera n'Imipaka")}</h2>

              <p>{t("Uru rubuga rutangwa nk'uko ruri kandi NewTalentsG ntishobora kwirengera ibibazo byose biterwa n'ikoreshwa nabi ryarwo cyangwa amakosa aturutse ku bantu bandi.")}</p>
            </section>

            <section>
              <h2>{t("6. Politiki y'Ubwiru")}</h2>

              <p>{t("Amakuru yawe bwite arinzwe nk'uko bisobanurwa muri")}<Link href="/privacy" className={styles.link}>
                  {" "}{t("Politiki y'Ubwiru")}</Link>.
              </p>
            </section>

            <section>
              <h2>{t("7. Amategeko Agenga")}</h2>

              <p>{t("Aya mategeko agengwa n'amategeko ya Repubulika y'u Rwanda.")}</p>

              <p>{t("Ikibazo cyose kijyanye n'aya mategeko kizakemurirwa mu nkiko zibifitiye ububasha mu Rwanda.")}</p>
            </section>

            <section>
              <h2>{t("8. Impinduka ku Mategeko")}</h2>

              <p>{t("NewTalentsG ifite uburenganzira bwo guhindura aya mategeko igihe icyo ari cyo cyose.")}</p>

              <p>{t("Impinduka zose zizatangira gukurikizwa zikimara gutangazwa kuri uru rubuga.")}</p>
            </section>

            <section>
              <h2>{t("9. Twandikire")}</h2>

              <div className={styles.contactBox}>
                <p>{t("Niba ufite ikibazo cyangwa igitekerezo twandikire kuri:")}</p>

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
