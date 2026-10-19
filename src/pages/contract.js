import { useState } from "react";
import Head from "next/head";
import styles from "../styles/contract.module.css";

import { db } from "../components/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import cookie from "cookie";
import { useI18n } from "@/i18n/I18nProvider";

export async function getServerSideProps({ req }) {
  const cookies = cookie.parse(req.headers.cookie || "");
  const userCookie = cookies.user ? JSON.parse(cookies.user) : null;

  if (!userCookie) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  return {
    props: {
      username: userCookie.username,
    },
  };
}

export default function ContractPage({ username }) {
  const { t } = useI18n();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    story: "",
    licenseType: "non-exclusive",
    usage: "audio",
    message: "",
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setSuccess("");
    setError("");

    try {
      await addDoc(collection(db, "contracts"), {
  ...form,
  username, // username iva muri cookie
  status: "pending",
  approved: false,
  createdAt: serverTimestamp(),
});

      setSuccess(
        t("Urakoze gusaba Content Licensing. Turasuzuma ubusabe bwawe kandi turaza kuvugana nawe ku ntambwe ikurikira mu gihe cya vuba.")
      );

      setForm({
        name: "",
        email: "",
        phone: "",
        story: "",
        licenseType: "non-exclusive",
        usage: "audio",
        message: "",
      });
    } catch (err) {
      console.error(err);

      setError(
        t("Habaye ikibazo mu kohereza ubusabe bwawe. Ongera ugerageze nyuma.")
      );
    }

    setLoading(false);
  };

  return (
    <>
      <Head>
        <title>{t("Application Of Content Licensing | NewTalentsG")}</title>

        <meta
          name="description"
          content="Saba Content Licensing Contract kuri New Talents Stories Group."
        />
      </Head>

      <main className={styles.page}>
        <div className={styles.container}>
          <div className={styles.card}>
            <h1 className={styles.title}>{t("APPLICATION OF CONTENT LICENSING")}</h1>

            <p className={styles.subtitle}>{t("Uzuza iyi form niba ushaka uburenganzira bwo gukoresha inkuru cyangwa ibindi bikorwa bya New Talents Stories Group.")}</p>

            <form
              className={styles.form}
              onSubmit={handleSubmit}
            >
              <div className={styles.grid}>
                <input
                  className={styles.input}
                  type="text"
                  name="name"
                  placeholder={t("Amazina yawe yose")}
                  value={form.name}
                  onChange={handleChange}
                  required
                />

                <input
                  className={styles.input}
                  type="email"
                  name="email"
                  placeholder={t("Email yawe")}
                  value={form.email}
                  onChange={handleChange}
                  required
                />

                <input
                  className={styles.input}
                  type="text"
                  name="phone"
                  placeholder={t("Nimero ya telefone")}
                  value={form.phone}
                  onChange={handleChange}
                  required
                />

                <input
                  className={styles.input}
                  type="text"
                  name="story"
                  placeholder={t("Izina ry'inkuru cyangwa content")}
                  value={form.story}
                  onChange={handleChange}
                  required
                />

                <select
                  className={styles.input}
                  name="licenseType"
                  value={form.licenseType}
                  onChange={handleChange}
                >
                  <option value="non-exclusive">{t("Non-Exclusive License")}</option>
                  <option value="exclusive">{t("Exclusive License")}</option>
                </select>

                <select
                  className={styles.input}
                  name="usage"
                  value={form.usage}
                  onChange={handleChange}
                >
                  <option value="audio">{t("Audio Rights")}</option>
                  <option value="film">{t("Film / Series")}</option>
                  <option value="radio">{t("Radio Rights")}</option>
                  <option value="custom">{t("Custom Project")}</option>
                </select>
              </div>

              <textarea
                className={styles.textarea}
                name="message"
                placeholder={t("Andika ibisobanuro birambuye ku mushinga wawe...")}
                value={form.message}
                onChange={handleChange}
              />

              <button
                type="submit"
                className={styles.button}
                disabled={loading}
              >
                {loading
                  ? t("Birimo koherezwa...")
                  : t("Ohereza Ubusabe")}
              </button>

              {success && (
                <div className={styles.success}>
                  {success}
                </div>
              )}

              {error && (
                <div className={styles.error}>
                  {error}
                </div>
              )}
            </form>
          </div>
        </div>
      </main>
    </>
  );
}
