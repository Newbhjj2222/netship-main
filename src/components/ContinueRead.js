// ContinueReading.jsx
import { useEffect, useState } from "react";
import Link from "next/link";
import Cookies from "js-cookie";

import { db } from "./firebase";

import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
} from "firebase/firestore";

import styles from "../styles/ContinueReading.module.css";
import { useI18n } from "@/i18n/I18nProvider";

/* =========================================================
   Helper: progress -> class name (step 5%)
   ========================================================= */
function getProgressClass(progress) {
  const step = Math.min(100, Math.max(0, Math.round(progress / 5) * 5));
  return `p${step}`;
}

export default function ContinueReading() {
  const { t } = useI18n();

  const [story, setStory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReading = async () => {
      try {
        const user = Cookies.get("user");

        if (!user) {
          setLoading(false);
          return;
        }

        const username = JSON.parse(user)?.username;

        if (!username) {
          setLoading(false);
          return;
        }

        // Last read episode
        const historyQuery = query(
          collection(db, "reading", username, "history"),
          orderBy("updatedAt", "desc"),
          limit(1)
        );

        const historySnap = await getDocs(historyQuery);

        if (historySnap.empty) {
          setLoading(false);
          return;
        }

        const lastRead = historySnap.docs[0].data();

        // All posts
        const postsSnap = await getDocs(
          query(collection(db, "posts"), orderBy("createdAt", "asc"))
        );

        const normalize = (text = "") =>
          String(text)
            .replace(/[\/\-_:.]+/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .toUpperCase();

        const extractStory = (head = "") => {
          const match = String(head).match(
            /^(.*?)\s*(?:S(\d+)|Season\s*(\d+))?\s*(?:EP|Episode)\s*(\d+)/i
          );

          return {
            title: match ? match[1].trim() : String(head).trim(),
            season: Number(match?.[2] || match?.[3] || 1),
            episode: Number(match?.[4] || 1),
          };
        };

        const episodes = postsSnap.docs
          .map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              ...extractStory(data.head),
            };
          })
          .filter(
            (post) =>
              normalize(post.title) === normalize(lastRead.storyHead)
          )
          .sort((a, b) => {
            if (a.season !== b.season) return a.season - b.season;
            return a.episode - b.episode;
          });

        const totalEpisodes = episodes.length;

        const currentIndex = episodes.findIndex(
          (episode) => episode.id === lastRead.postId
        );

        const currentEpisode =
          currentIndex >= 0
            ? currentIndex + 1
            : Number(lastRead.episode || 1);

        const progress =
          totalEpisodes > 0
            ? Math.min(
                100,
                Math.round((currentEpisode / totalEpisodes) * 100)
              )
            : 0;

        setStory({
          ...lastRead,
          totalEpisodes,
          currentEpisode,
          progress,
        });

        setLoading(false);
      } catch (error) {
        console.error("Continue reading error:", error);
        setLoading(false);
      }
    };

    fetchReading();
  }, []);

  /* ============== Loading ============== */
  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingSpinner} />
        <span className={styles.loadingText}>{t("Loading...")}</span>
      </div>
    );
  }

  /* ============== No history ============== */
  if (!story) {
    return null;
  }

  const progressClass = getProgressClass(story.progress);

  return (
    <div className={styles.wrapper}>
      <Link href={`/post/${story.postId}`} className={styles.link}>
        <article className={styles.card}>
          {/* Decorative glow */}
          <span className={styles.cardGlow} aria-hidden="true" />

          {/* IMAGE */}
          <div className={styles.imageWrapper}>
            {story.imageUrl ? (
              <img
                src={story.imageUrl}
                alt={story.storyHead || t("Story")}
                className={styles.image}
                loading="lazy"
              />
            ) : (
              <div className={styles.imagePlaceholder}>📖</div>
            )}
          </div>

          {/* CONTENT */}
          <div className={styles.content}>
            <div className={styles.label}>
              <span className={styles.bookIcon}>📖</span>
              <span className={styles.labelText}>{t("KOMEZA GUSOMA IYI")}</span>
            </div>

            <h3 className={styles.title}>{story.storyHead}</h3>

            <div className={styles.episode}>{t("Episode {currentEpisode}", { currentEpisode: story.currentEpisode })}<span className={styles.episodeMuted}>{t("of")}</span>
              {story.totalEpisodes}
            </div>

            {/* PROGRESS */}
            <div className={styles.progressContainer}>
              <div
                className={`${styles.progressBar} ${styles[progressClass]}`}
              >
                <span className={styles.progressShimmer} aria-hidden="true" />
              </div>
            </div>

            <div className={styles.progressInfo}>{t("{progress}% completed", { progress: story.progress })}</div>
          </div>

          {/* ARROW */}
          <div className={styles.arrow}>
            <span className={styles.arrowIcon}>→</span>
          </div>
        </article>
      </Link>
    </div>
  );
}
