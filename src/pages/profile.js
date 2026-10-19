import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Cookies from "js-cookie";
import cookie from "cookie";

import {
  FiUser,
  FiMail,
  FiLogOut,
  FiStar,
  FiShoppingCart,
  FiEdit3,
} from "react-icons/fi";

import {
  signOut,
  onAuthStateChanged,
} from "firebase/auth";

import {
  doc,
  getDoc,
} from "firebase/firestore";

import {
  auth,
  db,
} from "../components/firebase";

import styles from "../styles/profile.module.css";
import { useI18n } from "@/i18n/I18nProvider";

/*
============================================================
SAFE USER COOKIE PARSER
============================================================
*/
function parseUserCookie(value) {
  if (!value) {
    return null;
  }

  try {
    const decoded = decodeURIComponent(value);
    const parsed = JSON.parse(decoded);

    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    /*
    UID ni ingenzi cyane.
    Username nayo irakenewe kuri system yawe.
    */
    if (!parsed.uid) {
      return null;
    }

    return {
      uid: String(parsed.uid),
      username: parsed.username
        ? String(parsed.username)
        : "",
      email: parsed.email
        ? String(parsed.email)
        : "",
      fName: parsed.fName
        ? String(parsed.fName)
        : "",
    };
  } catch (error) {
    console.error(
      "USER COOKIE PARSE ERROR:",
      error
    );

    return null;
  }
}

/*
============================================================
GET USER FROM FIRESTORE
============================================================
*/
async function getUserFromFirestore(uid) {
  if (!uid) {
    return null;
  }

  try {
    /*
    Your database structure:

    userdate
      └── data
          └── UID
              ├── username
              ├── email
              ├── fName
              └── ...
    */

    const ref = doc(
      db,
      "userdate",
      "data"
    );

    const snap = await getDoc(ref);

    if (!snap.exists()) {
      return null;
    }

    const data = snap.data();

    if (!data || !data[uid]) {
      return null;
    }

    return {
      uid,
      ...data[uid],
    };
  } catch (error) {
    console.error(
      "GET FIRESTORE USER ERROR:",
      error
    );

    return null;
  }
}

/*
============================================================
SSR
============================================================
*/
export async function getServerSideProps({
  req,
}) {
  try {
    const rawCookie =
      req.headers.cookie || "";

    console.log(
      "PROFILE RAW COOKIE:",
      rawCookie
    );

    const cookies = cookie.parse(
      rawCookie
    );

    /*
    --------------------------------------------------------
    READ USER COOKIE
    --------------------------------------------------------
    */
    const cookieUser =
      parseUserCookie(
        cookies.user
      );

    /*
    --------------------------------------------------------
    IF COOKIE EXISTS
    --------------------------------------------------------
    */
    if (cookieUser?.uid) {
      return {
        props: {
          initialUser: cookieUser,
        },
      };
    }

    /*
    --------------------------------------------------------
    NO VALID COOKIE
    --------------------------------------------------------

    Do NOT immediately redirect.

    The client can still check Firebase Auth.
    This avoids redirecting an already logged-in
    Firebase user simply because the cookie was
    temporarily unavailable.
    --------------------------------------------------------
    */
    return {
      props: {
        initialUser: null,
      },
    };
  } catch (error) {
    console.error(
      "PROFILE SSR ERROR:",
      error
    );

    /*
    Do not redirect immediately here either.
    Let client-side Firebase Auth determine
    the actual login state.
    */
    return {
      props: {
        initialUser: null,
      },
    };
  }
}

