"use client";

import React, { useState, useEffect } from "react";
import styles from "../../styles/monitize.module.css";
import { db } from "../../components/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import emailjs from "@emailjs/browser";
import LinkComponent from "../../components/Link";
import { useI18n } from "@/i18n/I18nProvider";

const API_KEY = "d3b627c6d75013b8aaf2aac6de73dcb5";

export default function MonitorPage() {
  const { t } = useI18n();

  const [username, setUsername] = useState("");
  const [formData, setFormData] = useState({
    fullName: "",
    whatsapp: "",
    email: "",
    reason: "",
    idCard: null,
    profilePhoto: null,
    screenshotStories: null,
    screenshotRefer: null,
  });
  const [previews, setPreviews] = useState({});
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const cookies = document.cookie.split("; ").find((row) => row.startsWith("username="));
    if (cookies) setUsername(cookies.split("=")[1]);
  }, []);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (files) {
      const file = files[0];
      setFormData((prev) => ({ ...prev, [name]: file }));
      setPreviews((prev) => ({
        ...prev,
        [name]: URL.createObjectURL(file),
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const uploadToImgBB = async (file) => {
    try {
      const form = new FormData();
      form.append("image", file);
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${API_KEY}`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (data.success) return data.data.url;
      else throw new Error(data.error.message || "ImgBB upload failed");
    } catch (err) {
      throw new Error(`ImgBB Error: ${err.message}`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      // Upload amafoto yose kuri ImgBB
      const idCardUrl = formData.idCard ? await uploadToImgBB(formData.idCard) : "";
      const profilePhotoUrl = formData.profilePhoto ? await uploadToImgBB(formData.profilePhoto) : "";
      const screenshotStoriesUrl = formData.screenshotStories ? await uploadToImgBB(formData.screenshotStories) : "";
      const screenshotReferUrl = formData.screenshotRefer ? await uploadToImgBB(formData.screenshotRefer) : "";

      // Bika muri Firestore
      try {
        await addDoc(collection(db, "monetization_requests"), {
          username,
          fullName: formData.fullName,
          whatsapp: formData.whatsapp,
          email: formData.email,
          reason: formData.reason,
          idCardUrl,
          profilePhotoUrl,
          screenshotStoriesUrl,
          screenshotReferUrl,
          createdAt: serverTimestamp(),
        });
      } catch (firestoreErr) {
        throw new Error(`Firestore Error: ${firestoreErr.message}`);
      }

      // Ohereza email kuri admin
      try {
        await emailjs.send(
          "service_dshplvf",
          "template_jwwy9te",
          {
            username,
            fullName: formData.fullName,
            email: formData.email,
            message: `User ${username} yohereje request yo monetize.`,
          },
          "R4ZefiZiRaC9b_7af"
        );
      } catch (emailErr) {
        throw new Error(`EmailJS Error: ${emailErr.text || emailErr.message}`);
      }

      alert(t("✅ Request yawe yoherejwe neza!"));
      setFormData({
        fullName: "",
        whatsapp: "",
        email: "",
        reason: "",
        idCard: null,
        profilePhoto: null,
        screenshotStories: null,
        screenshotRefer: null,
      });
      setPreviews({});
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || t("Habaye ikibazo kidasobanutse"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <LinkComponent />
    
    <div className={styles.container}>
      <h2 className={styles.title}>{t("Monetization Request Form")}</h2>

      {errorMsg && <p className={styles.error}>{errorMsg}</p>}

      <form className={styles.form} onSubmit={handleSubmit}>
        <input
          type="text"
          name="fullName"
          placeholder={t("Amazina yawe bwite")}
          value={formData.fullName}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="whatsapp"
          placeholder={t("Numero ya WhatsApp")}
          value={formData.whatsapp}
          onChange={handleChange}
          required
        />
        <input
          type="email"
          name="email"
          placeholder={t("Email yawe")}
          value={formData.email}
          onChange={handleChange}
          required
        />
        <textarea
          name="reason"
          placeholder={t("Impamvu ya request")}
          value={formData.reason}
          onChange={handleChange}
          rows="3"
          required
        ></textarea>

        <label className={styles.label}>{t("Ifoto y’indangamuntu cyangwa passport cyangwa ikindi cyangobwa kerekana ko uri umwenegihugu:")}</label>
        <input type="file" name="idCard" accept="image/*" onChange={handleChange} required />
        {previews.idCard && <img src={previews.idCard} alt={t("Preview")} className={styles.preview} />}

        <label className={styles.label}>{t("Ifoto yawe bwite:")}</label>
        <input type="file" name="profilePhoto" accept="image/*" onChange={handleChange} required />
        {previews.profilePhoto && <img src={previews.profilePhoto} alt={t("Preview")} className={styles.preview} />}

        <label className={styles.label}>{t("Screenshot ya certificate yemeza ko wahuguwe na new talents stories group:")}</label>
        <input type="file" name="screenshotStories" accept="image/*" onChange={handleChange} required />
        {previews.screenshotStories && (
          <img src={previews.screenshotStories} alt={t("Preview")} className={styles.preview} />
        )}

        <label className={styles.label}>{t("Screenshot ya net influencer:")}</label>
        <input type="file" name="screenshotRefer" accept="image/*" onChange={handleChange} required />
        {previews.screenshotRefer && (
          <img src={previews.screenshotRefer} alt={t("Preview")} className={styles.preview} />
        )}

        <button type="submit" className={styles.submitButton} disabled={loading}>
          {loading ? <div className={styles.loader}></div> : t("Ohereza Request")}
        </button>
      </form>
    </div>
            </>
  );
}
