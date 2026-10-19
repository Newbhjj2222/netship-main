import { useEffect, useState } from "react";
import styles from "./hello.module.css";
import Link from "next/link";
import { useI18n } from "@/i18n/I18nProvider";
const slides = [
  {
    image: "/theme1.jpg",
    title: "Soma, Andika",
    subtitle: "Winjize amafaranga ku nkuru zawe.",
    description:
      "Wahoze usoma, none igihe ni iki cyo kugira icyo usiga ku isi.",
  },
  {
    image: "/theme2.jpg",
    title: "Shyira hanze impano yawe",
    subtitle: "Abasomyi baragutegereje.",
    description:
      "Andika inkuru nziza, zigerweho n'abantu benshi kandi wubake izina ryawe.",
  },
  {
    image: "/theme3.jpg",
    title: "Bona NES Points",
    subtitle: "Hindura impano yawe amafaranga.",
    description:
      "Uko abasomyi basoma inkuru zawe niko NES Points ziyongera.",
  },
];

export default function HeroSlider() {
  const { t } = useI18n();

  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={styles.slider}>
      {slides.map((slide, index) => (
        <div
          key={index}
          className={`${styles.slide} ${
            current === index ? styles.active : ""
          }`}
          style={{
            backgroundImage: `url(${slide.image})`,
          }}
        >
          <div className={styles.overlay}></div>

          <div className={styles.content}>
            <h1>{slide.title}</h1>

            <h2>{slide.subtitle}</h2>

            <p>{slide.description}</p>

            <div className={styles.buttons}>
              <Link href="/profile" className={styles.primary}>{t("Tangira Gusoma")}</Link>

  <Link href="/dashboard" className={styles.secondary}>{t("Tangira Kwandika")}</Link>
            </div>
          </div>
        </div>
      ))}

      <div className={styles.dots}>
        {slides.map((_, index) => (
          <span
            key={index}
            className={
              current === index
                ? `${styles.dot} ${styles.activeDot}`
                : styles.dot
            }
            onClick={() => setCurrent(index)}
          />
        ))}
      </div>
    </div>
  );
}
