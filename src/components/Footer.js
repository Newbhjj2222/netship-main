'use client';

import { useEffect, useState } from "react";

import Link from "next/link";

import {
  FaHome,
  FaCompass,
  FaWhatsapp,
  FaWallet,
  FaBell,
  FaUserCircle,
} from "react-icons/fa";

import {
  collection,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";

import { db } from "../components/firebase";

import Cookies from "js-cookie";
import { useI18n } from "../i18n/I18nProvider";

import styles from "./Footer.module.css";


export default function Footer() {
  const { t } = useI18n();
  const [username, setUsername] =
    useState("");

  const [unreadCount, setUnreadCount] =
    useState(0);


  /*
   * ======================================================
   * GET USER
   * ======================================================
   */

  useEffect(() => {
    const userCookie =
      Cookies.get("user");

    if (!userCookie) {
      setUsername("");
      return;
    }

    try {
      const userData =
        JSON.parse(userCookie);

      if (userData?.username) {
        setUsername(
          String(userData.username)
        );
      }
    } catch (error) {
      console.error(
        "Invalid user cookie:",
        error
      );
    }
  }, []);


  /*
   * ======================================================
   * REALTIME UNREAD NOTIFICATIONS
   * ======================================================
   */

  useEffect(() => {
    if (!username) {
      setUnreadCount(0);
      return;
    }

    const notificationsRef =
      collection(
        db,
        "notifications"
      );

    const q = query(
      notificationsRef,
      orderBy(
        "createdAt",
        "desc"
      )
    );

    const unsubscribe =
      onSnapshot(
        q,
        (snapshot) => {
          let count = 0;

          snapshot.forEach(
            (notificationDoc) => {
              const data =
                notificationDoc.data();

              const readBy =
                Array.isArray(
                  data.readBy
                )
                  ? data.readBy
                  : [];

              /*
               * If this user has not read
               * this notification
               */
              if (
                !readBy.includes(
                  username
                )
              ) {
                count++;
              }
            }
          );

          setUnreadCount(count);
        },

        (error) => {
          console.error(
            "Notification listener error:",
            error
          );

          setUnreadCount(0);
        }
      );

    return () => {
      unsubscribe();
    };
  }, [username]);


  /*
   * ======================================================
   * WHATSAPP
   * ======================================================
   */

  const goWhatsApp = () => {
    const number =
      "250722319367";

    const message = t("footer.whatsappMessage");

    const url =
      `https://wa.me/${number}?text=${encodeURIComponent(
        message
      )}`;

    window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );
  };


  /*
   * ======================================================
   * RENDER
   * ======================================================
   */

  return (
    <footer
      className={styles.footer}
    >

      <Link
        href="/"
        className={styles.item}
      >
        <FaHome />

        <span>
          {t("footer.home")}
        </span>
      </Link>


      <Link
        href="/explore"
        className={styles.item}
      >
        <FaCompass />

        <span>
          {t("footer.explore")}
        </span>
      </Link>


      <button
        type="button"
        className={styles.item}
        onClick={goWhatsApp}
      >
        <FaWhatsapp />

        <span>
          {t("footer.whatsapp")}
        </span>
      </button>


      <Link
        href="/member"
        className={styles.item}
      >
        <FaWallet />

        <span>
          {t("footer.membership")}
        </span>
      </Link>


      {/* =================================================
          NOTIFICATIONS
      ================================================= */}

      <Link
        href="/notifications"
        className={styles.item}
      >

        <div
          className={
            styles.iconWrapper
          }
        >

          <FaBell />

          {unreadCount > 0 && (
            <span
              className={styles.badge}
            >
              {unreadCount > 9
                ? "9+"
                : unreadCount}
            </span>
          )}

        </div>

        <span>
          {t("footer.notifications")}
        </span>

      </Link>


      <Link
        href="/profile"
        className={styles.item}
      >
        <FaUserCircle />

        <span>
          {t("footer.profile")}
        </span>
      </Link>

    </footer>
  );
}
