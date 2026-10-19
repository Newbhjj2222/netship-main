// src/components/LanguageSwitcher.js
// Guhitamo ururimi nka Facebook: agashushanyo k'isi (globe) gafungura idirishya ririmo indimi.
import { useEffect, useState } from "react";
import { FaGlobe, FaCheck, FaTimes } from "react-icons/fa";
import { useI18n } from "../i18n/I18nProvider";
import styles from "./LanguageSwitcher.module.css";

export default function LanguageSwitcher({ variant = "icon" }) {
  const { lang, setLang, languages, t } = useI18n();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const current = languages.find((l) => l.code === lang);

  return (
    <>
      <button
        type="button"
        className={variant === "row" ? styles.rowButton : styles.iconButton}
        onClick={() => setOpen(true)}
        aria-label={t("lang.label")}
        aria-haspopup="dialog"
      >
        <FaGlobe />
        {variant === "row" ? <span>{current?.native}</span> : <span className={styles.code}>{lang}</span>}
      </button>

      {open && (
        <div className={styles.overlay} onClick={() => setOpen(false)}>
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-label={t("lang.title")}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.head}>
              <h3>{t("lang.title")}</h3>
              <button type="button" className={styles.close} onClick={() => setOpen(false)} aria-label={t("lang.close")}>
                <FaTimes />
              </button>
            </div>

            <ul className={styles.list}>
              {languages.map((l) => (
                <li key={l.code}>
                  <button
                    type="button"
                    className={`${styles.item} ${l.code === lang ? styles.active : ""}`}
                    onClick={() => {
                      setLang(l.code);
                      setOpen(false);
                    }}
                    lang={l.code}
                  >
                    <span>{l.native}</span>
                    {l.code === lang && <FaCheck aria-hidden="true" />}
                  </button>
                </li>
              ))}
            </ul>

            <p className={styles.note}>{t("lang.note")}</p>
          </div>
        </div>
      )}
    </>
  );
}
