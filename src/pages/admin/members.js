import { useState } from "react";
import { db } from "@/components/firebase";

import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  addDoc,
  Timestamp,
} from "firebase/firestore";

import styles from "@/styles/membership.module.css";

import {
  FaEdit,
  FaTrash,
  FaUserSlash,
  FaUserCheck,
  FaSearch,
  FaSpinner,
  FaUser,
  FaShieldAlt,
  FaTimes,
  FaSave,
  FaPlus,
  FaCalendarAlt,
} from "react-icons/fa";

import LinkComponent from "@/components/Links";
import { useI18n } from "@/i18n/I18nProvider";

// =====================================================
// GET USER FROM COOKIE
// =====================================================

function getUserFromCookie(cookieString) {
  const cookies = cookieString || "";

  const userCookie = cookies
    .split(";")
    .find((c) => c.trim().startsWith("user="));

  if (!userCookie) return null;

  try {
    const cookieValue = userCookie.substring(
      userCookie.indexOf("=") + 1
    );

    return JSON.parse(decodeURIComponent(cookieValue));
  } catch (error) {
    console.error("Cookie error:", error);
    return null;
  }
}

// =====================================================
// SSR
// =====================================================

export async function getServerSideProps(context) {
  const { req } = context;

  const userData = getUserFromCookie(req.headers.cookie || "");

  if (
    !userData ||
    !userData.username ||
    userData.username.toLowerCase() !== "newtalentsg"
  ) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  try {
    const membersSnap = await getDocs(
      collection(db, "members")
    );

    const members = membersSnap.docs.map((memberDoc) => ({
      id: memberDoc.id,
      ...memberDoc.data(),
    }));

    return {
      props: {
        members: JSON.parse(JSON.stringify(members)),
      },
    };
  } catch (error) {
    console.error("Error fetching members:", error);

    return {
      props: {
        members: [],
      },
    };
  }
}

// =====================================================
// DATE FORMATTER
// Supports:
// - Firestore Timestamp
// - ISO string
// - normal date string
// - milliseconds
// - seconds
// - {seconds, nanoseconds}
// - {_seconds, _nanoseconds}
// =====================================================

