"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import {
  getFirestore,
  collection,
  doc,
  getDocs,
  writeBatch,
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
  const [storyType, setStoryType] =
    useState("series");

  // =========================================================
  // SERIES / PARTS
  // =========================================================
  const [season, setSeason] =
    useState("S01");

  const [fromEp, setFromEp] =
    useState(1);

  const [toEp, setToEp] =
    useState(1);

  // =========================================================
  // CONTENT
  // =========================================================
  const [episodesContent, setEpisodesContent] =
    useState([]);

  // =========================================================
  // EDITOR REFS
  //
  // IMPORTANT:
  // We do NOT use dangerouslySetInnerHTML on
  // every render because that makes the cursor
  // jump while typing.
  // =========================================================
  const editorRefs = useRef([]);

  // =========================================================
  // LOADING / ERROR
  // =========================================================
  const [loading, setLoading] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  // =========================================================
  // GET LOGGED USER
  // =========================================================
  useEffect(() => {
    const cookies =
      document.cookie.split("; ");

    const userCookie = cookies.find(
      (row) => row.startsWith("user=")
    );

    if (!userCookie) {
      router.push("/login");
      return;
    }

    try {
      const raw = userCookie.substring(
        "user=".length
      );

      const decoded =
        decodeURIComponent(raw);

      const parsed =
        JSON.parse(decoded);

      if (!parsed?.username) {
        throw new Error(
          "Username ntabwo yabonetse."
        );
      }

      setUsername(
        parsed.username
      );

      setCleanUsername(
        cleanString(
          parsed.username
        )
      );
    } catch (error) {
      console.error(
        "Cookie parse error:",
        error
      );

      router.push("/login");
    }
  }, [router]);

  // =========================================================
  // FETCH USER FOLDERS
  // =========================================================
  useEffect(() => {
    if (!cleanUsername) return;

    let cancelled = false;

    const fetchFolders =
      async () => {
        try {
          const snapshot =
            await getDocs(
              collection(
                db,
                "folders"
              )
            );

          const userFolders = [];

          snapshot.forEach(
            (docSnap) => {
              const data =
                docSnap.data();

              if (
                cleanString(
                  data.author
                ) ===
                cleanUsername
              ) {
                userFolders.push({
                  id: docSnap.id,
                  title:
                    data.title ||
                    "Untitled Folder",
                });
              }
            }
          );

          if (!cancelled) {
            setFolders(
              userFolders
            );
          }
        } catch (error) {
          console.error(
            "Folder error:",
            error
          );

          if (!cancelled) {
            setErrorMessage(
              t("❌ Habaye ikibazo mu kuzana folders.")
            );
          }
        }
      };

    fetchFolders();

    return () => {
      cancelled = true;
    };
  }, [cleanUsername, db]);

  // =========================================================
  // IMAGE CHANGE
  // =========================================================
  const handleImageChange = (
    e
  ) => {
    const file =
      e.target.files?.[0];

    if (!file) return;

    if (
      !file.type.startsWith(
        "image/"
      )
    ) {
      setErrorMessage(
        t("❌ Hitamo image file gusa.")
      );

      return;
    }

    setErrorMessage("");

    setImageFile(file);

    const reader =
      new FileReader();

    reader.onloadend = () => {
      setImageUrl(
        reader.result
      );
    };

    reader.readAsDataURL(
      file
    );
  };

  // =========================================================
  // CATEGORY CHANGE
  // =========================================================
  const handleCategoryChange = (
    e
  ) => {
    const selected =
      Array.from(
        e.target.selectedOptions,
        (option) =>
          option.value
      );

    setCategories(
      selected
    );
  };

  // =========================================================
  // STORY TYPE CHANGE
  // =========================================================
  const handleStoryTypeChange =
    (e) => {
      const type =
        e.target.value;

      setStoryType(type);

      setErrorMessage("");

      // Clear old editors because
      // the number/type may have changed.
      setEpisodesContent([]);

      editorRefs.current = [];

      if (
        type === "standalone"
      ) {
        setFromEp(1);
        setToEp(1);
        setSeason("S01");
        return;
      }

      if (type === "parts") {
        setFromEp(1);
        setToEp(1);
        return;
      }

      if (type === "series") {
        setSeason("S01");
        setFromEp(1);
        setToEp(1);
      }
    };

  // =========================================================
  // CREATE EMPTY CONTENT
  // =========================================================
  const createEmptyContent = (
    total
  ) => {
    return Array.from(
      { length: total },
      () => ""
    );
  };

  // =========================================================
  // STEP 1
  // =========================================================
  const handleStep1 = (
    e
  ) => {
    e.preventDefault();

    setErrorMessage("");

    // -------------------------------------------------------
    // BASIC VALIDATION
    // -------------------------------------------------------
    if (!head.trim()) {
      setErrorMessage(
        t("❌ Andika izina ry'inkuru.")
      );
      return;
    }

    if (!summary.trim()) {
      setErrorMessage(
        t("❌ Andika summary y'inkuru.")
      );
      return;
    }

    if (!folder) {
      setErrorMessage(
        t("❌ Hitamo folder.")
      );
      return;
    }

    if (
      categories.length ===
      0
    ) {
      setErrorMessage(
        t("❌ Hitamo category nibura imwe.")
      );
      return;
    }

    if (!imageFile) {
      setErrorMessage(
        t("❌ Shyiramo cover image.")
      );
      return;
    }

    // -------------------------------------------------------
    // STANDALONE
    // -------------------------------------------------------
    if (
      storyType ===
      "standalone"
    ) {
      setFromEp(1);
      setToEp(1);

      setEpisodesContent([
        "",
      ]);

      editorRefs.current = [];

      setStep(2);

      return;
    }

    // -------------------------------------------------------
    // SERIES / PARTS
    // -------------------------------------------------------
    const start =
      Number(fromEp);

    const end =
      Number(toEp);

    if (
      !Number.isInteger(
        start
      ) ||
      !Number.isInteger(
        end
      ) ||
      start < 1 ||
      end < 1
    ) {
      setErrorMessage(
        t("❌ Number igomba kuba integer kandi iri hejuru ya 0.")
      );
      return;
    }

    if (start > end) {
      setErrorMessage(
        t("❌ From ntishobora kuruta To.")
      );
      return;
    }

    const total =
      end - start + 1;

    if (total > 100) {
      setErrorMessage(
        t("❌ Ntushobora gukora Episodes/Parts zirenga 100 icyarimwe.")
      );
      return;
    }

    setFromEp(start);
    setToEp(end);

    setEpisodesContent(
      createEmptyContent(
        total
      )
    );

    editorRefs.current = [];

    setStep(2);
  };

  // =========================================================
  // CONTENT CHANGE
  // =========================================================
  const handleEpisodeChange = (
    index,
    value
  ) => {
    setEpisodesContent(
      (previous) => {
        const copy = [
          ...previous,
        ];

        copy[index] = value;

        return copy;
      }
    );
  };

  // =========================================================
  // INITIALIZE EDITOR CONTENT
  //
  // This runs only when entering Step 2 or
  // when the number of editors changes.
  //
  // It does NOT rewrite the editor after
  // every keystroke.
  // =========================================================
  useEffect(() => {
    if (step !== 2) {
      return;
    }

    const timer =
      setTimeout(() => {
        episodesContent.forEach(
          (
            content,
            index
          ) => {
            const editor =
              editorRefs.current[
                index
              ];

            if (!editor) {
              return;
            }

            const current =
              editor.innerHTML;

            if (
              !current &&
              content
            ) {
              editor.innerHTML =
                content;
            }
          }
        );
      }, 0);

    return () => {
      clearTimeout(timer);
    };
  }, [
    step,
    episodesContent.length,
  ]);

  // =========================================================
  // CLOUDINARY UPLOAD
  // =========================================================
  const uploadToCloudinary =
    async (file) => {
      if (!file) {
        throw new Error(
          "Nta cover image washyizemo."
        );
      }

      const fd =
        new FormData();

      fd.append(
        "file",
        file
      );

      fd.append(
        "upload_preset",
        "Newtalents"
      );

      const response =
        await fetch(
          "https://api.cloudinary.com/v1_1/dilowy3fd/image/upload",
          {
            method: "POST",
            body: fd,
          }
        );

      if (
        !response.ok
      ) {
        let message =
          "Cloudinary upload failed.";

        try {
          const data =
            await response.json();

          if (
            data?.error
              ?.message
          ) {
            message =
              data.error.message;
          }
        } catch {
          // Ignore JSON parsing errors
        }

        throw new Error(
          message
        );
      }

      const data =
        await response.json();

      if (
        !data?.secure_url
      ) {
        throw new Error(
          "Image upload failed."
        );
      }

      return data.secure_url;
    };

  // =========================================================
  // CONTENT TITLE
  // =========================================================
  const getContentTitle = (
    index
  ) => {
    const number =
      Number(fromEp) +
      index;

    if (
      storyType ===
      "standalone"
    ) {
      return "Inkuru yose";
    }

    if (
      storyType === "parts"
    ) {
      return `Part ${number}`;
    }

    return `Episode ${number}`;
  };

  // =========================================================
  // POST TITLE
  // =========================================================
  const getPostTitle = (
    number
  ) => {
    if (
      storyType ===
      "standalone"
    ) {
      return head.trim();
    }

    if (
      storyType === "parts"
    ) {
      return `${head.trim()} - Part ${number}`;
    }

    return `${head.trim()} ${season} Ep ${number}`;
  };

  // =========================================================
  // GET PLAIN TEXT
  //
  // Used only for validation.
  // =========================================================
  const getPlainText =
    (html) => {
      if (!html) {
        return "";
      }

      if (
        !html.includes("<")
      ) {
        return html
          .replace(
            /\u00a0/g,
            " "
          )
          .trim();
      }

      const temp =
        document.createElement(
          "div"
        );

      temp.innerHTML =
        html;

      return (
        temp.textContent ||
        temp.innerText ||
        ""
      )
        .replace(
          /\u00a0/g,
          " "
        )
        .trim();
    };

  // =========================================================
  // VALIDATE CONTENT
  // =========================================================
  const validateContent =
    () => {
      if (
        episodesContent.length ===
        0
      ) {
        return {
          valid: false,
          message:
            "❌ Nta content yabonetse.",
        };
      }

      for (
        let index = 0;
        index <
        episodesContent.length;
        index++
      ) {
        const content =
          episodesContent[
            index
          ];

        const plainText =
          getPlainText(
            content
          );

        if (
          !plainText
        ) {
          return {
            valid: false,
            message: `❌ ${getContentTitle(
              index
            )} ntabwo irandikwa. Banza uyuzuze.`,
          };
        }
      }

      return {
        valid: true,
        message: "",
      };
    };

  // =========================================================
  // STEP 2 SUBMIT
  // =========================================================
  const handleStep2 =
    async (e) => {
      e.preventDefault();

      if (loading) {
        return;
      }

      setErrorMessage("");

      // -------------------------------------------------------
      // IMPORTANT:
      // Before validating, read the CURRENT DOM content.
      //
      // This makes sure the last thing typed is already
      // included even before React finishes rendering.
      // -------------------------------------------------------
      const currentEditors =
        episodesContent.map(
          (
            content,
            index
          ) => {
            const editor =
              editorRefs.current[
                index
              ];

            if (
              editor
            ) {
              return editor.innerHTML;
            }

            return content;
          }
        );

      setEpisodesContent(
        currentEditors
      );

      // -------------------------------------------------------
      // VALIDATE DIRECTLY FROM CURRENT EDITORS
      // -------------------------------------------------------
      if (
        currentEditors.length ===
        0
      ) {
        setErrorMessage(
          t("❌ Nta content yabonetse.")
        );
        return;
      }

      for (
        let index = 0;
        index <
        currentEditors.length;
        index++
      ) {
        const plainText =
          getPlainText(
            currentEditors[
              index
            ]
          );

        if (
          !plainText
        ) {
          setErrorMessage(
            t("❌ {ContentTitle} ntabwo irandikwa. Banza uyuzuze.", { ContentTitle: getContentTitle(
              index
            ) })
          );

          return;
        }
      }

      if (
        !username ||
        !cleanUsername
      ) {
        setErrorMessage(
          t("❌ User ntabwo yabonetse. Ongera winjire.")
        );
        return;
      }

      if (!folder) {
        setErrorMessage(
          t("❌ Folder ntabwo yatoranyijwe.")
        );
        setStep(1);
        return;
      }

      if (
        categories.length ===
        0
      ) {
        setErrorMessage(
          t("❌ Category ntabwo yatoranyijwe.")
        );
        setStep(1);
        return;
      }

      if (!imageFile) {
        setErrorMessage(
          t("❌ Cover image irakenewe.")
        );
        setStep(1);
        return;
      }

      setLoading(true);

      try {
        // =====================================================
        // UPLOAD IMAGE
        // =====================================================
        const image =
          await uploadToCloudinary(
            imageFile
          );

        const createdAt =
          new Date().toISOString();

        const total =
          currentEditors.length;

        // =====================================================
        // CREATE FIRST POST REF
        // =====================================================
        const firstPostRef =
          doc(
            collection(
              db,
              "posts"
            )
          );

        // =====================================================
        // CREATE SUMMARY REF
        // =====================================================
        const summaryRef =
          doc(
            collection(
              db,
              "posts",
              firstPostRef.id,
              "summaries"
            )
          );

        // =====================================================
        // CREATE ALL POST REFS
        // =====================================================
        const postRefs = [
          firstPostRef,
        ];

        for (
          let i = 1;
          i < total;
          i++
        ) {
          postRefs.push(
            doc(
              collection(
                db,
                "posts"
              )
            )
          );
        }

        // =====================================================
        // ALL IDS
        // =====================================================
        const allPostIds =
          postRefs.map(
            (ref) => ref.id
          );

        // =====================================================
        // FIRST POST DATA
        // =====================================================
        const firstNumber =
          Number(fromEp);

        const firstPostData =
          {
            head:
              getPostTitle(
                firstNumber
              ),

            story:
              currentEditors[0],

            storyHead:
              head.trim(),

            summary:
              summary.trim(),

            categories,

            folderId:
              folder,

            imageUrl:
              image,

            author:
              username,

            authorClean:
              cleanUsername,

            createdAt,

            storyType,

            displayType:
              storyType ===
              "standalone"
                ? "single"
                : storyType ===
                  "parts"
                ? "parts"
                : "episodes",

            totalParts:
              total,

            storyId:
              firstPostRef.id,
          };

        // =====================================================
        // SERIES DATA
        // =====================================================
        if (
          storyType ===
          "series"
        ) {
          firstPostData.season =
            season;

          firstPostData.episodeNumber =
            firstNumber;

          firstPostData.fromEpisode =
            Number(fromEp);

          firstPostData.toEpisode =
            Number(toEp);

          firstPostData.totalEpisodes =
            total;
        }

        // =====================================================
        // PARTS DATA
        // =====================================================
        if (
          storyType ===
          "parts"
        ) {
          firstPostData.partNumber =
            firstNumber;

          firstPostData.fromPart =
            Number(fromEp);

          firstPostData.toPart =
            Number(toEp);

          firstPostData.totalParts =
            total;
        }

        // =====================================================
        // STANDALONE DATA
        // =====================================================
        if (
          storyType ===
          "standalone"
        ) {
          firstPostData.isStandalone =
            true;

          firstPostData.totalParts =
            1;
        }

        // =====================================================
        // SUMMARY DATA
        // =====================================================
        const summaryData =
          {
            head:
              head.trim(),

            summary:
              summary.trim(),

            categories,

            folderId:
              folder,

            imageUrl:
              image,

            author:
              username,

            authorClean:
              cleanUsername,

            createdAt,

            storyType,

            displayType:
              storyType ===
              "standalone"
                ? "single"
                : storyType ===
                  "parts"
                ? "parts"
                : "episodes",

            totalParts:
              total,

            episodeIds:
              allPostIds,

            firstEpisodeId:
              firstPostRef.id,
          };

        // =====================================================
        // SERIES SUMMARY
        // =====================================================
        if (
          storyType ===
          "series"
        ) {
          summaryData.season =
            season;

          summaryData.fromEpisode =
            Number(fromEp);

          summaryData.toEpisode =
            Number(toEp);

          summaryData.totalEpisodes =
            total;
        }

        // =====================================================
        // PARTS SUMMARY
        // =====================================================
        if (
          storyType ===
          "parts"
        ) {
          summaryData.fromPart =
            Number(fromEp);

          summaryData.toPart =
            Number(toEp);

          summaryData.totalParts =
            total;
        }

        // =====================================================
        // STANDALONE SUMMARY
        // =====================================================
        if (
          storyType ===
          "standalone"
        ) {
          summaryData.isStandalone =
            true;

          summaryData.totalParts =
            1;
        }

        // =====================================================
        // FIRESTORE BATCH
        // =====================================================
        const batch =
          writeBatch(db);

        // -----------------------------------------------------
        // FIRST POST
        // -----------------------------------------------------
        batch.set(
          firstPostRef,
          firstPostData
        );

        // -----------------------------------------------------
        // SUMMARY
        // -----------------------------------------------------
        batch.set(
          summaryRef,
          summaryData
        );

        // =====================================================
        // OTHER POSTS
        // =====================================================
        for (
          let i = 1;
          i < total;
          i++
        ) {
          const number =
            Number(fromEp) +
            i;

          const postRef =
            postRefs[i];

          const postData =
            {
              head:
                getPostTitle(
                  number
                ),

              story:
                currentEditors[
                  i
                ],

              storyHead:
                head.trim(),

              summary:
                summary.trim(),

              categories,

              folderId:
                folder,

              imageUrl:
                image,

              author:
                username,

              authorClean:
                cleanUsername,

              createdAt,

              storyType,

              displayType:
                storyType ===
                "parts"
                  ? "parts"
                  : "episodes",

              summaryId:
                firstPostRef.id,

              storyId:
                firstPostRef.id,

              totalParts:
                total,
            };

          // ---------------------------------------------------
          // SERIES
          // ---------------------------------------------------
          if (
            storyType ===
            "series"
          ) {
            postData.season =
              season;

            postData.episodeNumber =
              number;

            postData.fromEpisode =
              Number(fromEp);

            postData.toEpisode =
              Number(toEp);

            postData.totalEpisodes =
              total;
          }

          // ---------------------------------------------------
          // PARTS
          // ---------------------------------------------------
          if (
            storyType ===
            "parts"
          ) {
            postData.partNumber =
              number;

            postData.fromPart =
              Number(fromEp);

            postData.toPart =
              Number(toEp);

            postData.totalParts =
              total;
          }

          // ---------------------------------------------------
          // STANDALONE
          // ---------------------------------------------------
          if (
            storyType ===
            "standalone"
          ) {
            postData.isStandalone =
              true;

            postData.totalParts =
              1;
          }

          batch.set(
            postRef,
            postData
          );
        }

        // =====================================================
        // COMMIT
        // =====================================================
        await batch.commit();

        // =====================================================
        // SUCCESS
        // =====================================================
        if (
          storyType ===
          "standalone"
        ) {
          alert(
            t("✅ Inkuru yashyizweho neza.")
          );
        } else if (
          storyType === "parts"
        ) {
          alert(
            t("✅ Parts {total} zashyizweho neza.", { total })
          );
        } else {
          alert(
            t("✅ Episodes {total} zashyizweho neza.", { total })
          );
        }

        router.push(
          "/dashboard"
        );
      } catch (error) {
        console.error(
          "CREATE STORY ERROR:",
          error
        );

        setErrorMessage(
          "❌ Error: " +
            (error?.message ||
              "Unknown error")
        );
      } finally {
        setLoading(false);
      }
    };

  // =========================================================
  // BACK
  // =========================================================
  const handleBack = () => {
    if (loading) {
      return;
    }

    setErrorMessage("");

    setStep(1);
  };

  // =========================================================
  // UI
  // =========================================================
  return (
    <>
      <LinkComponent />

      <div
        className={
          styles.container
        }
      >
        <Folder />

        <h1
          className={
            styles.title
          }
        >{t("NetStory Uploader")}</h1>

        <p
          className={
            styles.userInfo
          }
        >{t("Logged in as")}{" "}
          <strong>
            {username}
          </strong>
        </p>

        {/* =====================================================
            ERROR
        ===================================================== */}
        {errorMessage && (
          <p
            className={
              styles.error
            }
          >
            {errorMessage}
          </p>
        )}

        {/* =====================================================
            STEP 1
        ===================================================== */}
        {step === 1 && (
          <form
            onSubmit={
              handleStep1
            }
            className={
              styles.form
            }
          >
            {/* =================================================
                TITLE
            ================================================= */}
            <input
              className={
                styles.input
              }
              type="text"
              placeholder={t("Izina ry'inkuru yawe")}
              value={head}
              onChange={(e) =>
                setHead(
                  e.target.value
                )
              }
              required
            />

            {/* =================================================
                SUMMARY
            ================================================= */}
            <textarea
              className={
                styles.textarea
              }
              placeholder={t("Andika summary y'inkuru yawe hano")}
              value={summary}
              onChange={(e) =>
                setSummary(
                  e.target.value
                )
              }
              rows={4}
              required
            />

            {/* =================================================
                STORY TYPE
            ================================================= */}
            <select
              className={
                styles.select
              }
              value={
                storyType
              }
              onChange={
                handleStoryTypeChange
              }
              required
            >
              <option value="series">{t("Series - Seasons & Episodes")}</option>

              <option value="standalone">{t("Standalone - Inkuru imwe")}</option>

              <option value="parts">{t("Parts - Ibice byinshi")}</option>
            </select>

            {/* =================================================
                DESCRIPTION
            ================================================= */}
            <p
              className={
                styles.userInfo
              }
            >
              {storyType ===
                "series" &&
                t("📚 Series: Inkuru izagira Seasons na Episodes.")}

              {storyType ===
                "standalone" &&
                t("📖 Standalone: Inkuru yose ni igice kimwe gusa.")}

              {storyType ===
                "parts" &&
                t("📑 Parts: Inkuru igizwe n'ibice byinshi, ariko nta Seasons.")}
            </p>

            {/* =================================================
                IMAGE
            ================================================= */}
            <input
              className={
                styles.fileInput
              }
              type="file"
              accept="image/*"
              onChange={
                handleImageChange
              }
              required
            />

            {/* =================================================
                IMAGE PREVIEW
            ================================================= */}
            {imageUrl && (
              <img
                className={
                  styles.previewImage
                }
                src={imageUrl}
                alt={t("Preview")}
              />
            )}

            {/* =================================================
                CATEGORIES
            ================================================= */}
            <select
              className={
                styles.select
              }
              multiple
              value={
                categories
              }
              onChange={
                handleCategoryChange
              }
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
                "family",
                "religion",
                "adventure",
                "Horror",
                "Mystery",
              ].map(
                (category) => (
                  <option
                    key={
                      category
                    }
                    value={
                      category
                    }
                  >
                    {category}
                  </option>
                )
              )}
            </select>

            {/* =================================================
                FOLDER
            ================================================= */}
            <select
              className={
                styles.select
              }
              value={folder}
              onChange={(e) =>
                setFolder(
                  e.target.value
                )
              }
              required
            >
              <option value="">{t("Select Folder")}</option>

              {folders.map(
                (f) => (
                  <option
                    key={f.id}
                    value={f.id}
                  >
                    {f.title}
                  </option>
                )
              )}
            </select>

            {/* =================================================
                SERIES OPTIONS
            ================================================= */}
            {storyType ===
              "series" && (
              <>
                <select
                  className={
                    styles.select
                  }
                  value={
                    season
                  }
                  onChange={(e) =>
                    setSeason(
                      e.target.value
                    )
                  }
                  required
                >
                  {Array.from(
                    {
                      length: 10,
                    },
                    (_, i) => {
                      const seasonNumber =
                        String(
                          i + 1
                        ).padStart(
                          2,
                          "0"
                        );

                      return (
                        <option
                          key={i}
                          value={`S${seasonNumber}`}
                        >{t("S{seasonNumber}", { seasonNumber })}</option>
                      );
                    }
                  )}
                </select>

                <input
                  className={
                    styles.input
                  }
                  type="number"
                  min="1"
                  placeholder={t("From episode")}
                  value={
                    fromEp
                  }
                  onChange={(e) =>
                    setFromEp(
                      Number(
                        e.target.value
                      )
                    )
                  }
                  required
                />

                <input
                  className={
                    styles.input
                  }
                  type="number"
                  min="1"
                  placeholder={t("To episode")}
                  value={
                    toEp
                  }
                  onChange={(e) =>
                    setToEp(
                      Number(
                        e.target.value
                      )
                    )
                  }
                  required
                />
              </>
            )}

            {/* =================================================
                PARTS OPTIONS
            ================================================= */}
            {storyType ===
              "parts" && (
              <>
                <input
                  className={
                    styles.input
                  }
                  type="number"
                  min="1"
                  placeholder={t("From Part")}
                  value={
                    fromEp
                  }
                  onChange={(e) =>
                    setFromEp(
                      Number(
                        e.target.value
                      )
                    )
                  }
                  required
                />

                <input
                  className={
                    styles.input
                  }
                  type="number"
                  min="1"
                  placeholder={t("To Part")}
                  value={
                    toEp
                  }
                  onChange={(e) =>
                    setToEp(
                      Number(
                        e.target.value
                      )
                    )
                  }
                  required
                />
              </>
            )}

            {/* =================================================
                STANDALONE
            ================================================= */}
            {storyType ===
              "standalone" && (
              <div
                className={
                  styles.episodeBox
                }
              >
                <h3
                  className={
                    styles.episodeTitle
                  }
                >{t("📖 Inkuru imwe ndende")}</h3>

                <p
                  className={
                    styles.userInfo
                  }
                >{t("Iyi nkuru ntizagira Season cyangwa Episode. Uzayandika yose ku rupapuro rukurikira.")}</p>
              </div>
            )}

            {/* =================================================
                NEXT
            ================================================= */}
            <button
              type="submit"
              className={
                styles.button
              }
            >{t("Next")}</button>
          </form>
        )}

        {/* =====================================================
            STEP 2
        ===================================================== */}
        {step === 2 && (
          <form
            onSubmit={
              handleStep2
            }
            className={
              styles.form
            }
          >
            {/* =================================================
                EDITORS
            ================================================= */}
            {episodesContent.map(
              (
                content,
                index
              ) => (
                <div
                  key={`${storyType}-${index}`}
                  className={
                    styles.episodeBox
                  }
                >
                  <h3
                    className={
                      styles.episodeTitle
                    }
                  >
                    {getContentTitle(
                      index
                    )}
                  </h3>

                  <div
                    ref={(element) => {
                      editorRefs.current[
                        index
                      ] =
                        element;
                    }}
                    className={
                      styles.editor
                    }
                    contentEditable={
                      !loading
                    }
                    suppressContentEditableWarning={
                      true
                    }
                    onInput={(
                      e
                    ) => {
                      handleEpisodeChange(
                        index,
                        e
                          .currentTarget
                          .innerHTML
                      );
                    }}
                  />
                </div>
              )
            )}

            {/* =================================================
                BACK
            ================================================= */}
            <button
              type="button"
              className={
                styles.button
              }
              onClick={
                handleBack
              }
              disabled={
                loading
              }
            >{t("Back")}</button>

            {/* =================================================
                PUBLISH
            ================================================= */}
            <button
              type="submit"
              className={
                styles.button
              }
              disabled={
                loading ||
                episodesContent.length ===
                  0
              }
            >
              {loading
                ? t("Uploading...")
                : storyType ===
                  "standalone"
                ? t("Publish Story")
                : storyType ===
                  "parts"
                ? t("Publish Parts")
                : t("Publish Series")}
            </button>
          </form>
        )}
      </div>
    </>
  );
}
