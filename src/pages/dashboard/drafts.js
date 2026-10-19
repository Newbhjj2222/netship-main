'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Head from "next/head";

import {
  FaFolder,
  FaFolderOpen,
  FaFileAlt,
  FaPlus,
  FaSyncAlt,
  FaArrowLeft,
  FaSave,
  FaCheck,
  FaTimes,
  FaTrash,
  FaImage,
  FaBold,
  FaItalic,
  FaUnderline,
  FaStrikethrough,
  FaAlignLeft,
  FaAlignCenter,
  FaAlignRight,
  FaListUl,
  FaListOl,
  FaQuoteLeft,
  FaUndo,
  FaRedo,
  FaPalette,
  FaHeading,
  FaFileCode,
  FaCloudUploadAlt,
  FaSpinner,
} from "react-icons/fa";

import styles from "@/styles/offlineEditor.module.css";
import { useI18n } from "@/i18n/I18nProvider";

/* =========================================================
   CONSTANTS
========================================================= */

const DB_NAME = "NewTalentsOfflineWriter";
const DB_VERSION = 1;
const STORE_NAME = "handles";
const ROOT_HANDLE_KEY = "rootDirectory";

const AUTO_SAVE_DELAY = 800;

/* =========================================================
   BROWSER SUPPORT
========================================================= */

const supportsFileSystemAccess = () => {
  return (
    typeof window !== "undefined" &&
    typeof window.showDirectoryPicker === "function"
  );
};

/* =========================================================
   INDEXED DB
========================================================= */

const openDatabase = () => {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(
        new Error(
          "Browser environment required."
        )
      );
      return;
    }

    if (!("indexedDB" in window)) {
      reject(
        new Error(
          "IndexedDB is not supported."
        )
      );
      return;
    }

    const request = indexedDB.open(
      DB_NAME,
      DB_VERSION
    );

    request.onupgradeneeded = () => {
      const db = request.result;

      if (
        !db.objectStoreNames.contains(
          STORE_NAME
        )
      ) {
        db.createObjectStore(
          STORE_NAME
        );
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(
        request.error ||
          new Error(
            "Could not open IndexedDB."
          )
      );
    };
  });
};

const saveHandleToDB = async (
  key,
  handle
) => {
  const db = await openDatabase();

  return new Promise(
    (resolve, reject) => {
      const transaction =
        db.transaction(
          STORE_NAME,
          "readwrite"
        );

      const store =
        transaction.objectStore(
          STORE_NAME
        );

      store.put(handle, key);

      transaction.oncomplete = () => {
        db.close();
        resolve();
      };

      transaction.onerror = () => {
        db.close();

        reject(
          transaction.error ||
            new Error(
              "Could not save directory handle."
            )
        );
      };
    }
  );
};

const getHandleFromDB = async (
  key
) => {
  const db = await openDatabase();

  return new Promise(
    (resolve, reject) => {
      const transaction =
        db.transaction(
          STORE_NAME,
          "readonly"
        );

      const request =
        transaction
          .objectStore(STORE_NAME)
          .get(key);

      request.onsuccess = () => {
        db.close();

        resolve(
          request.result || null
        );
      };

      request.onerror = () => {
        db.close();

        reject(
          request.error ||
            new Error(
              "Could not read directory handle."
            )
        );
      };
    }
  );
};

/* =========================================================
   PERMISSION
========================================================= */

const verifyPermission = async (
  handle,
  requestPermission = false
) => {
  if (!handle) {
    return false;
  }

  if (
    typeof handle.queryPermission !==
    "function"
  ) {
    return true;
  }

  const options = {
    mode: "readwrite",
  };

  let permission =
    await handle.queryPermission(
      options
    );

  if (permission === "granted") {
    return true;
  }

  if (
    requestPermission &&
    typeof handle.requestPermission ===
      "function"
  ) {
    permission =
      await handle.requestPermission(
        options
      );

    return permission === "granted";
  }

  return false;
};

/* =========================================================
   NAME HELPERS
========================================================= */

