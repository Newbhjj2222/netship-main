import React, { useState } from "react";
import Head from "next/head";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../components/firebase";
import styles from "../styles/contact.module.css";
import { useI18n } from "@/i18n/I18nProvider";

export default function Contact() {
  const { t } = useI18n();

  const [join, setJoin] = useState({
    name: "",
    email: "",
    phone: "",
    whatsapp: "",
  });

  const [message, setMessage] = useState({
    name: "",
    email: "",
    content: "",
  });

  const [ads, setAds] = useState({
    name: "",
    email: "",
    ad: "",
  });

  const [status, setStatus] = useState("");

  const handleChange = (setter) => (e) => {
    setter((prev) => ({
      ...prev,
      [e.target.id]: e.target.value,
    }));
  };

  const handleSubmit = async (
    e,
    data,
    collectionName,
    resetFunction
  ) => {
    e.preventDefault();

    setStatus(t("Birimo koherezwa..."));

    try {
      await addDoc(collection(db, collectionName), {
        ...data,
        createdAt: serverTimestamp(),
      });

      setStatus(t("Byoherejwe neza."));

      resetFunction();
    } catch (error) {
      setStatus("Habaye ikibazo: " + error.message);
    }
  };

  return (
    <>
      <Head>
        <title>{t("Twandikire | NewTalentsG")}</title>

        <meta
          name="description"
          content="Twandikire, usabe kwinjira mu ikipe cyangwa utange advertisement kuri NewTalentsG."
        />
      </Head>

      <main className={styles.page}>
        <div className={styles.container}>
          <div className={styles.hero}>
            <h1>{t("Twandikire")}</h1>

            <p>{t("Ushobora kwinjira mu ikipe yacu, kutwoherereza ubutumwa cyangwa gutanga advertisement yawe.")}</p>
          </div>

          {status && (
            <div className={styles.status}>
              {status}
            </div>
          )}

          <div className={styles.grid}>
            {/* JOIN */}
            <form
              className={styles.card}
              onSubmit={(e) =>
                handleSubmit(
                  e,
                  join,
                  "join",
                  () =>
                    setJoin({
                      name: "",
                      email: "",
                      phone: "",
                      whatsapp: "",
                    })
                )
              }
            >
              <h2>{t("Injira mu Ikipe")}</h2>

              <input
                type="text"
                id="name"
                value={join.name}
                onChange={handleChange(setJoin)}
                placeholder={t("Amazina yawe")}
                required
              />

              <input
                type="email"
                id="email"
                value={join.email}
                onChange={handleChange(setJoin)}
                placeholder={t("Email yawe")}
                required
              />

              <input
                type="tel"
                id="phone"
                value={join.phone}
                onChange={handleChange(setJoin)}
                placeholder={t("Nimero ya telefone")}
              />

              <input
                type="tel"
                id="whatsapp"
                value={join.whatsapp}
                onChange={handleChange(setJoin)}
                placeholder={t("Nimero ya WhatsApp")}
                required
              />

              <button type="submit">{t("Ohereza Ubusabe")}</button>
            </form>

            {/* MESSAGE */}
            <form
              className={styles.card}
              onSubmit={(e) =>
                handleSubmit(
                  e,
                  message,
                  "messages",
                  () =>
                    setMessage({
                      name: "",
                      email: "",
                      content: "",
                    })
                )
              }
            >
              <h2>{t("Ohereza Ubutumwa")}</h2>

              <input
                type="text"
                id="name"
                value={message.name}
                onChange={handleChange(setMessage)}
                placeholder={t("Amazina yawe")}
                required
              />

              <input
                type="email"
                id="email"
                value={message.email}
                onChange={handleChange(setMessage)}
                placeholder={t("Email yawe")}
                required
              />

              <textarea
                id="content"
                value={message.content}
                onChange={handleChange(setMessage)}
                placeholder={t("Andika ubutumwa bwawe...")}
                required
              />

              <button type="submit">{t("Ohereza")}</button>
            </form>

            {/* ADS */}
            <form
              className={styles.card}
              onSubmit={(e) =>
                handleSubmit(
                  e,
                  ads,
                  "ads",
                  () =>
                    setAds({
                      name: "",
                      email: "",
                      ad: "",
                    })
                )
              }
            >
              <h2>{t("Tanga Advertisement")}</h2>

              <input
                type="text"
                id="name"
                value={ads.name}
                onChange={handleChange(setAds)}
                placeholder={t("Amazina yawe")}
                required
              />

              <input
                type="email"
                id="email"
                value={ads.email}
                onChange={handleChange(setAds)}
                placeholder={t("Email yawe")}
                required
              />

              <textarea
                id="ad"
                value={ads.ad}
                onChange={handleChange(setAds)}
                placeholder={t("Andika advertisement yawe...")}
                required
              />

              <button type="submit">{t("Tanga Advertisement")}</button>
            </form>
          </div>
        </div>
      </main>
    </>
  );
}
