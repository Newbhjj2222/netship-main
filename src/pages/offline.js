import { useEffect, useState } from "react";
import Head from "next/head";
import localforage from "localforage";
import styles from "../styles/offline.module.css";
import { useI18n } from "@/i18n/I18nProvider";

/*
|--------------------------------------------------------------------------
| INDEXEDDB CONFIG (BIHAMYE NA STORY PAGE)
|--------------------------------------------------------------------------
*/

const OFFLINE_DB_NAME = "newTalentsOfflineStories";
const OFFLINE_DB_VERSION = 1;
const OFFLINE_STORY_STORE = "stories";
const OFFLINE_EPISODE_STORE = "episodes";

function openOfflineDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB ntabwo iboneka kuri browser."));
      return;
    }

    const request = window.indexedDB.open(
      OFFLINE_DB_NAME,
      OFFLINE_DB_VERSION
    );

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      if (!database.objectStoreNames.contains(OFFLINE_STORY_STORE)) {
        database.createObjectStore(OFFLINE_STORY_STORE, {
          keyPath: "storyKey",
        });
      }

      if (!database.objectStoreNames.contains(OFFLINE_EPISODE_STORE)) {
        const episodeStore = database.createObjectStore(
          OFFLINE_EPISODE_STORE,
          { keyPath: "episodeKey" }
        );

        episodeStore.createIndex("storyKey", "storyKey", {
          unique: false,
        });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/*
|--------------------------------------------------------------------------
| LOAD FROM INDEXEDDB (STORY + EPISODES ZOSE ZIHUYE)
|--------------------------------------------------------------------------
*/

async function loadStoriesFromIndexedDB() {
  try {
    const database = await openOfflineDB();

    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(
        [OFFLINE_STORY_STORE, OFFLINE_EPISODE_STORE],
        "readonly"
      );

      const storyStore = transaction.objectStore(OFFLINE_STORY_STORE);
      const episodeStore = transaction.objectStore(OFFLINE_EPISODE_STORE);

      const storiesRequest = storyStore.getAll();
      const episodesRequest = episodeStore.getAll();

      let storiesData = null;
      let episodesData = null;

      function finish() {
        // Bumba episodes zose mu nkuru imwe (group by storyKey)
        const episodeMap = {};

        episodesData.forEach((episode) => {
          if (!episodeMap[episode.storyKey]) {
            episodeMap[episode.storyKey] = [];
          }
          episodeMap[episode.storyKey].push(episode);
        });

        const grouped = storiesData.map((story) => {
          const episodes = (episodeMap[story.storyKey] || []).sort(
            (a, b) => {
              if ((a.season || 1) !== (b.season || 1)) {
                return (a.season || 1) - (b.season || 1);
              }
              return (a.orderNumber || 0) - (b.orderNumber || 0);
            }
          );

          return {
            storyKey: story.storyKey,
            storyId: story.storyId || story.storyKey,
            title: story.title || "Untitled",
            image: story.image || "",
            author: story.author || "",
            episodeCount: episodes.length || story.episodeCount || 0,
            savedAt: story.purchasedAt
              ? new Date(story.purchasedAt).getTime()
              : 0,
            source: "indexedDB",
            episodes,
          };
        });

        database.close();
        resolve(grouped);
      }

      storiesRequest.onsuccess = () => {
        storiesData = storiesRequest.result || [];
        if (episodesData !== null) finish();
      };

      episodesRequest.onsuccess = () => {
        episodesData = episodesRequest.result || [];
        if (storiesData !== null) finish();
      };

      transaction.onerror = () => {
        database.close();
        reject(transaction.error);
      };
    });
  } catch (error) {
    console.error("IndexedDB load error:", error);
    return [];
  }
}

/*
|--------------------------------------------------------------------------
| LOAD FROM LOCALFORAGE (UBURYO BW'A KARE - STORY IMWE)
|--------------------------------------------------------------------------
*/

async function loadStoriesFromLocalforage() {
  try {
    const keys = await localforage.keys();

    const storyKeys = keys.filter((key) =>
      String(key).startsWith("story-")
    );

    const results = [];

    for (const key of storyKeys) {
      const data = await localforage.getItem(key);

      if (!data) continue;

      const episode = {
        episodeKey: key,
        episodeId: data.id || key.replace("story-", ""),
        title: data.head || "Untitled",
        image: data.imageUrl || "",
        season: Number(data.season || 1),
        episode: Number(data.episode || 1),
        part: Number(data.part || 0),
        isFinal: Boolean(data.isFinal),
        orderNumber: Number(data.orderNumber || 1),
        story: data.story || "",
        content: data.story || data.content || "",
        audioUrl: data.audioUrl || "",
        videoUrl: data.videoUrl || "",
        author: data.author || "",
        createdAt: data.createdAt || null,
        savedAt: data.savedAt || 0,
      };

      results.push({
        storyKey: key,
        storyId: data.id || key.replace("story-", ""),
        title: data.head || "Untitled",
        image: data.imageUrl || "",
        author: data.author || "",
        episodeCount: 1,
        savedAt: data.savedAt || 0,
        source: "localforage",
        episodes: [episode],
      });
    }

    return results;
  } catch (error) {
    console.error("localforage load error:", error);
    return [];
  }
}

