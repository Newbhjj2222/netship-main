import Link from "next/link";
import {
  FaMoneyBillWave,
  FaFileContract,
  FaUserShield,
  FaCertificate,
  FaCrown,
  FaHeadset,
} from "react-icons/fa";

import styles from "../styles/Explore.module.css";
import { useI18n } from "@/i18n/I18nProvider";

export default function Explore() {
  const { t } = useI18n();

  const items = [
    {
      icon: <FaMoneyBillWave />,
      title: "Refund Policy",
      description:
        "Menya uburyo amafaranga asubizwa, ibisabwa ndetse n'igihe refund ishobora gutangirwa.",
      link: "/refund",
      button: "Soma Refund Policy",
    },
    {
      icon: <FaFileContract />,
      title: "Terms & Conditions",
      description:
        "Soma amategeko n'amabwiriza agenga ikoreshwa rya website yacu.",
      link: "/terms",
      button: "Soma Terms",
    },
    {
      icon: <FaUserShield />,
      title: "Privacy Policy",
      description:
        "Menya uburyo amakuru yawe arindwa kandi agakoreshwa mu buryo bwizewe.",
      link: "/privacy",
      button: "Soma Privacy Policy",
    },
    {
      icon: <FaCertificate />,
      title: "Content Licensing",
      description:
        "Sobanukirwa uburenganzira n'ikoreshwa ry'ibiri kuri website.",
      link: "/license",
      button: "Soma Licensing",
    },
          
    {
      icon: <FaCertificate />,
      title: "Ibijyanye n'urubuga",
      description:
        "Sobanukirwa byinshi kurubuga rwacu, imikorere yarwo n'uko warukoresha.",
      link: "/umusomyi",
      button: "Menya byinshi",
    },
    {
      icon: <FaCrown />,
      title: "Premium Membership",
      description:
        "Gura membership igufasha gusoma inkuru zose mu gihe cy'umwaka wose.",
      link: "/join",
      button: "Join Membership",
    },
    {
      icon: <FaHeadset />,
      title: "Support & Advertising",
      description:
        "Twandikire cyangwa utwandikire niba ushaka kwamamaza ibikorwa byawe.",
      link: "/support",
      button: "Contact Us",
    },
  ];

  return (
    <div className={styles.explore}>
      <div className={styles.container}>
        <h1>{t("Explore")}</h1>

        <p className={styles.intro}>{t("Hitamo icyiciro ushaka gusobanukirwa kugira ngo ubone amakuru arambuye ku mategeko, serivisi n'ubufasha dutanga.")}</p>

        <div className={styles.grid}>
          {items.map((item, index) => (
            <div className={styles.card} key={index}>
              <div className={styles.icon}>{item.icon}</div>

              <h2>{item.title}</h2>

              <p>{item.description}</p>

              <Link href={item.link}>
                <button>{item.button}</button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
