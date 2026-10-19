import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import localforage from "localforage";
import styles from "../../styles/offline.module.css";
import { useI18n } from "@/i18n/I18nProvider";

export default function OfflineStory() {
  const { t } = useI18n();

  const router = useRouter();
  const { id } = router.query;

  const [story, setStory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const loadStory = async () => {
      try {
        const data = await localforage.getItem(`story-${id}`);

        if (data) {
          setStory(data);
        }

        setLoading(false);
      } catch (err) {
        console.log(err);
        setLoading(false);
      }
    };

    loadStory();
  }, [id]);

  if (loading) {
    return (
      <div className={styles.container}>
        <p className={styles.loading}>{t("Loading offline story...")}</p>
      </div>
    );
  }

  if (!story) {
    return (
      <div className={styles.container}>
        <h2>{t("Offline Story Not Found")}</h2>

        <p>{t("Iyi nkuru ntiyigeze ibikwa kuri iki gikoresho.")}</p>

        <Link href="/">
          <button className={styles.homeBtn}>{t("Go Home")}</button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{t("{head} | Offline", { head: story.head })}</title>

        <meta
          name="description"
          content={story.head}
        />
      </Head>

      <div className={styles.container}>

        <div className={styles.topBar}>
          <Link href="/">
            <button className={styles.backBtn}>{t("← Home")}</button>
          </Link>
        </div>

        <h1 className={styles.title}>
          {story.head}
        </h1>

        {story.imageUrl && (
          <img
            src={story.imageUrl}
            alt={story.head}
            className={styles.image}
          />
        )}

        <div
          className={styles.story}
          dangerouslySetInnerHTML={{
            __html: story.story,
          }}
        />

        <div className={styles.footer}>
  <p className={styles.saved}>{t("Saved Offline")}</p>

  <small className={styles.date}>
    {story.savedAt
      ? new Date(story.savedAt).toLocaleString()
      : ""}
  </small>
</div>

      </div>
    </>
  );
}
