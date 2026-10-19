import {
  useState,
  useEffect,
  useRef,
} from "react";

import {
  useRouter,
} from "next/router";

import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  orderBy,
  query,
} from "firebase/firestore";

import {
  db,
} from "../../components/firebase";

import Cookies from "js-cookie";

import styles from "../../styles/notifications.module.css";

import {
  FaTrash,
  FaSave,
  FaBell,
  FaUsers,
  FaEye,
  FaTimes,
  FaBold,
  FaItalic,
  FaUnderline,
  FaLink,
  FaListUl,
  FaListOl,
  FaHeading,
  FaQuoteRight,
  FaImage,
  FaSpinner,
  FaEraser,
  FaUser,
} from "react-icons/fa";

import LinkComponent
  from "../../components/Links";
import { useI18n } from "@/i18n/I18nProvider";


export default function AdminNotifications() {
  const { t } = useI18n();


  const router =
    useRouter();


  /*
   * ======================================================
   * STATES
   * ======================================================
   */

  const [
    notifications,
    setNotifications,
  ] = useState([]);

  const [
    title,
    setTitle,
  ] = useState("");

  const [
    content,
    setContent,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    isClient,
    setIsClient,
  ] = useState(false);

  const [
    username,
    setUsername,
  ] = useState("");

  const [
    isAdmin,
    setIsAdmin,
  ] = useState(false);

  const [
    checkingAuth,
    setCheckingAuth,
  ] = useState(true);


  const editorRef =
    useRef(null);

  const [
    isEditorFocused,
    setIsEditorFocused,
  ] = useState(false);

  const isUpdatingFromState =
    useRef(false);


  /*
   * ======================================================
   * CHECK SESSION
   * ======================================================
   */

  useEffect(() => {

    setIsClient(true);

    setCheckingAuth(true);

    const userCookie =
      Cookies.get("user");


    if (!userCookie) {

      router.replace(
        "/login"
      );

      setCheckingAuth(false);

      return;
    }


    try {

      const userData =
        JSON.parse(
          userCookie
        );


      const userName =
        userData?.username ||
        "";


      setUsername(
        userName
      );


      const isAdminUser =
        userName
          .toLowerCase() ===
        "newtalentsg";


      if (isAdminUser) {

        setIsAdmin(true);

        fetchNotifications();

      } else {

        setIsAdmin(false);

        router.replace("/");

      }

    } catch (error) {

      console.error(
        "Error parsing cookie:",
        error
      );

      router.replace(
        "/login"
      );

    } finally {

      setCheckingAuth(
        false
      );

    }

  }, [router]);


  /*
   * ======================================================
   * FETCH NOTIFICATIONS
   * ======================================================
   */

  const fetchNotifications =
    async () => {

      try {

        const q =
          query(
            collection(
              db,
              "notifications"
            ),

            orderBy(
              "createdAt",
              "desc"
            )
          );


        const snap =
          await getDocs(q);


        const data =
          snap.docs.map(
            (notificationDoc) => {

              const data =
                notificationDoc.data();


              return {
                id:
                  notificationDoc.id,

                ...data,

                createdAt:
                  data.createdAt
                    ?.toDate?.() ||
                  new Date(),
              };

            }
          );


        setNotifications(
          data
        );

      } catch (error) {

        console.error(
          "Error fetching notifications:",
          error
        );

      }

    };


  /*
   * ======================================================
   * SYNC EDITOR
   * ======================================================
   */

  useEffect(() => {

    if (
      editorRef.current &&
      !isUpdatingFromState.current
    ) {

      const currentHtml =
        editorRef.current
          .innerHTML;


      const isEmpty =
        !currentHtml ||
        currentHtml ===
          "<br>" ||
        currentHtml ===
          "<div><br></div>";


      const newEmpty =
        !content ||
        content === "<br>" ||
        content ===
          "<div><br></div>";


      if (
        isEmpty &&
        newEmpty
      ) {
        return;
      }


      if (
        currentHtml !==
        content
      ) {

        editorRef.current
          .innerHTML =
          content || "";

      }

    }

  }, [content]);


  /*
   * ======================================================
   * HANDLE CONTENT CHANGE
   * ======================================================
   */

  const handleContentChange =
    () => {

      if (
        !editorRef.current
      ) {
        return;
      }


      isUpdatingFromState.current =
        true;


      const html =
        editorRef.current
          .innerHTML;


      setContent(
        html
      );


      setTimeout(() => {

        isUpdatingFromState.current =
          false;

      }, 0);

    };


  /*
   * ======================================================
   * EXEC COMMAND
   * ======================================================
   */

  const execCommand =
    (
      command,
      value = null
    ) => {

      document.execCommand(
        command,
        false,
        value
      );


      if (
        editorRef.current
      ) {

        editorRef.current.focus();

        handleContentChange();

      }

    };


  /*
   * ======================================================
   * INSERT LINK
   * ======================================================
   */

  const insertLink =
    () => {

      const url =
        prompt(
          t("Andika URL ya link:"),
          "https://"
        );


      if (url) {

        execCommand(
          "createLink",
          url
        );

      }

    };


  /*
   * ======================================================
   * INSERT IMAGE
   * ======================================================
   */

  const insertImage =
    () => {

      const url =
        prompt(
          t("Andika URL y'ishusho:"),
          "https://"
        );


      if (url) {

        execCommand(
          "insertImage",
          url
        );

      }

    };


  /*
   * ======================================================
   * HANDLE PASTE
   * ======================================================
   */

  const handlePaste =
    (e) => {

      e.preventDefault();


      const text =
        e.clipboardData
          .getData(
            "text/plain"
          );


      document.execCommand(
        "insertText",
        false,
        text
      );


      handleContentChange();

    };


  /*
   * ======================================================
   * SUBMIT
   * ======================================================
   */

  const handleSubmit =
    async (e) => {

      e.preventDefault();


      if (!title.trim()) {

        alert(
          t("Andika umutwe w'ubutumwa.")
        );

        return;
      }


      const cleanContent =
        content.trim();


      if (
        !cleanContent ||
        cleanContent === "<br>" ||
        cleanContent ===
          "<div><br></div>"
      ) {

        alert(
          t("Andika ibiri mu butumwa.")
        );

        return;
      }


      setLoading(true);


      try {

        /*
         * ================================================
         * SEND TO OUR SERVER
         * ================================================
         */

        const response =
          await fetch(
            "/api/notifications/send",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  title:
                    title.trim(),

                  content:
                    content,

                  sender:
                    "New Talents Stories Group",

                  url:
                    "/notifications",

                  type:
                    "general",
                }),
            }
          );


        const result =
          await response.json();


        /*
         * ================================================
         * CHECK RESULT
         * ================================================
         */

        if (!response.ok) {

          console.error(
            "Notification error:",
            result
          );


          alert(
            result?.message ||
              t("❌ Habaye ikibazo mu kohereza notification.")
          );

          return;
        }


        /*
         * ================================================
         * CLEAR FORM
         * ================================================
         */

        setTitle("");

        setContent("");


        if (
          editorRef.current
        ) {

          editorRef.current
            .innerHTML = "";

        }


        /*
         * ================================================
         * REFRESH LIST
         * ================================================
         */

        await fetchNotifications();


        alert(
          t("✅ Notification yabitswe muri Firestore kandi yoherejwe kuri OneSignal!")
        );

      } catch (error) {

        console.error(
          "Send notification error:",
          error
        );


        alert(
          t("❌ Habaye ikibazo mu kohereza notification.")
        );

      } finally {

        setLoading(false);

      }

    };


  /*
   * ======================================================
   * DELETE
   * ======================================================
   */

  const handleDelete =
    async (id) => {

      if (
        !confirm(
          t("Urahara ushaka gusiba iyi notification?")
        )
      ) {
        return;
      }


      try {

        await deleteDoc(
          doc(
            db,
            "notifications",
            id
          )
        );


        await fetchNotifications();


      } catch (error) {

        console.error(
          "Delete error:",
          error
        );


        alert(
          t("❌ Habaye ikibazo mu gusiba notification.")
        );

      }

    };


  /*
   * ======================================================
   * PLACEHOLDER
   * ======================================================
   */

  const getPlaceholder =
    () => {

      if (
        !content ||
        content === "<br>" ||
        content ===
          "<div><br></div>"
      ) {

        return "Andika ibiri mu butumwa hano...";

      }

      return "";

    };


  /*
   * ======================================================
   * LOADING
   * ======================================================
   */

  if (checkingAuth) {

    return (
      <div
        className={
          styles.container
        }
      >

        <div
          className={
            styles.loadingState
          }
        >

          <FaSpinner
            className={
              styles.loadingSpinner
            }
          />

          <p>{t("Ibihe...")}</p>

        </div>

      </div>
    );

  }


  /*
   * ======================================================
   * NOT ADMIN
   * ======================================================
   */

  if (
    !isAdmin &&
    isClient
  ) {

    return (
      <div
        className={
          styles.container
        }
      >

        <div
          className={
            styles.unauthorized
          }
        >

          <FaTimes
            className={
              styles.unauthorizedIcon
            }
          />

          <h2>{t("⛔ Ntabwo ufite uburenganzira")}</h2>

          <p>{t("Gusa abayobozi bashobora kugera kuri iyi page.")}</p>

          <button
            onClick={() =>
              router.push("/")
            }
            className={
              styles.goHomeBtn
            }
          >{t("🏠 Subira ku rupapuro rw'ibanze")}</button>

        </div>

      </div>
    );

  }


  /*
   * ======================================================
   * RENDER
   * ======================================================
   */

  return (
    <>
      <LinkComponent />

      <div
        className={
          styles.container
        }
      >

        {/* HEADER */}

        <div
          className={
            styles.header
          }
        >

          <div
            className={
              styles.headerLeft
            }
          >

            <FaBell
              className={
                styles.headerIcon
              }
            />

            <div>

              <h1
                className={
                  styles.title
                }
              >{t("📢 Manage Notifications")}</h1>

              <p
                className={
                  styles.subtitle
                }
              >

                <FaUser
                  className={
                    styles.subtitleIcon
                  }
                />{t("{username} (Admin)", { username })}</p>

            </div>

          </div>


          <div
            className={
              styles.headerStats
            }
          >

            <span
              className={
                styles.statBadge
              }
            >

              <FaBell />

              {notifications.length}

            </span>


            <span
              className={
                styles.statBadge
              }
            >

              <FaUsers />

              {
                new Set(
                  notifications.flatMap(
                    (n) =>
                      n.readBy || []
                  )
                ).size
              }

            </span>

          </div>

        </div>


        {/* FORM */}

        <div
          className={
            styles.formCard
          }
        >

          <form
            onSubmit={
              handleSubmit
            }
            className={
              styles.form
            }
          >

            <div
              className={
                styles.formGroup
              }
            >

              <label
                className={
                  styles.label
                }
              >

                <FaHeading />{t("Umutwe w'ubutumwa")}</label>


              <input
                type="text"
                placeholder={t("Andika umutwe hano...")}
                value={title}
                onChange={(e) =>
                  setTitle(
                    e.target.value
                  )
                }
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

              <label
                className={
                  styles.label
                }
              >

                <FaQuoteRight />{t("Ibiri mu butumwa")}</label>


              {/* TOOLBAR */}

              <div
                className={
                  styles.toolbar
                }
              >

                <button
                  type="button"
                  onClick={() =>
                    execCommand(
                      "bold"
                    )
                  }
                  className={
                    styles.toolbarBtn
                  }
                  title={t("Bold")}
                >
                  <FaBold />
                </button>


                <button
                  type="button"
                  onClick={() =>
                    execCommand(
                      "italic"
                    )
                  }
                  className={
                    styles.toolbarBtn
                  }
                  title={t("Italic")}
                >
                  <FaItalic />
                </button>


                <button
                  type="button"
                  onClick={() =>
                    execCommand(
                      "underline"
                    )
                  }
                  className={
                    styles.toolbarBtn
                  }
                  title={t("Underline")}
                >
                  <FaUnderline />
                </button>


                <div
                  className={
                    styles.toolbarDivider
                  }
                />


                <button
                  type="button"
                  onClick={() =>
                    execCommand(
                      "formatBlock",
                      "<h1>"
                    )
                  }
                  className={
                    styles.toolbarBtn
                  }
                  title={t("Heading 1")}
                >
                  <FaHeading />
                  1
                </button>


                <button
                  type="button"
                  onClick={() =>
                    execCommand(
                      "formatBlock",
                      "<h2>"
                    )
                  }
                  className={
                    styles.toolbarBtn
                  }
                  title={t("Heading 2")}
                >
                  <FaHeading />
                  2
                </button>


                <button
                  type="button"
                  onClick={() =>
                    execCommand(
                      "formatBlock",
                      "<h3>"
                    )
                  }
                  className={
                    styles.toolbarBtn
                  }
                  title={t("Heading 3")}
                >
                  <FaHeading />
                  3
                </button>


                <div
                  className={
                    styles.toolbarDivider
                  }
                />


                <button
                  type="button"
                  onClick={() =>
                    execCommand(
                      "insertOrderedList"
                    )
                  }
                  className={
                    styles.toolbarBtn
                  }
                  title={t("Ordered List")}
                >
                  <FaListOl />
                </button>


                <button
                  type="button"
                  onClick={() =>
                    execCommand(
                      "insertUnorderedList"
                    )
                  }
                  className={
                    styles.toolbarBtn
                  }
                  title={t("Unordered List")}
                >
                  <FaListUl />
                </button>


                <div
                  className={
                    styles.toolbarDivider
                  }
                />


                <button
                  type="button"
                  onClick={
                    insertLink
                  }
                  className={
                    styles.toolbarBtn
                  }
                  title={t("Insert Link")}
                >
                  <FaLink />
                </button>


                <button
                  type="button"
                  onClick={
                    insertImage
                  }
                  className={
                    styles.toolbarBtn
                  }
                  title={t("Insert Image")}
                >
                  <FaImage />
                </button>


                <div
                  className={
                    styles.toolbarDivider
                  }
                />


                <button
                  type="button"
                  onClick={() =>
                    execCommand(
                      "formatBlock",
                      "<blockquote>"
                    )
                  }
                  className={
                    styles.toolbarBtn
                  }
                  title={t("Blockquote")}
                >
                  <FaQuoteRight />
                </button>


                <button
                  type="button"
                  onClick={() =>
                    execCommand(
                      "removeFormat"
                    )
                  }
                  className={
                    styles.toolbarBtn
                  }
                  title={t("Remove Formatting")}
                >
                  <FaEraser />
                </button>

              </div>


              {/* EDITOR */}

              <div
                ref={
                  editorRef
                }
                contentEditable
                onInput={
                  handleContentChange
                }
                onFocus={() =>
                  setIsEditorFocused(
                    true
                  )
                }
                onBlur={() =>
                  setIsEditorFocused(
                    false
                  )
                }
                onPaste={
                  handlePaste
                }
                className={`
                  ${styles.editor}
                  ${
                    isEditorFocused
                      ? styles.editorFocused
                      : ""
                  }
                `}
                data-placeholder={
                  getPlaceholder()
                }
                suppressContentEditableWarning={
                  true
                }
              />


              <div
                className={
                  styles.editorHint
                }
              >

                <small>{t("💡 Koresha toolbar hejuru kugira ngo uhindure imiterere y'ubutumwa")}</small>

              </div>

            </div>


            {/* SUBMIT */}

            <button
              type="submit"
              disabled={loading}
              className={
                styles.submitBtn
              }
            >

              {loading ? (

                <>
                  <FaSpinner
                    className={
                      styles.spinner
                    }
                  />{t("Kohereza kuri OneSignal...")}</>

              ) : (

                <>
                  <FaSave />{t("Ohereza Notification")}</>

              )}

            </button>

          </form>

        </div>


        {/* TABLE */}

        <div
          className={
            styles.tableSection
          }
        >

          <h2
            className={
              styles.sectionTitle
            }
          >

            <FaEye />{t("Ibyo watanze ({length})", { length: notifications.length })}</h2>


          <div
            className={
              styles.tableWrapper
            }
          >

            {notifications.length ===
            0 ? (

              <div
                className={
                  styles.emptyState
                }
              >

                <FaBell
                  className={
                    styles.emptyIcon
                  }
                />

                <h3>{t("Nta Notification")}</h3>

                <p>{t("Nta makuru wakohereje. Koresha formu yo hejuru.")}</p>

              </div>

            ) : (

              <table
                className={
                  styles.table
                }
              >

                <thead>

                  <tr>

                    <th>#</th>

                    <th>{t("Umutwe")}</th>

                    <th>{t("Ubutumwa")}</th>

                    <th>{t("Koherejwe")}</th>

                    <th>{t("Abasomyi")}</th>

                    <th>{t("Push")}</th>

                    <th>{t("Action")}</th>

                  </tr>

                </thead>


                <tbody>

                  {notifications.map(
                    (
                      n,
                      index
                    ) => (

                      <tr
                        key={n.id}
                        className={
                          styles.tableRow
                        }
                      >

                        <td
                          className={
                            styles.indexCell
                          }
                        >
                          {index + 1}
                        </td>


                        <td
                          className={
                            styles.titleCell
                          }
                        >

                          <span
                            className={
                              styles.titleText
                            }
                          >
                            {n.title}
                          </span>

                        </td>


                        <td
                          className={
                            styles.contentCell
                          }
                        >

                          <div
                            className={
                              styles.contentPreview
                            }
                            dangerouslySetInnerHTML={{
                              __html:
                                n.content
                                  ?.slice(
                                    0,
                                    60
                                  ) +
                                (
                                  n.content
                                    ?.length >
                                  60
                                    ? "..."
                                    : ""
                                ),
                            }}
                          />

                        </td>


                        <td
                          className={
                            styles.dateCell
                          }
                        >

                          {new Date(
                            n.createdAt
                          ).toLocaleDateString(
                            "rw-RW",
                            {
                              day:
                                "numeric",

                              month:
                                "short",

                              year:
                                "numeric",
                            }
                          )}

                        </td>


                        <td
                          className={
                            styles.readCell
                          }
                        >

                          <span
                            className={
                              styles.readCount
                            }
                          >
                            {
                              n.readBy
                                ?.length ||
                              0
                            }
                          </span>

                        </td>


                        <td
                          className={
                            styles.readCell
                          }
                        >

                          {n.pushSent ? (
                            <span>
                              ✅
                            </span>
                          ) : (
                            <span>
                              ❌
                            </span>
                          )}

                        </td>


                        <td
                          className={
                            styles.actionCell
                          }
                        >

                          <button
                            onClick={() =>
                              handleDelete(
                                n.id
                              )
                            }
                            className={
                              styles.deleteBtn
                            }
                            title={t("Siba iyi notification")}
                          >
                            <FaTrash />
                          </button>

                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            )}

          </div>

        </div>

      </div>
    </>
  );
}
