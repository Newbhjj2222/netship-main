import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  query,
  orderBy,
  where,
  writeBatch,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../../components/firebase";
import Cookies from "js-cookie";
import { useRouter } from "next/router";
import styles from "../../styles/admin.module.css";
import LinkComponent from "../../components/Link";
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
SSR - GET USER FROM COOKIE
========================= */
export async function getServerSideProps(context) {
  const { req } = context;
  
  // ===== 1. BONA USER MURI COOKIE =====
  const cookies = req.headers.cookie || "";
  const userCookie = cookies.split(";").find(c => c.trim().startsWith("user="));
  
  let username = null;
  let userData = null;

  if (userCookie) {
    try {
      const cookieValue = userCookie.split("=")[1];
      userData = JSON.parse(decodeURIComponent(cookieValue));
      username = userData.username;
    } catch (error) {
      console.error("Error parsing user cookie:", error);
    }
  }

  // ===== 2. NIBO USER ATABONEKA, YEREKEZA KURI LOGIN =====
  if (!username) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  // ===== 3. REBA NIBO USER ARI MONITIZED (author) =====
  try {
    const authorRef = doc(db, "authors", username);
    const authorSnap = await getDoc(authorRef);

    let isMonitized = false;

    if (authorSnap.exists()) {
      const authorData = authorSnap.data();
      isMonitized = authorData.status?.toLowerCase() === "monitized";
    }

    // ===== 4. NIBO ATARI MONITIZED, GARAGAZA UBUTUMWA =====
    if (!isMonitized) {
      return {
        props: {
          username,
          isMonitized: false,
          message: "Ntabwo account yawe iri monitize. Tangaza inkuru kenshi nibwo uzemererwa kubyaza inyungu ibihangano byawe.",
          stories: [],
        },
      };
    }

    // ===== 5. SHAKA INKURU ZA USER GUSA =====
    // Shakisha posts zanditswe na uyu user gusa
    const postsSnap = await getDocs(
      query(
        collection(db, "posts"), 
        where("author", "==", username),
        orderBy("createdAt", "desc")
      )
    );

    // Shakisha reports zose
    const reportsSnap = await getDocs(collection(db, "reports"));

    const grouped = {};

    // ===== GROUP POSTS =====
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
          postIds: [],
        };
      }

      grouped[title].episodes.push(post);
      grouped[title].postIds.push(d.id);

      // season detection
      const seasonMatch = (post.head || "").match(/S(\d+)|Season\s*(\d+)/i);
      const season = seasonMatch
        ? parseInt(seasonMatch[1] || seasonMatch[2])
        : 1;

      grouped[title].seasons.add(season);
    });

    // ===== REPORTS COUNT (gusa raporo z'inkuru za uyu user) =====
    reportsSnap.docs.forEach((d) => {
      const r = d.data();
      const title = getStoryTitle(r.storyTitle || r.head || "");

      // Reba niba iyi report ivuga inkuru za uyu user
      if (grouped[title]) {
        grouped[title].reports += 1;
      }
    });

    // ===== FINAL STORIES =====
    const stories = Object.values(grouped).map((story) => {
      const allPaid =
        story.episodes.length > 0 &&
        story.episodes.every((ep) => ep.accessType === "paid");

      // Reba niba hari episodes ziri "paid"
      const hasPaidEpisodes = story.episodes.some((ep) => ep.accessType === "paid");

      return {
        title: story.title,
        image: story.image,
        author: story.author,
        totalEpisodes: story.episodes.length,
        totalSeasons: story.seasons.size,
        reportCount: story.reports,
        status: allPaid ? "paid" : hasPaidEpisodes ? "mixed" : "free",
        postIds: story.postIds,
        episodes: story.episodes,
      };
    });

    return {
      props: {
        username,
        isMonitized: true,
        message: null,
        stories,
      },
    };

  } catch (error) {
    console.error("Error fetching data:", error);
    return {
      props: {
        username,
        isMonitized: false,
        message: "Habaye ikibazo mu kubona amakuru.",
        stories: [],
      },
    };
  }
}

