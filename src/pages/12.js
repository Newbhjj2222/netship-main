import { useState } from "react";
import { db } from "../components/firebase";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  updateDoc
} from "firebase/firestore";
import { useI18n } from "@/i18n/I18nProvider";

export default function MembersPage({ initialMembers }) {
  const { t } = useI18n();

  const [members, setMembers] = useState(initialMembers);
  const [loading, setLoading] = useState(false);

  const handleDelete = async (phone) => {
    if (!confirm(t("Are you sure you want to delete member {phone}?", { phone }))) return;

    setLoading(true);
    try {
      await deleteDoc(doc(db, "members", phone));
      setMembers(members.filter((m) => m.phone !== phone));
    } catch (error) {
      alert("Delete failed: " + error.message);
    }
    setLoading(false);
  };

  const handleCopy = (phone) => {
    navigator.clipboard.writeText(phone);
    alert(t("Copied: {phone}", { phone }));
  };

  // 🔥 NEW: Edit Username
  const handleEditUsername = async (member) => {
    const newUsername = prompt(t("Enter new username:"), member.username || "");

    if (!newUsername || newUsername === member.username) return;

    setLoading(true);
    try {
      await updateDoc(doc(db, "members", member.phone), {
        username: newUsername,
      });

      setMembers((prev) =>
        prev.map((m) =>
          m.phone === member.phone ? { ...m, username: newUsername } : m
        )
      );
    } catch (error) {
      alert("Update failed: " + error.message);
    }
    setLoading(false);
  };

  return (
    <div style={styles.page}>
      
      <main style={styles.main}>
        <div style={styles.card}>
          <h1 style={styles.title}>{t("Memberships")}</h1>
          {loading && <p>{t("Processing...")}</p>}
          {!loading && members.length === 0 && <p>{t("No members found.")}</p>}

          {members.length > 0 && (
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>{t("Phone")}</th>
                    <th>{t("Username")}</th>
                    <th>{t("Member?")}</th>
                    <th>{t("Subscribed At")}</th>
                    <th>{t("Expires At")}</th>
                    <th>{t("Action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.phone} style={styles.row}>
                      <td style={styles.phoneCell}>
                        {m.phone}
                        <button
                          style={styles.copyButton}
                          onClick={() => handleCopy(m.phone)}
                          title={t("Copy phone")}
                        >
                          📋
                        </button>
                      </td>

                      <td>{m.username || "-"}</td>

                      <td>{m.isMember ? t("Yes") : t("No")}</td>

                      <td>
                        {m.createdAt
                          ? new Date(m.createdAt.seconds * 1000).toLocaleString()
                          : "-"}
                      </td>

                      <td>
                        {m.subscriptionExpiresAt
                          ? new Date(
                              m.subscriptionExpiresAt.seconds * 1000
                            ).toLocaleDateString()
                          : "-"}
                      </td>

                      <td style={{ display: "flex", gap: 8 }}>
                        {/* 🆕 EDIT BUTTON */}
                        <button
                          style={styles.editButton}
                          onClick={() => handleEditUsername(m)}
                        >{t("Edit")}</button>

                        <button
                          style={styles.deleteButton}
                          onClick={() => handleDelete(m.phone)}
                        >{t("Delete")}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
      
    </div>
  );
}

export async function getServerSideProps() {
  try {
    const membersCol = collection(db, "members");
    const snapshot = await getDocs(membersCol);
    const members = snapshot.docs.map((doc) => doc.data());

    return { props: { initialMembers: members } };
  } catch (error) {
    console.error("SSR fetch members error:", error);
    return { props: { initialMembers: [] } };
  }
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    background: "#f0f4f8",
  },
  main: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 1100,
    background: "#fff",
    padding: 30,
    borderRadius: 12,
    boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
    overflowX: "auto",
  },
  title: {
    fontSize: "1.8rem",
    marginBottom: 20,
    color: "#111827",
  },
  tableContainer: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 700,
  },
  row: {
    borderBottom: "1px solid #e5e7eb",
  },
  phoneCell: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  copyButton: {
    padding: "2px 6px",
    fontSize: 14,
    borderRadius: 6,
    border: "1px solid #d1d5db",
    background: "#f9fafb",
    cursor: "pointer",
  },
  editButton: {
    padding: "6px 12px",
    background: "#3b82f6",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
  },
  deleteButton: {
    padding: "6px 12px",
    background: "#ef4444",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
  },
};
