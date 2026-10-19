import {
  useState,
  useEffect,
} from "react";

import {
  useRouter,
} from "next/router";

import {
  collection,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
  arrayUnion,
} from "firebase/firestore";

import {
  db,
} from "../components/firebase";

import Cookies from "js-cookie";

import styles from "../styles/notification.module.css";

import {
  FaBell,
  FaCheckCircle,
  FaClock,
  FaUser,
  FaEnvelope,
  FaCalendarAlt,
  FaSpinner,
} from "react-icons/fa";
import { useI18n } from "@/i18n/I18nProvider";


export default function UserNotifications() {
  const { t } = useI18n();

  const router =
    useRouter();

  const [
    notifications,
    setNotifications,
  ] = useState([]);

  const [
    username,
    setUsername,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(true);


  /*
   * ======================================================
   * SESSION
   * ======================================================
   */

  useEffect(() => {
    const userCookie =
      Cookies.get("user");

    if (!userCookie) {
      router.replace("/login");
      return;
    }

    try {
      const userData =
        JSON.parse(userCookie);

      if (!userData?.username) {
        router.replace("/login");
        return;
      }

      setUsername(
        String(userData.username)
      );
    } catch (error) {
      router.replace("/login");
    }
  }, [router]);


  /*
   * ======================================================
   * REALTIME NOTIFICATIONS
   * ======================================================
   */

  useEffect(() => {
    if (!username) return;

    setLoading(true);

    const q = query(
      collection(
        db,
        "notifications"
      ),

      orderBy(
        "createdAt",
        "desc"
      )
    );

    const unsubscribe =
      onSnapshot(
        q,
        async (snapshot) => {
          try {
            const data =
              snapshot.docs.map(
                (notificationDoc) => {
                  const raw =
                    notificationDoc.data();

                  return {
                    id:
                      notificationDoc.id,

                    ...raw,

                    createdAt:
                      raw.createdAt
                        ?.toDate?.() ||
                      new Date(),
                  };
                }
              );

            setNotifications(data);

            /*
             * =================================================
             * MARK UNREAD NOTIFICATIONS AS READ
             * =================================================
             *
             * We do this after displaying them.
             */

            for (const notification
              of data) {

              const readBy =
                Array.isArray(
                  notification.readBy
                )
                  ? notification.readBy
                  : [];

              if (
                !readBy.includes(
                  username
                )
              ) {
                try {
                  await updateDoc(
                    doc(
                      db,
                      "notifications",
                      notification.id
                    ),
                    {
                      readBy:
                        arrayUnion(
                          username
                        ),
                    }
                  );
                } catch (error) {
                  console.error(
                    "Mark read error:",
                    error
                  );
                }
              }
            }
          } catch (error) {
            console.error(
              "Notification processing error:",
              error
            );
          } finally {
            setLoading(false);
          }
        },

        (error) => {
          console.error(
            "Notification listener error:",
            error
          );

          setLoading(false);
        }
      );

    return () => {
      unsubscribe();
    };
  }, [username]);


  /*
   * ======================================================
   * TIME AGO
   * ======================================================
   */

  const getTimeAgo = (
    date
  ) => {
    if (!date) {
      return "";
    }

    const now =
      new Date();

    const diff =
      Math.floor(
        (now - date) / 1000
      );

    if (diff < 60) {
      return `${diff} seconds ago`;
    }

    if (diff < 3600) {
      return `${Math.floor(
        diff / 60
      )} minutes ago`;
    }

    if (diff < 86400) {
      return `${Math.floor(
        diff / 3600
      )} hours ago`;
    }

    if (diff < 604800) {
      return `${Math.floor(
        diff / 86400
      )} days ago`;
    }

    return date.toLocaleDateString();
  };


  /*
   * ======================================================
   * RENDER
   * ======================================================
   */

  return (
    <div
      className={styles.container}
    >

      <div
        className={styles.header}
      >

        <div
          className={
            styles.headerLeft
          }
        >

          <FaBell
            className={
              styles.headerIcon
            }
          />

          <div>

            <h1
              className={
                styles.title
              }
            >{t("🔔 Amakuru")}</h1>

            <p
              className={
                styles.subtitle
              }
            >
              <FaUser
                className={
                  styles.subtitleIcon
                }
              />

              {username}
            </p>

          </div>

        </div>


        <div
          className={
            styles.headerStats
          }
        >

          <span
            className={
              styles.statBadge
            }
          >
            <FaBell />

            {notifications.length}
          </span>


          <span
            className={
              styles.statBadge
            }
          >
            <FaCheckCircle />

            {
              notifications.filter(
                (n) =>
                  n.readBy?.includes(
                    username
                  )
              ).length
            }

          </span>

        </div>

      </div>


      {loading ? (

        <div
          className={
            styles.loadingState
          }
        >

          <FaSpinner
            className={
              styles.loadingSpinner
            }
          />

          <p>{t("loading...")}</p>

        </div>

      ) : notifications.length === 0 ? (

        <div
          className={
            styles.emptyState
          }
        >

          <FaBell
            className={
              styles.emptyIcon
            }
          />

          <h3>{t("📭 Nta Makuru")}</h3>

          <p>{t("Nta makuru mashya. Tuzakumenyesha niba hari ibishya.")}</p>

        </div>

      ) : (

        <div
          className={
            styles.list
          }
        >

          {notifications.map(
            (n) => {

              const isRead =
                n.readBy?.includes(
                  username
                );

              return (
                <div
                  key={n.id}
                  className={`
                    ${styles.card}
                    ${
                      isRead
                        ? styles.read
                        : styles.unread
                    }
                  `}
                >

                  <div
                    className={
                      styles.cardHeader
                    }
                  >

                    <div
                      className={
                        styles.cardTitleWrapper
                      }
                    >

                      <h3
                        className={
                          styles.cardTitle
                        }
                      >
                        {n.title}
                      </h3>

                      {!isRead && (
                        <span
                          className={
                            styles.unreadBadge
                          }
                        >
                          ●
                        </span>
                      )}

                    </div>


                    <div
                      className={
                        styles.cardMeta
                      }
                    >

                      <span
                        className={
                          styles.cardDate
                        }
                      >

                        <FaCalendarAlt />

                        {getTimeAgo(
                          n.createdAt
                        )}

                      </span>


                      {isRead && (
                        <span
                          className={
                            styles.readBadge
                          }
                        >

                          <FaCheckCircle />{t("Wayibonye")}</span>
                      )}

                    </div>

                  </div>


                  <div
                    className={
                      styles.cardBody
                    }
                    dangerouslySetInnerHTML={{
                      __html:
                        n.content || "",
                    }}
                  />


                  <div
                    className={
                      styles.cardFooter
                    }
                  >

                    <span
                      className={
                        styles.sender
                      }
                    >

                      <FaEnvelope />

                      {n.sender ||
                        t("New Talents Stories Group")}

                    </span>


                    {isRead && (
                      <span
                        className={
                          styles.readTime
                        }
                      >

                        <FaClock />{t("Wayibonye")}</span>
                    )}

                  </div>

                </div>
              );
            }
          )}

        </div>

      )}

    </div>
  );
}