/*
============================================================
PROFILE PAGE
============================================================
*/
export default function ProfilePage({
  initialUser,
}) {
  const { t } = useI18n();

  const router = useRouter();

  const [user, setUser] = useState(
    initialUser
  );

  const [checkingAuth, setCheckingAuth] =
    useState(!initialUser);

  const [loggingOut, setLoggingOut] =
    useState(false);

  /*
  ==========================================================
  AUTH CHECK
  ==========================================================
  */
  useEffect(() => {
    /*
    If SSR already found a valid user,
    there is no need to block the page.
    */
    if (initialUser?.uid) {
      setCheckingAuth(false);
      return;
    }

    /*
    --------------------------------------------------------
    FIREBASE AUTH STATE
    --------------------------------------------------------
    */
    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (firebaseUser) => {
          try {
            /*
            ------------------------------------------------
            NO FIREBASE USER
            ------------------------------------------------
            */
            if (!firebaseUser) {
              /*
              Give the browser one final chance
              to read the cookie.
              */
              const browserCookie =
                Cookies.get("user");

              const cookieUser =
                parseUserCookie(
                  browserCookie
                );

              if (cookieUser?.uid) {
                setUser(cookieUser);
                setCheckingAuth(false);
                return;
              }

              /*
              Nobody is logged in.
              */
              setUser(null);
              setCheckingAuth(false);

              await router.replace(
                "/login?returnTo=/profile"
              );

              return;
            }

            /*
            ------------------------------------------------
            FIREBASE USER EXISTS
            ------------------------------------------------
            */

            /*
            First try cookie.
            */
            const browserCookie =
              Cookies.get("user");

            let cookieUser =
              parseUserCookie(
                browserCookie
              );

            /*
            If cookie is missing or invalid,
            get the user from Firestore.
            */
            if (
              !cookieUser?.uid ||
              cookieUser.uid !==
                firebaseUser.uid
            ) {
              const firestoreUser =
                await getUserFromFirestore(
                  firebaseUser.uid
                );

              if (firestoreUser) {
                cookieUser = {
                  uid: firebaseUser.uid,

                  username:
                    firestoreUser.username ||
                    firestoreUser.fName ||
                    firebaseUser.displayName ||
                    "User",

                  email:
                    firestoreUser.email ||
                    firebaseUser.email ||
                    "",

                  fName:
                    firestoreUser.fName ||
                    firebaseUser.displayName ||
                    "User",
                };

                /*
                --------------------------------------------
                REPAIR USER COOKIE
                --------------------------------------------
                */
                Cookies.set(
                  "user",
                  JSON.stringify(
                    cookieUser
                  ),
                  {
                    expires: 7,
                    path: "/",
                    sameSite: "lax",
                  }
                );
              }
            }

            /*
            ------------------------------------------------
            FINAL USER
            ------------------------------------------------
            */
            if (cookieUser?.uid) {
              setUser(cookieUser);
              setCheckingAuth(false);
              return;
            }

            /*
            Firebase user exists but we could not
            find matching application user data.
            */
            console.error(
              "Firebase user exists but application user data was not found."
            );

            setUser(null);
            setCheckingAuth(false);

            await router.replace(
              "/login?returnTo=/profile"
            );
          } catch (error) {
            console.error(
              "PROFILE AUTH CHECK ERROR:",
              error
            );

            setCheckingAuth(false);
          }
        }
      );

    return () => {
      unsubscribe();
    };
  }, [
    initialUser,
    router,
  ]);

  /*
  ==========================================================
  LOGOUT
  ==========================================================
  */
  const handleLogout = async () => {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);

    try {
      /*
      Firebase logout
      */
      await signOut(auth);
    } catch (error) {
      console.error(
        "FIREBASE LOGOUT ERROR:",
        error
      );
    }

    /*
    Remove application cookie
    */
    try {
      Cookies.remove("user", {
        path: "/",
      });
    } catch (error) {
      console.error(
        "COOKIE LOGOUT ERROR:",
        error
      );
    }

    /*
    Remove any possible old cookie
    */
    try {
      Cookies.remove("user");
    } catch (error) {}

    /*
    Clear local state
    */
    setUser(null);

    /*
    Return to login
    */
    await router.replace("/login");
  };

  /*
  ==========================================================
  LOADING
  ==========================================================
  */
  if (checkingAuth) {
    return (
      <div className={styles.container}>
        <div className={styles.profileCard}>
          <p>{t("Tegereza gato...")}</p>
        </div>
      </div>
    );
  }

  /*
  ==========================================================
  NO USER
  ==========================================================
  */
  if (!user?.uid) {
    return (
      <div className={styles.container}>
        <div className={styles.profileCard}>
          <p>{t("Ntabwo winjiye muri konti.")}</p>
        </div>
      </div>
    );
  }

  /*
  ==========================================================
  RENDER PROFILE
  ==========================================================
  */
  return (
    <div className={styles.container}>
      <div className={styles.profileCard}>
        {/* ==================================================
            PROFILE HEADER
        ================================================== */}
        <div className={styles.header}>
          <FiUser size={40} />

          <h2>
            {user.username ||
              user.fName ||
              t("User")}
          </h2>
        </div>

        {/* ==================================================
            EMAIL
        ================================================== */}
        <p className={styles.email}>
          <FiMail />

          <span>
            {user.email ||
              t("No email")}
          </span>
        </p>

        {/* ==================================================
            NES
        ================================================== */}
        <NeSCard
          username={
            user.username
          }
        />

        {/* ==================================================
            ACTIONS
        ================================================== */}
        <div className={styles.actions}>
          {/* BUY NES */}
          <button
            type="button"
            className={
              styles.buyBtn
            }
            onClick={() =>
              router.push("/wallet")
            }
          >
            <FiShoppingCart />

            <span>{t("Gura NeS")}</span>
          </button>

          {/* AUTHOR DASHBOARD */}
          <button
            type="button"
            className={
              styles.authorBtn
            }
            onClick={() =>
              router.push(
                "/dashboard"
              )
            }
          >
            <FiEdit3 />

            <span>{t("Go to Author dashboard")}</span>
          </button>

          {/* LOGOUT */}
          <button
            type="button"
            onClick={
              handleLogout
            }
            className={
              styles.logoutBtn
            }
            disabled={
              loggingOut
            }
          >
            <FiLogOut />

            <span>
              {loggingOut
                ? t("Logging out...")
                : t("Logout")}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

/*
============================================================
NES CARD
============================================================
*/
function NeSCard({
  username,
}) {
  const { t } = useI18n();

  const [nes, setNes] =
    useState(0);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchNeS =
      async () => {
        /*
        No username
        */
        if (!username) {
          if (mounted) {
            setNes(0);
            setLoading(false);
          }

          return;
        }

        try {
          /*
          Your Firestore structure:

          depositers
             └── username
                 └── nes
          */
          const ref = doc(
            db,
            "depositers",
            username
          );

          const snap =
            await getDoc(ref);

          if (!mounted) {
            return;
          }

          if (snap.exists()) {
            const data =
              snap.data();

            setNes(
              Number(
                data?.nes || 0
              )
            );
          } else {
            setNes(0);
          }
        } catch (error) {
          console.error(
            "NES ERROR:",
            error
          );

          if (mounted) {
            setNes(0);
          }
        } finally {
          if (mounted) {
            setLoading(false);
          }
        }
      };

    fetchNeS();

    return () => {
      mounted = false;
    };
  }, [username]);

  return (
    <div className={styles.nesCard}>
      <FiStar size={20} />

      <div>
        <p
          className={
            styles.nesTitle
          }
        >{t("NeS Points")}</p>

        <h3>
          {loading
            ? "..."
            : nes}
        </h3>
      </div>
    </div>
  );
}
