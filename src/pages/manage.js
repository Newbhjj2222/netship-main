import { useState } from "react";
import { db } from "../components/firebase";
import { collection, addDoc } from "firebase/firestore";
import styles from "../styles/manage.module.css";
import { useI18n } from "@/i18n/I18nProvider";

export default function Manage() {
  const { t } = useI18n();

  const [form, setForm] = useState({
    name: "",
    apk: "",
    image: "",
    rating: "",
    installs: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (!form.name || !form.apk) {
      alert(t("Shyiramo amakuru yose"));
      return;
    }

    try {
      await addDoc(collection(db, "apps"), {
        ...form,
        rating: parseFloat(form.rating || 0),
      });

      alert(t("App yongewemo neza 🚀"));

      setForm({
        name: "",
        apk: "",
        image: "",
        rating: "",
        installs: "",
      });
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>{t("Add App")}</h1>

        <input
          className={styles.input}
          name="name"
          placeholder={t("App Name")}
          value={form.name}
          onChange={handleChange}
        />

        <input
          className={styles.input}
          name="apk"
          placeholder={t("APK Link")}
          value={form.apk}
          onChange={handleChange}
        />

        <input
          className={styles.input}
          name="image"
          placeholder={t("Image URL")}
          value={form.image}
          onChange={handleChange}
        />

        <input
          className={styles.input}
          name="rating"
          placeholder={t("Rating (4.5)")}
          value={form.rating}
          onChange={handleChange}
        />

        <input
          className={styles.input}
          name="installs"
          placeholder={t("Installs (10K+)")}
          value={form.installs}
          onChange={handleChange}
        />

        <button className={styles.button} onClick={handleSubmit}>{t("Save App")}</button>
      </div>
    </div>
  );
}
