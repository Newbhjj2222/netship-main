import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth, db } from "../components/firebase";
import {
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import Cookies from "js-cookie";
import Image from "next/image";
import styles from "../styles/Login.module.css";
import { useI18n } from "@/i18n/I18nProvider";

export default function LoginPage() {
  const { t } = useI18n();

  const router = useRouter();
  const provider = new GoogleAuthProvider();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  /*
  ============================================================
  GET REDIRECT URL
  ============================================================
  */
  const getRedirectUrl = () => {
    if (!router.isReady) {
      return "/";
    }

    /*
    ----------------------------------------------------------
    READ returnTo FIRST
    ----------------------------------------------------------
    read.js sends:

    /login?returnTo=/post/abcdef

    We also keep support for "redirect" in case another
    page still uses the old parameter.
    ----------------------------------------------------------
    */
    const queryRedirect =
      router.query.returnTo || router.query.redirect;

    if (!queryRedirect) {
      return "/";
    }

    const value = Array.isArray(queryRedirect)
      ? queryRedirect[0]
      : queryRedirect;

    if (!value) {
      return "/";
    }

    let decodedValue = value;

    try {
      decodedValue = decodeURIComponent(value);
    } catch (error) {
      console.error("Redirect decode error:", error);
    }

    /*
    ----------------------------------------------------------
    SECURITY
    ----------------------------------------------------------

    Only allow internal paths.

    Example allowed:
      /post/abcdef
      /profile
      /library

    Do not allow:
      https://example.com
      javascript:...
    ----------------------------------------------------------
    */
    if (
      !decodedValue.startsWith("/") ||
      decodedValue.startsWith("//")
    ) {
      return "/";
    }

    /*
    Do not redirect back to login itself.
    */
    if (
      decodedValue === "/login" ||
      decodedValue.startsWith("/login?")
    ) {
      return "/";
    }

    return decodedValue;
  };

  /*
  ============================================================
  REDIRECT AFTER LOGIN
  ============================================================
  */
  const redirectAfterLogin = async () => {
    const redirect = getRedirectUrl();

    console.log("=================================");
    console.log("LOGIN REDIRECT");
    console.log("Current URL:", router.asPath);
    console.log("returnTo:", router.query.returnTo);
    console.log("redirect:", router.query.redirect);
    console.log("Final redirect:", redirect);
    console.log("=================================");

    try {
      await router.replace(redirect);
    } catch (error) {
      console.error("Redirect error:", error);

      /*
      If something goes wrong, send the user home.
      */
      await router.replace("/");
    }
  };

  /*
  ============================================================
  AUTO LOGIN
  ============================================================
  */
  useEffect(() => {
    if (!router.isReady) return;

    const userCookie = Cookies.get("user");

    if (!userCookie) return;

    const redirect = getRedirectUrl();

    console.log("AUTO LOGIN REDIRECT:", redirect);

    /*
    If the user is already logged in, return them to
    the page they originally requested.
    */
    router.replace(redirect);
  }, [router.isReady]);

  /*
  ============================================================
  GET USER FROM FIRESTORE
  ============================================================
  */
  const getUserData = async (uid) => {
    try {
      const ref = doc(db, "userdate", "data");
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        return null;
      }

      const data = snap.data();

      if (!data[uid]) {
        return null;
      }

      return data[uid];
    } catch (error) {
      console.error("Error fetching user:", error);
      return null;
    }
  };

  /*
  ============================================================
  SAVE USER TO COOKIE
  ============================================================
  */
  const saveUserToCookie = (
    uid,
    firebaseUser,
    dbUser
  ) => {
    const userData = {
      uid,
      email:
        firebaseUser.email ||
        dbUser?.email ||
        "",

      fName:
        dbUser?.fName ||
        firebaseUser.displayName ||
        "User",

      username:
        dbUser?.username ||
        firebaseUser.displayName ||
        dbUser?.fName ||
        "User",
    };

    Cookies.set(
      "user",
      JSON.stringify(userData),
      {
        expires: 7,
        path: "/",
        sameSite: "lax",
      }
    );

    console.log(
      "COOKIE SAVED:",
      userData
    );
  };

  /*
  ============================================================
  EMAIL LOGIN
  ============================================================
  */
  const handleEmailLogin = async (e) => {
    e.preventDefault();

    if (loading) return;

    setLoading(true);
    setMessage("");

    try {
      const res =
        await signInWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );

      const user = res.user;

      const dbUser =
        await getUserData(user.uid);

      if (!dbUser) {
        setMessage(
          t("User ntaboneka muri database. Ongera ugerageze cyangwa wandikire administrator.")
        );

        setLoading(false);
        return;
      }

      /*
      ----------------------------------------------------------
      SAVE COOKIE BEFORE REDIRECT
      ----------------------------------------------------------
      */
      saveUserToCookie(
        user.uid,
        user,
        dbUser
      );

      setMessage(
        t("Winjiye neza! Tegereza gato...")
      );

      /*
      ----------------------------------------------------------
      RETURN TO ORIGINAL PAGE
      ----------------------------------------------------------
      */
      await redirectAfterLogin();
    } catch (error) {
      console.error(
        "Email login error:",
        error
      );

      let errorMessage =
        "Kwinjira ntibishobotse.";

      switch (error.code) {
        case "auth/invalid-credential":
        case "auth/wrong-password":
        case "auth/user-not-found":
          errorMessage =
            "Email cyangwa password ntabwo ari byo.";
          break;

        case "auth/invalid-email":
          errorMessage =
            "Email wanditse ntabwo ari yo.";
          break;

        case "auth/user-disabled":
          errorMessage =
            "Iyi konti yarahagaritswe. Hamagara administrator.";
          break;

        case "auth/too-many-requests":
          errorMessage =
            "Wagerageje inshuro nyinshi. Tegereza gato wongere ugerageze.";
          break;

        default:
          errorMessage =
            "Kwinjira ntibishobotse. Ongera ugerageze.";
      }

      setMessage(errorMessage);
      setLoading(false);
    }
  };

  /*
  ============================================================
  GOOGLE LOGIN
  ============================================================
  */
  const handleGoogleLogin = async () => {
    if (loading) return;

    setLoading(true);
    setMessage("");

    try {
      const res =
        await signInWithPopup(
          auth,
          provider
        );

      const user = res.user;

      const ref =
        doc(db, "userdate", "data");

      const snap =
        await getDoc(ref);

      const data =
        snap.exists()
          ? snap.data()
          : {};

      /*
      ----------------------------------------------------------
      CREATE FIRESTORE USER IF NOT EXISTS
      ----------------------------------------------------------
      */
      if (!data[user.uid]) {
        await setDoc(
          ref,
          {
            [user.uid]: {
              uid: user.uid,

              fName:
                user.displayName ||
                "User",

              username:
                user.displayName ||
                "User",

              email:
                user.email ||
                "",

              provider: "google",

              photoURL:
                user.photoURL ||
                "",
            },
          },
          {
            merge: true,
          }
        );
      }

      /*
      ----------------------------------------------------------
      GET LATEST FIRESTORE DATA
      ----------------------------------------------------------
      */
      const dbUser =
        await getUserData(
          user.uid
        );

      if (!dbUser) {
        setMessage(
          t("Ntibyashobotse kubona amakuru ya konti yawe.")
        );

        setLoading(false);
        return;
      }

      /*
      ----------------------------------------------------------
      SAVE COOKIE
      ----------------------------------------------------------
      */
      saveUserToCookie(
        user.uid,
        user,
        dbUser
      );

      setMessage(
        t("Winjiye neza ukoresheje Google! Tegereza gato...")
      );

      /*
      ----------------------------------------------------------
      RETURN TO ORIGINAL PAGE
      ----------------------------------------------------------
      */
      await redirectAfterLogin();
    } catch (error) {
      console.error(
        "Google login error:",
        error
      );

      let errorMessage =
        "Google login ntibishobotse.";

      switch (error.code) {
        case "auth/popup-closed-by-user":
          errorMessage =
            "Wafunze idirishya rya Google mbere yuko login irangira.";
          break;

        case "auth/popup-blocked":
          errorMessage =
            "Browser yabujije Google login popup. Emerera popup kuri uru rubuga.";
          break;

        case "auth/cancelled-popup-request":
          errorMessage =
            "Google login yahagaritswe. Ongera ugerageze.";
          break;

        case "auth/account-exists-with-different-credential":
          errorMessage =
            "Iyi email isanzwe ifite indi login method. Koresha uburyo washyizeho konti.";
          break;

        default:
          errorMessage =
            "Google login ntibishobotse. Ongera ugerageze.";
      }

      setMessage(errorMessage);
      setLoading(false);
    }
  };

  /*
  ============================================================
  FORGOT PASSWORD
  ============================================================
  */
  const handleForgotPassword =
    async (e) => {
      e.preventDefault();

      if (!resetEmail.trim()) {
        setMessage(
          t("Andika email wakoresheje kuri konti yawe.")
        );
        return;
      }

      if (resetLoading) return;

      setResetLoading(true);
      setMessage("");

      try {
        /*
        Firebase Auth sends the password reset email.
        */
        await sendPasswordResetEmail(
          auth,
          resetEmail.trim()
        );

        setMessage(
          t("Email yo guhindura password yoherejwe. Reba inbox yawe na spam/junk.")
        );

        setResetEmail("");
      } catch (error) {
        console.error(
          "Password reset error:",
          error
        );

        let errorMessage =
          "Ntibyashobotse kohereza email yo guhindura password.";

        switch (error.code) {
          case "auth/invalid-email":
            errorMessage =
              "Email wanditse ntabwo ari yo.";
            break;

          case "auth/user-not-found":
            errorMessage =
              "Nta konti iboneka ikoresha iyo email.";
            break;

          case "auth/too-many-requests":
            errorMessage =
              "Wagerageje inshuro nyinshi. Tegereza gato wongere ugerageze.";
            break;

          default:
            errorMessage =
              "Ntibyashobotse kohereza email. Ongera ugerageze.";
        }

        setMessage(errorMessage);
      } finally {
        setResetLoading(false);
      }
    };

  /*
  ============================================================
  RENDER
  ============================================================
  */
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>{t("Sign In")}</h2>

      {message && (
        <p
          className={styles.message}
          role="alert"
        >
          {message}
        </p>
      )}

      {!showForgotPassword ? (
        <>
          {/* ==================================================
              LOGIN FORM
          ================================================== */}
          <form
            onSubmit={handleEmailLogin}
            className={styles.form}
          >
            <input
              type="email"
              placeholder={t("Email")}
              autoComplete="email"
              required
              value={email}
              onChange={(e) =>
                setEmail(
                  e.target.value
                )
              }
            />

            <input
              type="password"
              placeholder={t("Password")}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) =>
                setPassword(
                  e.target.value
                )
              }
            />

            <button
              type="submit"
              className={styles.btn}
              disabled={loading}
            >
              {loading
                ? t("Loading...")
                : t("Sign In")}
            </button>
          </form>

          {/* ==================================================
              FORGOT PASSWORD
          ================================================== */}
          <button
            type="button"
            className={
              styles.forgotPassword
            }
            onClick={() => {
              setMessage("");
              setResetEmail(email);
              setShowForgotPassword(
                true
              );
            }}
            disabled={loading}
          >{t("Forgot Password?")}</button>

          <p
            className={
              styles.orText
            }
          >{t("or")}</p>

          {/* ==================================================
              GOOGLE LOGIN
          ================================================== */}
          <button
            type="button"
            className={
              styles.googleBtn
            }
            onClick={
              handleGoogleLogin
            }
            disabled={loading}
          >
            <Image
              src="/google.svg"
              width={20}
              height={20}
              alt={t("Google")}
            />

            <span>{t("Continue with Google")}</span>
          </button>

          {/* ==================================================
              ACCOUNT INSTRUCTIONS
          ================================================== */}
          <div
            className={
              styles.loginInstructions
            }
          >
            <h3>{t("Amabwiriza yo kwinjira")}</h3>

            <ul>
              <li>{t("Niba warakoze konti ukoresheje")}<strong>
                  {" "}{t("Email na Password")}</strong>{t(", injira ukoresheje iyo email na password.")}</li>

              <li>{t("Niba warakoze konti ukoresheje")}<strong>
                  {" "}{t("Continue with Google")}</strong>{t(", ugomba kongera gukoresha")}<strong>
                  {" "}{t("Continue with Google")}</strong>{t("kugira ngo winjire muri konti yawe.")}</li>

              <li>{t("Ntukore indi konti ya Google ukoresheje email itandukanye niba ushaka gusubira muri konti yawe isanzwe.")}</li>

              <li>{t("Wibagiwe password? Kanda kuri")}<strong>
                  {" "}{t("Forgot Password?")}</strong>{t(", Newtalentsg iguhe email yo kuyihindura mu buryo bwizewe.")}</li>
            </ul>
          </div>

          {/* ==================================================
              REGISTER
          ================================================== */}
          <p
            className={
              styles.registerText
            }
          >{t("Nta konti?")}{" "}
            <a href="/register">{t("Iyandikishe hano")}</a>
          </p>
        </>
      ) : (
        <>
          {/* ==================================================
              RESET PASSWORD
          ================================================== */}
          <div
            className={
              styles.forgotPasswordBox
            }
          >
            <h3>{t("Hindura Password")}</h3>

            <p>{t("Andika email wakoresheje kwiyandikisha. newtalentsg izohereza email izagufasha gushyiraho password nshya.")}</p>

            <form
              onSubmit={
                handleForgotPassword
              }
              className={styles.form}
            >
              <input
                type="email"
                placeholder={t("Email")}
                autoComplete="email"
                required
                value={resetEmail}
                onChange={(e) =>
                  setResetEmail(
                    e.target.value
                  )
                }
              />

              <button
                type="submit"
                className={styles.btn}
                disabled={
                  resetLoading
                }
              >
                {resetLoading
                  ? t("Sending...")
                  : t("Send Reset Email")}
              </button>
            </form>

            <button
              type="button"
              className={
                styles.backToLogin
              }
              onClick={() => {
                setShowForgotPassword(
                  false
                );
                setMessage("");
              }}
              disabled={
                resetLoading
              }
            >{t("← Back to Sign In")}</button>
          </div>
        </>
      )}

      {loading && (
        <p
          className={styles.loading}
        >{t("Tegereza gato...")}</p>
      )}
    </div>
  );
}
