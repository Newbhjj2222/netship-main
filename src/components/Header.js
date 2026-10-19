import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import Cookies from "js-cookie";
import LanguageSwitcher from "./LanguageSwitcher";
import { useI18n } from "../i18n/I18nProvider";

import {
  FaBars,
  FaTimes,
  FaHome,
  FaCompass,
  FaBook,
  FaVoteYea,
  FaNewspaper,
  FaUser,
  FaPenNib,
  FaDownload,
  FaGamepad,
  FaUsers,
} from "react-icons/fa";

import styles from "./Header.module.css";

export default function Header() {
  const router = useRouter();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const userCookie = Cookies.get("user");

    if (userCookie) {
      try {
        const user = JSON.parse(userCookie);

        if (user.username === "NewtalentsG") {
  setIsAdmin(true);

        }
      } catch (err) {
        console.error("Invalid user cookie:", err);
      }
    }
  }, []);

  const links = [
    {
      name: t("nav.home"),
      href: "/",
      icon: <FaHome />,
    },
    {
      name: t("nav.explore"),
      href: "/explore",
      icon: <FaCompass />,
    },
    {
      name: t("nav.about"),
      href: "/about",
      icon: <FaBook />,
    },
    {
  name: t("nav.polls"),
  href: "/polls",
  icon: <FaVoteYea />,
},
    {
      name: t("nav.plans"),
      href: "/ibiciro",
      icon: <FaNewspaper />,
    },
    {
  name: t("nav.offline"),
  href: "/offline",
  icon: <FaDownload />,
},
    {
      name: t("nav.profile"),
      href: "/profile",
      icon: <FaUser />,
    },
    {
  name: t("nav.authors"),
  href: "/authors",
  icon: <FaPenNib />,
},
    {
  name: t("nav.train"),
  href: "/train",
  icon: <FaPenNib />,
},
    {
  name: t("nav.install"),
  href: "/apk",
  icon: <FaDownload />,
},
    {
  name: t("nav.nesMine"),
  href: "/nesMine",
  icon: <FaGamepad />,
},
  ];

  return (
    <>
      {/* HEADER */}
      <header className={styles.header}>
        {/* LEFT */}
        <div className={styles.left}>
          <button
  className={styles.menuBtn}
  onClick={() => setOpen(true)}
  aria-label={t("nav.openMenu")}
>
  <FaBars />
</button>

          <Image
            src="/logo.png"
            alt={t("logo")}
            width={45}
            height={45}
            className={styles.logoImage}
          />

          <div>
            <h3>{t("NEW TALENTS")}</h3>
            <span>{t("Stories Group")}</span>
          </div>
        </div>

        {/* CENTER */}
        <nav className={styles.center}>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={
                router.pathname === link.href
                  ? `${styles.link} ${styles.active}`
                  : styles.link
              }
            >
              {link.name}
            </Link>
          ))}
        </nav>

        {/* RIGHT */}
        <div className={styles.rightGroup}>
          <div className={styles.langWrap}>
            <LanguageSwitcher />
          </div>

          <div className={styles.right}>
            <Link
              href={isAdmin ? "/admin" : "/profile"}
              aria-label={isAdmin ? t("nav.openAdmin") : t("nav.openProfile")}
            >
              <FaUsers style={{ cursor: "pointer" }} />
            </Link>
          </div>
        </div>
      </header>

      {/* MOBILE SIDEBAR */}
      {open && (
        <div
          className={styles.overlay}
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`${styles.sidebar} ${
          open ? styles.showSidebar : ""
        }`}
      >
        <button
          className={styles.close}
          onClick={() => setOpen(false)}
        >
          <FaTimes />
        </button>

        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={
              router.pathname === link.href
                ? `${styles.sideLink} ${styles.active}`
                : styles.sideLink
            }
            onClick={() => setOpen(false)}
          >
            {link.icon}
            {link.name}
          </Link>
        ))}

        <div className={styles.sideLang}>
          <LanguageSwitcher variant="row" />
        </div>
      </aside>
    </>
  );
}
