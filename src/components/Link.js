import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import styles from "../styles/Link.module.css";
import {
  FaHome,
  FaMoneyBillWave,
  FaChartLine,
  FaWallet,
  FaShareAlt,
  FaVideo,
  FaGavel,
  FaFileContract,
  FaPenFancy,
  FaBars,
  FaTrophy,
  FaTimes,
  FaUser,
  FaSignOutAlt,
} from "react-icons/fa";
import Cookies from "js-cookie";
import { useI18n } from "@/i18n/I18nProvider";

export default function LinkComponent({ username }) {
  const { t } = useI18n();

  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [userName, setUserName] = useState(username || "");

  useEffect(() => {
    setIsClient(true);
    if (!userName) {
      const userCookie = Cookies.get("user");
      if (userCookie) {
        try {
          const userData = JSON.parse(userCookie);
          setUserName(userData.username || "User");
        } catch {
          setUserName("User");
        }
      }
    }
  }, [userName]);

  // ===== NAVIGATION LINKS =====
  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: <FaHome /> },
    { href: "/dashboard/earn", label: "Earnings", icon: <FaMoneyBillWave /> },
    { href: "/dashboard/inf", label: "Monitization", icon: <FaChartLine /> },
    { href: "/dashboard/balance", label: "Wallet", icon: <FaWallet /> },
    { href: "/dashboard/share", label: "Share Stories", icon: <FaShareAlt /> },
    { href: "/dashboard/meet", label: "Meeting", icon: <FaVideo /> },
    { href: "/dashboard/injiza", label: "Uburyo bwo Kwinjiza", icon: <FaMoneyBillWave /> },
    { href: "/dashboard/rule", label: "Rules", icon: <FaGavel /> },
    { href: "/dashboard/contract", label: "Make Contract", icon: <FaFileContract /> },
    { href: "/dashboard/create", label: "Write Story", icon: <FaPenFancy /> },
    {
  href: "/dashboard/achievements",
  label: "Achievements",
  icon: <FaTrophy />,
},
    {
  href: "/financial",
  label: "Financial Management",
  icon: <FaChartLine />,
},
  ];

  // ===== CHECK IF LINK IS ACTIVE =====
  const isActive = (href) => {
    if (href === "/") {
      return router.pathname === "/";
    }
    return router.pathname.startsWith(href);
  };

  // ===== TOGGLE MENU =====
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // ===== CLOSE MENU =====
  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  // ===== HANDLE LOGOUT =====
  const handleLogout = () => {
    if (confirm(t("Urahara ushaka gusohoka?"))) {
      Cookies.remove("user");
      router.push("/login");
    }
  };

  // ===== GET INITIALS =====
  const getInitials = (name) => {
    if (!name) return "U";
    return name.charAt(0).toUpperCase();
  };

  return (
    <>
      <nav className={styles.navbar}>
        <div className={styles.navContainer}>
          {/* ===== LOGO ===== */}
          <div className={styles.logo}>
            <Link href="/" onClick={closeMenu}>
              <span className={styles.logoText}>
                <span className={styles.logoHighlight}>{t("N")}</span>{t("TS")}</span>
              <span className={styles.logoSub}>{t("Stories")}</span>
            </Link>
          </div>

          {/* ===== DESKTOP LINKS (with horizontal scroll) ===== */}
          <div className={styles.desktopLinksWrapper}>
            <div className={styles.desktopLinks}>
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`${styles.navLink} ${
                    isActive(link.href) ? styles.active : ""
                  }`}
                >
                  <span className={styles.navIcon}>{link.icon}</span>
                  <span className={styles.navLabel}>{link.label}</span>
                  {isActive(link.href) && (
                    <span className={styles.activeIndicator}></span>
                  )}
                </Link>
              ))}
            </div>
          </div>

          {/* ===== USER SECTION ===== */}
          <div className={styles.userSection}>
            <div className={styles.userAvatar}>
              <span>{getInitials(userName)}</span>
            </div>
            <span className={styles.userName}>{userName}</span>
            <button onClick={handleLogout} className={styles.logoutBtn} title={t("Logout")}>
              <FaSignOutAlt />
            </button>
          </div>

          {/* ===== MOBILE HAMBURGER ===== */}
          <button
            className={styles.hamburger}
            onClick={toggleMenu}
            aria-label={t("Toggle menu")}
          >
            {isMenuOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>
      </nav>

      {/* ===== SIDEBAR MENU (Mobile) ===== */}
      <div className={`${styles.sidebar} ${isMenuOpen ? styles.sidebarOpen : ""}`}>
        <div className={styles.sidebarHeader}>
          <div className={styles.sidebarLogo}>
            <span className={styles.logoText}>
              <span className={styles.logoHighlight}>{t("N")}</span>{t("TS")}</span>
            <span className={styles.logoSub}>{t("Stories")}</span>
          </div>
          <button onClick={closeMenu} className={styles.sidebarCloseBtn}>
            <FaTimes />
          </button>
        </div>

        <div className={styles.sidebarUserInfo}>
          <div className={styles.sidebarAvatar}>
            <span>{getInitials(userName)}</span>
          </div>
          <div className={styles.sidebarUserDetails}>
            <span className={styles.sidebarUserName}>{userName}</span>
            <span className={styles.sidebarUserRole}>{t("Content Creator")}</span>
          </div>
        </div>

        <div className={styles.sidebarLinks}>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`${styles.sidebarNavLink} ${
                isActive(link.href) ? styles.sidebarActive : ""
              }`}
              onClick={closeMenu}
            >
              <span className={styles.sidebarNavIcon}>{link.icon}</span>
              <span className={styles.sidebarNavLabel}>{link.label}</span>
              {isActive(link.href) && (
                <span className={styles.sidebarActiveIndicator}>●</span>
              )}
            </Link>
          ))}
        </div>

        <div className={styles.sidebarFooter}>
          <button onClick={handleLogout} className={styles.sidebarLogoutBtn}>
            <FaSignOutAlt />{" "}{t("Logout")}</button>
        </div>
      </div>

      {/* ===== OVERLAY ===== */}
      {isMenuOpen && (
        <div className={styles.overlay} onClick={closeMenu}></div>
      )}

      {/* ===== SPACER (to prevent content hiding behind fixed navbar) ===== */}
      <div className={styles.navSpacer}></div>
    </>
  );
}