/* =========================
COMPONENT
========================= */
export default function StoriesAdmin({ 
  username, 
  isMonitized, 
  message, 
  stories: initialStories 
}) {
  const { t } = useI18n();

  const router = useRouter();
  const [data, setData] = useState(initialStories);
  const [loadingStory, setLoadingStory] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [isClient, setIsClient] = useState(false);

  // ===== CHECK SESSION =====
  useEffect(() => {
    setIsClient(true);
    const userCookie = Cookies.get("user");
    if (!userCookie) {
      router.replace("/login");
    }
  }, [router]);

  // ===== FILTER STORIES =====
  const filteredStories = data.filter((story) => {
    const matchesSearch = story.title
      .toLowerCase()
      .includes(searchTerm.toLowerCase()) ||
      story.author.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === "all" || story.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  // ===== NIBO ATARI MONITIZED =====
  if (!isMonitized) {
    return (
      <>
      <LinkComponent />
      <div className={styles.container}>
        <div className={styles.notMonitizedCard}>
          <div className={styles.lockIcon}>🔒</div>
          <h2>{t("Account Ntabwo Yemererwa")}</h2>
          <p>{message || t("Ntabwo account yawe iri monitize.")}</p>
          <div className={styles.infoBox}>
            <h3>{t("📖 Tangaza Inkuru Kenshi")}</h3>
            <p>{t("Kugira ngo ubone kubyaza inyungu ibihangano byawe, ugomba")}{" "}<strong>{t("kwandika no gutangaza inkuru nyinshi")}</strong>{t(". Nibwo uzemererwa kugira status ya")}{" "}<strong>{t("\"Monitized\"")}</strong>.
            </p>
            <ul>
              <li>{t("✅ Andika inkuru nyinshi zishimishije")}</li>
              <li>{t("✅ Tangaza ibihangano byawe buri munsi ukora share")}</li>
              <li>{t("✅ Gerageza kugera kubasomyi 10k+")}</li>
              <li>{t("✅ Vugana n'abandi banditsi umenye uburyo wabikora")}</li>
            </ul>
          </div>
          <button 
            onClick={() => router.push("/dashboard")} 
            className={styles.goHomeBtn}
          >{t("🏠 Subira ku Rupapuro Rw'Ibanze")}</button>
        </div>
      </div>
              </>
    );
  }

  // ===== BULK STATUS UPDATE =====
  const changeStatus = async (storyTitle, newStatus) => {
    try {
      setLoadingStory(storyTitle);

      // Shakisha gusa posts za uyu user
      const snap = await getDocs(
        query(
          collection(db, "posts"),
          where("author", "==", username)
        )
      );

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
      alert(t("❌ Habaye ikibazo mu guhindura status."));
    }
  };

  // ===== REPORT COUNT DISPLAY =====
  const getReportDisplay = (count) => {
    if (count === 0) return "✅ Nta report";
    if (count === 1) return "⚠️ 1 report";
    if (count <= 3) return `⚠️ ${count} reports`;
    if (count <= 5) return `🔴 ${count} reports (Attention!)`;
    return `🚨 ${count} reports (Urgent!)`;
  };

  // ===== STATUS BADGE =====
  const getStatusBadge = (status) => {
    switch (status) {
      case "paid":
        return <span className={styles.paid}>{t("💰 Paid")}</span>;
      case "mixed":
        return <span className={styles.mixed}>{t("🔄 Mixed")}</span>;
      default:
        return <span className={styles.free}>{t("📖 Free")}</span>;
    }
  };

  // ===== RENDER =====
  return (
    <div className={styles.container}>
      {/* HEADER */}
      <div className={styles.header}>
        <div>
          <h1>{t("📚 My Stories")}</h1>
          <p className={styles.userInfo}>{t("👤 {username} (Monitized)", { username })}</p>
          <p className={styles.storyCount}>{t("📖 Total Stories: {length}", { length: data.length })}</p>
        </div>
      </div>

      {/* STATS */}
      <div className={styles.stats}>
        <div className={styles.statCard}>
          <span>{t("📚 Total Stories")}</span>
          <strong>{data.length}</strong>
        </div>
        <div className={styles.statCard}>
          <span>{t("💰 Paid")}</span>
          <strong>{data.filter(s => s.status === "paid").length}</strong>
        </div>
        <div className={styles.statCard}>
          <span>{t("📖 Free")}</span>
          <strong>{data.filter(s => s.status === "free").length}</strong>
        </div>
        <div className={styles.statCard}>
          <span>{t("🔄 Mixed")}</span>
          <strong>{data.filter(s => s.status === "mixed").length}</strong>
        </div>
        <div className={styles.statCard}>
          <span>{t("⚠️ Reports")}</span>
          <strong>{data.reduce((acc, s) => acc + s.reportCount, 0)}</strong>
        </div>
      </div>

      {/* FILTERS */}
      <div className={styles.filters}>
        <input
          type="text"
          placeholder={t("🔍 Shakisha inkuru...")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="all">{t("📋 Zose")}</option>
          <option value="paid">{t("💰 Paid")}</option>
          <option value="free">{t("📖 Free")}</option>
          <option value="mixed">{t("🔄 Mixed")}</option>
        </select>
      </div>

      {/* TABLE */}
      <div className={styles.tableWrapper}>
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
            {filteredStories.length === 0 ? (
              <tr>
                <td colSpan="8" className={styles.emptyRow}>{t("📭 Nta nkuru wanditse")}</td>
              </tr>
            ) : (
              filteredStories.map((story) => (
                <tr key={story.title}>
                  <td>
                    <img
                      src={story.image || "/default-cover.jpg"}
                      alt={story.title}
                      className={styles.cover}
                      onError={(e) => {
                        e.target.src = "/default-cover.jpg";
                      }}
                    />
                  </td>

                  <td className={styles.storyTitle}>{story.title}</td>
                  <td>{story.author}</td>
                  <td>{story.totalSeasons}</td>
                  <td>{story.totalEpisodes}</td>

                  <td>
                    <span className={
                      story.reportCount === 0 ? styles.reportSafe :
                      story.reportCount <= 3 ? styles.reportWarning :
                      styles.reportDanger
                    }>
                      {getReportDisplay(story.reportCount)}
                    </span>
                  </td>

                  <td>{getStatusBadge(story.status)}</td>

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
                        ? t("⏳ Updating...")
                        : story.status === "paid"
                        ? t("📖 Make Free")
                        : t("💰 Make Paid")}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* FOOTER */}
      <div className={styles.footer}>
        <p>{t("📊 Showing: {length} / {length2} stories", { length: filteredStories.length, length2: data.length })}</p>
        <p>{t("💡 Handa kuri \"Make Paid\" kugira ngo inkuru ibonekere abakoresha")}</p>
      </div>
    </div>
        
  );
}