function formatDate(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "N/A";
  }

  try {
    let date;

    // Firestore Timestamp converted object
    if (
      typeof value === "object" &&
      typeof value.seconds === "number"
    ) {
      date = new Date(value.seconds * 1000);
    }

    // Firestore Timestamp with underscore fields
    else if (
      typeof value === "object" &&
      typeof value._seconds === "number"
    ) {
      date = new Date(value._seconds * 1000);
    }

    // JavaScript Date
    else if (value instanceof Date) {
      date = value;
    }

    // Number
    else if (typeof value === "number") {
      // seconds
      if (value < 10000000000) {
        date = new Date(value * 1000);
      }
      // milliseconds
      else {
        date = new Date(value);
      }
    }

    // String
    else if (typeof value === "string") {
      const trimmed = value.trim();

      // Numeric string
      if (/^\d+$/.test(trimmed)) {
        const numericValue = Number(trimmed);

        if (numericValue < 10000000000) {
          date = new Date(numericValue * 1000);
        } else {
          date = new Date(numericValue);
        }
      } else {
        date = new Date(trimmed);
      }
    }

    if (!date || isNaN(date.getTime())) {
      return "N/A";
    }

    return date.toLocaleDateString("rw-RW", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch (error) {
    console.error("Date formatting error:", error);
    return "N/A";
  }
}

// =====================================================
// DATETIME LOCAL FOR INPUT
// =====================================================

function formatDateForInput(value) {
  if (!value) return "";

  try {
    let date;

    if (
      typeof value === "object" &&
      typeof value.seconds === "number"
    ) {
      date = new Date(value.seconds * 1000);
    } else if (
      typeof value === "object" &&
      typeof value._seconds === "number"
    ) {
      date = new Date(value._seconds * 1000);
    } else if (typeof value === "number") {
      date =
        value < 10000000000
          ? new Date(value * 1000)
          : new Date(value);
    } else {
      date = new Date(value);
    }

    if (isNaN(date.getTime())) return "";

    const year = date.getFullYear();
    const month = String(
      date.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
      date.getDate()
    ).padStart(2, "0");

    const hours = String(
      date.getHours()
    ).padStart(2, "0");

    const minutes = String(
      date.getMinutes()
    ).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch {
    return "";
  }
}

// =====================================================
// COMPONENT
// =====================================================

export default function MembershipManagement({
  members: initialMembers,
}) {
  const { t } = useI18n();

  const [members, setMembers] = useState(
    initialMembers || []
  );

  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");

  const [editingMember, setEditingMember] =
    useState(null);

  // ===================================================
  // EDIT FORM
  // ===================================================

  const [editForm, setEditForm] = useState({
    phone: "",
    username: "",
    isMember: true,
    subscriptionExpiresAt: "",
  });

  // ===================================================
  // ADD MEMBER
  // ===================================================

  const [showAddForm, setShowAddForm] =
    useState(false);

  const [addForm, setAddForm] = useState({
    phone: "",
    username: "",
    isMember: true,
    subscriptionExpiresAt: "",
  });

  // ===================================================
  // SEARCH
  // ===================================================

  const filteredMembers = members.filter((member) => {
    const searchTerm = search.toLowerCase().trim();

    return (
      String(member.phone || "")
        .toLowerCase()
        .includes(searchTerm) ||
      String(member.username || "")
        .toLowerCase()
        .includes(searchTerm) ||
      String(member.id || "")
        .toLowerCase()
        .includes(searchTerm)
    );
  });

  // ===================================================
  // ADD MEMBER
  // ===================================================

  const addMember = async (e) => {
    e.preventDefault();

    if (!addForm.phone.trim()) {
      alert(t("❌ Shyiramo numero ya telephone."));
      return;
    }

    try {
      setLoading(true);

      let subscriptionExpiresAt = null;

      if (addForm.subscriptionExpiresAt) {
        const selectedDate = new Date(
          addForm.subscriptionExpiresAt
        );

        if (isNaN(selectedDate.getTime())) {
          alert(t("❌ Itariki winjijemo ntabwo ari yo."));
          setLoading(false);
          return;
        }

        subscriptionExpiresAt =
          Timestamp.fromDate(selectedDate);
      }

      const memberData = {
        phone: addForm.phone.trim(),
        username:
          addForm.username.trim() || null,

        isMember: addForm.isMember,

        subscriptionExpiresAt,

        createdAt: Timestamp.now(),

        updatedAt: Timestamp.now(),
      };

      const memberRef = await addDoc(
        collection(db, "members"),
        memberData
      );

      const newMember = {
        id: memberRef.id,

        ...memberData,

        // Convert Timestamp to something SSR-safe
        subscriptionExpiresAt:
          subscriptionExpiresAt
            ? {
                seconds:
                  subscriptionExpiresAt.seconds,
                nanoseconds:
                  subscriptionExpiresAt.nanoseconds,
              }
            : null,

        createdAt: {
          seconds: memberData.createdAt.seconds,
          nanoseconds:
            memberData.createdAt.nanoseconds,
        },

        updatedAt: {
          seconds: memberData.updatedAt.seconds,
          nanoseconds:
            memberData.updatedAt.nanoseconds,
        },
      };

      setMembers((prev) => [
        newMember,
        ...prev,
      ]);

      setAddForm({
        phone: "",
        username: "",
        isMember: true,
        subscriptionExpiresAt: "",
      });

      setShowAddForm(false);

      alert(
        t("✅ Umunyamuryango yongewe muri database neza!")
      );
    } catch (error) {
      console.error(
        "Error adding member:",
        error
      );

      alert(
        t("❌ Habaye ikibazo mu kongera umunyamuryango.")
      );
    } finally {
      setLoading(false);
    }
  };

  // ===================================================
  // TOGGLE ACTIVE / INACTIVE
  // ===================================================

  const toggleActivate = async (
    id,
    currentStatus
  ) => {
    const action = currentStatus
      ? "guhagarika"
      : "gusubiza";

    if (
      !confirm(
        t("Urahagije ushaka {action} iyi membership?", { action })
      )
    ) {
      return;
    }

    try {
      setLoading(true);

      await updateDoc(
        doc(db, "members", id),
        {
          isMember: !currentStatus,
          updatedAt: Timestamp.now(),
        }
      );

      setMembers((prev) =>
        prev.map((member) =>
          member.id === id
            ? {
                ...member,
                isMember: !currentStatus,
              }
            : member
        )
      );
    } catch (error) {
      console.error(error);

      alert(
        t("❌ Habaye ikibazo mu guhindura status.")
      );
    } finally {
      setLoading(false);
    }
  };

  // ===================================================
  // DELETE MEMBER
  // ===================================================

  const deleteMember = async (id) => {
    if (
      !confirm(
        t("Ushaka koko gusiba uyu munyamuryango burundu?")
      )
    ) {
      return;
    }

    try {
      setLoading(true);

      await deleteDoc(
        doc(db, "members", id)
      );

      setMembers((prev) =>
        prev.filter(
          (member) => member.id !== id
        )
      );

      alert(
        t("✅ Umunyamuryango yasibwe neza!")
      );
    } catch (error) {
      console.error(error);

      alert(
        t("❌ Habaye ikibazo mu gusiba.")
      );
    } finally {
      setLoading(false);
    }
  };

  // ===================================================
  // START EDIT
  // ===================================================

  const startEdit = (member) => {
    setEditingMember(member.id);

    setEditForm({
      phone: member.phone || "",
      username: member.username || "",
      isMember:
        member.isMember !== false,

      subscriptionExpiresAt:
        formatDateForInput(
          member.subscriptionExpiresAt
        ),
    });
  };

  // ===================================================
  // CANCEL EDIT
  // ===================================================

  const cancelEdit = () => {
    setEditingMember(null);

    setEditForm({
      phone: "",
      username: "",
      isMember: true,
      subscriptionExpiresAt: "",
    });
  };

  // ===================================================
  // SAVE EDIT
  // ===================================================

  const saveEdit = async (id) => {
    if (!editForm.phone.trim()) {
      alert(
        t("❌ Numero ya telephone ntishobora kuba empty.")
      );
      return;
    }

    try {
      setLoading(true);

      let subscriptionExpiresAt = null;

      if (editForm.subscriptionExpiresAt) {
        const selectedDate = new Date(
          editForm.subscriptionExpiresAt
        );

        if (isNaN(selectedDate.getTime())) {
          alert(
            t("❌ Itariki winjijemo ntabwo ari yo.")
          );

          setLoading(false);
          return;
        }

        subscriptionExpiresAt =
          Timestamp.fromDate(selectedDate);
      }

      const updatedData = {
        phone: editForm.phone.trim(),

        username:
          editForm.username.trim() || null,

        isMember: editForm.isMember,

        subscriptionExpiresAt,

        updatedAt: Timestamp.now(),
      };

      await updateDoc(
        doc(db, "members", id),
        updatedData
      );

      setMembers((prev) =>
        prev.map((member) =>
          member.id === id
            ? {
                ...member,
                phone: updatedData.phone,
                username:
                  updatedData.username,

                isMember:
                  updatedData.isMember,

                subscriptionExpiresAt:
                  subscriptionExpiresAt
                    ? {
                        seconds:
                          subscriptionExpiresAt.seconds,
                        nanoseconds:
                          subscriptionExpiresAt.nanoseconds,
                      }
                    : null,
              }
            : member
        )
      );

      cancelEdit();

      alert(
        t("✅ Amakuru yavuguruwe neza!")
      );
    } catch (error) {
      console.error(error);

      alert(
        t("❌ Habaye ikibazo mu kubika amakuru.")
      );
    } finally {
      setLoading(false);
    }
  };

  // ===================================================
  // RENDER
  // ===================================================

  return (
    <>
      <LinkComponent />

      <div className={styles.container}>
        <div className={styles.card}>

          {/* ==========================================
              HEADER
          ========================================== */}

          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <FaShieldAlt
                className={styles.headerIcon}
              />

              <div>
                <h1 className={styles.title}>{t("Membership Management")}</h1>

                <p className={styles.subtitle}>{t("Manage all members on the platform")}</p>
              </div>
            </div>

            <div className={styles.stats}>
              <span
                className={
                  styles.statBadge
                }
              >
                <FaUser />

                <strong>
                  {members.length}
                </strong>
              </span>

              <span
                className={`${styles.statBadge} ${styles.statActive}`}
              >
                <FaUserCheck />

                <strong>
                  {
                    members.filter(
                      (member) =>
                        member.isMember !== false
                    ).length
                  }
                </strong>
              </span>

              <span
                className={`${styles.statBadge} ${styles.statInactive}`}
              >
                <FaUserSlash />

                <strong>
                  {
                    members.filter(
                      (member) =>
                        member.isMember === false
                    ).length
                  }
                </strong>
              </span>
            </div>
          </div>

          {/* ==========================================
              ADD MEMBER BUTTON
          ========================================== */}

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginBottom: "20px",
            }}
          >
            <button
              type="button"
              onClick={() =>
                setShowAddForm(
                  !showAddForm
                )
              }
              className={`${styles.actionBtn} ${styles.saveBtn}`}
            >
              {showAddForm ? (
                <>
                  <FaTimes />
                  <span>{t("Close")}</span>
                </>
              ) : (
                <>
                  <FaPlus />
                  <span>{t("Add Member")}</span>
                </>
              )}
            </button>
          </div>

          {/* ==========================================
              ADD MEMBER FORM
          ========================================== */}

          {showAddForm && (
            <form
              onSubmit={addMember}
              style={{
                marginBottom: "25px",
                padding: "20px",
                borderRadius: "12px",
                border: "1px solid rgba(128,128,128,0.25)",
              }}
            >
              <h2
                style={{
                  marginTop: 0,
                  marginBottom: "18px",
                }}
              >
                <FaPlus />{" "}{t("Add New Member")}</h2>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "15px",
                }}
              >

                {/* PHONE */}

                <div>
                  <label>{t("Phone")}</label>

                  <input
                    type="text"
                    placeholder={t("078xxxxxxx")}
                    value={addForm.phone}
                    onChange={(e) =>
                      setAddForm({
                        ...addForm,
                        phone:
                          e.target.value,
                      })
                    }
                    className={
                      styles.editInput
                    }
                    required
                  />
                </div>

                {/* USERNAME */}

                <div>
                  <label>{t("Username")}</label>

                  <input
                    type="text"
                    placeholder={t("Username")}
                    value={
                      addForm.username
                    }
                    onChange={(e) =>
                      setAddForm({
                        ...addForm,
                        username:
                          e.target.value,
                      })
                    }
                    className={
                      styles.editInput
                    }
                  />
                </div>

                {/* EXPIRY */}

                <div>
                  <label>
                    <FaCalendarAlt />{" "}{t("Expiry")}</label>

                  <input
                    type="datetime-local"
                    value={
                      addForm.subscriptionExpiresAt
                    }
                    onChange={(e) =>
                      setAddForm({
                        ...addForm,
                        subscriptionExpiresAt:
                          e.target.value,
                      })
                    }
                    className={
                      styles.editInput
                    }
                  />
                </div>

                {/* STATUS */}

                <div>
                  <label>{t("Status")}</label>

                  <select
                    value={
                      addForm.isMember
                        ? "active"
                        : "inactive"
                    }
                    onChange={(e) =>
                      setAddForm({
                        ...addForm,
                        isMember:
                          e.target.value ===
                          "active",
                      })
                    }
                    className={
                      styles.editInput
                    }
                  >
                    <option value="active">{t("Active")}</option>

                    <option value="inactive">{t("Inactive")}</option>
                  </select>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  marginTop: "20px",
                }}
              >
                <button
                  type="submit"
                  disabled={loading}
                  className={`${styles.actionBtn} ${styles.saveBtn}`}
                >
                  {loading ? (
                    <FaSpinner
                      className={
                        styles.spinner
                      }
                    />
                  ) : (
                    <FaSave />
                  )}

                  <span>
                    {loading
                      ? t("Saving...")
                      : t("Add Member")}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setShowAddForm(false)
                  }
                  className={`${styles.actionBtn} ${styles.cancelBtn}`}
                >
                  <FaTimes />
                  <span>{t("Cancel")}</span>
                </button>
              </div>
            </form>
          )}

          {/* ==========================================
              SEARCH
          ========================================== */}

          <div
            className={
              styles.searchWrapper
            }
          >
            <FaSearch
              className={
                styles.searchIcon
              }
            />

            <input
              type="text"
              placeholder={t("Shaka mu phone, username cyangwa id...")}
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              className={
                styles.searchInput
              }
            />
          </div>

          {/* ==========================================
              TABLE
          ========================================== */}

          <div
            className={
              styles.tableWrapper
            }
          >
            <table
              className={styles.table}
            >
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t("Phone")}</th>
                  <th>{t("Username")}</th>
                  <th>{t("Status")}</th>
                  <th>{t("Expiry")}</th>
                  <th>{t("Actions")}</th>
                </tr>
              </thead>

              <tbody>
                {filteredMembers.length ===
                0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      className={
                        styles.emptyRow
                      }
                    >{t("📭 Nta munyamuryango")}</td>
                  </tr>
                ) : (
                  filteredMembers.map(
                    (
                      member,
                      index
                    ) => {
                      const isActive =
                        member.isMember !==
                        false;

                      const isEditing =
                        editingMember ===
                        member.id;

                      return (
                        <tr
                          key={
                            member.id
                          }
                          className={
                            !isActive
                              ? styles.inactiveRow
                              : ""
                          }
                        >
                          {/* NUMBER */}

                          <td
                            className={
                              styles.indexCell
                            }
                          >
                            {index + 1}
                          </td>

                          {/* PHONE */}

                          <td
                            className={
                              styles.phoneCell
                            }
                          >
                            {isEditing ? (
                              <input
                                type="text"
                                value={
                                  editForm.phone
                                }
                                onChange={(
                                  e
                                ) =>
                                  setEditForm(
                                    {
                                      ...editForm,
                                      phone:
                                        e
                                          .target
                                          .value,
                                    }
                                  )
                                }
                                className={
                                  styles.editInput
                                }
                              />
                            ) : (
                              member.phone ||
                              "N/A"
                            )}
                          </td>

                          {/* USERNAME */}

                          <td
                            className={
                              styles.usernameCell
                            }
                          >
                            {isEditing ? (
                              <input
                                type="text"
                                value={
                                  editForm.username ||
                                  ""
                                }
                                onChange={(
                                  e
                                ) =>
                                  setEditForm(
                                    {
                                      ...editForm,
                                      username:
                                        e
                                          .target
                                          .value,
                                    }
                                  )
                                }
                                className={
                                  styles.editInput
                                }
                              />
                            ) : (
                              member.username ||
                              "—"
                            )}
                          </td>

                          {/* STATUS */}

                          <td
                            className={
                              styles.statusCell
                            }
                          >
                            <span
                              className={
                                isActive
                                  ? styles.statusActive
                                  : styles.statusInactive
                              }
                            >
                              {isActive ? (
                                <FaUserCheck />
                              ) : (
                                <FaUserSlash />
                              )}

                              {isActive
                                ? t("Active")
                                : t("Inactive")}
                            </span>
                          </td>

                          {/* EXPIRY */}

                          <td
                            className={
                              styles.expiryCell
                            }
                          >
                            {isEditing ? (
                              <input
                                type="datetime-local"
                                value={
                                  editForm.subscriptionExpiresAt
                                }
                                onChange={(
                                  e
                                ) =>
                                  setEditForm(
                                    {
                                      ...editForm,
                                      subscriptionExpiresAt:
                                        e
                                          .target
                                          .value,
                                    }
                                  )
                                }
                                className={
                                  styles.editInput
                                }
                              />
                            ) : (
                              formatDate(
                                member.subscriptionExpiresAt
                              )
                            )}
                          </td>

                          {/* ACTIONS */}

                          <td
                            className={
                              styles.actionCell
                            }
                          >
                            {isEditing ? (
                              <div
                                className={
                                  styles.actionGroup
                                }
                              >
                                <button
                                  onClick={() =>
                                    saveEdit(
                                      member.id
                                    )
                                  }
                                  className={`${styles.actionBtn} ${styles.saveBtn}`}
                                  disabled={
                                    loading
                                  }
                                >
                                  {loading ? (
                                    <FaSpinner
                                      className={
                                        styles.spinner
                                      }
                                    />
                                  ) : (
                                    <FaSave />
                                  )}

                                  <span>{t("Save")}</span>
                                </button>

                                <button
                                  onClick={
                                    cancelEdit
                                  }
                                  className={`${styles.actionBtn} ${styles.cancelBtn}`}
                                >
                                  <FaTimes />

                                  <span>{t("Cancel")}</span>
                                </button>
                              </div>
                            ) : (
                              <div
                                className={
                                  styles.actionGroup
                                }
                              >

                                {/* EDIT */}

                                <button
                                  onClick={() =>
                                    startEdit(
                                      member
                                    )
                                  }
                                  className={`${styles.actionBtn} ${styles.editBtn}`}
                                  title={t("Hindura")}
                                >
                                  <FaEdit />
                                </button>

                                {/* ACTIVATE / DEACTIVATE */}

                                <button
                                  onClick={() =>
                                    toggleActivate(
                                      member.id,
                                      isActive
                                    )
                                  }
                                  className={`${styles.actionBtn} ${
                                    isActive
                                      ? styles.deactivateBtn
                                      : styles.activateBtn
                                  }`}
                                  title={
                                    isActive
                                      ? t("Hagarika")
                                      : t("Subiza")
                                  }
                                  disabled={
                                    loading
                                  }
                                >
                                  {isActive ? (
                                    <FaUserSlash />
                                  ) : (
                                    <FaUserCheck />
                                  )}
                                </button>

                                {/* DELETE */}

                                <button
                                  onClick={() =>
                                    deleteMember(
                                      member.id
                                    )
                                  }
                                  className={`${styles.actionBtn} ${styles.deleteBtn}`}
                                  title={t("Siba")}
                                  disabled={
                                    loading
                                  }
                                >
                                  <FaTrash />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    }
                  )
                )}
              </tbody>
            </table>
          </div>

          {/* ==========================================
              FOOTER
          ========================================== */}

          <div
            className={styles.footer}
          >
            <p>{t("📊 Showing")}{" "}
              <strong>
                {
                  filteredMembers.length
                }
              </strong>{" "}
              /{" "}
              <strong>
                {members.length}
              </strong>{" "}{t("members")}</p>
          </div>
        </div>
      </div>
    </>
  );
}
