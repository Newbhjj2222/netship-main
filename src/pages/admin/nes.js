import { db } from "@/components/firebase";

import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  Timestamp,
} from "firebase/firestore";

import { useState } from "react";
import { useRouter } from "next/router";

import styles from "@/styles/nes.module.css";

import {
  FaSearch,
  FaUser,
  FaCoins,
  FaClock,
  FaEdit,
  FaSave,
  FaSpinner,
  FaChartLine,
  FaCheckCircle,
  FaExclamationCircle,
  FaPlus,
  FaUserPlus,
  FaTimes,
} from "react-icons/fa";

import LinkComponent from "../../components/Links";
import { useI18n } from "@/i18n/I18nProvider";

/* =========================================================
   DATE TO JAVASCRIPT DATE

   Iyi function igerageza format nyinshi cyane:
   - Firestore Timestamp
   - Timestamp.toDate()
   - seconds
   - _seconds
   - nanoseconds
   - _nanoseconds
   - milliseconds
   - ISO
   - date string
   - numeric string
   - object ifite value
   - object ifite date
   - object ifite timestamp
========================================================= */

function convertToDate(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  try {
    /* -----------------------------------------------
       JavaScript Date
    ------------------------------------------------ */

    if (value instanceof Date) {
      return Number.isNaN(
        value.getTime()
      )
        ? null
        : value;
    }

    /* -----------------------------------------------
       Firestore Timestamp
    ------------------------------------------------ */

    if (
      typeof value === "object" &&
      typeof value.toDate === "function"
    ) {
      const date =
        value.toDate();

      if (
        date instanceof Date &&
        !Number.isNaN(
          date.getTime()
        )
      ) {
        return date;
      }
    }

    /* -----------------------------------------------
       Firestore Timestamp serialized

       {
         seconds: 1234567890,
         nanoseconds: 123
       }
    ------------------------------------------------ */

    if (
      typeof value === "object" &&
      value.seconds !== undefined
    ) {
      const seconds =
        Number(value.seconds);

      const nanoseconds =
        Number(
          value.nanoseconds || 0
        );

      if (
        Number.isFinite(
          seconds
        )
      ) {
        const date =
          new Date(
            seconds * 1000 +
              nanoseconds /
                1000000
          );

        if (
          !Number.isNaN(
            date.getTime()
          )
        ) {
          return date;
        }
      }
    }

    /* -----------------------------------------------
       Firestore serialized with _
    ------------------------------------------------ */

    if (
      typeof value === "object" &&
      value._seconds !== undefined
    ) {
      const seconds =
        Number(
          value._seconds
        );

      const nanoseconds =
        Number(
          value._nanoseconds || 0
        );

      if (
        Number.isFinite(
          seconds
        )
      ) {
        const date =
          new Date(
            seconds * 1000 +
              nanoseconds /
                1000000
          );

        if (
          !Number.isNaN(
            date.getTime()
          )
        ) {
          return date;
        }
      }
    }

    /* -----------------------------------------------
       Object ifite date
    ------------------------------------------------ */

    if (
      typeof value === "object" &&
      value.date !== undefined
    ) {
      const date =
        convertToDate(
          value.date
        );

      if (date) {
        return date;
      }
    }

    /* -----------------------------------------------
       Object ifite timestamp
    ------------------------------------------------ */

    if (
      typeof value === "object" &&
      value.timestamp !== undefined
    ) {
      const date =
        convertToDate(
          value.timestamp
        );

      if (date) {
        return date;
      }
    }

    /* -----------------------------------------------
       Object ifite value
    ------------------------------------------------ */

    if (
      typeof value === "object" &&
      value.value !== undefined
    ) {
      const date =
        convertToDate(
          value.value
        );

      if (date) {
        return date;
      }
    }

    /* -----------------------------------------------
       Number
    ------------------------------------------------ */

    if (
      typeof value === "number"
    ) {
      // Seconds
      if (
        value > 0 &&
        value < 10000000000
      ) {
        const date =
          new Date(
            value * 1000
          );

        if (
          !Number.isNaN(
            date.getTime()
          )
        ) {
          return date;
        }
      }

      // Milliseconds
      if (value > 0) {
        const date =
          new Date(value);

        if (
          !Number.isNaN(
            date.getTime()
          )
        ) {
          return date;
        }
      }
    }

    /* -----------------------------------------------
       String
    ------------------------------------------------ */

    if (
      typeof value === "string"
    ) {
      const text =
        value.trim();

      if (!text) {
        return null;
      }

      /* Numeric string */

      if (
        /^-?\d+(\.\d+)?$/.test(
          text
        )
      ) {
        const number =
          Number(text);

        if (
          Number.isFinite(
            number
          )
        ) {
          // Seconds
          if (
            number > 0 &&
            number < 10000000000
          ) {
            const date =
              new Date(
                number * 1000
              );

            if (
              !Number.isNaN(
                date.getTime()
              )
            ) {
              return date;
            }
          }

          // Milliseconds
          if (number > 0) {
            const date =
              new Date(number);

            if (
              !Number.isNaN(
                date.getTime()
              )
            ) {
              return date;
            }
          }
        }
      }

      /* Normal date string */

      const date =
        new Date(text);

      if (
        !Number.isNaN(
          date.getTime()
        )
      ) {
        return date;
      }
    }

    /* -----------------------------------------------
       Last attempt

       Niba object ifite toString()
    ------------------------------------------------ */

    if (
      typeof value === "object"
    ) {
      const stringValue =
        String(value);

      if (
        stringValue &&
        stringValue !==
          "[object Object]"
      ) {
        const date =
          new Date(
            stringValue
          );

        if (
          !Number.isNaN(
            date.getTime()
          )
        ) {
          return date;
        }
      }
    }
  } catch (error) {
    console.error(
      "DATE CONVERSION ERROR:",
      error
    );
  }

  return null;
}

