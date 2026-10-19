import { useState } from "react";
import {
  collection,
  getDocs,
  query,
  orderBy,
  writeBatch,
  doc,
} from "firebase/firestore";
import { db } from "../../components/firebase";
import styles from "../../styles/adminStories.module.css";
import LinkComponent from "../../components/Links";
import { useI18n } from "@/i18n/I18nProvider";
/* =========================
   STORY TITLE NORMALIZER
========================= */
function getStoryTitle(head = "") {
  let title = (head || "").trim();

  // Remove S01 / Season 1 + EP numbers
  title = title.replace(
    /\s*(?:S\d+|Season\s*\d+)?\s*(?:EP|Episode)?\s*\d+$/i,
    ""
  );

  // Remove EP Final / Finale / Finally
  title = title.replace(
    /\s*(?:EP|Episode)\s*(?:Final|Finale|Finally)$/i,
    ""
  );

  // Remove standalone Final / Finale / Finally
  title = title.replace(
    /\s*(?:Final|Finale|Finally)$/i,
    ""
  );

  return title.trim();
}

/* =========================
   SSR
========================= */
export async function getServerSideProps() {
  try {
    const postsSnap = await getDocs(
      query(collection(db, "posts"), orderBy("createdAt", "desc"))
    );

    const reportsSnap = await getDocs(collection(db, "reports"));

    const grouped = {};

    /* =========================
       GROUP POSTS
    ========================== */
    postsSnap.docs.forEach((d) => {
      const post = { id: d.id, ...d.data() };

      const title = getStoryTitle(post.head);

      if (!grouped[title]) {
        grouped[title] = {
          title,
          image: post.imageUrl || "",
          author: post.author || "Unknown",
          episodes: [],
          seasons: new Set(),
          reports: 0,
        };
      }

      grouped[title].episodes.push(post);

      // season detection
      const seasonMatch = (post.head || "").match(/S(\d+)|Season\s*(\d+)/i);
      const season = seasonMatch
        ? parseInt(seasonMatch[1] || seasonMatch[2])
        : 1;

      grouped[title].seasons.add(season);
    });

    /* =========================
       REPORTS COUNT
    ========================== */
    reportsSnap.docs.forEach((d) => {
      const r = d.data();

      const title = getStoryTitle(r.storyTitle || r.head || "");

      if (grouped[title]) {
        grouped[title].reports += 1;
      }
    });

    /* =========================
       FINAL STORIES
    ========================== */
    const stories = Object.values(grouped).map((story) => {
      const allPaid =
        story.episodes.length > 0 &&
        story.episodes.every((ep) => ep.accessType === "paid");

      return {
        title: story.title,
        image: story.image,
        author: story.author,
        totalEpisodes: story.episodes.length,
        totalSeasons: story.seasons.size,
        reportCount: story.reports,
        status: allPaid ? "paid" : "free",
      };
    });

    return { props: { stories } };
  } catch (err) {
    return { props: { stories: [] } };
  }
}

/* =========================
   COMPONENT
========================= */
export default function StoriesAdmin({ stories }) {
  const { t } = useI18n();

  const [data, setData] = useState(stories);
  const [loadingStory, setLoadingStory] = useState(null);

  /* =========================
     BULK STATUS UPDATE
  ========================== */
  const changeStatus = async (storyTitle, newStatus) => {
    try {
      setLoadingStory(storyTitle);

      const snap = await getDocs(collection(db, "posts"));

      const batch = writeBatch(db);

      snap.docs.forEach((d) => {
        const post = d.data();

        const title = getStoryTitle(post.head);

        if (title === storyTitle) {
          batch.update(doc(db, "posts", d.id), {
            accessType: newStatus,
          });
        }
      });

      await batch.commit();

      setData((prev) =>
        prev.map((s) =>
          s.title === storyTitle
            ? { ...s, status: newStatus }
            : s
        )
      );

      setLoadingStory(null);
    } catch (err) {
      console.log(err);
      setLoadingStory(null);
    }
  };

  /* =========================
     UI
  ========================== */
  return (
    <>
    <LinkComponent />
    <div className={styles.container}>
      <h1>{t("Stories Manager")}</h1>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>{t("Cover")}</th>
            <th>{t("Story")}</th>
            <th>{t("Author")}</th>
            <th>{t("Seasons")}</th>
            <th>{t("Episodes")}</th>
            <th>{t("Reports")}</th>
            <th>{t("Status")}</th>
            <th>{t("Action")}</th>
          </tr>
        </thead>

        <tbody>
          {data.map((story) => (
            <tr key={story.title}>
              <td>
                <img
                  src={story.image}
                  alt={story.title}
                  className={styles.cover}
                />
              </td>

              <td>{story.title}</td>
              <td>{story.author}</td>
              <td>{story.totalSeasons}</td>
              <td>{story.totalEpisodes}</td>
              <td>{story.reportCount}</td>

              <td>
                <span
                  className={
                    story.status === "paid"
                      ? styles.paid
                      : styles.free
                  }
                >
                  {story.status}
                </span>
              </td>

              <td>
                <button
                  disabled={loadingStory === story.title}
                  className={
                    story.status === "paid"
                      ? styles.freeBtn
                      : styles.paidBtn
                  }
                  onClick={() =>
                    changeStatus(
                      story.title,
                      story.status === "paid"
                        ? "free"
                        : "paid"
                    )
                  }
                >
                  {loadingStory === story.title
                    ? t("Updating...")
                    : story.status === "paid"
                    ? t("Make Free")
                    : t("Make Paid")}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
            </>
  );
}
