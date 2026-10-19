import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import styles from "../styles/Link.module.css";
import {
  FaHome,
  FaBullhorn,
  FaFileContract,
  FaShieldAlt,
  FaCoins,
  FaWallet,
  FaBell,
  FaCheckCircle,
  FaClipboardList,
  FaFlag,
  FaMoneyBillWave,
  FaChartLine,
  FaBars,
  FaTrophy,
  FaTimes,
  FaRobot,
  FaDatabase,
  FaUser,
  FaSignOutAlt,
  FaUsers,
  FaShareAlt,
  FaTachometerAlt,
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

  // ===== ADMIN NAVIGATION LINKS =====
  const navLinks = [
    { href: "/admin", label: "Dashboard", icon: <FaTachometerAlt /> },
    { href: "/admin/ads", label: "Advertising", icon: <FaBullhorn /> },
    { href: "/admin/contracts", label: "Contract Management", icon: <FaFileContract /> },
    { href: "/admin/licensing", label: "Content Licensing", icon: <FaShieldAlt /> },
    { href: "/admin/nes", label: "Depositers", icon: <FaCoins /> },
    { href: "/admin/rewards", label: "Authors Balance", icon: <FaWallet /> },
    { href: "/admin/notifications", label: "Notifications", icon: <FaBell /> },
    { href: "/admin/verified", label: "Monitization", icon: <FaCheckCircle /> },
    { href: "/admin/requests", label: "Monitization Requests", icon: <FaClipboardList /> },
    { href: "/admin/report", label: "Reported Stories", icon: <FaFlag /> },
    { href: "/admin/earn", label: "Story Monitization", icon: <FaMoneyBillWave /> },
    { href: "/admin/polls", label: "Amatora", icon: <FaTrophy /> },
    { href: "/admin/chat", label: "AI Training", icon: <FaRobot /> },
{ href: "/admin/unanswered", label: "AI Collection", icon: <FaDatabase /> },
    { href: "/admin/members", label: "Membership management", icon: <FaMoneyBillWave /> },
    {
  href: "/admin/trainer",
  label: "Amahugurwa",
  icon: <FaChartLine />
},
    { href: "/admin/manager", label: "Management", icon: <FaChartLine /> },
    { href: "/admin/share", label: "Share Stories", icon: <FaShareAlt /> },
    {
  href: "admin/vm",
  label: "Visitors Management",
  icon: <FaUsers />,
},
  ];

  // ===== CHECK IF LINK IS ACTIVE =====
  const isActive = (href) => {
    if (href === "/admin") {
      return router.pathname === "/admin";
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
            <Link href="/admin" onClick={closeMenu}>
              <span className={styles.logoText}>
                <span className={styles.logoHighlight}>{t("A")}</span>{t("NTS")}</span>
              <span className={styles.logoSub}>{t("Admin")}</span>
            </Link>
          </div>

          {/* ===== DESKTOP LINKS ===== */}
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
              <span className={styles.logoHighlight}>{t("A")}</span>{t("NTS")}</span>
            <span className={styles.logoSub}>{t("Admin")}</span>
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
            <span className={styles.sidebarUserRole}>{t("Admin")}</span>
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

      {/* ===== SPACER ===== */}
      <div className={styles.navSpacer}></div>
    </>
  );
}
