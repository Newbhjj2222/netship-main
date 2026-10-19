// pages/member.js
import { db } from "../components/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";

import cookie from "cookie";

import {
  FaUser,
  FaUserTie,
  FaHandsHelping,
  FaWhatsapp,
  FaCrown,
  FaFeatherAlt,
} from "react-icons/fa";

import styles from "../styles/member.module.css";
import { useI18n } from "@/i18n/I18nProvider";

// ===== SSR =====
export async function getServerSideProps({ req }) {
  const cookies = req.headers.cookie
    ? req.headers.cookie
    : "";

  const parsedCookies = cookie.parse(cookies);

  const userCookie = parsedCookies.user
    ? JSON.parse(parsedCookies.user)
    : null;

  if (!userCookie) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  const username = userCookie.username;

  // ===== ROLES =====
  const roles = [
    "member",
    "umujyanama",
    "umuterankunga",
  ];

  let roleData = {};

  for (let role of roles) {
    const q = query(
      collection(db, role + "s"),
      where("username", "==", username)
    );

    const snap = await getDocs(q);

    if (!snap.empty) {
      const data = snap.docs[0].data();

      if (role === "member") {
        const now = new Date();

        const expires =
          data.subscriptionExpiresAt
            ? data.subscriptionExpiresAt.toDate()
            : null;

        data.isActive =
          data.isMember &&
          expires &&
          expires > now;

        data.expiresAt = expires
          ? expires.toISOString()
          : null;
      } else {
        data.isActive = true;
      }

      roleData[role] = data;
    } else {
      roleData[role] = {
        isActive: false,
        expiresAt: null,
      };
    }
  }

  // ===== AUTHOR CHECK =====
  let isAuthor = false;

  try {
    const authorRef = doc(db, "authors", username);

    const authorSnap = await getDoc(authorRef);

    if (authorSnap.exists()) {
      isAuthor = true;
    }
  } catch (err) {
    console.error("Author check error:", err);
  }

  return {
    props: {
      username,
      roleData,
      isAuthor,
    },
  };
}

// ===== COMPONENT =====
export default function MemberPage({
  username,
  roleData,
  isAuthor,
}) {
  const { t } = useI18n();

  // ===== WHATSAPP =====
  const goWhatsApp = (roleLabel) => {
    if (typeof window === "undefined") return;

    const number = "250722319367";

    const message = `Muraho, ndifuza ubufasha ku bijyanye na ${roleLabel}.`;

    const url = `https://wa.me/${number}?text=${encodeURIComponent(
      message
    )}`;

    window.open(url, "_blank");
  };

  // ===== ROLES =====
  const roles = [
    {
      key: "member",
      label: "Membership",
      icon: <FaUser />,
    },

    {
      key: "umujyanama",
      label: "Umujyanama",
      icon: <FaUserTie />,
    },

    {
      key: "umuterankunga",
      label: "Umuterankunga",
      icon: <FaHandsHelping />,
    },
  ];

  return (
    <div className={styles.container}>
      {/* ===== TOP USER ===== */}
      <div className={styles.profileCard}>
        <div className={styles.avatar}>
          {username?.charAt(0)?.toUpperCase()}
        </div>

        <div className={styles.profileInfo}>
          <h1>{username}</h1>

          <div className={styles.badges}>
            {/* ===== AUTHOR BADGE ===== */}
            {isAuthor && (
              <div className={styles.authorBadge}>
                <FaFeatherAlt />
                <span>{t("Official Author")}</span>
              </div>
            )}

            {/* ===== MEMBER BADGE ===== */}
            {roleData.member?.isActive && (
              <div className={styles.memberBadge}>
                <FaCrown />
                <span>{t("Premium Member")}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== ROLE CARDS ===== */}
      <div className={styles.cardsWrapper}>
        {roles.map((role) => {
          const data = roleData[role.key];

          const active = data?.isActive;

          // convert expiresAt back to Date
          const expiresDate = data?.expiresAt
            ? new Date(data.expiresAt)
            : null;

          return (
            <div
              key={role.key}
              className={styles.card}
            >
              <div className={styles.icon}>
                {role.icon}
              </div>

              <h2>{role.label}</h2>

              <span
                className={
                  active
                    ? styles.activeBadge
                    : styles.nonActiveBadge
                }
              >
                {active
                  ? t("Active")
                  : t("Non-Active")}
              </span>

              {/* ===== MEMBER EXPIRY ===== */}
              {role.key === "member" &&
                expiresDate && (
                  <p>{t("Igihe izarangirira:")}{" "}
                    {expiresDate.toLocaleDateString()}
                  </p>
                )}

              {/* ===== BUTTON ===== */}
              <button
                className={styles.whatsappBtn}
                onClick={() =>
                  goWhatsApp(role.label)
                }
              >
                <FaWhatsapp />{t("Twandikire")}</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
