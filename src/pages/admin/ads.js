import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { db } from "../../components/firebase";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  query,
  orderBy,
} from "firebase/firestore";
import Cookies from "js-cookie";
import styles from "../../styles/adminAds.module.css";
import {
  FaPlus,
  FaTrash,
  FaEdit,
  FaSave,
  FaImage,
  FaVideo,
  FaLink,
  FaCheck,
  FaTimes,
  FaSpinner,
  FaUpload,
  FaEye,
  FaEyeSlash,
  FaArrowLeft,
  FaExclamationTriangle,
  FaInfoCircle,
  FaFileAlt,
  FaClock,
  FaSync,
} from "react-icons/fa";
import LinkComponent from "../../components/Links";
import { useI18n } from "@/i18n/I18nProvider";
// ============================================
// CHECK ADMIN - SSR
// ============================================
export async function getServerSideProps(context) {
  const cookies = context.req.headers.cookie || "";
  const userCookie = cookies.split(";").find((c) => c.trim().startsWith("user="));

  if (!userCookie) {
    return {
      redirect: { destination: "/login", permanent: false },
    };
  }

  try {
    const cookieValue = userCookie.split("=")[1];
    const userData = JSON.parse(decodeURIComponent(cookieValue));
    const username = userData.username || "";

    if (username.toLowerCase() !== "newtalentsg") {
      return {
        redirect: { destination: "/", permanent: false },
      };
    }

    return { props: { username } };
  } catch {
    return {
      redirect: { destination: "/login", permanent: false },
    };
  }
}