const cleanFileName = (name) => {
  return String(name || "")
    .trim()
    .replace(
      /[<>:"/\\|?*\x00-\x1F]/g,
      ""
    )
    .replace(/\s+/g, " ")
    .replace(/\.+$/g, "")
    .slice(0, 120);
};

const removeExtension = (name) => {
  return String(name || "").replace(
    /\.(txt|html)$/i,
    ""
  );
};

/* =========================================================
   TEXT HELPERS
========================================================= */

const htmlToPlainText = (
  html = ""
) => {
  if (
    typeof document ===
    "undefined"
  ) {
    return "";
  }

  const container =
    document.createElement("div");

  container.innerHTML = html;

  return (
    container.innerText ||
    container.textContent ||
    ""
  )
    .replace(/\u00a0/g, " ")
    .trim();
};

const countWords = (
  text = ""
) => {
  const clean = String(text)
    .trim()
    .replace(/\s+/g, " ");

  return clean
    ? clean.split(" ").length
    : 0;
};

const countCharacters = (
  text = ""
) => {
  return Array.from(
    text || ""
  ).length;
};

/* =========================================================
   IMAGE FILE
========================================================= */

const readCoverImage = async (
  directory
) => {
  if (!directory) {
    return null;
  }

  const possibleNames = [
    "cover.jpg",
    "cover.jpeg",
    "cover.png",
    "cover.webp",
  ];

  for (const name of possibleNames) {
    try {
      const fileHandle =
        await directory.getFileHandle(
          name
        );

      const file =
        await fileHandle.getFile();

      return URL.createObjectURL(
        file
      );
    } catch {
      // Try next image.
    }
  }

  return null;
};

/* =========================================================
   READ DIRECTORY
========================================================= */

const readDirectory = async (
  directory
) => {
  const folders = [];
  const files = [];

  if (!directory) {
    return {
      folders,
      files,
    };
  }

  for await (const [
    name,
    handle,
  ] of directory.entries()) {
    if (
      handle.kind ===
      "directory"
    ) {
      folders.push({
        name,
        handle,
      });
    } else {
      if (
        name
          .toLowerCase()
          .endsWith(".txt")
      ) {
        files.push({
          name,
          handle,
        });
      }
    }
  }

  const sortFn = (a, b) =>
    a.name.localeCompare(
      b.name
    );

  folders.sort(sortFn);
  files.sort(sortFn);

  return {
    folders,
    files,
  };
};

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function OfflineWriter() {
  const { t } = useI18n();

  /* =======================================================
     REFS
  ======================================================= */

  const editorRef = useRef(null);

  const savedRangeRef =
    useRef(null);

  const autoSaveTimer =
    useRef(null);

  const objectUrlsRef =
    useRef([]);

  const isMountedRef =
    useRef(true);

  /* =======================================================
     STATE
  ======================================================= */

  const [rootHandle, setRootHandle] =
    useState(null);

  const [rootName, setRootName] =
    useState("");

  const [
    rootPermission,
    setRootPermission,
  ] = useState(false);

  const [folders, setFolders] =
    useState([]);

  const [rootFiles, setRootFiles] =
    useState([]);

  const [
    selectedFolder,
    setSelectedFolder,
  ] = useState(null);

  const [
    folderFiles,
    setFolderFiles,
  ] = useState([]);

  const [
    selectedFile,
    setSelectedFile,
  ] = useState(null);

  const [
    coverImages,
    setCoverImages,
  ] = useState({});

  const [
    showFolderModal,
    setShowFolderModal,
  ] = useState(false);

  const [
    showTextModal,
    setShowTextModal,
  ] = useState(false);

  const [folderName, setFolderName] =
    useState("");

  const [textName, setTextName] =
    useState("");

  const [coverFile, setCoverFile] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [saving, setSaving] =
    useState(false);

  const [saved, setSaved] =
    useState(false);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [words, setWords] =
    useState(0);

  const [
    characters,
    setCharacters,
  ] = useState(0);

  const [
    editorTitle,
    setEditorTitle,
  ] = useState("");

  /*
   * IMPORTANT:
   * Content iba muri state kugira ngo file
   * ibanze isomwe, React ikore editor,
   * hanyuma useEffect ishyire content muri DOM.
   */
  const [
    editorContent,
    setEditorContent,
  ] = useState("");

  const [fontSize, setFontSize] =
    useState("16px");

  const [textColor, setTextColor] =
    useState("#111111");

  const [
    isSavingDisabled,
    setIsSavingDisabled,
  ] = useState(false);

  /* =======================================================
     UPDATE COUNTS
  ======================================================= */

  const updateCounts =
    useCallback((text) => {
      setWords(
        countWords(text)
      );

      setCharacters(
        countCharacters(text)
      );
    }, []);

  /* =======================================================
     LOAD FOLDER FILES
  ======================================================= */

  const loadFolderFiles =
    useCallback(
      async (folderHandle) => {
        if (!folderHandle) {
          return;
        }

        try {
          const result =
            await readDirectory(
              folderHandle
            );

          if (
            isMountedRef.current
          ) {
            setFolderFiles(
              result.files
            );
          }
        } catch (err) {
          console.error(
            "Load folder files error:",
            err
          );

          if (
            isMountedRef.current
          ) {
            setError(
              t("Files z'inkuru ntizashoboye gusomwa.")
            );
          }
        }
      },
      []
    );

  /* =======================================================
     OPEN TEXT FILE
     
     IMPORTANT FIX:
     Ntitugishyira content muri editorRef
     ako kanya. Tubanza kuyishyira muri
     editorContent state.
  ======================================================= */

  const openTextFile =
    useCallback(
      async (file) => {
        if (!file?.handle) {
          return;
        }

        try {
          const fileObject =
            await file.handle.getFile();

          const content =
            await fileObject.text();

          const title =
            removeExtension(
              file.name
            );

          if (
            !isMountedRef.current
          ) {
            return;
          }

          setSelectedFile({
            ...file,
            title,
          });

          setEditorTitle(title);

          /*
           * Ibi ni byo by'ingenzi.
           * Content izajya muri editor nyuma
           * y'uko React amaze gukora editor.
           */
          setEditorContent(
            content
          );

          updateCounts(
            content
          );

          setSaved(true);
          setError("");
        } catch (err) {
          console.error(
            "Open text file error:",
            err
          );

          if (
            isMountedRef.current
          ) {
            setError(
              t("Text ntiyashoboye gufunguka.")
            );
          }
        }
      },
      [updateCounts]
    );

  /* =======================================================
     LOAD ROOT DIRECTORY
  ======================================================= */

  const loadRootDirectory =
    useCallback(
      async (handle) => {
        if (
          !handle ||
          !isMountedRef.current
        ) {
          return;
        }

        try {
          const permission =
            await verifyPermission(
              handle,
              false
            );

          if (!permission) {
            if (
              isMountedRef.current
            ) {
              setRootPermission(
                false
              );
            }

            return;
          }

          const result =
            await readDirectory(
              handle
            );

          if (
            !isMountedRef.current
          ) {
            return;
          }

          setFolders(
            result.folders
          );

          setRootFiles(
            result.files
          );

          setRootPermission(
            true
          );

          setRootName(
            handle.name || ""
          );

          const imagePromises =
            result.folders.map(
              async (folder) => {
                const image =
                  await readCoverImage(
                    folder.handle
                  );

                if (image) {
                  objectUrlsRef.current.push(
                    image
                  );

                  return {
                    name: folder.name,
                    image,
                  };
                }

                return null;
              }
            );

          const imageResults =
            await Promise.all(
              imagePromises
            );

          if (
            !isMountedRef.current
          ) {
            return;
          }

          const imageMap = {};

          imageResults.forEach(
            (result) => {
              if (result) {
                imageMap[
                  result.name
                ] =
                  result.image;
              }
            }
          );

          setCoverImages(
            imageMap
          );
        } catch (err) {
          console.error(
            "Load root directory error:",
            err
          );

          if (
            isMountedRef.current
          ) {
            setError(
              t("Ntibishoboye gusoma ibiri kuri memory card.")
            );
          }
        }
      },
      []
    );

  /* =======================================================
     CHOOSE ROOT FOLDER
  ======================================================= */

  const chooseRootFolder =
    useCallback(
      async () => {
        if (
          typeof window ===
            "undefined" ||
          typeof window.showDirectoryPicker !==
            "function"
        ) {
          setError(
            t("Browser yawe ntiyashyigikira File System Access API.")
          );

          return;
        }

        setError("");

        try {
          const handle =
            await window.showDirectoryPicker(
              {
                mode: "readwrite",
              }
            );

          const permission =
            await verifyPermission(
              handle,
              true
            );

          if (!permission) {
            setError(
              t("Permission yo kwandika muri folder ntiyatanzwe.")
            );

            return;
          }

          await saveHandleToDB(
            ROOT_HANDLE_KEY,
            handle
          );

          if (
            !isMountedRef.current
          ) {
            return;
          }

          setRootHandle(handle);

          setRootName(
            handle.name || ""
          );

          setRootPermission(
            true
          );

          await loadRootDirectory(
            handle
          );
        } catch (err) {
          if (
            err?.name ===
            "AbortError"
          ) {
            return;
          }

          console.error(
            "Choose folder error:",
            err
          );

          if (
            isMountedRef.current
          ) {
            setError(
              t("Habaye ikibazo mu guhitamo folder.")
            );
          }
        }
      },
      [loadRootDirectory]
    );

  /* =======================================================
     REQUEST SAVED PERMISSION
  ======================================================= */

  const requestSavedPermission =
    useCallback(
      async () => {
        if (!rootHandle) {
          return false;
        }

        try {
          const granted =
            await verifyPermission(
              rootHandle,
              true
            );

          if (
            isMountedRef.current
          ) {
            setRootPermission(
              granted
            );
          }

          if (
            granted &&
            isMountedRef.current
          ) {
            await loadRootDirectory(
              rootHandle
            );
          }

          return granted;
        } catch (err) {
          console.error(
            "Permission error:",
            err
          );

          if (
            isMountedRef.current
          ) {
            setError(
              t("Permission ntiyashoboye gutangwa.")
            );
          }

          return false;
        }
      },
      [
        rootHandle,
        loadRootDirectory,
      ]
    );

  /* =======================================================
     OPEN STORY FOLDER
  ======================================================= */

  const openStoryFolder =
    useCallback(
      async (
        folderNameValue,
        suppliedRootHandle = null
      ) => {
        const parent =
          suppliedRootHandle ||
          rootHandle;

        if (!parent) {
          return;
        }

        try {
          const folder =
            await parent.getDirectoryHandle(
              folderNameValue
            );

          if (
            !isMountedRef.current
          ) {
            return;
          }

          /*
           * Clear old editor content before
           * changing to another folder.
           */
          if (editorRef.current) {
            editorRef.current.innerHTML =
              "";
          }

          setEditorContent("");

          setSelectedFolder({
            name: folderNameValue,
            handle: folder,
          });

          setSelectedFile(null);

          setEditorTitle("");

          setFolderFiles([]);

          setWords(0);

          setCharacters(0);

          setSearch("");

          setSaved(false);

          await loadFolderFiles(
            folder
          );
        } catch (err) {
          console.error(
            "Open story folder error:",
            err
          );

          if (
            isMountedRef.current
          ) {
            setError(
              t("Inkuru folder ntiyabonetse.")
            );
          }
        }
      },
      [
        rootHandle,
        loadFolderFiles,
      ]
    );

  /* =======================================================
     CREATE STORY FOLDER
  ======================================================= */

  const createStoryFolder =
    useCallback(
      async () => {
        const name =
          cleanFileName(
            folderName
          );

        if (!name) {
          setError(
            t("Andika izina ry'inkuru.")
          );

          return;
        }

        if (!rootHandle) {
          setError(
            t("Banza uhitemo folder ya memory card.")
          );

          return;
        }

        try {
          const granted =
            await requestSavedPermission();

          if (!granted) {
            return;
          }

          const folder =
            await rootHandle.getDirectoryHandle(
              name,
              {
                create: true,
              }
            );

          if (coverFile) {
            const extension =
              coverFile.name
                .split(".")
                .pop()
                ?.toLowerCase() ||
              "jpg";

            const fileHandle =
              await folder.getFileHandle(
                `cover.${extension}`,
                {
                  create: true,
                }
              );

            const writable =
              await fileHandle.createWritable();

            await writable.write(
              await coverFile.arrayBuffer()
            );

            await writable.close();
          }

          if (
            !isMountedRef.current
          ) {
            return;
          }

          setFolderName("");

          setCoverFile(null);

          setShowFolderModal(
            false
          );

          await loadRootDirectory(
            rootHandle
          );

          if (
            !isMountedRef.current
          ) {
            return;
          }

          setSelectedFolder({
            name,
            handle: folder,
          });

          await loadFolderFiles(
            folder
          );
        } catch (err) {
          console.error(
            "Create folder error:",
            err
          );

          if (
            isMountedRef.current
          ) {
            setError(
              t("Folder ntiyashoboye kuremwa.")
            );
          }
        }
      },
      [
        folderName,
        coverFile,
        rootHandle,
        requestSavedPermission,
        loadRootDirectory,
        loadFolderFiles,
      ]
    );

  /* =======================================================
     CREATE TEXT FILE
  ======================================================= */

  const createTextFile =
    useCallback(
      async () => {
        const name =
          cleanFileName(
            textName
          );

        if (!name) {
          setError(
            t("Andika izina rya text.")
          );

          return;
        }

        if (!selectedFolder) {
          setError(
            t("Banza ufungure inkuru.")
          );

          return;
        }

        try {
          const granted =
            await requestSavedPermission();

          if (!granted) {
            return;
          }

          const folder =
            selectedFolder.handle;

          const fileHandle =
            await folder.getFileHandle(
              `${name}.txt`,
              {
                create: true,
              }
            );

          const htmlHandle =
            await folder.getFileHandle(
              `${name}.html`,
              {
                create: true,
              }
            );

          const writable =
            await fileHandle.createWritable();

          await writable.write("");

          await writable.close();

          const htmlWritable =
            await htmlHandle.createWritable();

          await htmlWritable.write(
            `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body></body>
</html>`
          );

          await htmlWritable.close();

          if (
            !isMountedRef.current
          ) {
            return;
          }

          setTextName("");

          setShowTextModal(
            false
          );

          const newFile = {
            name: `${name}.txt`,
            handle: fileHandle,
          };

          setFolderFiles(
            (previous) =>
              [
                ...previous.filter(
                  (file) =>
                    file.name !==
                    newFile.name
                ),
                newFile,
              ].sort((a, b) =>
                a.name.localeCompare(
                  b.name
                )
              )
          );

          /*
           * Open the newly-created file.
           * editorContent will be empty, then
           * React will render the editor.
           */
          await openTextFile(
            newFile
          );
        } catch (err) {
          console.error(
            "Create text error:",
            err
          );

          if (
            isMountedRef.current
          ) {
            setError(
              t("Text file ntiyashoboye kuremwa.")
            );
          }
        }
      },
      [
        textName,
        selectedFolder,
        requestSavedPermission,
        openTextFile,
      ]
    );

  /* =======================================================
     SAVE CURRENT FILE
  ======================================================= */

  const saveCurrentFile =
    useCallback(
      async () => {
        if (
          !selectedFile ||
          !selectedFolder ||
          !editorRef.current ||
          isSavingDisabled
        ) {
          return;
        }

        setIsSavingDisabled(
          true
        );

        try {
          setSaving(true);

          setSaved(false);

          setError("");

          const html =
            editorRef.current
              .innerHTML;

          const plainText =
            htmlToPlainText(
              html
            );

          const txtHandle =
            selectedFile.handle;

          const writable =
            await txtHandle.createWritable();

          await writable.write(
            plainText
          );

          await writable.close();

          const htmlFileName =
            `${selectedFile.title}.html`;

          const htmlHandle =
            await selectedFolder.handle.getFileHandle(
              htmlFileName,
              {
                create: true,
              }
            );

          const htmlWritable =
            await htmlHandle.createWritable();

          const completeHTML =
            `<!DOCTYPE html>
<html lang="rw">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${selectedFile.title}</title>
</head>
<body>
${html}
</body>
</html>`;

          await htmlWritable.write(
            completeHTML
          );

          await htmlWritable.close();

          if (
            isMountedRef.current
          ) {
            setSaving(false);

            setSaved(true);

            updateCounts(
              plainText
            );
          }
        } catch (err) {
          console.error(
            "Save error:",
            err
          );

          if (
            isMountedRef.current
          ) {
            setSaving(false);

            setSaved(false);

            setError(
              t("Auto-save yanze kubika file.")
            );
          }
        } finally {
          if (
            isMountedRef.current
          ) {
            setIsSavingDisabled(
              false
            );
          }
        }
      },
      [
        selectedFile,
        selectedFolder,
        updateCounts,
        isSavingDisabled,
      ]
    );

  /* =======================================================
     AUTO SAVE
  ======================================================= */

  const scheduleAutoSave =
    useCallback(() => {
      setSaved(false);

      if (
        autoSaveTimer.current
      ) {
        clearTimeout(
          autoSaveTimer.current
        );
      }

      autoSaveTimer.current =
        setTimeout(() => {
          if (
            isMountedRef.current
          ) {
            saveCurrentFile();
          }
        }, AUTO_SAVE_DELAY);
    }, [saveCurrentFile]);

  /* =======================================================
     SAVE SELECTION
  ======================================================= */

  const saveSelection =
    useCallback(() => {
      if (
        typeof window ===
        "undefined"
      ) {
        return;
      }

      const selection =
        window.getSelection();

      if (
        !selection ||
        selection.rangeCount === 0
      ) {
        return;
      }

      const range =
        selection.getRangeAt(
          0
        );

      if (
        editorRef.current &&
        editorRef.current.contains(
          range.commonAncestorContainer
        )
      ) {
        savedRangeRef.current =
          range.cloneRange();
      }
    }, []);

  /* =======================================================
     RESTORE SELECTION
  ======================================================= */

  const restoreSelection =
    useCallback(() => {
      if (
        typeof window ===
          "undefined" ||
        !savedRangeRef.current
      ) {
        return;
      }

      const selection =
        window.getSelection();

      if (!selection) {
        return;
      }

      selection.removeAllRanges();

      selection.addRange(
        savedRangeRef.current
      );
    }, []);

  /* =======================================================
     TOOLBAR COMMAND
  ======================================================= */

  const execCommand =
    useCallback(
      (
        command,
        value = null
      ) => {
        if (
          typeof document ===
            "undefined" ||
          !editorRef.current
        ) {
          return;
        }

        editorRef.current.focus();

        restoreSelection();

        try {
          document.execCommand(
            command,
            false,
            value
          );
        } catch (err) {
          console.error(
            "Toolbar command error:",
            err
          );
        }

        saveSelection();

        scheduleAutoSave();

        updateCounts(
          editorRef.current
            .innerText
        );
      },
      [
        restoreSelection,
        saveSelection,
        scheduleAutoSave,
        updateCounts,
      ]
    );

  /* =======================================================
     FONT SIZE
  ======================================================= */

  const applyFontSize =
    useCallback(
      (size) => {
        if (
          !editorRef.current
        ) {
          return;
        }

        execCommand(
          "fontSize",
          "7"
        );

        const fontElements =
          editorRef.current.querySelectorAll(
            'font[size="7"]'
          );

        fontElements.forEach(
          (element) => {
            element.removeAttribute(
              "size"
            );

            element.style.fontSize =
              size;
          }
        );

        scheduleAutoSave();
      },
      [
        execCommand,
        scheduleAutoSave,
      ]
    );

  /* =======================================================
     TEXT COLOR
  ======================================================= */

  const applyColor =
    useCallback(
      (color) => {
        setTextColor(color);

        execCommand(
          "foreColor",
          color
        );
      },
      [execCommand]
    );

  /* =======================================================
     EDITOR INPUT
  ======================================================= */

  const handleEditorInput =
    useCallback(() => {
      if (
        !editorRef.current
      ) {
        return;
      }

      const text =
        editorRef.current
          .innerText;

      updateCounts(text);

      scheduleAutoSave();
    }, [
      updateCounts,
      scheduleAutoSave,
    ]);

  /* =======================================================
     DELETE FILE
  ======================================================= */

  const deleteTextFile =
    useCallback(
      async () => {
        if (
          !selectedFile ||
          !selectedFolder
        ) {
          return;
        }

        const confirmed =
          window.confirm(
            t("Urashaka gusiba \"{name}\"?", { name: selectedFile.name })
          );

        if (!confirmed) {
          return;
        }

        try {
          if (
            autoSaveTimer.current
          ) {
            clearTimeout(
              autoSaveTimer.current
            );

            autoSaveTimer.current =
              null;
          }

          await selectedFolder.handle.removeEntry(
            selectedFile.name
          );

          try {
            await selectedFolder.handle.removeEntry(
              `${selectedFile.title}.html`
            );
          } catch {
            // HTML file may not exist.
          }

          if (
            isMountedRef.current
          ) {
            setSelectedFile(
              null
            );

            setEditorTitle("");

            setEditorContent("");

            setFolderFiles(
              (previous) =>
                previous.filter(
                  (file) =>
                    file.name !==
                    selectedFile.name
                )
            );

            setWords(0);

            setCharacters(0);

            setSaved(false);

            if (
              editorRef.current
            ) {
              editorRef.current.innerHTML =
                "";
            }
          }
        } catch (err) {
          console.error(
            "Delete file error:",
            err
          );

          if (
            isMountedRef.current
          ) {
            setError(
              t("File ntiyashoboye gusibwa.")
            );
          }
        }
      },
      [
        selectedFile,
        selectedFolder,
      ]
    );

  /* =======================================================
     REFRESH
  ======================================================= */

  const refreshFiles =
    useCallback(async () => {
      if (
        !rootHandle ||
        refreshing
      ) {
        return;
      }

      setRefreshing(true);

      setError("");

      try {
        let granted =
          await verifyPermission(
            rootHandle,
            false
          );

        if (!granted) {
          granted =
            await verifyPermission(
              rootHandle,
              true
            );
        }

        if (!granted) {
          if (
            isMountedRef.current
          ) {
            setRootPermission(
              false
            );

            setError(
              t("Tool ikeneye permission yo gusoma memory card.")
            );
          }

          return;
        }

        await loadRootDirectory(
          rootHandle
        );

        if (
          selectedFolder &&
          isMountedRef.current
        ) {
          try {
            const folder =
              await rootHandle.getDirectoryHandle(
                selectedFolder.name
              );

            setSelectedFolder({
              name: selectedFolder.name,
              handle: folder,
            });

            await loadFolderFiles(
              folder
            );

            /*
             * Niba file yari ifunguye,
             * yongeye gusomwa muri state.
             * useEffect izongera kuyishyira
             * muri editor.
             */
            if (
              selectedFile &&
              isMountedRef.current
            ) {
              const fileName =
                selectedFile.name;

              const fileHandle =
                await folder.getFileHandle(
                  fileName
                );

              const updatedFile = {
                name: fileName,
                handle:
                  fileHandle,
              };

              await openTextFile(
                updatedFile
              );
            }
          } catch (err) {
            console.error(
              "Error reopening folder after refresh:",
              err
            );
          }
        }
      } catch (err) {
        console.error(
          "Refresh error:",
          err
        );

        if (
          isMountedRef.current
        ) {
          setError(
            t("Refresh yanze gusoma files.")
          );
        }
      } finally {
        if (
          isMountedRef.current
        ) {
          setRefreshing(false);
        }
      }
    }, [
      rootHandle,
      refreshing,
      loadRootDirectory,
      selectedFolder,
      selectedFile,
      loadFolderFiles,
      openTextFile,
    ]);

  /* =======================================================
     BACK TO STORIES
  ======================================================= */

  const backToStories =
    useCallback(() => {
      if (
        autoSaveTimer.current
      ) {
        clearTimeout(
          autoSaveTimer.current
        );

        autoSaveTimer.current =
          null;
      }

      if (editorRef.current) {
        editorRef.current.innerHTML =
          "";
      }

      setSelectedFolder(null);

      setSelectedFile(null);

      setFolderFiles([]);

      setEditorTitle("");

      setEditorContent("");

      setWords(0);

      setCharacters(0);

      setSearch("");

      setSaved(false);
    }, []);

  /* =======================================================
     VISIBLE FILES
  ======================================================= */

  const visibleFiles =
    useMemo(() => {
      const value =
        search
          .trim()
          .toLowerCase();

      if (!value) {
        return folderFiles;
      }

      return folderFiles.filter(
        (file) =>
          file.name
            .toLowerCase()
            .includes(value)
      );
    }, [
      folderFiles,
      search,
    ]);

  /* =======================================================
     IMPORTANT FIX:
     PUT FILE CONTENT INTO EDITOR AFTER RENDER
     
     This is the actual fix for:
     
     "Words/Characters show correctly,
      but editor is empty."
  ======================================================= */

  useEffect(() => {
    if (
      !selectedFile ||
      !editorRef.current
    ) {
      return;
    }

    /*
     * innerText is correct because TXT files
     * contain plain text.
     */
    editorRef.current.innerText =
      editorContent;

    updateCounts(
      editorContent
    );

    /*
     * Put cursor at the beginning/end
     * without triggering React state updates.
     */
    try {
      const selection =
        window.getSelection();

      const range =
        document.createRange();

      range.selectNodeContents(
        editorRef.current
      );

      range.collapse(false);

      selection.removeAllRanges();

      selection.addRange(
        range
      );
    } catch {
      // Ignore selection errors.
    }
  }, [
    selectedFile,
    editorContent,
    updateCounts,
  ]);

  /* =======================================================
     CLEAN OBJECT URLS
  ======================================================= */

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach(
        (url) => {
          try {
            URL.revokeObjectURL(
              url
            );
          } catch {
            // Ignore cleanup errors.
          }
        }
      );

      objectUrlsRef.current =
        [];
    };
  }, []);

  /* =======================================================
     INITIALIZE SAVED FOLDER
     
     NOTE:
     This effect is intentionally AFTER
     loadRootDirectory initialization.
     That prevents the old initialization-order
     problem during Next.js build.
  ======================================================= */

  useEffect(() => {
    let mounted = true;

    isMountedRef.current =
      true;

    const initialize =
      async () => {
        try {
          if (
            !supportsFileSystemAccess()
          ) {
            if (mounted) {
              setError(
                t("Browser yawe ntiyashyigikira File System Access API. Koresha browser igezweho nka Chrome.")
              );

              setLoading(false);
            }

            return;
          }

          const handle =
            await getHandleFromDB(
              ROOT_HANDLE_KEY
            );

          if (
            !mounted ||
            !isMountedRef.current
          ) {
            return;
          }

          if (handle) {
            setRootHandle(handle);

            setRootName(
              handle.name || ""
            );

            const granted =
              await verifyPermission(
                handle,
                false
              );

            if (
              !mounted ||
              !isMountedRef.current
            ) {
              return;
            }

            if (granted) {
              setRootPermission(
                true
              );

              await loadRootDirectory(
                handle
              );
            } else {
              setRootPermission(
                false
              );
            }
          }
        } catch (err) {
          console.error(
            "Initialization error:",
            err
          );

          if (
            mounted &&
            isMountedRef.current
          ) {
            setError(
              t("Habaye ikibazo mu gusoma folder wabikiyemo inkuru.")
            );
          }
        } finally {
          if (
            mounted &&
            isMountedRef.current
          ) {
            setLoading(false);
          }
        }
      };

    initialize();

    return () => {
      mounted = false;

      isMountedRef.current =
        false;

      if (
        autoSaveTimer.current
      ) {
        clearTimeout(
          autoSaveTimer.current
        );

        autoSaveTimer.current =
          null;
      }
    };
  }, [loadRootDirectory]);

  /* =======================================================
     KEYBOARD SHORTCUTS
  ======================================================= */

  useEffect(() => {
    const handleKeyDown =
      (e) => {
        if (
          (e.ctrlKey ||
            e.metaKey) &&
          e.key.toLowerCase() ===
            "s"
        ) {
          e.preventDefault();

          if (selectedFile) {
            saveCurrentFile();
          }

          return;
        }

        if (
          (e.ctrlKey ||
            e.metaKey) &&
          e.key.toLowerCase() ===
            "z"
        ) {
          e.preventDefault();

          execCommand("undo");

          return;
        }

        if (
          (e.ctrlKey ||
            e.metaKey) &&
          e.key.toLowerCase() ===
            "y"
        ) {
          e.preventDefault();

          execCommand("redo");

          return;
        }

        if (
          (e.ctrlKey ||
            e.metaKey) &&
          e.key.toLowerCase() ===
            "b"
        ) {
          e.preventDefault();

          execCommand("bold");

          return;
        }

        if (
          (e.ctrlKey ||
            e.metaKey) &&
          e.key.toLowerCase() ===
            "i"
        ) {
          e.preventDefault();

          execCommand("italic");
        }
      };

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    selectedFile,
    saveCurrentFile,
    execCommand,
  ]);

  /* =======================================================
     NO SUPPORT
  ======================================================= */

  if (
    !supportsFileSystemAccess() &&
    !loading
  ) {
    return (
      <>
        <Head>
          <title>{t("Offline Writer")}</title>
        </Head>

        <main
          className={
            styles.unsupported
          }
        >
          <FaFileAlt />

          <h1>{t("Browser ntiyashyigikira iyi tool")}</h1>

          <p>{t("Koresha browser igezweho ishyigikira File System Access API.")}</p>
        </main>
      </>
    );
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <>
      <Head>
        <title>{t("Offline Story Writer")}</title>

        <meta
          name="viewport"
          content="width=device-width, initial-scale=1"
        />
      </Head>

      <main
        className={styles.app}
      >
        {/* =================================================
            TOP BAR
        ================================================= */}

        <header
          className={styles.topBar}
        >
          <div
            className={styles.brand}
          >
            <FaFileAlt />

            <div>
              <strong>{t("Offline Writer")}</strong>

              <small>
                {rootPermission
                  ? t("Connected: {rootName}", { rootName })
                  : t("Memory Card Writer")}
              </small>
            </div>
          </div>

          <div
            className={
              styles.topActions
            }
          >
            {!rootHandle && (
              <button
                type="button"
                className={
                  styles.primaryButton
                }
                onClick={
                  chooseRootFolder
                }
              >
                <FaCloudUploadAlt />{t("Hitamo Memory Card Folder")}</button>
            )}

            {rootHandle && (
              <button
                type="button"
                className={
                  styles.secondaryButton
                }
                onClick={
                  refreshFiles
                }
                disabled={refreshing}
              >
                <FaSyncAlt
                  className={
                    refreshing
                      ? styles.spin
                      : ""
                  }
                />{t("Refresh")}</button>
            )}
          </div>
        </header>

        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <div
            className={
              styles.errorBar
            }
          >
            <span>
              {error}
            </span>

            <button
              type="button"
              onClick={() =>
                setError("")
              }
              aria-label={t("Close error")}
            >
              <FaTimes />
            </button>
          </div>
        )}

        {/* =================================================
            LOADING
        ================================================= */}

        {loading ? (
          <div
            className={
              styles.loading
            }
          >
            <FaSpinner
              className={
                styles.spin
              }
            />

            <p>{t("Gusoma memory card...")}</p>
          </div>
        ) : !rootHandle ? (
          <section
            className={styles.setup}
          >
            <div
              className={
                styles.setupIcon
              }
            >
              <FaFolderOpen />
            </div>

            <h1>{t("Offline Story Writer")}</h1>

            <p>{t("Hitamo folder iri kuri memory card. Iyo umaze gutanga permission, tool izajya yibuka folder kandi ikongera ikayisoma nyuma ya refresh.")}</p>

            <button
              type="button"
              className={
                styles.primaryButtonLarge
              }
              onClick={
                chooseRootFolder
              }
            >
              <FaFolder />{t("Hitamo Folder")}</button>
          </section>
        ) : !selectedFolder ? (
          <section
            className={
              styles.library
            }
          >
            <div
              className={
                styles.sectionHeader
              }
            >
              <div>
                <span
                  className={
                    styles.sectionEyebrow
                  }
                >{t("LIBRARY")}</span>

                <h1>{t("Inkuru")}</h1>

                <p>
                  {folders.length}{" "}
                  {folders.length ===
                  1
                    ? t("folder")
                    : t("folders")}
                </p>
              </div>

              <button
                type="button"
                className={
                  styles.primaryButton
                }
                onClick={() =>
                  setShowFolderModal(
                    true
                  )
                }
              >
                <FaPlus />{t("New Story")}</button>
            </div>

            {folders.length ===
            0 ? (
              <div
                className={
                  styles.empty
                }
              >
                <FaFolder />

                <h2>{t("Nta nkuru zirimo")}</h2>

                <p>{t("Kora folder ya mbere y'inkuru.")}</p>
              </div>
            ) : (
              <div
                className={
                  styles.folderGrid
                }
              >
                {folders.map(
                  (folder) => (
                    <button
                      type="button"
                      key={
                        folder.name
                      }
                      className={
                        styles.folderCard
                      }
                      onClick={() =>
                        openStoryFolder(
                          folder.name
                        )
                      }
                    >
                      <div
                        className={
                          styles.folderCover
                        }
                      >
                        {coverImages[
                          folder.name
                        ] ? (
                          <img
                            src={
                              coverImages[
                                folder.name
                              ]
                            }
                            alt={
                              folder.name
                            }
                            loading="lazy"
                          />
                        ) : (
                          <div
                            className={
                              styles.draftIcon
                            }
                          >
                            <FaFileAlt />
                          </div>
                        )}

                        <span
                          className={
                            styles.folderIcon
                          }
                        >
                          <FaFolder />
                        </span>
                      </div>

                      <div
                        className={
                          styles.folderInfo
                        }
                      >
                        <h2>
                          {
                            folder.name
                          }
                        </h2>

                        <span>{t("Fungura inkuru →")}</span>
                      </div>
                    </button>
                  )
                )}
              </div>
            )}

            {rootFiles.length >
              0 && (
              <div
                className={
                  styles.rootFiles
                }
              >
                <h2>{t("Files ziri hanze")}</h2>

                <div>
                  {rootFiles.map(
                    (file) => (
                      <span
                        key={
                          file.name
                        }
                      >
                        <FaFileAlt />

                        {file.name}
                      </span>
                    )
                  )}
                </div>
              </div>
            )}
          </section>
        ) : (
          <section
            className={
              styles.storyWorkspace
            }
          >
            {/* =================================================
                WORKSPACE HEADER
            ================================================= */}

            <div
              className={
                styles.workspaceHeader
              }
            >
              <button
                type="button"
                className={
                  styles.backButton
                }
                onClick={
                  backToStories
                }
              >
                <FaArrowLeft />{t("Inkuru")}</button>

              <div
                className={
                  styles.workspaceTitle
                }
              >
                <FaFolder />

                <div>
                  <h1>
                    {
                      selectedFolder.name
                    }
                  </h1>

                  <span>
                    {
                      folderFiles.length
                    }{" "}{t("files")}</span>
                </div>
              </div>

              <button
                type="button"
                className={
                  styles.primaryButton
                }
                onClick={() =>
                  setShowTextModal(
                    true
                  )
                }
              >
                <FaPlus />{t("Add Text")}</button>
            </div>

            {/* =================================================
                EDITOR
            ================================================= */}

            {selectedFile ? (
              <div
                className={
                  styles.editorPage
                }
              >
                <div
                  className={
                    styles.editorTop
                  }
                >
                  <button
                    type="button"
                    className={
                      styles.backButton
                    }
                    onClick={() => {
                      if (
                        autoSaveTimer.current
                      ) {
                        clearTimeout(
                          autoSaveTimer.current
                        );

                        autoSaveTimer.current =
                          null;
                      }

                      setSelectedFile(
                        null
                      );

                      setEditorTitle(
                        ""
                      );

                      setEditorContent(
                        ""
                      );

                      setWords(0);

                      setCharacters(
                        0
                      );

                      setSaved(false);

                      if (
                        editorRef.current
                      ) {
                        editorRef.current.innerHTML =
                          "";
                      }
                    }}
                  >
                    <FaArrowLeft />{t("Files")}</button>

                  <div>
                    <h2>
                      {
                        editorTitle
                      }
                    </h2>

                    <span>
                      {saving ? (
                        <>
                          <FaSpinner
                            className={
                              styles.spin
                            }
                          />{t("Saving...")}</>
                      ) : saved ? (
                        <>
                          <FaCheck />{t("Saved")}</>
                      ) : (
                        t("Unsaved changes")
                      )}
                    </span>
                  </div>

                  <button
                    type="button"
                    className={
                      styles.deleteButton
                    }
                    onClick={
                      deleteTextFile
                    }
                  >
                    <FaTrash />{t("Delete")}</button>
                </div>

                {/* =================================================
                    TOOLBAR
                ================================================= */}

                <div
                  className={
                    styles.toolbar
                  }
                >
                  <button
                    type="button"
                    onMouseDown={(e) =>
                      e.preventDefault()
                    }
                    onClick={() =>
                      execCommand(
                        "bold"
                      )
                    }
                    title={t("Bold")}
                    aria-label={t("Bold")}
                  >
                    <FaBold />
                  </button>

                  <button
                    type="button"
                    onMouseDown={(e) =>
                      e.preventDefault()
                    }
                    onClick={() =>
                      execCommand(
                        "italic"
                      )
                    }
                    title={t("Italic")}
                    aria-label={t("Italic")}
                  >
                    <FaItalic />
                  </button>

                  <button
                    type="button"
                    onMouseDown={(e) =>
                      e.preventDefault()
                    }
                    onClick={() =>
                      execCommand(
                        "underline"
                      )
                    }
                    title={t("Underline")}
                    aria-label={t("Underline")}
                  >
                    <FaUnderline />
                  </button>

                  <button
                    type="button"
                    onMouseDown={(e) =>
                      e.preventDefault()
                    }
                    onClick={() =>
                      execCommand(
                        "strikeThrough"
                      )
                    }
                    title={t("Strike")}
                    aria-label={t("Strike")}
                  >
                    <FaStrikethrough />
                  </button>

                  <span
                    className={
                      styles.divider
                    }
                  />

                  <select
                    value={fontSize}
                    onChange={(e) => {
                      const value =
                        e.target.value;

                      setFontSize(
                        value
                      );

                      applyFontSize(
                        value
                      );
                    }}
                    aria-label={t("Font size")}
                  >
                    <option value="14px">
                      14
                    </option>

                    <option value="16px">
                      16
                    </option>

                    <option value="18px">
                      18
                    </option>

                    <option value="20px">
                      20
                    </option>

                    <option value="24px">
                      24
                    </option>

                    <option value="28px">
                      28
                    </option>

                    <option value="32px">
                      32
                    </option>
                  </select>

                  <label
                    className={
                      styles.colorButton
                    }
                    title={t("Text color")}
                  >
                    <FaPalette />

                    <input
                      type="color"
                      value={
                        textColor
                      }
                      onChange={(e) =>
                        applyColor(
                          e.target.value
                        )
                      }
                      aria-label={t("Text color")}
                    />
                  </label>

                  <span
                    className={
                      styles.divider
                    }
                  />

                  <button
                    type="button"
                    onMouseDown={(e) =>
                      e.preventDefault()
                    }
                    onClick={() =>
                      execCommand(
                        "justifyLeft"
                      )
                    }
                    title={t("Align left")}
                    aria-label={t("Align left")}
                  >
                    <FaAlignLeft />
                  </button>

                  <button
                    type="button"
                    onMouseDown={(e) =>
                      e.preventDefault()
                    }
                    onClick={() =>
                      execCommand(
                        "justifyCenter"
                      )
                    }
                    title={t("Align center")}
                    aria-label={t("Align center")}
                  >
                    <FaAlignCenter />
                  </button>

                  <button
                    type="button"
                    onMouseDown={(e) =>
                      e.preventDefault()
                    }
                    onClick={() =>
                      execCommand(
                        "justifyRight"
                      )
                    }
                    title={t("Align right")}
                    aria-label={t("Align right")}
                  >
                    <FaAlignRight />
                  </button>

                  <span
                    className={
                      styles.divider
                    }
                  />

                  <button
                    type="button"
                    onMouseDown={(e) =>
                      e.preventDefault()
                    }
                    onClick={() =>
                      execCommand(
                        "insertUnorderedList"
                      )
                    }
                    title={t("Bullet list")}
                    aria-label={t("Bullet list")}
                  >
                    <FaListUl />
                  </button>

                  <button
                    type="button"
                    onMouseDown={(e) =>
                      e.preventDefault()
                    }
                    onClick={() =>
                      execCommand(
                        "insertOrderedList"
                      )
                    }
                    title={t("Numbered list")}
                    aria-label={t("Numbered list")}
                  >
                    <FaListOl />
                  </button>

                  <span
                    className={
                      styles.divider
                    }
                  />

                  <button
                    type="button"
                    onMouseDown={(e) =>
                      e.preventDefault()
                    }
                    onClick={() =>
                      execCommand(
                        "formatBlock",
                        "blockquote"
                      )
                    }
                    title={t("Quote")}
                    aria-label={t("Quote")}
                  >
                    <FaQuoteLeft />
                  </button>

                  <button
                    type="button"
                    onMouseDown={(e) =>
                      e.preventDefault()
                    }
                    onClick={() =>
                      execCommand(
                        "formatBlock",
                        "h2"
                      )
                    }
                    title={t("Heading")}
                    aria-label={t("Heading")}
                  >
                    <FaHeading />
                  </button>

                  <span
                    className={
                      styles.divider
                    }
                  />

                  <button
                    type="button"
                    onMouseDown={(e) =>
                      e.preventDefault()
                    }
                    onClick={() =>
                      execCommand(
                        "undo"
                      )
                    }
                    title={t("Undo")}
                    aria-label={t("Undo")}
                  >
                    <FaUndo />
                  </button>

                  <button
                    type="button"
                    onMouseDown={(e) =>
                      e.preventDefault()
                    }
                    onClick={() =>
                      execCommand(
                        "redo"
                      )
                    }
                    title={t("Redo")}
                    aria-label={t("Redo")}
                  >
                    <FaRedo />
                  </button>
                </div>

                {/* =================================================
                    EDITOR AREA
                ================================================= */}

                <div
                  ref={editorRef}
                  className={
                    styles.editor
                  }
                  contentEditable
                  suppressContentEditableWarning
                  spellCheck
                  onInput={
                    handleEditorInput
                  }
                  onKeyUp={
                    saveSelection
                  }
                  onMouseUp={
                    saveSelection
                  }
                  onFocus={
                    saveSelection
                  }
                  data-placeholder="Tangira kwandika inkuru yawe hano..."
                  style={{
                    fontSize,
                  }}
                />

                {/* =================================================
                    STATUS BAR
                ================================================= */}

                <div
                  className={
                    styles.statusBar
                  }
                >
                  <span>{t("Words:")}{" "}
                    <strong>
                      {words}
                    </strong>
                  </span>

                  <span>{t("Characters:")}{" "}
                    <strong>
                      {characters}
                    </strong>
                  </span>

                  <span>
                    {saving
                      ? t("Saving...")
                      : saved
                      ? t("Saved to memory card")
                      : t("Waiting for changes")}
                  </span>
                </div>
              </div>
            ) : (
              /* =================================================
                  FILE WORKSPACE
              ================================================= */

              <div
                className={
                  styles.fileWorkspace
                }
              >
                <div
                  className={
                    styles.fileToolbar
                  }
                >
                  <input
                    type="search"
                    placeholder={t("Search text files...")}
                    value={search}
                    onChange={(e) =>
                      setSearch(
                        e.target.value
                      )
                    }
                    className={
                      styles.search
                    }
                    aria-label={t("Search text files")}
                  />

                  <button
                    type="button"
                    className={
                      styles.primaryButton
                    }
                    onClick={() =>
                      setShowTextModal(
                        true
                      )
                    }
                  >
                    <FaPlus />{t("Add Text")}</button>
                </div>

                {visibleFiles.length ===
                0 ? (
                  <div
                    className={
                      styles.empty
                    }
                  >
                    <FaFileAlt />

                    <h2>{t("Nta text files")}</h2>

                    <p>{t("Kanda Add Text utangire.")}</p>
                  </div>
                ) : (
                  <div
                    className={
                      styles.fileGrid
                    }
                  >
                    {visibleFiles.map(
                      (file) => (
                        <button
                          type="button"
                          key={
                            file.name
                          }
                          className={
                            styles.fileCard
                          }
                          onClick={() =>
                            openTextFile(
                              file
                            )
                          }
                        >
                          <div
                            className={
                              styles.fileIcon
                            }
                          >
                            <FaFileAlt />
                          </div>

                          <div>
                            <h3>
                              {removeExtension(
                                file.name
                              )}
                            </h3>

                            <span>
                              {
                                file.name
                              }
                            </span>
                          </div>
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* =================================================
            CREATE FOLDER MODAL
        ================================================= */}

        {showFolderModal && (
          <div
            className={
              styles.modalOverlay
            }
            onMouseDown={() =>
              setShowFolderModal(
                false
              )
            }
          >
            <div
              className={
                styles.modal
              }
              onMouseDown={(e) =>
                e.stopPropagation()
              }
            >
              <div
                className={
                  styles.modalHeader
                }
              >
                <h2>{t("New Story")}</h2>

                <button
                  type="button"
                  onClick={() =>
                    setShowFolderModal(
                      false
                    )
                  }
                  aria-label={t("Close")}
                >
                  <FaTimes />
                </button>
              </div>

              <label>{t("Izina ry'inkuru")}</label>

              <input
                autoFocus
                value={folderName}
                onChange={(e) =>
                  setFolderName(
                    e.target.value
                  )
                }
                placeholder={t("Urugero: UMUGORE WACANYE INYUMA")}
                onKeyDown={(e) => {
                  if (
                    e.key ===
                    "Enter"
                  ) {
                    createStoryFolder();
                  }
                }}
              />

              <label>{t("Cover image")}</label>

              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setCoverFile(
                    e.target.files?.[0] ||
                      null
                  )
                }
              />

              <div
                className={
                  styles.modalActions
                }
              >
                <button
                  type="button"
                  className={
                    styles.secondaryButton
                  }
                  onClick={() =>
                    setShowFolderModal(
                      false
                    )
                  }
                >{t("Cancel")}</button>

                <button
                  type="button"
                  className={
                    styles.primaryButton
                  }
                  onClick={
                    createStoryFolder
                  }
                >
                  <FaCheck />{t("Create Story")}</button>
              </div>
            </div>
          </div>
        )}

        {/* =================================================
            CREATE TEXT MODAL
        ================================================= */}

        {showTextModal && (
          <div
            className={
              styles.modalOverlay
            }
            onMouseDown={() =>
              setShowTextModal(
                false
              )
            }
          >
            <div
              className={
                styles.modal
              }
              onMouseDown={(e) =>
                e.stopPropagation()
              }
            >
              <div
                className={
                  styles.modalHeader
                }
              >
                <h2>{t("Add Text")}</h2>

                <button
                  type="button"
                  onClick={() =>
                    setShowTextModal(
                      false
                    )
                  }
                  aria-label={t("Close")}
                >
                  <FaTimes />
                </button>
              </div>

              <label>{t("Izina rya text")}</label>

              <input
                autoFocus
                value={textName}
                onChange={(e) =>
                  setTextName(
                    e.target.value
                  )
                }
                placeholder={t("Urugero: Episode 01")}
                onKeyDown={(e) => {
                  if (
                    e.key ===
                    "Enter"
                  ) {
                    createTextFile();
                  }
                }}
              />

              <p
                className={
                  styles.modalHint
                }
              >{t("Hazaremwa:")}<br />

                <strong>
                  {cleanFileName(
                    textName
                  ) || t("name")}{t(".txt")}</strong>

                <br />

                <strong>
                  {cleanFileName(
                    textName
                  ) || t("name")}{t(".html")}</strong>
              </p>

              <div
                className={
                  styles.modalActions
                }
              >
                <button
                  type="button"
                  className={
                    styles.secondaryButton
                  }
                  onClick={() =>
                    setShowTextModal(
                      false
                    )
                  }
                >{t("Cancel")}</button>

                <button
                  type="button"
                  className={
                    styles.primaryButton
                  }
                  onClick={
                    createTextFile
                  }
                >
                  <FaCheck />{t("Okey")}</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
