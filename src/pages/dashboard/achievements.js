import Head from "next/head";
import { db } from "@/components/firebase";

import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import LinkComponent from "../../components/Link";

import {
  FaTrophy,
  FaEye,
  FaMedal,
  FaStar,
  FaChartLine,
  FaFire,
} from "react-icons/fa";

import styles from "@/styles/achievements.module.css";
import { useI18n } from "@/i18n/I18nProvider";

const achievements = [
  {
    views: 500,
    title: "Rising Writer",
    icon: <FaStar />,
  },
  {
    views: 1000,
    title: "Popular Author",
    icon: <FaMedal />,
  },
  {
    views: 5000,
    title: "Trending Story",
    icon: <FaFire />,
  },
  {
    views: 10000,
    title: "Top Creator",
    icon: <FaTrophy />,
  },
];

function formatNumber(num) {
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(".0", "") + "K";
  }
  return num;
}

function getProgress(views) {
  let next = achievements.find((item) => views < item.views);

  if (!next) {
    return {
      percent: 100,
      next: "Completed",
    };
  }

  const percent = Math.min((views / next.views) * 100, 100);

  return {
    percent,
    next: next.views,
  };
}

export default function Achievements({ stories }) {
  const { t } = useI18n();

  return (
    <>
      <Head>
        <title>{t("Author Achievements | New Talents Stories Group")}</title>
        <meta
          name="description"
          content="Reba achievements z'umwanditsi n'iterambere ry'inkuru ze."
        />
      </Head>
<LinkComponent />
      <div className={styles.container}>
        <h1 className={styles.title}>
          <FaTrophy />{t("Author Achievements")}</h1>

        {stories.length === 0 ? (
          <div className={styles.empty}>{t("Nta nkuru ziraboneka.")}</div>
        ) : (
          <div className={styles.grid}>
            {stories.map((story) => {
              const progress = getProgress(story.views);

              return (
                <div className={styles.card} key={story.id}>
                  <img
                    src={story.image}
                    className={styles.image}
                    alt={story.title}
                  />

                  <div className={styles.content}>
                    <h2>{story.title}</h2>

                    <div className={styles.views}>
                      <FaEye />{t("{Number} views", { Number: formatNumber(story.views) })}</div>

                    <div className={styles.progressBox}>
                      <div className={styles.progress}>
                        <div
                          className={styles.bar}
                          style={{
                            width: `${progress.percent}%`,
                          }}
                        ></div>
                      </div>

                      <p>{t("{Fixed}% kugeza kuri", { Fixed: progress.percent.toFixed(0) })}{" "}
                        {progress.next === "Completed"
                          ? t("Master Achievement")
                          : formatNumber(progress.next) + " views"}
                      </p>
                    </div>

                    <div className={styles.badges}>
                      {achievements.map((a) => {
                        if (story.views >= a.views) {
                          return (
                            <span key={a.views} className={styles.badge}>
                              {a.icon}
                              {a.title}
                            </span>
                          );
                        }
                        return null;
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

export async function getServerSideProps(context) {
  const { req } = context;
  const userCookie = req.cookies.user;

  if (!userCookie) {
    return {
      props: {
        stories: [],
      },
    };
  }

  try {
    const user = JSON.parse(userCookie);
    const username = user.username;

    const snap = await getDocs(
      query(collection(db, "posts"), where("author", "==", username))
    );

    const data = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Group by inkuru
    const groups = {};

    data.forEach((post) => {
      const title =
        post.head
          ?.replace(/\s*(S\d+|Season\s*\d+)?\s*(EP|Episode)\s*\d+/i, "")
          .trim() || "Untitled";

      if (!groups[title]) {
        groups[title] = {
          title,
          views: 0,
          image: post.image || post.imageUrl || "/cover.jpg",
        };
      }

      groups[title].views += post.views || 0;
    });

    const result = Object.values(groups)
      .sort((a, b) => b.views - a.views)
      .slice(0, 5);

    return {
      props: {
        stories: result,
      },
    };
  } catch (error) {
    console.error("Error fetching stories:", error);
    return {
      props: {
        stories: [],
      },
    };
  }
}