/*
|--------------------------------------------------------------------------
| PAGE
|--------------------------------------------------------------------------
*/

export default function OfflinePage() {
  const { t } = useI18n();

  const [stories, setStories] = useState([]);
  const [activeStory, setActiveStory] = useState(null);
  const [activeEpisode, setActiveEpisode] = useState(null);
  const [loading, setLoading] = useState(true);

  /*
  |--------------------------------------------------------------------------
  | LOAD ZOSE (INDEXEDDB + LOCALFORAGE)
  |--------------------------------------------------------------------------
  */

  const loadStories = async () => {
    setLoading(true);

    try {
      // Bona amakuru muri both sources icyarimwe
      const [indexedStories, legacyStories] = await Promise.all([
        loadStoriesFromIndexedDB(),
        loadStoriesFromLocalforage(),
      ]);

      // Huza: niba story imwe iri muri both (by storyId/storyKey),
      // tanga priority IndexedDB (kuko ifite episodes nyinshi).
      const merged = [...indexedStories];

      const existingKeys = new Set(
        indexedStories.map((story) =>
          String(story.storyId || story.storyKey)
        )
      );

      legacyStories.forEach((legacy) => {
        const key = String(legacy.storyId || legacy.storyKey);

        if (!existingKeys.has(key)) {
          merged.push(legacy);
          existingKeys.add(key);
        }
      });

      // Sort newest first
      merged.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));

      setStories(merged);
    } catch (error) {
      console.error("Load stories error:", error);
      setStories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStories();
  }, []);

  /*
  |--------------------------------------------------------------------------
  | OPEN / CLOSE
  |--------------------------------------------------------------------------
  */

  const openStory = (story) => {
    setActiveStory(story);
    // Fungura episode ya mbere ako kanya
    setActiveEpisode(story.episodes?.[0] || null);
  };

  const closeStory = () => {
    setActiveStory(null);
    setActiveEpisode(null);
  };

  const backToEpisodes = () => {
    setActiveEpisode(null);
  };

  const openEpisode = (episode) => {
    setActiveEpisode(episode);
  };

  /*
  |--------------------------------------------------------------------------
  | DELETE ALL
  |--------------------------------------------------------------------------
  */

  const clearAll = async () => {
    const confirm = window.confirm(
      t("Urashaka gusiba inkuru zose zabitswe offline?")
    );

    if (!confirm) return;

    try {
      // 1) Siba muri localforage
      const keys = await localforage.keys();

      for (const key of keys) {
        if (String(key).startsWith("story-")) {
          await localforage.removeItem(key);
        }
      }

      // 2) Siba muri IndexedDB
      try {
        const database = await openOfflineDB();

        await new Promise((resolve, reject) => {
          const transaction = database.transaction(
            [OFFLINE_STORY_STORE, OFFLINE_EPISODE_STORE],
            "readwrite"
          );

          transaction.objectStore(OFFLINE_STORY_STORE).clear();
          transaction.objectStore(OFFLINE_EPISODE_STORE).clear();

          transaction.oncomplete = () => {
            database.close();
            resolve(true);
          };

          transaction.onerror = () => {
            database.close();
            reject(transaction.error);
          };
        });
      } catch (error) {
        console.warn("IndexedDB clear skipped:", error);
      }

      setStories([]);
      setActiveStory(null);
      setActiveEpisode(null);
    } catch (error) {
      console.error("Clear all error:", error);
      alert(t("Gusiba byanze. Ongera ugerageze."));
    }
  };

  /*
  |--------------------------------------------------------------------------
  | HELPERS ZO KWEREKANA
  |--------------------------------------------------------------------------
  */

  const getEpisodeLabel = (episode) => {
    const season = Number(episode.season || 1);
    const seasonLabel = `S${String(season).padStart(2, "0")}`;

    if (episode.isFinal) {
      return `${seasonLabel} FINAL`;
    }

    if (Number(episode.episode) > 0) {
      return `${seasonLabel} EP${String(episode.episode).padStart(
        2,
        "0"
      )}`;
    }

    if (Number(episode.part) > 0) {
      return `${seasonLabel} PART ${episode.part}`;
    }

    return seasonLabel;
  };

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    <>
      <Head>
        <title>{t("Offline Stories")}</title>
      </Head>

      <div className={styles.container}>
        <h1 className={styles.title}>{t("Offline Library")}</h1>

        {/* =========================================================
            ACTION BAR
        ========================================================== */}

        <div className={styles.actions}>
          <button onClick={loadStories} className={styles.reloadBtn}>{t("Reload")}</button>

          <button onClick={clearAll} className={styles.deleteAllBtn}>{t("Clean All")}</button>
        </div>

        {/* =========================================================
            LOADING
        ========================================================== */}

        {loading && <p className={styles.loading}>{t("Loading...")}</p>}

        {/* =========================================================
            EMPTY
        ========================================================== */}

        {!loading && stories.length === 0 && (
          <p className={styles.empty}>{t("Nta nkuru yabitswe offline ihari. Ushobora kujya uzibika igihe ufite internet hanyuma igihe utayifite ukajya ubasha kuzisoma.")}</p>
        )}

        {/* =========================================================
            STORY LIST (NTA STORY YAFUNGURIWE)
        ========================================================== */}

        {!loading && !activeStory && stories.length > 0 && (
          <div className={styles.list}>
            {stories.map((story) => (
              <div
                key={story.storyKey || story.storyId}
                className={styles.card}
              >
                <h3 className={styles.cardTitle}>{story.title}</h3>

                <p className={styles.meta}>{t("📚 Episodes: {episodeCount} | Author:", { episodeCount: story.episodeCount })}{" "}
                  {story.author || t("Unknown")}
                </p>

                <p className={styles.meta}>
                  {story.savedAt
                    ? `📥 Saved: ${new Date(
                        story.savedAt
                      ).toLocaleString()}`
                    : ""}
                  {story.source === "localforage" &&
                    t("• Legacy")}
                </p>

                <button
                  className={styles.readBtn}
                  onClick={() => openStory(story)}
                >{t("Read")}</button>
              </div>
            ))}
          </div>
        )}

        {/* =========================================================
            ACTIVE STORY VIEW
        ========================================================== */}

        {activeStory && (
          <div className={styles.reader}>
            <button className={styles.backBtn} onClick={closeStory}>{t("← Back to Library")}</button>

            <h2 className={styles.storyTitle}>{activeStory.title}</h2>

            {activeStory.image && (
              <img
                src={activeStory.image}
                alt={activeStory.title}
                className={styles.image}
              />
            )}

            <p className={styles.meta}>{t("📚 Episodes: {episodeCount} | Author:", { episodeCount: activeStory.episodeCount })}{" "}
              {activeStory.author || t("Unknown")}
            </p>

            {/* =====================================================
                EPISODE LIST (NIBA NTARAGUFUNGURA)
            ====================================================== */}

            {!activeEpisode && (
              <div className={styles.episodeList}>
                <h3>{t("Episodes")}</h3>

                {activeStory.episodes.map((episode) => (
                  <button
                    key={episode.episodeKey}
                    className={styles.episodeBtn}
                    onClick={() => openEpisode(episode)}
                  >
                    <span className={styles.episodeLabel}>
                      {getEpisodeLabel(episode)}
                    </span>
                    <span className={styles.episodeTitleSmall}>
                      {episode.title}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* =====================================================
                EPISODE CONTENT
            ====================================================== */}

            {activeEpisode && (
              <div>
                {activeStory.episodes.length > 1 && (
                  <button
                    className={styles.backBtn}
                    onClick={backToEpisodes}
                  >{t("←Reba izindi Episodes")}</button>
                )}

                <h3 className={styles.episodeHeader}>
                  {getEpisodeLabel(activeEpisode)} —{" "}
                  {activeEpisode.title}
                </h3>

                {activeEpisode.image && (
                  <img
                    src={activeEpisode.image}
                    alt={activeEpisode.title}
                    className={styles.image}
                  />
                )}

                {activeEpisode.audioUrl && (
                  <audio
                    controls
                    src={activeEpisode.audioUrl}
                    style={{ width: "100%", marginBottom: "12px" }}
                  />
                )}

                {activeEpisode.videoUrl && (
                  <video
                    controls
                    src={activeEpisode.videoUrl}
                    style={{ width: "100%", marginBottom: "12px" }}
                  />
                )}

                <div
                  className={styles.story}
                  dangerouslySetInnerHTML={{
                    __html:
                      activeEpisode.content ||
                      activeEpisode.story ||
                      "",
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