/* =========================================================
   FIND DATE FROM USER DATA

   Iyi ntireba time gusa.
   Ireba fields nyinshi.
========================================================= */

function getUserDate(data) {
  if (!data) {
    return null;
  }

  const possibleFields = [
    "time",
    "updatedAt",
    "createdAt",
    "date",
    "timestamp",
    "created",
    "updated",
    "subscriptionExpiresAt",
  ];

  for (
    const field of possibleFields
  ) {
    if (
      data[field] !==
        undefined &&
      data[field] !== null &&
      data[field] !== ""
    ) {
      const date =
        convertToDate(
          data[field]
        );

      if (date) {
        return date;
      }
    }
  }

  return null;
}

/* =========================================================
   FORMAT DATE
========================================================= */

function formatDate(value) {
  const date =
    convertToDate(value);

  if (!date) {
    return "Nta tariki yabonetse";
  }

  try {
    return new Intl.DateTimeFormat(
      "rw-RW",
      {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }
    ).format(date);
  } catch {
    return date.toLocaleString();
  }
}

/* =========================================================
   NORMALIZE NES
========================================================= */

function normalizeNes(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const number =
    Number(value);

  if (
    !Number.isFinite(number) ||
    number < 0 ||
    !Number.isInteger(number)
  ) {
    return null;
  }

  return number;
}

/* =========================================================
   PAGE
========================================================= */

