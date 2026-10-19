import { collection, getDocs } from "firebase/firestore";
import { db } from "@/components/firebase";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import styles from "@/styles/manager.module.css";
import {
  FaChartLine,
  FaBook,
  FaFilm,
  FaUsers,
  FaFire,
  FaStar,
  FaShareAlt,
  FaEye,
  FaCalendarAlt,
  FaArrowLeft,
  FaSpinner,
  FaTrophy,
  FaMedal
} from "react-icons/fa";
import LinkComponent from "../../components/Links";
import { useI18n } from "@/i18n/I18nProvider";

// 📊 Chart (client-side only)
const ViewsChart = dynamic(() => import("@/components/ViewsChart"), {
  ssr: false,
  loading: () => (
    <div className={styles.chartLoading}>
      <FaSpinner className={styles.spinner} /> Loading chart...
    </div>
  ),
});

// =======================================
// 🧼 CLEAN & NORMALIZE STORY TITLE
// =======================================
export function cleanStoryHead(head = "") {
  if (!head || typeof head !== "string") return "";

  return head
    // remove content inside parentheses
    .replace(/\(.*?\)/g, "")
    // remove S05E08, S5E8, s01e01
    .replace(/\bS\d+\s*E\d+\b/gi, "")
    // remove episode words: EP 8, Episode 10
    .replace(/\bEP(ISODE)?\s*\d+\b/gi, "")
    // remove season words: Season 5, Series 2
    .replace(/\b(SEASON|SERIES)\s*\d+\b/gi, "")
    // remove standalone S05, S5
    .replace(/\bS\d+\b/gi, "")
    // remove PART 1, PART 2
    .replace(/\bPART\s*\d+\b/gi, "")
    // remove FINAL, NEW SEASON
    .replace(/\b(FINAL|NEW\s*SEASON)\b/gi, "")
    // remove separators
    .replace(/[-–—|:_]/g, " ")
    // normalize spaces
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}

// =======================================
// 🎬 EXTRACT SEASON NUMBER
// =======================================
export function extractSeason(head = "") {
  if (!head || typeof head !== "string") return 1;

  // S05E08 → Season 5
  const sxe = head.match(/\bS(\d+)\s*E\d+\b/i);
  if (sxe) return Number(sxe[1]);

  // Season 5 / Series 3
  const seasonWord = head.match(/\b(SEASON|SERIES)\s*(\d+)\b/i);
  if (seasonWord) return Number(seasonWord[2]);

  // S05 / S5
  const seasonShort = head.match(/\bS(\d+)\b/i);
  if (seasonShort) return Number(seasonShort[1]);

  return 1;
}

