'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider
} from "firebase/auth";

import { auth, db } from "@/components/firebase";
import {
  doc,
  getDoc,
  setDoc
} from "firebase/firestore";

import Cookies from "js-cookie";
import styles from "@/styles/Register.module.css";
import { useI18n } from "@/i18n/I18nProvider";

export default function RegisterPage() {
  const { t } = useI18n();

  const router = useRouter();
  const provider = new GoogleAuthProvider();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [pass1, setPass1] = useState("");
  const [pass2, setPass2] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // =========================
  // GET ALL USERS
  // =========================
  const getUsers = async () => {
    const ref = doc(db, "userdate", "data");
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      return {};
    }

    return snap.data();
  };

  // =========================
  // CHECK EMAIL EXISTS
  // =========================
  const checkEmail = async (email) => {
    const data = await getUsers();

    const emailLower = email.trim().toLowerCase();

    return Object.values(data).some(
      (u) =>
        u?.email?.trim().toLowerCase() === emailLower
    );
  };

  // =========================
  // GENERATE AVAILABLE USERNAME
  // =========================
  const getAvailableUsername = async (originalUsername) => {
    const data = await getUsers();

    const baseUsername = originalUsername
      .trim()
      .toLowerCase();

    // Nturekura username iriho.
    // Dufata izina nyirizina uko user yarishyizemo.
    let newUsername = originalUsername.trim();

    // Check niba username itarakoreshwa
    const usernameExists = (name) => {
      return Object.values(data).some(
        (u) =>
          u?.username?.trim().toLowerCase() ===
          name.trim().toLowerCase()
      );
    };

    // Niba itarakoreshwa, tuyisubize uko iri
    if (!usernameExists(newUsername)) {
      return newUsername;
    }

    // Niba yakoreshejwe, tangira kuri 1
    let number = 1;

    while (
      usernameExists(`${baseUsername}${number}`)
    ) {
      number++;
    }

    return `${originalUsername.trim()}${number}`;
  };

  // =========================
  // SAVE COOKIE
  // =========================
  const saveCookie = (user) => {
    Cookies.set(
      "user",
      JSON.stringify(user),
      {
        expires: 7,
        path: "/"
      }
    );
  };

  // =========================
  // EMAIL REGISTER
  // =========================
  const handleRegister = async (e) => {
    e.preventDefault();

    setMessage("");
    setLoading(true);

    if (pass1 !== pass2) {
      setLoading(false);
      return setMessage(t("Passwords ntizihura."));
    }

    try {
      // =========================
      // CHECK EMAIL
      // =========================
      const emailExists = await checkEmail(email);

      if (emailExists) {
        setLoading(false);
        return setMessage(
          t("Email isanzwe ikoreshwa.")
        );
      }

      // =========================
      // FIND AVAILABLE USERNAME
      // =========================
      const finalUsername =
        await getAvailableUsername(username);

      // =========================
      // CREATE FIREBASE ACCOUNT
      // =========================
      const res =
        await createUserWithEmailAndPassword(
          auth,
          email,
          pass1
        );

      const user = res.user;

      // =========================
      // USER DATA
      // =========================
      const userData = {
        uid: user.uid,
        email: user.email,
        username: finalUsername
      };

      // =========================
      // SAVE USER
      // =========================
      await setDoc(
        doc(db, "userdate", "data"),
        {
          [user.uid]: userData
        },
        {
          merge: true
        }
      );

      // =========================
      // SAVE COOKIE
      // =========================
      saveCookie(userData);

      // =========================
      // REDIRECT
      // =========================
      router.replace("/");

    } catch (err) {
      console.error(err);

      setLoading(false);
      setMessage(
        err?.message ||
        t("Habaye ikibazo mu gukora account.")
      );
    }
  };

  // =========================
  // GOOGLE REGISTER
  // =========================
  const handleGoogle = async () => {
    setLoading(true);
    setMessage("");

    try {
      // =========================
      // GOOGLE LOGIN
      // =========================
      const res =
        await signInWithPopup(auth, provider);

      const user = res.user;

      // =========================
      // CHECK EMAIL
      // =========================
      const emailExists =
        await checkEmail(user.email);

      if (emailExists) {
        setLoading(false);

        return setMessage(
          t("Account isanzwe ikoreshwa.")
        );
      }

      // =========================
      // GOOGLE DISPLAY NAME
      // =========================
      const googleUsername =
        user.displayName || "User";

      // =========================
      // FIND AVAILABLE USERNAME
      // =========================
      const finalUsername =
        await getAvailableUsername(
          googleUsername
        );

      // =========================
      // USER DATA
      // =========================
      const userData = {
        uid: user.uid,
        email: user.email,
        username: finalUsername
      };

      // =========================
      // SAVE USER
      // =========================
      await setDoc(
        doc(db, "userdate", "data"),
        {
          [user.uid]: userData
        },
        {
          merge: true
        }
      );

      // =========================
      // SAVE COOKIE
      // =========================
      saveCookie(userData);

      // =========================
      // REDIRECT
      // =========================
      router.replace("/");

    } catch (err) {
      console.error(err);

      setLoading(false);

      setMessage(
        err?.message ||
        t("Google registration yanze.")
      );
    }
  };

  return (
    <div className={styles.container}>

      <h2 className={styles.title}>{t("Create Account")}</h2>

      {message && (
        <p className={styles.message}>
          {message}
        </p>
      )}

      <form
        className={styles.form}
        onSubmit={handleRegister}
      >

        <input
          className={styles.input}
          placeholder={t("Username")}
          value={username}
          onChange={(e) =>
            setUsername(e.target.value)
          }
          required
        />

        <input
          className={styles.input}
          type="email"
          placeholder={t("Email")}
          value={email}
          onChange={(e) =>
            setEmail(e.target.value)
          }
          required
        />

        <input
          className={styles.input}
          type="password"
          placeholder={t("Password")}
          value={pass1}
          onChange={(e) =>
            setPass1(e.target.value)
          }
          required
        />

        <input
          className={styles.input}
          type="password"
          placeholder={t("Confirm Password")}
          value={pass2}
          onChange={(e) =>
            setPass2(e.target.value)
          }
          required
        />

        <button
          className={styles.btn}
          disabled={loading}
        >
          {loading
            ? t("Creating...")
            : t("Register")}
        </button>

      </form>

      <p className={styles.loginLink}>{t("Already have account?")}{" "}
        <a href="/login">{t("Login")}</a>
      </p>

      {loading && (
        <div className={styles.loading}></div>
      )}

    </div>
  );
}