// ============================================
// COMPONENT
// ============================================
export default function AdminAds({ username }) {
  const { t } = useI18n();

  const router = useRouter();
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  // ===== FORM STATE =====
  const [form, setForm] = useState({
    title: "",
    description: "",
    link: "",
    mediaType: "image",
    mediaUrl: "",
    active: true,
  });

  const fileInputRef = useRef(null);

  // ===== FETCH ADS =====
  const fetchAds = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, "ads"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      const data = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAds(data);
    } catch (err) {
      console.error(err);
      setError(t("Habaye ikibazo mu kubona ads."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAds();
  }, []);

  // ===== RESET FORM =====
  const resetForm = () => {
    setForm({
      title: "",
      description: "",
      link: "",
      mediaType: "image",
      mediaUrl: "",
      active: true,
    });
    setPreviewImage(null);
    setEditingId(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // ===== HANDLE CHANGE =====
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // ===== UPLOAD TO CLOUDINARY =====
  const uploadToCloudinary = async (file) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", "Newtalents");

    const res = await fetch(
      "https://api.cloudinary.com/v1_1/dilowy3fd/image/upload",
      { method: "POST", body: fd }
    );

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || "Upload yananiye.");
    }

    const data = await res.json();
    return data.secure_url;
  };

  // ===== HANDLE FILE SELECT =====
  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewImage(reader.result);
    };
    reader.readAsDataURL(file);

    try {
      setSubmitting(true);
      const url = await uploadToCloudinary(file);
      setForm((prev) => ({ ...prev, mediaUrl: url }));
      setSuccess(t("Ifoto yakojejwe neza!"));
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message || t("Upload yananiye."));
      setTimeout(() => setError(""), 3000);
    } finally {
      setSubmitting(false);
    }
  };

  // ===== SUBMIT FORM =====
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.title.trim()) {
      setError(t("Andika umutwe w'iyi ad."));
      return;
    }

    if (!form.mediaUrl.trim()) {
      setError(t("Ongera ubike ifoto cyangwa video."));
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const dataToSave = {
        title: form.title.trim(),
        description: form.description.trim(),
        link: form.link.trim(),
        mediaType: form.mediaType,
        mediaUrl: form.mediaUrl.trim(),
        active: form.active,
        updatedAt: new Date().toISOString(),
      };

      if (editingId) {
        await updateDoc(doc(db, "ads", editingId), dataToSave);
        setSuccess(t("Ad ivuguruwe neza!"));
      } else {
        await addDoc(collection(db, "ads"), {
          ...dataToSave,
          createdAt: new Date().toISOString(),
        });
        setSuccess(t("Ad yashyizweho neza!"));
      }

      await fetchAds();
      resetForm();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error(err);
      setError(err.message || t("Habaye ikibazo mu kubika ad."));
      setTimeout(() => setError(""), 3000);
    } finally {
      setSubmitting(false);
    }
  };

  // ===== DELETE AD =====
  const handleDelete = async (id) => {
    if (!confirm(t("Ushaka koko gusiba iyi ad?"))) return;

    try {
      await deleteDoc(doc(db, "ads", id));
      await fetchAds();
      setSuccess(t("Ad yasibwe neza!"));
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error(err);
      setError(t("Habaye ikibazo mu gusiba ad."));
      setTimeout(() => setError(""), 3000);
    }
  };

  // ===== TOGGLE ACTIVE (Show/Hide) =====
  const toggleActive = async (id, currentStatus) => {
    try {
      const newStatus = !currentStatus;
      await updateDoc(doc(db, "ads", id), {
        active: newStatus,
        updatedAt: new Date().toISOString(),
      });
      await fetchAds();
      setSuccess(newStatus ? t("Ad yerekanwe neza!") : t("Ad yihishwe neza!"));
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error(err);
      setError(t("Habaye ikibazo mu guhindura status."));
      setTimeout(() => setError(""), 3000);
    }
  };

  // ===== EDIT AD =====
  const handleEdit = (ad) => {
    setEditingId(ad.id);
    setForm({
      title: ad.title || "",
      description: ad.description || "",
      link: ad.link || "",
      mediaType: ad.mediaType || "image",
      mediaUrl: ad.mediaUrl || "",
      active: ad.active !== undefined ? ad.active : true,
    });
    setPreviewImage(ad.mediaUrl || null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ===== CANCEL EDIT =====
  const handleCancelEdit = () => {
    resetForm();
  };

  // ===== FORMAT DATE =====
  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    try {
      return new Date(dateStr).toLocaleDateString("rw-RW", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <>
    <LinkComponent />
    <div className={styles.container}>
      <div className={styles.card}>
        {/* HEADER */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <button onClick={() => router.push("/admin")} className={styles.backBtn}>
              <FaArrowLeft />{" "}{t("Subira")}</button>
            <div>
              <h1 className={styles.title}>{t("📢 Manage Ads")}</h1>
              <p className={styles.subtitle}>
                <FaInfoCircle className={styles.infoIcon} />{" "}{t("{username} (Admin)", { username })}</p>
            </div>
          </div>
          <div className={styles.headerStats}>
            <span className={styles.statBadge}>
              <FaImage /> {ads.length}
            </span>
            <span className={styles.statBadge}>
              <FaEye /> {ads.filter((a) => a.active).length}{" "}{t("active")}</span>
            <span className={styles.statBadge}>
              <FaEyeSlash /> {ads.filter((a) => !a.active).length}{" "}{t("hidden")}</span>
          </div>
        </div>

        {/* MESSAGES */}
        {error && (
          <div className={styles.errorMsg}>
            <FaExclamationTriangle /> {error}
          </div>
        )}
        {success && (
          <div className={styles.successMsg}>
            <FaCheck /> {success}
          </div>
        )}

        {/* FORM */}
        <form onSubmit={handleSubmit} className={styles.form}>
          <h2 className={styles.formTitle}>
            {editingId ? t("✏️ Hindura Ad") : t("➕ Shyiramo Ad nshya")}
          </h2>

          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label}>{t("Umutwe *")}</label>
              <input
                type="text"
                name="title"
                placeholder={t("Andika umutwe...")}
                value={form.title}
                onChange={handleChange}
                className={styles.input}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>{t("Ibyo ivuga")}</label>
              <textarea
                name="description"
                placeholder={t("Andika ibisobanuro...")}
                value={form.description}
                onChange={handleChange}
                className={styles.textarea}
                rows={3}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>
                <FaLink />{" "}{t("Link (URL)")}</label>
              <input
                type="url"
                name="link"
                placeholder="https://example.com"
                value={form.link}
                onChange={handleChange}
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>{t("Ubwoko bwa media")}</label>
              <select
                name="mediaType"
                value={form.mediaType}
                onChange={handleChange}
                className={styles.select}
              >
                <option value="image">{t("🖼️ Image")}</option>
                <option value="video">{t("🎬 Video")}</option>
              </select>
            </div>

            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
              <label className={styles.label}>
                <FaUpload />{" "}{t("Ifoto cyangwa Video URL")}</label>
              <div className={styles.uploadWrapper}>
                <input
                  type="text"
                  name="mediaUrl"
                  placeholder={t("Cyangwa shyiramo URL...")}
                  value={form.mediaUrl}
                  onChange={handleChange}
                  className={`${styles.input} ${styles.mediaInput}`}
                />
                <div className={styles.fileUpload}>
                  <label className={styles.fileLabel}>
                    <FaUpload />{" "}{t("Hitamo ifoto")}<input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*,video/*"
                      onChange={handleFileSelect}
                      className={styles.fileInput}
                    />
                  </label>
                  {submitting && <FaSpinner className={styles.spinner} />}
                </div>
              </div>
              {previewImage && (
                <div className={styles.previewWrapper}>
                  {form.mediaType === "video" ? (
                    <video src={previewImage} controls className={styles.previewMedia} />
                  ) : (
                    <img src={previewImage} alt={t("Preview")} className={styles.previewMedia} />
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewImage(null);
                      setForm((prev) => ({ ...prev, mediaUrl: "" }));
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className={styles.removePreview}
                  >
                    <FaTimes />
                  </button>
                </div>
              )}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  name="active"
                  checked={form.active}
                  onChange={handleChange}
                />
                <span>{t("Active (igaragara)")}</span>
              </label>
            </div>
          </div>

          <div className={styles.formActions}>
            <button type="submit" disabled={submitting} className={styles.submitBtn}>
              {submitting ? (
                <><FaSpinner className={styles.spinner} />{" "}{t("Ibihe...")}</>
              ) : editingId ? (
                <><FaSave />{" "}{t("Vugurura")}</>
              ) : (
                <><FaPlus />{" "}{t("Shyiramo")}</>
              )}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className={styles.cancelBtn}
              >
                <FaTimes />{" "}{t("Kureka")}</button>
            )}
          </div>
        </form>

        {/* ADS TABLE */}
        <div className={styles.tableSection}>
          <h2 className={styles.sectionTitle}>
            <FaFileAlt />{" "}{t("Ads zose ({length})", { length: ads.length })}</h2>

          {loading ? (
            <div className={styles.loadingState}>
              <FaSpinner className={styles.loadingSpinner} />
              <p>{t("Ibihe...")}</p>
            </div>
          ) : ads.length === 0 ? (
            <div className={styles.emptyState}>
              <FaImage className={styles.emptyIcon} />
              <h3>{t("📭 Nta Ad")}</h3>
              <p>{t("Nta ad yashyizweho. Koresha formu yo hejuru.")}</p>
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>{t("Media")}</th>
                    <th>{t("Title")}</th>
                    <th>{t("Link")}</th>
                    <th>{t("Type")}</th>
                    <th>{t("Status")}</th>
                    <th>{t("Created")}</th>
                    <th>{t("Actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {ads.map((ad, index) => (
                    <tr key={ad.id} className={!ad.active ? styles.inactiveRow : ""}>
                      <td className={styles.indexCell}>{index + 1}</td>
                      <td className={styles.mediaCell}>
                        {ad.mediaType === "video" ? (
                          <video src={ad.mediaUrl} className={styles.thumbVideo} />
                        ) : (
                          <img src={ad.mediaUrl} alt={ad.title} className={styles.thumbImage} />
                        )}
                      </td>
                      <td className={styles.titleCell}>
                        <span className={styles.titleText}>{ad.title || t("Untitled")}</span>
                        {ad.description && (
                          <span className={styles.descText}>{ad.description}</span>
                        )}
                      </td>
                      <td className={styles.linkCell}>
                        {ad.link ? (
                          <a href={ad.link} target="_blank" rel="noopener noreferrer" className={styles.linkUrl}>
                            <FaLink />{" "}{t("Link")}</a>
                        ) : (
                          <span className={styles.noLink}>N/A</span>
                        )}
                      </td>
                      <td className={styles.typeCell}>
                        <span className={ad.mediaType === "video" ? styles.typeVideo : styles.typeImage}>
                          {ad.mediaType === "video" ? "🎬" : "🖼️"}
                        </span>
                      </td>
                      <td className={styles.statusCell}>
                        <span className={ad.active ? styles.statusActive : styles.statusInactive}>
                          {ad.active ? <FaCheck /> : <FaTimes />}
                          {ad.active ? t("Active") : t("Hidden")}
                        </span>
                      </td>
                      <td className={styles.dateCell}>
                        {formatDate(ad.createdAt)}
                      </td>
                      <td className={styles.actionCell}>
                        <button
                          onClick={() => handleEdit(ad)}
                          className={styles.editBtn}
                          title={t("Hindura")}
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => toggleActive(ad.id, ad.active)}
                          className={ad.active ? styles.showBtn : styles.hideBtn}
                          title={ad.active ? t("Hisha") : t("Yerekana")}
                        >
                          {ad.active ? <FaEyeSlash /> : <FaEye />}
                        </button>
                        <button
                          onClick={() => handleDelete(ad.id)}
                          className={styles.deleteBtn}
                          title={t("Siba")}
                        >
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className={styles.footer}>
          <p>{t("📊 Total: {length} ads ·", { length: ads.length })}{" "}{ads.filter(a => a.active).length}{" "}{t("active ·")}{" "}{ads.filter(a => !a.active).length}{" "}{t("hidden")}</p>
        </div>
      </div>
    </div>
          </>
  );
}
