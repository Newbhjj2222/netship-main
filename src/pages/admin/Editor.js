import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import { db } from "@/components/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import Cookies from "js-cookie";
import styles from "@/styles/Editor.module.css";
import {
  FaBold,
  FaItalic,
  FaUnderline,
  FaHeading,
  FaListUl,
  FaListOl,
  FaLink,
  FaImage,
  FaSave,
  FaTrash,
  FaArrowLeft,
  FaQuoteRight,
  FaEraser,
  FaSpinner
} from "react-icons/fa";
import LinkComponent from "../../components/Links";
import { useI18n } from "@/i18n/I18nProvider";

export default function EditorPage() {
  const { t } = useI18n();

  const router = useRouter();
  const { id: postId } = router.query;
  const editorRef = useRef(null);
  const isUpdatingFromEditor = useRef(false);
  const [isReady, setIsReady] = useState(false);

  const [head, setHead] = useState("");
  const [story, setStory] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditorFocused, setIsEditorFocused] = useState(false);

  // ===== CHECK SESSION =====
  useEffect(() => {
    const userCookie = Cookies.get("user");
    if (!userCookie) {
      router.replace("/login");
      return;
    }
    setIsReady(true);
  }, [router]);

  // ===== FETCH POST (ikora iyo router yaruzuye) =====
  useEffect(() => {
    if (!isReady) return;
    if (!router.isReady) return;
    if (!postId) {
      router.push("/");
      return;
    }

    const fetchPost = async () => {
      try {
        setLoading(true);
        const ref = doc(db, "posts", postId);
        const snap = await getDoc(ref);
        
        if (snap.exists()) {
          const data = snap.data();
          const content = data.story || "";
          
          setHead(data.head || "");
          setStory(content);
          setImageUrl(data.imageUrl || "");
          
          // Shyiramo content mu editor
          if (editorRef.current) {
            editorRef.current.innerHTML = content;
          }
        } else {
          alert(t("Inkuru ntiboneka."));
          router.push("/");
        }
      } catch (error) {
        console.error("Error fetching post:", error);
        alert(t("Habaye ikibazo mu kubona inkuru."));
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [postId, router, router.isReady, isReady]);

  // ===== SYNC story -> editor (iyo story ihindutse) =====
  useEffect(() => {
    if (editorRef.current && story && !isUpdatingFromEditor.current) {
      const currentHtml = editorRef.current.innerHTML;
      // Kureka niba byose bisanzwe
      if (currentHtml !== story) {
        editorRef.current.innerHTML = story;
      }
    }
  }, [story]);

  // ===== SYNC editor -> story =====
  const handleContentChange = () => {
    if (editorRef.current && !isUpdatingFromEditor.current) {
      isUpdatingFromEditor.current = true;
      setStory(editorRef.current.innerHTML);
      isUpdatingFromEditor.current = false;
    }
  };

  // ===== EXECUTE COMMAND =====
  const execCommand = (command, value = null) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
      handleContentChange();
    }
  };

  // ===== INSERT LINK =====
  const insertLink = () => {
    const url = prompt(t("Andika URL ya link:"), "https://");
    if (url) {
      execCommand('createLink', url);
    }
  };

  // ===== INSERT IMAGE =====
  const insertImage = () => {
    const url = prompt(t("Andika URL y'ishusho:"), "https://");
    if (url) {
      execCommand('insertImage', url);
    }
  };

  // ===== INSERT IMAGE URL TO STATE =====
  const handleImageUrlChange = () => {
    const url = prompt(t("Andika URL y'ishusho ya cover:"), "https://");
    if (url) {
      setImageUrl(url);
    }
  };

  // ===== SAVE POST =====
  const savePost = async () => {
    if (!head.trim()) {
      alert(t("Shyiramo umutwe w'inkuru!"));
      return;
    }

    const content = editorRef.current?.innerHTML || "";
    if (!content.trim() || content === "<br>" || content === "<div><br></div>") {
      alert(t("Andika ibiri mu nkuru!"));
      return;
    }

    setSaving(true);
    try {
      const ref = doc(db, "posts", postId);
      await updateDoc(ref, {
        head: head.trim(),
        story: content,
        imageUrl: imageUrl || "",
        updatedAt: new Date(),
      });
      setStory(content);
      alert(t("✅ Inkuru ivuguruwe neza!"));
    } catch (error) {
      console.error("Error saving post:", error);
      alert(t("❌ Byanze gukomeza kubika inkuru."));
    } finally {
      setSaving(false);
    }
  };

  // ===== DELETE POST =====
  const deletePost = async () => {
    if (!confirm(t("Ushaka koko gusiba iyi nkuru?"))) return;
    
    try {
      await updateDoc(doc(db, "posts", postId), {
        deleted: true,
        deletedAt: new Date()
      });
      alert(t("✅ Inkuru yasibwe!"));
      router.push("/");
    } catch (error) {
      console.error("Error deleting post:", error);
      alert(t("❌ Byanze gusiba inkuru."));
    }
  };

  // ===== HANDLE PASTE =====
  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
    handleContentChange();
  };

  // ===== LOADING =====
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <FaSpinner className={styles.loadingSpinner} />
          <p>{t("Ibihe...")}</p>
        </div>
      </div>
    );
  }

  // ===== RENDER =====
  return (
    <>
    <LinkComponent />
    <div className={styles.container}>
      <div className={styles.editorContainer}>
        {/* HEADER */}
        <div className={styles.header}>
          <button
            onClick={() => router.back()}
            className={styles.backBtn}
            title={t("Subira inyuma")}
          >
            <FaArrowLeft />{" "}{t("Subira")}</button>
          <h1 className={styles.title}>{t("✏️ Hindura Inkuru")}</h1>
          <div className={styles.headerActions}>
            <button
              onClick={savePost}
              disabled={saving}
              className={styles.saveBtn}
            >
              {saving ? (
                <><FaSpinner className={styles.spinner} />{" "}{t("Ibihe...")}</>
              ) : (
                <><FaSave />{" "}{t("Bika")}</>
              )}
            </button>
            <button
              onClick={deletePost}
              className={styles.deleteBtn}
              title={t("Siba inkuru")}
            >
              <FaTrash />
            </button>
          </div>
        </div>

        {/* TOOLBAR */}
        <div className={styles.toolbar}>
          <button onClick={() => execCommand('bold')} className={styles.toolbarBtn} title={t("Bold")}>
            <FaBold />
          </button>
          <button onClick={() => execCommand('italic')} className={styles.toolbarBtn} title={t("Italic")}>
            <FaItalic />
          </button>
          <button onClick={() => execCommand('underline')} className={styles.toolbarBtn} title={t("Underline")}>
            <FaUnderline />
          </button>
          <div className={styles.toolbarDivider}></div>
          <button onClick={() => execCommand('formatBlock', '<h2>')} className={styles.toolbarBtn} title={t("Heading")}>
            <FaHeading />
          </button>
          <button onClick={() => execCommand('formatBlock', '<h3>')} className={styles.toolbarBtn} title={t("Subheading")}>
            <FaHeading />2
          </button>
          <div className={styles.toolbarDivider}></div>
          <button onClick={() => execCommand('insertOrderedList')} className={styles.toolbarBtn} title={t("Ordered List")}>
            <FaListOl />
          </button>
          <button onClick={() => execCommand('insertUnorderedList')} className={styles.toolbarBtn} title={t("Unordered List")}>
            <FaListUl />
          </button>
          <div className={styles.toolbarDivider}></div>
          <button onClick={insertLink} className={styles.toolbarBtn} title={t("Insert Link")}>
            <FaLink />
          </button>
          <button onClick={insertImage} className={styles.toolbarBtn} title={t("Insert Image in content")}>
            <FaImage />
          </button>
          <div className={styles.toolbarDivider}></div>
          <button onClick={() => execCommand('formatBlock', '<blockquote>')} className={styles.toolbarBtn} title={t("Blockquote")}>
            <FaQuoteRight />
          </button>
          <button onClick={() => execCommand('removeFormat')} className={styles.toolbarBtn} title={t("Remove Formatting")}>
            <FaEraser />
          </button>
        </div>

        {/* COVER IMAGE */}
        <div className={styles.imageSection}>
          <div className={styles.imageLabel}>
            <FaImage />{" "}{t("Cover Image URL")}</div>
          <div className={styles.imageInputWrapper}>
            <input
              type="text"
              placeholder={t("Andika URL y'ishusho ya cover...")}
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className={styles.imageInput}
            />
            <button onClick={handleImageUrlChange} className={styles.imageUrlBtn}>
              <FaImage />
            </button>
          </div>
          {imageUrl && (
            <div className={styles.imagePreviewWrapper}>
              <img src={imageUrl} alt={head || t("Cover")} className={styles.imagePreview} />
              <button onClick={() => setImageUrl("")} className={styles.removeImageBtn}>
                <FaTrash />
              </button>
            </div>
          )}
        </div>

        {/* TITLE INPUT */}
        <input
          className={styles.titleInput}
          placeholder={t("Andika umutwe w'inkuru (head)...")}
          value={head}
          onChange={(e) => setHead(e.target.value)}
        />

        {/* EDITOR */}
        <div
          ref={editorRef}
          contentEditable
          onInput={handleContentChange}
          onFocus={() => setIsEditorFocused(true)}
          onBlur={() => setIsEditorFocused(false)}
          onPaste={handlePaste}
          className={`${styles.editorArea} ${isEditorFocused ? styles.editorFocused : ''}`}
          data-placeholder="Andika ibiri mu nkuru hano..."
          suppressContentEditableWarning={true}
        />

        {/* CHARACTER & WORD COUNT */}
        <div className={styles.footer}>
          <span className={styles.charCount}>
            {story.replace(/<[^>]*>/g, "").length}{" "}{t("characters")}</span>
          <span className={styles.wordCount}>
            {story.replace(/<[^>]*>/g, "").split(/\s+/).filter(w => w.length > 0).length}{" "}{t("words")}</span>
        </div>
      </div>
    </div>
            </>
  );
}
