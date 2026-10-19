import React, { useState } from "react";
import Cookies from "js-cookie";
import { db } from "./firebase";
import {
  collection,
  doc,
  setDoc,
} from "firebase/firestore";
import styles from "./Folder.module.css";
import { useI18n } from "@/i18n/I18nProvider";

const Folder = () => {
  const { t } = useI18n();

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  /*
  ============================================================
  GET USERNAME FROM LOGIN COOKIE
  ============================================================

  Login page ibika:

  Cookies.set("user", JSON.stringify({
    uid: "...",
    email: "...",
    fName: "...",
    username: "..."
  }));

  Bityo hano dusoma "user", hanyuma tugakuramo
  userData.username.
  ============================================================
  */
  const getUsernameFromCookie = () => {
    try {
      const userCookie = Cookies.get("user");

      if (!userCookie) {
        console.error(
          "User cookie ntibonetse."
        );
        return null;
      }

      /*
      ----------------------------------------------------------
      Convert JSON string back to object
      ----------------------------------------------------------
      */
      const userData = JSON.parse(userCookie);

      console.log(
        "User data from cookie:",
        userData
      );

      /*
      ----------------------------------------------------------
      Get username
      ----------------------------------------------------------
      */
      const username =
        typeof userData?.username === "string"
          ? userData.username.trim()
          : "";

      if (!username) {
        console.error(
          "Username ntiboneka muri user cookie.",
          userData
        );

        return null;
      }

      return username;
    } catch (error) {
      console.error(
        "Error reading user cookie:",
        error
      );

      return null;
    }
  };

  /*
  ============================================================
  CREATE FOLDER
  ============================================================
  */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;

    /*
    ----------------------------------------------------------
    Get logged-in user's username
    ----------------------------------------------------------
    */
    const username =
      getUsernameFromCookie();

    if (!username) {
      alert(
        t("Nta username ibonetse muri konti yawe. Ongera winjire muri konti.")
      );

      return;
    }

    /*
    ----------------------------------------------------------
    Validate title
    ----------------------------------------------------------
    */
    const folderTitle =
      title.trim();

    if (!folderTitle) {
      alert(
        t("Shyiramo izina rya folder.")
      );

      return;
    }

    try {
      setLoading(true);

      /*
      --------------------------------------------------------
      Create new Firestore document
      --------------------------------------------------------
      */
      const newFolderRef = doc(
        collection(db, "folders")
      );

      /*
      --------------------------------------------------------
      Save folder
      --------------------------------------------------------
      */
      await setDoc(
        newFolderRef,
        {
          title: folderTitle,

          content:
            content.trim(),

          /*
          Username y'umuntu winjiye
          */
          author: username,

          /*
          Useful additional information
          */
          authorUsername: username,

          createdAt:
            new Date().toISOString(),
        }
      );

      console.log(
        "Folder saved:",
        {
          id: newFolderRef.id,
          title: folderTitle,
          author: username,
        }
      );

      alert(
        t("Folder \"{folderTitle}\" yabitswe neza.", { folderTitle })
      );

      /*
      --------------------------------------------------------
      Reset form
      --------------------------------------------------------
      */
      setTitle("");
      setContent("");
      setShowForm(false);

      /*
      --------------------------------------------------------
      Reload page
      --------------------------------------------------------
      */
      window.location.reload();
    } catch (error) {
      console.error(
        "Error saving folder:",
        error
      );

      alert(
        "Hari ikibazo mu kubika folder: " +
          (error?.message ||
            "Unknown error")
      );
    } finally {
      setLoading(false);
    }
  };

  /*
  ============================================================
  RENDER
  ============================================================
  */
  return (
    <>
      {/* ======================================================
          FLOATING BUTTON
      ====================================================== */}
      <button
        type="button"
        className={
          styles.floatingBtn
        }
        onClick={() =>
          setShowForm(
            (previous) => !previous
          )
        }
        aria-label={t("Create folder")}
      >
        +
      </button>

      {/* ======================================================
          FORM OVERLAY
      ====================================================== */}
      {showForm && (
        <div
          className={styles.overlay}
        >
          <form
            className={styles.form}
            onSubmit={handleSubmit}
          >
            <h3
              className={styles.title}
            >{t("Create Folder")}</h3>

            {/* ==================================================
                FOLDER TITLE
            ================================================== */}
            <input
              type="text"
              placeholder={t("Folder Title")}
              value={title}
              onChange={(e) =>
                setTitle(
                  e.target.value
                )
              }
              required
              disabled={loading}
              className={
                styles.input
              }
            />

            {/* ==================================================
                FOLDER DESCRIPTION
            ================================================== */}
            <textarea
              placeholder={t("Folder Description")}
              value={content}
              onChange={(e) =>
                setContent(
                  e.target.value
                )
              }
              disabled={loading}
              className={
                styles.textarea
              }
            />

            {/* ==================================================
                BUTTONS
            ================================================== */}
            <div
              className={
                styles.buttons
              }
            >
              {/* CANCEL */}
              <button
                type="button"
                className={
                  styles.cancelBtn
                }
                onClick={() =>
                  setShowForm(false)
                }
                disabled={loading}
              >{t("Cancel")}</button>

              {/* SAVE */}
              <button
                type="submit"
                className={
                  styles.saveBtn
                }
                disabled={loading}
              >
                {loading
                  ? t("Saving...")
                  : t("Save")}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};

export default Folder;
