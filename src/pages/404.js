import Link from "next/link";
import { FaTools, FaHome, FaClock } from "react-icons/fa";
import styles from "../styles/404.module.css";
import { useI18n } from "@/i18n/I18nProvider";

export default function Custom404() {
  const { t } = useI18n();

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.icon}>
          <FaTools />
        </div>

        <h1>{t("Uraho!!!!")}</h1>
        <h2>{t("Iyi Page aracyari Kubakwa")}</h2>

        <p>{t("Iyi page ntabwo iraboneka ubu. Iracyari mu bikorwa byo kuyubaka kugira ngo izaze igaragara neza. Izashyirwa online vuba cyane.")}</p>

        <div className={styles.info}>
          <FaClock className={styles.clock} />
          <span>{t("Murakoze ku bwo kwihangana.")}</span>
        </div>

        <Link href="/" className={styles.btn}>
          <FaHome />
          <span>{t("Garuka Ahabanza")}</span>
        </Link>
      </div>
    </div>
  );
}
