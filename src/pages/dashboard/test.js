"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
} from "firebase/firestore";
import { app } from "@/components/firebase";
import styles from "@/styles/create.module.css";
import Folder from "@/components/Folder";
import LinkComponent from "../../components/Link";
import { useI18n } from "@/i18n/I18nProvider";

export default function CreateStoryPage() {
  const { t } = useI18n();

  const db = getFirestore(app);
  const router = useRouter();

  // =========================================================
  // CLEAN STRING
  // =========================================================
  const cleanString = (str) => {
    if (!str) return "";

    return str
      .normalize("NFD")
      .replace(/[^\w\s]/gi, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  };

  // =========================================================
  // BASIC STATES
  // =========================================================
  const [step, setStep] = useState(1);

  const [username, setUsername] = useState("");
  const [cleanUsername, setCleanUsername] = useState("");

  const [head, setHead] = useState("");
  const [summary, setSummary] = useState("");

  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState("");

  const [categories, setCategories] = useState([]);

  const [folders, setFolders] = useState([]);
  const [folder, setFolder] = useState("");

  // =========================================================
  // STORY TYPE
  //
  // series     = Seasons + Episodes
  // standalone = Inkuru imwe ndende
  // parts      = Inkuru ifite Parts
  // =========================================================
  const [storyType, setStoryType] = useState("series");

  // =========================================================
  // SERIES / PARTS SETTINGS
  // =========================================================
  const [season, setSeason] = useState("S01");

  const [fromEp, setFromEp] = useState(1);
  const [toEp, setToEp] = useState(1);

  const [episodesContent, setEpisodesContent] = useState([]);

  // =========================================================
  // LOADING / ERROR
  // =========================================================
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // =========================================================
  // GET LOGGED USER
  // =========================================================
  useEffect(() => {
    const cookies = document.cookie.split("; ");

    const userCookie = cookies.find((row) =>
      row.startsWith("user=")
    );

    if (!userCookie) {
      router.push("/login");
      return;
    }

    try {
      const raw = userCookie.split("=")[1];
      const decoded = decodeURIComponent(raw);
      const parsed = JSON.parse(decoded);

      setUsername(parsed.username);
      setCleanUsername(cleanString(parsed.username));
    } catch (err) {
      console.error("Cookie parse error:", err);
      router.push("/login");
    }
  }, [router]);

  // =========================================================
  // FETCH USER FOLDERS
  // =========================================================
  useEffect(() => {
    if (!cleanUsername) return;

    const fetchFolders = async () => {
      try {
        const qSnap = await getDocs(collection(db, "folders"));

        const userFolders = [];

        qSnap.forEach((docSnap) => {
          const data = docSnap.data();

          if (cleanString(data.author) === cleanUsername) {
            userFolders.push({
              id: docSnap.id,
              title: data.title,
            });
          }
        });

        setFolders(userFolders);
      } catch (error) {
        console.error(error);
        setErrorMessage(t("❌ Habaye ikibazo mu kuzana folders."));
      }
    };

    fetchFolders();
  }, [cleanUsername, db]);

  // =========================================================
  // IMAGE CHANGE
  // =========================================================
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setImageFile(file);

    const reader = new FileReader();

    reader.onloadend = () => {
      setImageUrl(reader.result);
    };

    reader.readAsDataURL(file);
  };

  // =========================================================
  // CATEGORY CHANGE
  // =========================================================
  const handleCategoryChange = (e) => {
    setCategories(
      Array.from(
        e.target.selectedOptions,
        (option) => option.value
      )
    );
  };

  // =========================================================
  // STORY TYPE CHANGE
  // =========================================================
  const handleStoryTypeChange = (e) => {
    const type = e.target.value;

    setStoryType(type);

    setErrorMessage("");

    // Standalone = inkuru imwe gusa
    if (type === "standalone") {
      setFromEp(1);
      setToEp(1);
      setSeason("S01");
    }

    // Parts = default parts 1
    if (type === "parts") {
      setFromEp(1);
      setToEp(1);
    }

    // Series = default S01 Ep 1
    if (type === "series") {
      setSeason("S01");
      setFromEp(1);
      setToEp(1);
    }
  };

  // =========================================================
  // STEP 1 VALIDATION
  // =========================================================
  const handleStep1 = (e) => {
    e.preventDefault();

    setErrorMessage("");

    // Basic validation
    if (
      !head.trim() ||
      !folder ||
      categories.length === 0 ||
      !imageFile ||
      !summary.trim()
    ) {
      setErrorMessage(t("❌ Wuzuza amakuru yose asabwa."));
      return;
    }

    // =======================================================
    // STANDALONE
    // =======================================================
    if (storyType === "standalone") {
      setFromEp(1);
      setToEp(1);

      setEpisodesContent([""]);

      setStep(2);

      return;
    }

    // =======================================================
    // SERIES / PARTS
    // =======================================================
    if (fromEp < 1 || toEp < 1) {
      setErrorMessage(t("❌ Number igomba kuba hejuru ya 0."));
      return;
    }

    if (fromEp > toEp) {
      setErrorMessage(t("❌ From ntishobora kuruta To."));
      return;
    }

    const total = toEp - fromEp + 1;

    // Irinda gukora episodes/parts nyinshi cyane accidentally
    if (total > 100) {
      setErrorMessage(
        t("❌ Ntushobora gukora Episodes/Parts zirenga 100 icyarimwe.")
      );
      return;
    }

    setEpisodesContent(
      Array.from({ length: total }, () => "")
    );

    setStep(2);
  };

  // =========================================================
  // CONTENT CHANGE
  // =========================================================
  const handleEpisodeChange = (index, value) => {
    const copy = [...episodesContent];

    copy[index] = value;

    setEpisodesContent(copy);
  };

  // =========================================================
  // CLOUDINARY UPLOAD
  // =========================================================
  const uploadToCloudinary = async (file) => {
    if (!file) {
      throw new Error("Nta cover image washyizemo.");
    }

    const fd = new FormData();

    fd.append("file", file);
    fd.append("upload_preset", "Newtalents");

    const res = await fetch(
      "https://api.cloudinary.com/v1_1/dilowy3fd/image/upload",
      {
        method: "POST",
        body: fd,
      }
    );

    if (!res.ok) {
      throw new Error("Cloudinary upload failed.");
    }

    const data = await res.json();

    if (!data.secure_url) {
      throw new Error("Image upload failed.");
    }

    return data.secure_url;
  };

  // =========================================================
  // GET CONTENT TITLE
  // =========================================================
  const getContentTitle = (index) => {
    const number = index + fromEp;

    if (storyType === "standalone") {
      return "Inkuru yose";
    }

    if (storyType === "parts") {
      return `Part ${number}`;
    }

    return `Episode ${number}`;
  };

  // =========================================================
  // STEP 2 SUBMIT
  // =========================================================
  const handleStep2 = async (e) => {
    e.preventDefault();

    setErrorMessage("");

    // Check every editor
    const hasEmptyContent = episodesContent.some(
      (content) => !content || !content.trim()
    );

    if (hasEmptyContent) {
      if (storyType === "standalone") {
        setErrorMessage(t("❌ Andika inkuru yose mbere yo kuyohereza."));
      } else if (storyType === "parts") {
        setErrorMessage(t("❌ Andika Parts zose mbere yo kuyohereza."));
      } else {
        setErrorMessage(t("❌ Andika Episodes zose mbere yo kuyohereza."));
      }

      return;
    }

    setLoading(true);

    try {
      // =====================================================
      // UPLOAD IMAGE
      // =====================================================
      const image = await uploadToCloudinary(imageFile);

      const createdAt = new Date().toISOString();

      // =====================================================
      // CREATE FIRST POST
      // =====================================================
      const firstPostRef = doc(collection(db, "posts"));

      // -----------------------------------------------------
      // TITLE
      // -----------------------------------------------------
      let firstTitle = head;

      if (storyType === "series") {
        firstTitle = `${head} ${season} Ep ${fromEp}`;
      }

      if (storyType === "parts") {
        firstTitle = `${head} - Part ${fromEp}`;
      }

      // =====================================================
      // BASE DATA
      // =====================================================
      const firstPostData = {
        head: firstTitle,

        story: episodesContent[0],

        storyHead: head,

        summary: summary,

        categories,

        folderId: folder,

        imageUrl: image,

        author: username,

        authorClean: cleanUsername,

        createdAt,

        storyType,

        displayType:
          storyType === "standalone"
            ? "single"
            : storyType === "parts"
            ? "parts"
            : "episodes",

        totalParts: episodesContent.length,

        // First document ID
        storyId: firstPostRef.id,
      };

      // =====================================================
      // SERIES DATA
      // =====================================================
      if (storyType === "series") {
        firstPostData.season = season;
        firstPostData.episodeNumber = fromEp;

        firstPostData.fromEpisode = fromEp;
        firstPostData.toEpisode = toEp;

        firstPostData.totalEpisodes =
          toEp - fromEp + 1;
      }

      // =====================================================
      // PARTS DATA
      // =====================================================
      if (storyType === "parts") {
        firstPostData.partNumber = fromEp;

        firstPostData.fromPart = fromEp;
        firstPostData.toPart = toEp;

        firstPostData.totalParts =
          toEp - fromEp + 1;
      }

      // =====================================================
      // STANDALONE DATA
      // =====================================================
      if (storyType === "standalone") {
        firstPostData.isStandalone = true;

        firstPostData.totalParts = 1;
      }

      await setDoc(
        firstPostRef,
        firstPostData
      );

      // =====================================================
      // CREATE SUMMARY DOCUMENT
      // =====================================================
      const summaryRef = doc(
        collection(
          db,
          "posts",
          firstPostRef.id,
          "summaries"
        )
      );

      const summaryData = {
        head,

        summary,

        categories,

        folderId: folder,

        imageUrl: image,

        author: username,

        authorClean: cleanUsername,

        createdAt,

        storyType,

        displayType:
          storyType === "standalone"
            ? "single"
            : storyType === "parts"
            ? "parts"
            : "episodes",

        totalParts: episodesContent.length,

        episodeIds: [],

        firstEpisodeId: firstPostRef.id,
      };

      // Series summary
      if (storyType === "series") {
        summaryData.season = season;

        summaryData.fromEpisode = fromEp;

        summaryData.toEpisode = toEp;

        summaryData.totalEpisodes =
          toEp - fromEp + 1;
      }

      // Parts summary
      if (storyType === "parts") {
        summaryData.fromPart = fromEp;

        summaryData.toPart = toEp;

        summaryData.totalParts =
          toEp - fromEp + 1;
      }

      // Standalone summary
      if (storyType === "standalone") {
        summaryData.isStandalone = true;

        summaryData.totalParts = 1;
      }

      await setDoc(
        summaryRef,
        summaryData
      );

      // =====================================================
      // CREATE OTHER POSTS
      // =====================================================
      const postPromises = [];
      const postIds = [];

      for (
        let i = 1;
        i < episodesContent.length;
        i++
      ) {
        const number = fromEp + i;

        const postRef = doc(
          collection(db, "posts")
        );

        postIds.push(postRef.id);

        // -----------------------------------------------
        // TITLE
        // -----------------------------------------------
        let postTitle = head;

        if (storyType === "series") {
          postTitle = `${head} ${season} Ep ${number}`;
        }

        if (storyType === "parts") {
          postTitle = `${head} - Part ${number}`;
        }

        // -----------------------------------------------
        // POST DATA
        // -----------------------------------------------
        const postData = {
          head: postTitle,

          story: episodesContent[i],

          storyHead: head,

          categories,

          folderId: folder,

          imageUrl: image,

          author: username,

          authorClean: cleanUsername,

          createdAt,

          storyType,

          displayType:
            storyType === "parts"
              ? "parts"
              : "episodes",

          summaryId: firstPostRef.id,

          storyId: firstPostRef.id,
        };

        // Series
        if (storyType === "series") {
          postData.season = season;

          postData.episodeNumber = number;
        }

        // Parts
        if (storyType === "parts") {
          postData.partNumber = number;
        }

        postPromises.push(
          setDoc(postRef, postData)
        );
      }

      // Save all other posts
      await Promise.all(postPromises);

      // =====================================================
      // UPDATE SUMMARY WITH ALL IDS
      // =====================================================
      await setDoc(
        summaryRef,
        {
          ...summaryData,

          episodeIds: postIds,

          firstEpisodeId: firstPostRef.id,
        }
      );

      // =====================================================
      // SUCCESS
      // =====================================================
      alert(t("✅ Inkuru yashyizweho neza."));

      router.push("/dashboard");
    } catch (err) {
      console.error(err);

      setErrorMessage(
        "❌ Error: " +
          (err?.message || "Unknown error")
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // UI
  // =========================================================
  return (
    <>
      <LinkComponent />

      <div className={styles.container}>
        <Folder />

        <h1 className={styles.title}>{t("NetStory Uploader")}</h1>

        <p className={styles.userInfo}>{t("Logged in as")}{" "}
          <strong>{username}</strong>
        </p>

        {errorMessage && (
          <p className={styles.error}>
            {errorMessage}
          </p>
        )}

        {/* =================================================
            STEP 1
        ================================================= */}
        {step === 1 && (
          <form
            onSubmit={handleStep1}
            className={styles.form}
          >
            {/* STORY TITLE */}
            <input
              className={styles.input}
              type="text"
              placeholder={t("Izina ry'inkuru yawe")}
              value={head}
              onChange={(e) =>
                setHead(e.target.value)
              }
              required
            />

            {/* SUMMARY */}
            <textarea
              className={styles.textarea}
              placeholder={t("Andika summary y'inkuru yawe hano")}
              value={summary}
              onChange={(e) =>
                setSummary(e.target.value)
              }
              required
              rows={4}
            />

            {/* =================================================
                STORY TYPE
            ================================================= */}
            <select
              className={styles.select}
              value={storyType}
              onChange={handleStoryTypeChange}
              required
            >
              <option value="series">{t("Series - Seasons & Episodes")}</option>

              <option value="standalone">{t("Standalone - Inkuru imwe")}</option>

              <option value="parts">{t("Parts - Ibice byinshi")}</option>
            </select>

            {/* STORY TYPE DESCRIPTION */}
            <p className={styles.userInfo}>
              {storyType === "series" &&
                t("📚 Series: Inkuru izagira Seasons na Episodes.")}

              {storyType === "standalone" &&
                t("📖 Standalone: Inkuru yose ni igice kimwe gusa.")}

              {storyType === "parts" &&
                t("📑 Parts: Inkuru igizwe n'ibice byinshi, ariko nta Seasons.")}
            </p>

            {/* IMAGE */}
            <input
              className={styles.fileInput}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              required
            />

            {/* IMAGE PREVIEW */}
            {imageUrl && (
              <img
                className={styles.previewImage}
                src={imageUrl}
                alt={t("Preview")}
              />
            )}

            {/* CATEGORIES */}
            <select
              className={styles.select}
              multiple
              onChange={handleCategoryChange}
              required
            >
              {[
                "Action",
                "Drama",
                "Comedy",
                "Love-Story",
                "kingdom",
                "sex🔞story",
                "sci-fi",
                "religion",
                "adventure",
                "Horror",
                "Mystery",
              ].map((category) => (
                <option
                  key={category}
                  value={category}
                >
                  {category}
                </option>
              ))}
            </select>

            {/* FOLDER */}
            <select
              className={styles.select}
              value={folder}
              onChange={(e) =>
                setFolder(e.target.value)
              }
              required
            >
              <option value="">{t("Select Folder")}</option>

              {folders.map((f) => (
                <option
                  key={f.id}
                  value={f.id}
                >
                  {f.title}
                </option>
              ))}
            </select>

            {/* =================================================
                SERIES OPTIONS
            ================================================= */}
            {storyType === "series" && (
              <>
                <select
                  className={styles.select}
                  value={season}
                  onChange={(e) =>
                    setSeason(e.target.value)
                  }
                  required
                >
                  {Array.from(
                    { length: 10 },
                    (_, i) => {
                      const seasonNum =
                        String(i + 1).padStart(
                          2,
                          "0"
                        );

                      return (
                        <option
                          key={i}
                          value={`S${seasonNum}`}
                        >{t("S{seasonNum}", { seasonNum })}</option>
                      );
                    }
                  )}
                </select>

                <input
                  className={styles.input}
                  type="number"
                  min="1"
                  placeholder={t("From episode")}
                  value={fromEp}
                  onChange={(e) =>
                    setFromEp(
                      Number(e.target.value)
                    )
                  }
                  required
                />

                <input
                  className={styles.input}
                  type="number"
                  min="1"
                  placeholder={t("To episode")}
                  value={toEp}
                  onChange={(e) =>
                    setToEp(
                      Number(e.target.value)
                    )
                  }
                  required
                />
              </>
            )}

            {/* =================================================
                PARTS OPTIONS
            ================================================= */}
            {storyType === "parts" && (
              <>
                <input
                  className={styles.input}
                  type="number"
                  min="1"
                  placeholder={t("From Part")}
                  value={fromEp}
                  onChange={(e) =>
                    setFromEp(
                      Number(e.target.value)
                    )
                  }
                  required
                />

                <input
                  className={styles.input}
                  type="number"
                  min="1"
                  placeholder={t("To Part")}
                  value={toEp}
                  onChange={(e) =>
                    setToEp(
                      Number(e.target.value)
                    )
                  }
                  required
                />
              </>
            )}

            {/* =================================================
                STANDALONE INFO
            ================================================= */}
            {storyType === "standalone" && (
              <div className={styles.episodeBox}>
                <h3
                  className={styles.episodeTitle}
                >{t("📖 Inkuru imwe ndende")}</h3>

                <p className={styles.userInfo}>{t("Iyi nkuru ntizagira Season cyangwa Episode. Uzayandika yose ku rupapuro rukurikira.")}</p>
              </div>
            )}

            {/* NEXT */}
            <button
              type="submit"
              className={styles.button}
            >{t("Next")}</button>
          </form>
        )}

        {/* =================================================
            STEP 2
        ================================================= */}
        {step === 2 && (
          <form
            onSubmit={handleStep2}
            className={styles.form}
          >
            {/* =================================================
                EDITORS
            ================================================= */}
            {episodesContent.map(
              (content, index) => (
                <div
                  key={index}
                  className={
                    styles.episodeBox
                  }
                >
                  <h3
                    className={
                      styles.episodeTitle
                    }
                  >
                    {getContentTitle(index)}
                  </h3>

                   <div
                  className={styles.editor}
                  contentEditable
                  onInput={(e) =>
                    handleEpisodeChange(i, e.currentTarget.innerHTML)
                  }
                />
              </div>
              )
            )}

            {/* =================================================
                BACK BUTTON
            ================================================= */}
            <button
              type="button"
              className={styles.button}
              onClick={() => {
                if (!loading) {
                  setStep(1);
                }
              }}
              disabled={loading}
            >{t("Back")}</button>

            {/* =================================================
                SUBMIT
            ================================================= */}
            <button
              type="submit"
              className={styles.button}
              disabled={loading}
            >
              {loading
                ? t("Uploading...")
                : storyType === "standalone"
                ? t("Publish Story")
                : storyType === "parts"
                ? t("Publish Parts")
                : t("Publish Series")}
            </button>
          </form>
        )}
      </div>
    </>
  );
}