export default function NESPage({
  depositers: initialDepositers,
  selectedId: initialSelectedId,
  selectedData: initialSelectedData,
  searchQuery: initialSearchQuery,
}) {
  const { t } = useI18n();

  const router =
    useRouter();

  const [message, setMessage] =
    useState("");

  const [messageType, setMessageType] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [localSearch, setLocalSearch] =
    useState(
      initialSearchQuery || ""
    );

  const [depositers, setDepositers] =
    useState(
      initialDepositers || []
    );

  const [selectedId, setSelectedId] =
    useState(
      initialSelectedId || null
    );

  const [selectedData, setSelectedData] =
    useState(
      initialSelectedData || null
    );

  /* ADD USER */

  const [showAddUser, setShowAddUser] =
    useState(false);

  const [newUsername, setNewUsername] =
    useState("");

  const [newUserPlan, setNewUserPlan] =
    useState("Free");

  const [newUserNes, setNewUserNes] =
    useState("0");

  /* UPDATE NES */

  const [newNesValue, setNewNesValue] =
    useState("");

  /* =====================================================
     UPDATE NES
  ===================================================== */

  const handleUpdate = async (
    e
  ) => {
    e.preventDefault();

    if (!selectedId) {
      setMessage(
        t("Hitamo umukoresha mbere.")
      );

      setMessageType("error");

      return;
    }

    const nes =
      normalizeNes(
        newNesValue
      );

    // 0 ni valid
    if (nes === null) {
      setMessage(
        t("NES igomba kuba 0 cyangwa umubare wuzuye urenze 0.")
      );

      setMessageType("error");

      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response =
        await fetch(
          "/api/update-nes",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              user: selectedId,
              nes,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Update failed."
        );
      }

      const updatedTime =
        data.updatedAt ||
        new Date().toISOString();

      setSelectedData(
        (previous) => ({
          ...(previous || {}),
          id: selectedId,
          nes,
          time: updatedTime,
        })
      );

      setDepositers(
        (previous) =>
          previous.map(
            (user) =>
              user.id ===
              selectedId
                ? {
                    ...user,
                    nes,
                  }
                : user
          )
      );

      setNewNesValue("");

      setMessage(
        data.message ||
          t("NES za {selectedId} zahinduwe kuri {nes}.", { selectedId, nes })
      );

      setMessageType(
        "success"
      );
    } catch (error) {
      console.error(
        "UPDATE NES ERROR:",
        error
      );

      setMessage(
        error.message ||
          t("Habaye ikibazo mu kuvugurura NES.")
      );

      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
     ADD USER
  ===================================================== */

  const handleAddUser = async (
    e
  ) => {
    e.preventDefault();

    const username =
      newUsername.trim();

    const plan =
      newUserPlan.trim() ||
      "Free";

    const nes =
      normalizeNes(
        newUserNes
      );

    if (!username) {
      setMessage(
        t("Andika username.")
      );

      setMessageType("error");

      return;
    }

    if (username.length < 2) {
      setMessage(
        t("Username igomba kugira nibura inyuguti 2.")
      );

      setMessageType("error");

      return;
    }

    if (nes === null) {
      setMessage(
        t("NES igomba kuba 0 cyangwa irenze.")
      );

      setMessageType("error");

      return;
    }

    const exists =
      depositers.some(
        (user) =>
          String(user.id)
            .toLowerCase() ===
          username.toLowerCase()
      );

    if (exists) {
      setMessage(
        t("Uyu mukoresha asanzwe ahari.")
      );

      setMessageType("error");

      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const userRef =
        doc(
          db,
          "depositers",
          username
        );

      const existing =
        await getDoc(userRef);

      if (existing.exists()) {
        setMessage(
          t("Uyu mukoresha asanzwe ari muri database.")
        );

        setMessageType("error");

        return;
      }

      const now =
        Timestamp.now();

      await setDoc(
        userRef,
        {
          id: username,
          plan,
          nes,
          time: now,
          createdAt: now,
          updatedAt: now,
        }
      );

      const newUser = {
        id: username,
        plan,
        nes,

        // SSR/client safe
        time:
          now
            .toDate()
            .toISOString(),
      };

      setDepositers(
        (previous) => [
          ...previous,
          newUser,
        ]
      );

      setSelectedId(
        username
      );

      setSelectedData(
        newUser
      );

      await router.push(
        {
          pathname:
            "/admin/nes",
          query: {
            user: username,
          },
        },
        undefined,
        {
          shallow: true,
        }
      );

      setNewUsername("");
      setNewUserPlan("Free");
      setNewUserNes("0");
      setNewNesValue("");
      setShowAddUser(false);

      setMessage(
        t("Umukoresha {username} yongewe neza afite NES {nes}.", { username, nes })
      );

      setMessageType(
        "success"
      );
    } catch (error) {
      console.error(
        "ADD USER ERROR:",
        error
      );

      setMessage(
        error.message ||
          t("Habaye ikosa mu kongera umukoresha.")
      );

      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
     SHOW
  ===================================================== */

  const handleSearchSubmit =
    async (e) => {
      e.preventDefault();

      const search =
        localSearch.trim();

      setMessage("");

      if (!search) {
        setSelectedId(null);
        setSelectedData(null);

        await router.push(
          "/admin/nes"
        );

        return;
      }

      const matches =
        depositers.filter(
          (user) =>
            String(user.id)
              .toLowerCase()
              .includes(
                search.toLowerCase()
              )
        );

      if (
        matches.length === 0
      ) {
        setSelectedId(null);
        setSelectedData(null);

        setMessage(
          t("Nta user uhuye na \"{search}\" wabonetse.", { search })
        );

        setMessageType(
          "error"
        );

        await router.push(
          {
            pathname:
              "/admin/nes",
            query: {
              search,
            },
          },
          undefined,
          {
            shallow: true,
          }
        );

        return;
      }

      const username =
        matches[0].id;

      setLoading(true);

      try {
        const userSnap =
          await getDoc(
            doc(
              db,
              "depositers",
              username
            )
          );

        if (
          !userSnap.exists()
        ) {
          throw new Error(
            "User ntaboneka muri database."
          );
        }

        const data =
          userSnap.data();

        const date =
          getUserDate(data);

        setSelectedId(
          username
        );

        setSelectedData({
          ...data,

          id: username,

          nes:
            normalizeNes(
              data.nes
            ) ?? 0,

          // IMPORTANT
          // Buri gihe time iba string
          time: date
            ? date.toISOString()
            : null,
        });

        await router.push(
          {
            pathname:
              "/admin/nes",
            query: {
              search,
              user: username,
            },
          },
          undefined,
          {
            shallow: true,
          }
        );
      } catch (error) {
        console.error(
          "SHOW USER ERROR:",
          error
        );

        setMessage(
          error.message ||
            t("Habaye ikibazo mu gushaka user.")
        );

        setMessageType(
          "error"
        );
      } finally {
        setLoading(false);
      }
    };

  /* =====================================================
     SELECT USER
  ===================================================== */

  const handleSelectChange =
    async (e) => {
      const username =
        e.target.value;

      setMessage("");

      if (!username) {
        setSelectedId(null);
        setSelectedData(null);

        await router.push(
          "/admin/nes"
        );

        return;
      }

      setLoading(true);

      try {
        const userSnap =
          await getDoc(
            doc(
              db,
              "depositers",
              username
            )
          );

        if (
          !userSnap.exists()
        ) {
          throw new Error(
            "User ntaboneka."
          );
        }

        const data =
          userSnap.data();

        const date =
          getUserDate(data);

        setSelectedId(
          username
        );

        setSelectedData({
          ...data,

          id: username,

          nes:
            normalizeNes(
              data.nes
            ) ?? 0,

          time: date
            ? date.toISOString()
            : null,
        });

        const query = {
          user: username,
        };

        if (
          localSearch.trim()
        ) {
          query.search =
            localSearch.trim();
        }

        await router.push(
          {
            pathname:
              "/admin/nes",
            query,
          },
          undefined,
          {
            shallow: true,
          }
        );
      } catch (error) {
        console.error(
          "SELECT USER ERROR:",
          error
        );

        setMessage(
          error.message ||
            t("Habaye ikibazo.")
        );

        setMessageType(
          "error"
        );

        setSelectedData(null);
      } finally {
        setLoading(false);
      }
    };

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <>
      <LinkComponent />

      <div
        className={
          styles.container
        }
      >
        <div
          className={
            styles.card
          }
        >
          {/* HEADER */}

          <div
            className={
              styles.header
            }
          >
            <h1
              className={
                styles.title
              }
            >
              <FaCoins
                className={
                  styles.headerIcon
                }
              />{t("Management of NES")}</h1>

            <p
              className={
                styles.subtitle
              }
            >{t("Manage user NES points")}</p>
          </div>

          {/* MESSAGE */}

          {message && (
            <div
              className={`${styles.message} ${
                messageType ===
                "success"
                  ? styles.success
                  : styles.error
              }`}
            >
              {messageType ===
              "success" ? (
                <FaCheckCircle
                  className={
                    styles.messageIcon
                  }
                />
              ) : (
                <FaExclamationCircle
                  className={
                    styles.messageIcon
                  }
                />
              )}

              <span>
                {message}
              </span>
            </div>
          )}

          {/* CONTROLS */}

          <form
            onSubmit={
              handleSearchSubmit
            }
            className={
              styles.controls
            }
          >
            {/* SEARCH */}

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
                name="search"
                placeholder={t("Shaka username...")}
                value={
                  localSearch
                }
                onChange={(e) =>
                  setLocalSearch(
                    e.target.value
                  )
                }
                className={
                  styles.searchInput
                }
              />
            </div>

            {/* SELECT */}

            <div
              className={
                styles.selectWrapper
              }
            >
              <FaUser
                className={
                  styles.selectIcon
                }
              />

              <select
                value={
                  selectedId || ""
                }
                onChange={
                  handleSelectChange
                }
                className={
                  styles.documentSelect
                }
              >
                <option value="">{t("Hitamo User")}</option>

                {depositers.map(
                  (user) => (
                    <option
                      key={
                        user.id
                      }
                      value={
                        user.id
                      }
                    >
                      {user.id}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* SHOW */}

            <button
              type="submit"
              className={
                styles.primaryBtn
              }
              disabled={loading}
            >
              {loading ? (
                <FaSpinner
                  className={
                    styles.spinner
                  }
                />
              ) : (
                <FaSearch />
              )}{t("Show")}</button>

            {/* ADD */}

            <button
              type="button"
              onClick={() =>
                setShowAddUser(
                  (value) =>
                    !value
                )
              }
              className={
                styles.addUserBtn
              }
              disabled={loading}
            >
              {showAddUser ? (
                <>
                  <FaTimes />{t("Close")}</>
              ) : (
                <>
                  <FaUserPlus />{t("Add User")}</>
              )}
            </button>
          </form>

          {/* ADD USER */}

          {showAddUser && (
            <div
              className={
                styles.addUserForm
              }
            >
              <h3>
                <FaPlus />{t("Ongera Umukoresha Mushya")}</h3>

              <form
                onSubmit={
                  handleAddUser
                }
                className={
                  styles.addUserFormInner
                }
              >
                <div
                  className={
                    styles.formGroup
                  }
                >
                  <label>{t("Izina ry'umukoresha *")}</label>

                  <input
                    type="text"
                    value={
                      newUsername
                    }
                    onChange={(e) =>
                      setNewUsername(
                        e.target.value
                      )
                    }
                    placeholder={t("Andika username...")}
                    className={
                      styles.input
                    }
                    required
                  />
                </div>

                <div
                  className={
                    styles.formGroup
                  }
                >
                  <label>{t("Plan")}</label>

                  <input
                    type="text"
                    value={
                      newUserPlan
                    }
                    onChange={(e) =>
                      setNewUserPlan(
                        e.target.value
                      )
                    }
                    placeholder={t("Free")}
                    className={
                      styles.input
                    }
                  />
                </div>

                <div
                  className={
                    styles.formGroup
                  }
                >
                  <label>
                    <FaCoins />{t("NES y'ibanze")}</label>

                  <input
                    type="number"
                    value={
                      newUserNes
                    }
                    onChange={(e) =>
                      setNewUserNes(
                        e.target.value
                      )
                    }
                    min="0"
                    step="1"
                    className={
                      styles.input
                    }
                    required
                  />
                </div>

                <div
                  className={
                    styles.formActions
                  }
                >
                  <button
                    type="submit"
                    className={
                      styles.saveBtn
                    }
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
                    )}{t("Ongera")}</button>

                  <button
                    type="button"
                    onClick={() =>
                      setShowAddUser(
                        false
                      )
                    }
                    className={
                      styles.cancelBtn
                    }
                  >
                    <FaTimes />{t("Cancel")}</button>
                </div>
              </form>
            </div>
          )}

          {/* SELECTED USER */}

          {selectedData && (
            <div
              className={
                styles.selectedInfo
              }
            >
              <div
                className={
                  styles.userBadge
                }
              >
                <FaUser
                  className={
                    styles.userBadgeIcon
                  }
                />

                <span
                  className={
                    styles.userBadgeName
                  }
                >
                  {selectedId}
                </span>
              </div>
            </div>
          )}

          {/* TABLE */}

          {selectedData ? (
            <div
              className={
                styles.tableWrapper
              }
            >
              <table
                className={
                  styles.table
                }
              >
                <thead>
                  <tr>
                    <th>
                      <FaChartLine />{t("Plan")}</th>

                    <th>
                      <FaCoins />{t("NES")}</th>

                    <th>
                      <FaClock />{t("Time")}</th>

                    <th>
                      <FaEdit />{t("Action")}</th>
                  </tr>
                </thead>

                <tbody>
                  <tr>
                    <td
                      className={
                        styles.planCell
                      }
                    >
                      <span
                        className={
                          styles.planValue
                        }
                      >
                        {selectedData.plan ??
                          t("Free")}
                      </span>
                    </td>

                    <td
                      className={
                        styles.nesCell
                      }
                    >
                      <span
                        className={
                          styles.nesValue
                        }
                      >
                        {selectedData.nes ??
                          0}
                      </span>
                    </td>

                    <td
                      className={
                        styles.timeCell
                      }
                    >
                      <FaClock />

                      <span>
                        {formatDate(
                          selectedData.time
                        )}
                      </span>
                    </td>

                    <td
                      className={
                        styles.actionCell
                      }
                    >
                      <form
                        onSubmit={
                          handleUpdate
                        }
                        className={
                          styles.inlineForm
                        }
                      >
                        <input
                          type="number"
                          value={
                            newNesValue
                          }
                          onChange={(e) =>
                            setNewNesValue(
                              e.target.value
                            )
                          }
                          placeholder={`NES nshya (${selectedData.nes ?? 0})`}
                          min="0"
                          step="1"
                          className={
                            styles.input
                          }
                          required
                        />

                        <button
                          type="submit"
                          className={
                            styles.updateBtn
                          }
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
                          )}{t("Update")}</button>
                      </form>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div
              className={
                styles.emptyState
              }
            >
              <FaUser
                className={
                  styles.emptyIcon
                }
              />

              <h3>{t("Nta User Ihitamo")}</h3>

              <p>{t("Shaka username, ukande Show, cyangwa uhitemo user muri list.")}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* =========================================================
   SSR
========================================================= */

export async function getServerSideProps(
  context
) {
  const {
    query,
  } = context;

  const selectedId =
    typeof query.user ===
    "string"
      ? query.user
      : null;

  const searchQuery =
    typeof query.search ===
    "string"
      ? query.search
      : "";

  let depositers = [];

  /* =======================================================
     GET USERS
  ======================================================= */

  try {
    const snapshot =
      await getDocs(
        collection(
          db,
          "depositers"
        )
      );

    depositers =
      snapshot.docs.map(
        (item) => {
          const data =
            item.data();

          const date =
            getUserDate(data);

          return {
            id: item.id,

            nes:
              normalizeNes(
                data.nes
              ) ?? 0,

            // IMPORTANT:
            // Buri user agira date
            // isanzwe ari string
            time: date
              ? date.toISOString()
              : null,
          };
        }
      );
  } catch (error) {
    console.error(
      "GET DEPOSITERS ERROR:",
      error
    );
  }

  /* =======================================================
     SEARCH FILTER
  ======================================================= */

  if (searchQuery) {
    const search =
      searchQuery
        .trim()
        .toLowerCase();

    depositers =
      depositers.filter(
        (user) =>
          String(user.id)
            .toLowerCase()
            .includes(search)
      );
  }

  /* =======================================================
     SELECTED USER
  ======================================================= */

  let selectedData =
    null;

  if (selectedId) {
    try {
      const userSnap =
        await getDoc(
          doc(
            db,
            "depositers",
            selectedId
          )
        );

      if (
        userSnap.exists()
      ) {
        const data =
          userSnap.data();

        /* ---------------------------------------------
           FIND DATE FROM ANY FIELD
        --------------------------------------------- */

        const date =
          getUserDate(data);

        /*
          IMPORTANT:

          Ntitwohereza Firestore Timestamp
          kuri browser.

          Tubanza kuyihindura ISO string.
        */

        const safeTime =
          date
            ? date.toISOString()
            : null;

        /* ---------------------------------------------
           NES
        --------------------------------------------- */

        const safeNes =
          normalizeNes(
            data.nes
          ) ?? 0;

        /*
          Ntitwohereza data yose uko iri,
          kuko ishobora kuba irimo Timestamp
          idashobora gucishwa muri Next.js SSR.

          Dushyiramo gusa fields zisanzwe
          cyangwa dukureho timestamp objects.
        */

        selectedData = {
          id: userSnap.id,

          plan:
            data.plan ??
            "Free",

          nes: safeNes,

          time: safeTime,

          /*
            Niba ushaka no kubika izindi fields
            z'ingenzi:
          */

          ...(data.phone !==
          undefined
            ? {
                phone:
                  String(
                    data.phone
                  ),
              }
            : {}),

          ...(data.username !==
          undefined
            ? {
                username:
                  String(
                    data.username
                  ),
              }
            : {}),
        };
      }
    } catch (error) {
      console.error(
        "GET SELECTED USER ERROR:",
        error
      );
    }
  }

  return {
    props: {
      depositers,
      selectedId,
      selectedData,
      searchQuery,
    },
  };
}