// =======================================
// SSR
// =======================================
export async function getServerSideProps(context) {
  // Check session
  const cookies = context.req.headers.cookie || "";
  const userCookie = cookies.split(";").find(c => c.trim().startsWith("user="));
  if (!userCookie) {
    return {
      redirect: { destination: "/login", permanent: false }
    };
  }

  try {
    const snap = await getDocs(collection(db, "posts"));
    const posts = [];

    snap.forEach((doc) => {
      posts.push({ id: doc.id, ...doc.data() });
    });

    // =======================================
    // 🧠 MAPS
    // =======================================
    const storiesMap = {};
    const authorMap = {};

    posts.forEach((p) => {
      const storyKey = cleanStoryHead(p.head);
      const season = extractSeason(p.head);
      const views = Number(p.views) || 0;

      // ===== STORIES =====
      if (!storiesMap[storyKey]) {
        storiesMap[storyKey] = {
          title: storyKey,
          totalViews: 0,
          episodes: 0,
          seasons: new Set(),
          imageUrl: p.imageUrl || "",
        };
      }

      storiesMap[storyKey].totalViews += views;
      storiesMap[storyKey].episodes += 1;
      storiesMap[storyKey].seasons.add(season);

      // ===== AUTHORS =====
      if (p.author) {
        if (!authorMap[p.author]) {
          authorMap[p.author] = {
            author: p.author,
            totalViews: 0,
            stories: new Set(),
          };
        }

        authorMap[p.author].totalViews += views;
        authorMap[p.author].stories.add(storyKey);
      }
    });

    // =======================================
    // 🔥 TOP STORIES
    // =======================================
    const stories = Object.values(storiesMap).map((s) => {
      const avg = s.episodes ? s.totalViews / s.episodes : 0;

      return {
        title: s.title,
        totalViews: s.totalViews,
        episodes: s.episodes,
        seasonsCount: s.seasons.size,
        avgViews: Math.round(avg),
        trending: avg >= 500,
        imageUrl: s.imageUrl,
      };
    });

    const topStories = [...stories]
      .sort((a, b) => b.totalViews - a.totalViews)
      .slice(0, 10);

    // =======================================
    // ⭐ POPULAR AUTHORS
    // =======================================
    const popularAuthors = Object.values(authorMap)
      .map((a) => ({
        author: a.author,
        totalViews: a.totalViews,
        storiesCount: a.stories.size,
        avgPerStory: Math.round(a.totalViews / a.stories.size),
      }))
      .sort((a, b) => b.totalViews - a.totalViews)
      .slice(0, 10);

    // =======================================
    // 📢 SHARE SUGGESTIONS
    // =======================================
    const shareBoost = [...posts]
      .filter((p) => p.views)
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, 6);

    return {
      props: {
        stats: {
          totalStories: stories.length,
          totalEpisodes: posts.length,
        },
        topStories,
        popularAuthors,
        shareBoost,
      },
    };
  } catch (error) {
    console.error("Error fetching data:", error);
    return {
      props: {
        stats: { totalStories: 0, totalEpisodes: 0 },
        topStories: [],
        popularAuthors: [],
        shareBoost: [],
        error: "Habaye ikibazo mu kubona amakuru.",
      },
    };
  }
}

// =======================================
// COMPONENT
// =======================================
export default function ManagerPage({
  stats,
  topStories,
  popularAuthors,
  shareBoost,
  error,
}) {
  const { t } = useI18n();

  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const userCookie = Cookies.get("user");
    if (!userCookie) {
      router.replace("/login");
    }
  }, [router]);

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorCard}>
          <p>{error}</p>
          <button onClick={() => router.reload()} className={styles.retryBtn}>{t("Gerageza bundi bushize")}</button>
        </div>
      </div>
    );
  }

  return (
    <>
    <LinkComponent />
    <div className={styles.container}>
      {/* HEADER */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <button onClick={() => router.back()} className={styles.backBtn}>
            <FaArrowLeft />{" "}{t("Subira")}</button>
          <div>
            <h1 className={styles.title}>{t("📊 Manager Dashboard")}</h1>
            <p className={styles.subtitle}>{t("Overview of stories, authors, and performance")}</p>
          </div>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.updateBadge}>
            <FaCalendarAlt />{" "}{t("Updated:")}{" "}{new Date().toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.statCard1}`}>
          <div className={styles.statIconWrapper}>
            <FaBook className={styles.statIcon} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>{t("Total Stories")}</span>
            <strong className={styles.statValue}>{stats.totalStories}</strong>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statCard2}`}>
          <div className={styles.statIconWrapper}>
            <FaFilm className={styles.statIcon} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>{t("Total Episodes")}</span>
            <strong className={styles.statValue}>{stats.totalEpisodes}</strong>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statCard3}`}>
          <div className={styles.statIconWrapper}>
            <FaUsers className={styles.statIcon} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>{t("Popular Authors")}</span>
            <strong className={styles.statValue}>{popularAuthors.length}</strong>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statCard4}`}>
          <div className={styles.statIconWrapper}>
            <FaFire className={styles.statIcon} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>{t("Trending Stories")}</span>
            <strong className={styles.statValue}>
              {topStories.filter(s => s.trending).length}
            </strong>
          </div>
        </div>
      </div>

      {/* CHART */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <FaChartLine className={styles.sectionIcon} />{" "}{t("Top Stories Views")}</h2>
        </div>
        <div className={styles.chartWrapper}>
          <ViewsChart data={topStories} />
        </div>
      </section>

      {/* TOP STORIES */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <FaFire className={styles.sectionIcon} />{" "}{t("Top 10 Most Read Stories")}</h2>
          <span className={styles.sectionCount}>{topStories.length}</span>
        </div>
        <div className={styles.list}>
          {topStories.length === 0 ? (
            <div className={styles.emptyState}>
              <p>{t("Nta nkuru ziboneka")}</p>
            </div>
          ) : (
            topStories.map((s, i) => (
              <div key={s.title} className={styles.listItem}>
                <div className={styles.rankWrapper}>
                  <span className={`${styles.rank} ${i < 3 ? styles.topRank : ''}`}>
                    {i + 1}
                  </span>
                  {i === 0 && <FaTrophy className={styles.trophyIcon} />}
                  {i === 1 && <FaMedal className={styles.medalIcon} />}
                </div>
                <div className={styles.itemContent}>
                  <div className={styles.itemTitle}>
                    <strong>{s.title || t("Untitled")}</strong>
                    {s.trending && (
                      <span className={styles.badge}>
                        <FaFire />{" "}{t("Trending")}</span>
                    )}
                  </div>
                  <div className={styles.itemMeta}>
                    <span><FaEye />{" "}{t("{totalViews} views", { totalViews: s.totalViews })}</span>
                    <span><FaFilm />{" "}{t("{episodes} eps", { episodes: s.episodes })}</span>
                    <span>{t("📅 {seasonsCount} seasons", { seasonsCount: s.seasonsCount })}</span>
                    <span>{t("📊 {avgViews}/ep", { avgViews: s.avgViews })}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* POPULAR AUTHORS */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <FaStar className={styles.sectionIcon} />{" "}{t("Most Popular Authors")}</h2>
          <span className={styles.sectionCount}>{popularAuthors.length}</span>
        </div>
        <div className={styles.list}>
          {popularAuthors.length === 0 ? (
            <div className={styles.emptyState}>
              <p>{t("Nta banditsi baboneka")}</p>
            </div>
          ) : (
            popularAuthors.map((a, i) => (
              <div key={a.author} className={styles.listItem}>
                <div className={styles.rankWrapper}>
                  <span className={`${styles.rank} ${i < 3 ? styles.topRank : ''}`}>
                    {i + 1}
                  </span>
                </div>
                <div className={styles.itemContent}>
                  <div className={styles.itemTitle}>
                    <strong>{a.author}</strong>
                  </div>
                  <div className={styles.itemMeta}>
                    <span><FaEye />{" "}{t("{totalViews} views", { totalViews: a.totalViews })}</span>
                    <span><FaBook />{" "}{t("{storiesCount} stories", { storiesCount: a.storiesCount })}</span>
                    <span>{t("📊 {avgPerStory}/story", { avgPerStory: a.avgPerStory })}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* SHARE SUGGESTIONS */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <FaShareAlt className={styles.sectionIcon} />{" "}{t("Share Suggestions")}</h2>
          <span className={styles.sectionCount}>{shareBoost.length}</span>
        </div>
        <div className={styles.list}>
          {shareBoost.length === 0 ? (
            <div className={styles.emptyState}>
              <p>{t("Nta nkuru zitangwa")}</p>
            </div>
          ) : (
            shareBoost.map((p) => (
              <div key={p.id} className={styles.listItem}>
                <div className={styles.itemContent}>
                  <div className={styles.itemTitle}>
                    <strong>{p.head || t("Untitled")}</strong>
                  </div>
                  <div className={styles.itemMeta}>
                    <span><FaEye /> {p.views || 0}{" "}{t("views")}</span>
                    <span><FaShareAlt />{" "}{t("Suggest for sharing")}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* FOOTER */}
      <div className={styles.footer}>
        <p>{t("© 2026 Manager Dashboard · All rights reserved")}</p>
      </div>
    </div>
        </>
  );
}
