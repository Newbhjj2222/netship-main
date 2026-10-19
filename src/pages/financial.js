import { useCallback, useEffect, useMemo, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import Cookies from "js-cookie";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import {
  FaArrowDown,
  FaArrowUp,
  FaBalanceScale,
  FaCalendarAlt,
  FaChartLine,
  FaCheckCircle,
  FaChevronDown,
  FaCreditCard,
  FaEdit,
  FaFileInvoiceDollar,
  FaFilter,
  FaMoneyBillWave,
  FaPlus,
  FaSearch,
  FaTrash,
  FaWallet,
  FaTimes,
} from "react-icons/fa";

import { db } from "../components/firebase";
import styles from "../styles/Financial.module.css";
import { useI18n } from "@/i18n/I18nProvider";

const CURRENCY = "RWF";

const TRANSACTION_TYPES = {
  income: {
    label: "Income",
    description: "Amafaranga yinjiye",
    icon: FaArrowUp,
  },

  expense: {
    label: "Expense",
    description: "Amafaranga yakoreshejwe",
    icon: FaArrowDown,
  },

  credit: {
    label: "Credit",
    description: "Amafaranga ugomba kwakira",
    icon: FaCreditCard,
  },

  debt: {
    label: "Debt",
    description: "Amafaranga ugomba kwishyura",
    icon: FaFileInvoiceDollar,
  },
};

const CATEGORIES = [
  "Salary",
  "Business",
  "Food",
  "Transport",
  "Rent",
  "Bills",
  "Education",
  "Health",
  "Shopping",
  "Family",
  "Entertainment",
  "Loan",
  "Investment",
  "Other",
];

function formatMoney(value) {
  const amount = Number(value) || 0;

  return `${amount.toLocaleString("en-US")} ${CURRENCY}`;
}

function getToday() {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getCookieUser() {
  try {
    const cookie = Cookies.get("user");

    if (!cookie) {
      return null;
    }

    const parsed = JSON.parse(cookie);

    if (!parsed?.username) {
      return null;
    }

    return parsed;
  } catch (error) {
    console.error("Cookie parsing error:", error);
    return null;
  }
}

function normalizeTransaction(id, data = {}) {
  return {
    id,
    type: data.type || "expense",
    title: data.title || "Untitled",
    description: data.description || "",
    category: data.category || "Other",
    amount: Number(data.amount) || 0,
    date: data.date || getToday(),
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
  };
}

export async function getServerSideProps(context) {
  const cookie = context.req.cookies?.user;

  if (!cookie) {
    return {
      redirect: {
        destination: "/login?returnTo=/financial",
        permanent: false,
      },
    };
  }

  let user;

  try {
    user = JSON.parse(cookie);
  } catch {
    return {
      redirect: {
        destination: "/login?returnTo=/financial",
        permanent: false,
      },
    };
  }

  if (!user?.username) {
    return {
      redirect: {
        destination: "/login?returnTo=/financial",
        permanent: false,
      },
    };
  }

  const username = String(user.username).trim();

  let initialData = {
    username,
    uid: user.uid || "",
    openingBalance: 0,
    transactions: [],
  };

  try {
    const financialRef = doc(
      db,
      "financial",
      username
    );

    const financialSnap = await getDoc(
      financialRef
    );

    if (financialSnap.exists()) {
      const financialData =
        financialSnap.data();

      initialData.openingBalance =
        Number(
          financialData.openingBalance
        ) || 0;

      const transactionsRef =
        collection(
          db,
          "financial",
          username,
          "transactions"
        );

      const snapshot =
        await getDocs(
          transactionsRef
        );

      initialData.transactions =
        snapshot.docs
          .map((item) =>
            normalizeTransaction(
              item.id,
              item.data()
            )
          )
          .sort((a, b) => {
            const dateA =
              new Date(a.date).getTime();

            const dateB =
              new Date(b.date).getTime();

            return dateB - dateA;
          });
    }
  } catch (error) {
    console.error(
      "SSR financial loading error:",
      error
    );
  }

  return {
    props: {
      initialData,
    },
  };
}

export default function FinancialPage({
  initialData,
}) {
  const { t } = useI18n();

  const router = useRouter();

  const [user, setUser] = useState(null);

  const [openingBalance, setOpeningBalance] =
    useState(
      Number(
        initialData?.openingBalance
      ) || 0
    );

  const [transactions, setTransactions] =
    useState(
      initialData?.transactions || []
    );

  const [loading, setLoading] =
    useState(false);

  const [loadingData, setLoadingData] =
    useState(false);

  const [savingBalance, setSavingBalance] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [errorMessage, setErrorMessage] =
    useState("");

  const [showModal, setShowModal] =
    useState(false);

  const [
    showBalanceModal,
    setShowBalanceModal,
  ] = useState(false);

  const [showDeleteModal, setShowDeleteModal] =
    useState(false);

  const [editingId, setEditingId] =
    useState(null);

  const [deleteId, setDeleteId] =
    useState(null);

  const [search, setSearch] =
    useState("");

  const [filterType, setFilterType] =
    useState("all");

  const [
    filterCategory,
    setFilterCategory,
  ] = useState("all");

  const [form, setForm] = useState({
    type: "income",
    title: "",
    description: "",
    category: "Other",
    amount: "",
    date: getToday(),
  });

  const [balanceInput, setBalanceInput] =
    useState(
      String(
        Number(
          initialData?.openingBalance
        ) || 0
      )
    );

  /*
  ============================================================
  AUTHENTICATION
  ============================================================
  */

  useEffect(() => {
    const cookieUser =
      getCookieUser();

    if (!cookieUser) {
      router.replace(
        "/login?returnTo=/financial"
      );
      return;
    }

    setUser(cookieUser);
  }, [router]);

  /*
  ============================================================
  LOAD FINANCIAL DATA
  ============================================================
  */

  const loadFinancialData =
    useCallback(async () => {
      if (!user?.username) {
        return;
      }

      setLoadingData(true);

      try {
        const username =
          String(
            user.username
          ).trim();

        const financialRef =
          doc(
            db,
            "financial",
            username
          );

        const financialSnap =
          await getDoc(
            financialRef
          );

        let nextOpeningBalance = 0;

        if (financialSnap.exists()) {
          const data =
            financialSnap.data();

          nextOpeningBalance =
            Number(
              data.openingBalance
            ) || 0;
        } else {
          await setDoc(
            financialRef,
            {
              username,
              uid: user.uid || "",
              openingBalance: 0,
              balance: 0,
              totalIncome: 0,
              totalExpense: 0,
              totalCredit: 0,
              totalDebt: 0,
              currency: CURRENCY,
              status: "balanced",
              createdAt:
                serverTimestamp(),
              updatedAt:
                serverTimestamp(),
            },
            {
              merge: true,
            }
          );
        }

        const transactionsRef =
          collection(
            db,
            "financial",
            username,
            "transactions"
          );

        const snapshot =
          await getDocs(
            transactionsRef
          );

        const records =
          snapshot.docs
            .map((item) =>
              normalizeTransaction(
                item.id,
                item.data()
              )
            )
            .sort((a, b) => {
              const dateA =
                new Date(
                  a.date
                ).getTime();

              const dateB =
                new Date(
                  b.date
                ).getTime();

              return dateB - dateA;
            });

        setOpeningBalance(
          nextOpeningBalance
        );

        setBalanceInput(
          String(
            nextOpeningBalance
          )
        );

        setTransactions(
          records
        );
      } catch (error) {
        console.error(
          "Loading financial data error:",
          error
        );

        setErrorMessage(
          t("Ntibyashobotse gufungura financial records.")
        );
      } finally {
        setLoadingData(false);
      }
    }, [user]);

  useEffect(() => {
    if (user?.username) {
      loadFinancialData();
    }
  }, [
    user,
    loadFinancialData,
  ]);

  /*
  ============================================================
  TOTALS
  ============================================================
  */

  const totals = useMemo(() => {
    let income = 0;
    let expenses = 0;
    let credits = 0;
    let debts = 0;

    transactions.forEach(
      (transaction) => {
        const amount =
          Number(
            transaction.amount
          ) || 0;

        if (
          transaction.type ===
          "income"
        ) {
          income += amount;
        }

        if (
          transaction.type ===
          "expense"
        ) {
          expenses += amount;
        }

        if (
          transaction.type ===
          "credit"
        ) {
          credits += amount;
        }

        if (
          transaction.type ===
          "debt"
        ) {
          debts += amount;
        }
      }
    );

    const balance =
      Number(openingBalance) +
      income +
      credits -
      expenses -
      debts;

    const difference =
      income - expenses;

    let status = "balanced";

    if (difference > 0) {
      status = "surplus";
    }

    if (difference < 0) {
      status = "deficit";
    }

    return {
      income,
      expenses,
      credits,
      debts,
      balance,
      difference,
      status,
      count: transactions.length,
    };
  }, [
    transactions,
    openingBalance,
  ]);

  /*
  ============================================================
  FILTER
  ============================================================
  */

  const filteredTransactions =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      return transactions
        .filter((transaction) => {
          if (
            filterType !== "all" &&
            transaction.type !==
              filterType
          ) {
            return false;
          }

          if (
            filterCategory !==
              "all" &&
            transaction.category !==
              filterCategory
          ) {
            return false;
          }

          if (!query) {
            return true;
          }

          return (
            transaction.title
              .toLowerCase()
              .includes(query) ||
            transaction.description
              .toLowerCase()
              .includes(query) ||
            transaction.category
              .toLowerCase()
              .includes(query)
          );
        })
        .sort((a, b) => {
          return (
            new Date(
              b.date
            ).getTime() -
            new Date(
              a.date
            ).getTime()
          );
        });
    }, [
      transactions,
      search,
      filterType,
      filterCategory,
    ]);

  /*
  ============================================================
  MESSAGE
  ============================================================
  */

  const showMessage =
    useCallback((text) => {
      setMessage(text);

      window.setTimeout(() => {
        setMessage("");
      }, 3500);
    }, []);

  /*
  ============================================================
  SAVE FINANCIAL SUMMARY
  ============================================================
  */

  const updateFinancialSummary =
    useCallback(
      async (
        nextOpeningBalance,
        nextTransactions
      ) => {
        if (!user?.username) {
          return;
        }

        const username =
          String(
            user.username
          ).trim();

        let income = 0;
        let expenses = 0;
        let credits = 0;
        let debts = 0;

        nextTransactions.forEach(
          (transaction) => {
            const amount =
              Number(
                transaction.amount
              ) || 0;

            if (
              transaction.type ===
              "income"
            ) {
              income += amount;
            }

            if (
              transaction.type ===
              "expense"
            ) {
              expenses += amount;
            }

            if (
              transaction.type ===
              "credit"
            ) {
              credits += amount;
            }

            if (
              transaction.type ===
              "debt"
            ) {
              debts += amount;
            }
          }
        );

        const balance =
          Number(
            nextOpeningBalance
          ) +
          income +
          credits -
          expenses -
          debts;

        let status = "balanced";

        if (income > expenses) {
          status = "surplus";
        }

        if (income < expenses) {
          status = "deficit";
        }

        await setDoc(
          doc(
            db,
            "financial",
            username
          ),
          {
            username,

            uid: user.uid || "",

            openingBalance:
              Number(
                nextOpeningBalance
              ) || 0,

            currency: CURRENCY,

            totalIncome: income,

            totalExpense:
              expenses,

            totalCredit:
              credits,

            totalDebt:
              debts,

            balance,

            status,

            transactionCount:
              nextTransactions.length,

            updatedAt:
              serverTimestamp(),
          },
          {
            merge: true,
          }
        );
      },
      [user]
    );

  /*
  ============================================================
  OPEN ADD
  ============================================================
  */

  const openAddModal = () => {
    setEditingId(null);

    setForm({
      type: "income",
      title: "",
      description: "",
      category: "Other",
      amount: "",
      date: getToday(),
    });

    setErrorMessage("");
    setShowModal(true);
  };

  /*
  ============================================================
  OPEN EDIT
  ============================================================
  */

  const openEditModal = (
    transaction
  ) => {
    setEditingId(
      transaction.id
    );

    setForm({
      type: transaction.type,
      title: transaction.title,
      description:
        transaction.description ||
        "",
      category:
        transaction.category ||
        "Other",
      amount: String(
        transaction.amount
      ),
      date:
        transaction.date ||
        getToday(),
    });

    setErrorMessage("");
    setShowModal(true);
  };

  /*
  ============================================================
  CLOSE MODAL
  ============================================================
  */

  const closeModal = () => {
    if (loading) {
      return;
    }

    setShowModal(false);
    setEditingId(null);
    setErrorMessage("");
  };

  /*
  ============================================================
  FORM CHANGE
  ============================================================
  */

  const handleFormChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  /*
  ============================================================
  ADD / UPDATE RECORD
  ============================================================
  */

  const handleSubmit =
    async (event) => {
      event.preventDefault();

      if (!user?.username) {
        router.replace(
          "/login?returnTo=/financial"
        );
        return;
      }

      const title =
        form.title.trim();

      const description =
        form.description.trim();

      const amount =
        Number(form.amount);

      if (!title) {
        setErrorMessage(
          t("Andika title ya record.")
        );
        return;
      }

      if (
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        setErrorMessage(
          t("Amount igomba kuba iruta zero.")
        );
        return;
      }

      if (!form.date) {
        setErrorMessage(
          t("Hitamo itariki.")
        );
        return;
      }

      if (
        !TRANSACTION_TYPES[
          form.type
        ]
      ) {
        setErrorMessage(
          t("Hitamo transaction type.")
        );
        return;
      }

      setLoading(true);
      setErrorMessage("");

      try {
        const username =
          String(
            user.username
          ).trim();

        const transactionsRef =
          collection(
            db,
            "financial",
            username,
            "transactions"
          );

        if (editingId) {
          /*
          ======================================================
          UPDATE
          ======================================================
          */

          const transactionRef =
            doc(
              db,
              "financial",
              username,
              "transactions",
              editingId
            );

          await updateDoc(
            transactionRef,
            {
              type: form.type,
              title,
              description,
              category:
                form.category,
              amount,
              date: form.date,
              updatedAt:
                serverTimestamp(),
            }
          );

          const updated =
            transactions.map(
              (transaction) => {
                if (
                  transaction.id !==
                  editingId
                ) {
                  return transaction;
                }

                return {
                  ...transaction,
                  type: form.type,
                  title,
                  description,
                  category:
                    form.category,
                  amount,
                  date: form.date,
                };
              }
            );

          setTransactions(
            updated
          );

          await updateFinancialSummary(
            openingBalance,
            updated
          );

          showMessage(
            t("Record yahinduwe neza.")
          );
        } else {
          /*
          ======================================================
          CREATE
          ======================================================
          */

          const transactionRef =
            await addDoc(
              transactionsRef,
              {
                type: form.type,
                title,
                description,
                category:
                  form.category,
                amount,
                date: form.date,
                createdAt:
                  serverTimestamp(),
                updatedAt:
                  serverTimestamp(),
              }
            );

          const newTransaction = {
            id: transactionRef.id,
            type: form.type,
            title,
            description,
            category:
              form.category,
            amount,
            date: form.date,
            createdAt: null,
            updatedAt: null,
          };

          const updated = [
            ...transactions,
            newTransaction,
          ];

          setTransactions(
            updated
          );

          await updateFinancialSummary(
            openingBalance,
            updated
          );

          showMessage(
            t("Record nshya yabitswe neza.")
          );
        }

        setShowModal(false);
        setEditingId(null);

        setForm({
          type: "income",
          title: "",
          description: "",
          category: "Other",
          amount: "",
          date: getToday(),
        });
      } catch (error) {
        console.error(
          "Save transaction error:",
          error
        );

        setErrorMessage(
          t("Ntibyashobotse kubika record.")
        );
      } finally {
        setLoading(false);
      }
    };

  /*
  ============================================================
  DELETE
  ============================================================
  */

  const openDeleteModal = (
    id
  ) => {
    setDeleteId(id);
    setErrorMessage("");
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    if (loading) {
      return;
    }

    setDeleteId(null);
    setShowDeleteModal(false);
  };

  const handleDelete =
    async () => {
      if (
        !deleteId ||
        !user?.username
      ) {
        return;
      }

      setLoading(true);
      setErrorMessage("");

      try {
        const username =
          String(
            user.username
          ).trim();

        await deleteDoc(
          doc(
            db,
            "financial",
            username,
            "transactions",
            deleteId
          )
        );

        const updated =
          transactions.filter(
            (transaction) =>
              transaction.id !==
              deleteId
          );

        setTransactions(
          updated
        );

        await updateFinancialSummary(
          openingBalance,
          updated
        );

        setShowDeleteModal(
          false
        );

        setDeleteId(null);

        showMessage(
          t("Record yasibwe neza.")
        );
      } catch (error) {
        console.error(
          "Delete error:",
          error
        );

        setErrorMessage(
          t("Ntibyashobotse gusiba record.")
        );
      } finally {
        setLoading(false);
      }
    };

  /*
  ============================================================
  SAVE OPENING BALANCE
  ============================================================
  */

  const handleSaveOpeningBalance =
    async () => {
      if (!user?.username) {
        return;
      }

      const amount =
        Number(balanceInput);

      if (
        !Number.isFinite(amount) ||
        amount < 0
      ) {
        setErrorMessage(
          t("Opening balance ntishobora kuba munsi ya zero.")
        );
        return;
      }

      setSavingBalance(true);
      setErrorMessage("");

      try {
        await updateFinancialSummary(
          amount,
          transactions
        );

        setOpeningBalance(
          amount
        );

        setBalanceInput(
          String(amount)
        );

        setShowBalanceModal(
          false
        );

        showMessage(
          t("Opening balance yabitswe neza.")
        );
      } catch (error) {
        console.error(
          "Opening balance error:",
          error
        );

        setErrorMessage(
          t("Ntibyashobotse kubika opening balance.")
        );
      } finally {
        setSavingBalance(false);
      }
    };

  /*
  ============================================================
  STATUS
  ============================================================
  */

  const statusInfo =
    useMemo(() => {
      if (
        totals.status ===
        "surplus"
      ) {
        return {
          title:
            "Income iruta Expenses",
          text:
            "Amafaranga winjiza aruta ayo ukoresha.",
          icon: FaArrowUp,
        };
      }

      if (
        totals.status ===
        "deficit"
      ) {
        return {
          title:
            "Expenses ziruta Income",
          text:
            "Amafaranga ukoresha aruta ayo winjiza.",
          icon: FaArrowDown,
        };
      }

      return {
        title:
          "Income na Expenses birangana",
        text:
          "Nta tandukaniro riri hagati ya income na expenses.",
        icon: FaBalanceScale,
      };
    }, [totals.status]);

  if (!user) {
    return (
      <div
        className={
          styles.loadingScreen
        }
      >
        <div
          className={
            styles.loader
          }
        />

        <p>{t("Loading financial dashboard...")}</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{t("Financial Management | New Talents")}</title>

        <meta
          name="description"
          content="Manage income, expenses, credits, debts and financial balance."
        />
      </Head>

      <main
        className={
          styles.page
        }
      >
        <div
          className={
            styles.container
          }
        >
          {/* HEADER */}

          <header
            className={
              styles.header
            }
          >
            <div>
              <div
                className={
                  styles.eyebrow
                }
              >
                <FaChartLine />{t("PERSONAL FINANCE")}</div>

              <h1
                className={
                  styles.title
                }
              >{t("Financial Management")}</h1>

              <p
                className={
                  styles.subtitle
                }
              >{t("Murikirane income, expenses, credit, debt na balance yawe ahantu hamwe.")}</p>
            </div>

            <div
              className={
                styles.headerActions
              }
            >
              <button
                type="button"
                className={
                  styles.secondaryButton
                }
                onClick={() => {
                  setBalanceInput(
                    String(
                      openingBalance
                    )
                  );

                  setErrorMessage(
                    ""
                  );

                  setShowBalanceModal(
                    true
                  );
                }}
              >
                <FaWallet />{t("Starting Balance")}</button>

              <button
                type="button"
                className={
                  styles.primaryButton
                }
                onClick={
                  openAddModal
                }
              >
                <FaPlus />{t("Add Record")}</button>
            </div>
          </header>

          {/* USER */}

          <div
            className={
              styles.userBar
            }
          >
            <div
              className={
                styles.userIdentity
              }
            >
              <div
                className={
                  styles.avatar
                }
              >
                {String(
                  user.username
                )
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div>
                <span>{t("Financial Account")}</span>

                <strong>
                  {user.username}
                </strong>
              </div>
            </div>

            <div
              className={
                styles.currencyBadge
              }
            >
              {CURRENCY}
            </div>
          </div>

          {/* MESSAGE */}

          {message && (
            <div
              className={
                styles.successMessage
              }
            >
              <FaCheckCircle />
              {message}
            </div>
          )}

          {errorMessage &&
            !showModal &&
            !showBalanceModal &&
            !showDeleteModal && (
              <div
                className={
                  styles.errorMessage
                }
              >
                {errorMessage}
              </div>
            )}

          {/* SUMMARY */}

          <section
            className={
              styles.summaryGrid
            }
          >
            <article
              className={`${styles.summaryCard} ${styles.balanceCard}`}
            >
              <div
                className={
                  styles.cardIcon
                }
              >
                <FaWallet />
              </div>

              <div
                className={
                  styles.cardContent
                }
              >
                <span>{t("Available Balance")}</span>

                <strong>
                  {formatMoney(
                    totals.balance
                  )}
                </strong>

                <small>{t("Opening Balance included")}</small>
              </div>
            </article>

            <article
              className={`${styles.summaryCard} ${styles.incomeCard}`}
            >
              <div
                className={
                  styles.cardIcon
                }
              >
                <FaArrowUp />
              </div>

              <div
                className={
                  styles.cardContent
                }
              >
                <span>{t("Total Income")}</span>

                <strong>
                  {formatMoney(
                    totals.income
                  )}
                </strong>

                <small>{t("Money received")}</small>
              </div>
            </article>

            <article
              className={`${styles.summaryCard} ${styles.expenseCard}`}
            >
              <div
                className={
                  styles.cardIcon
                }
              >
                <FaArrowDown />
              </div>

              <div
                className={
                  styles.cardContent
                }
              >
                <span>{t("Total Expenses")}</span>

                <strong>
                  {formatMoney(
                    totals.expenses
                  )}
                </strong>

                <small>{t("Money spent")}</small>
              </div>
            </article>

            <article
              className={`${styles.summaryCard} ${styles.creditCard}`}
            >
              <div
                className={
                  styles.cardIcon
                }
              >
                <FaCreditCard />
              </div>

              <div
                className={
                  styles.cardContent
                }
              >
                <span>{t("Total Credit")}</span>

                <strong>
                  {formatMoney(
                    totals.credits
                  )}
                </strong>

                <small>{t("Money to receive")}</small>
              </div>
            </article>

            <article
              className={`${styles.summaryCard} ${styles.debtCard}`}
            >
              <div
                className={
                  styles.cardIcon
                }
              >
                <FaFileInvoiceDollar />
              </div>

              <div
                className={
                  styles.cardContent
                }
              >
                <span>{t("Total Debt")}</span>

                <strong>
                  {formatMoney(
                    totals.debts
                  )}
                </strong>

                <small>{t("Money to pay")}</small>
              </div>
            </article>
          </section>

          {/* BALANCE */}

          <section
            className={`${styles.balancePanel} ${styles[totals.status]}`}
          >
            <div
              className={
                styles.balancePanelHeader
              }
            >
              <div>
                <span
                  className={
                    styles.sectionLabel
                  }
                >{t("FINANCIAL HEALTH")}</span>

                <h2>
                  {
                    statusInfo.title
                  }
                </h2>

                <p>
                  {
                    statusInfo.text
                  }
                </p>
              </div>

              <div
                className={
                  styles.statusIcon
                }
              >
                {(() => {
                  const Icon =
                    statusInfo.icon;

                  return <Icon />;
                })()}
              </div>
            </div>

            <div
              className={
                styles.balanceNumbers
              }
            >
              <div>
                <span>{t("Income")}</span>

                <strong>
                  {formatMoney(
                    totals.income
                  )}
                </strong>
              </div>

              <div
                className={
                  styles.balanceVs
                }
              >
                <FaBalanceScale />
                <span>{t("VS")}</span>
              </div>

              <div>
                <span>{t("Expenses")}</span>

                <strong>
                  {formatMoney(
                    totals.expenses
                  )}
                </strong>
              </div>
            </div>

            <div
              className={
                styles.differenceBar
              }
            >
              <div
                className={
                  styles.differenceTrack
                }
              >
                <div
                  className={
                    styles.differenceFill
                  }
                  style={{
                    width: `${
                      Math.min(
                        Math.abs(
                          totals.difference
                        ) /
                          Math.max(
                            totals.income,
                            totals.expenses,
                            1
                          ) *
                          100,
                        100
                      )
                    }%`,
                  }}
                />
              </div>

              <div
                className={
                  styles.differenceText
                }
              >
                <span>{t("Income vs Expenses")}</span>

                <strong>
                  {totals.difference >=
                  0
                    ? "+"
                    : ""}
                  {formatMoney(
                    totals.difference
                  )}
                </strong>
              </div>
            </div>
          </section>

          {/* TRANSACTIONS */}

          <section
            className={
              styles.transactionsSection
            }
          >
            <div
              className={
                styles.transactionsHeader
              }
            >
              <div>
                <span
                  className={
                    styles.sectionLabel
                  }
                >{t("MONEY RECORDS")}</span>

                <h2>{t("All Transactions")}</h2>

                <p>{t("Income, Expense, Credit na Debt byose biri hano.")}</p>
              </div>

              <button
                type="button"
                className={
                  styles.mobileAddButton
                }
                onClick={
                  openAddModal
                }
              >
                <FaPlus />{t("Add")}</button>
            </div>

            {/* FILTERS */}

            <div
              className={
                styles.filters
              }
            >
              <div
                className={
                  styles.searchBox
                }
              >
                <FaSearch />

                <input
                  type="search"
                  value={search}
                  placeholder={t("Search records...")}
                  onChange={(e) =>
                    setSearch(
                      e.target.value
                    )
                  }
                />
              </div>

              <div
                className={
                  styles.filterControl
                }
              >
                <FaFilter />

                <select
                  value={
                    filterType
                  }
                  onChange={(e) =>
                    setFilterType(
                      e.target.value
                    )
                  }
                >
                  <option value="all">{t("All Types")}</option>

                  <option value="income">{t("Income")}</option>

                  <option value="expense">{t("Expense")}</option>

                  <option value="credit">{t("Credit")}</option>

                  <option value="debt">{t("Debt")}</option>
                </select>

                <FaChevronDown />
              </div>

              <div
                className={
                  styles.filterControl
                }
              >
                <select
                  value={
                    filterCategory
                  }
                  onChange={(e) =>
                    setFilterCategory(
                      e.target.value
                    )
                  }
                >
                  <option value="all">{t("All Categories")}</option>

                  {CATEGORIES.map(
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

                <FaChevronDown />
              </div>
            </div>

            {/* COUNT */}

            <div
              className={
                styles.recordsInfo
              }
            >
              <span>
                {filteredTransactions.length}{" "}{t("records")}</span>

              {loadingData && (
                <span>{t("Loading...")}</span>
              )}
            </div>

            {/* TABLE */}

            {filteredTransactions.length ===
            0 ? (
              <div
                className={
                  styles.emptyState
                }
              >
                <div
                  className={
                    styles.emptyIcon
                  }
                >
                  <FaMoneyBillWave />
                </div>

                <h3>{t("Nta records zihari")}</h3>

                <p>{t("Ongeramo Income, Expense, Credit cyangwa Debt.")}</p>

                <button
                  type="button"
                  className={
                    styles.primaryButton
                  }
                  onClick={
                    openAddModal
                  }
                >
                  <FaPlus />{t("Add First Record")}</button>
              </div>
            ) : (
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
                      <th>{t("Date")}</th>

                      <th>{t("Description")}</th>

                      <th>{t("Category")}</th>

                      <th>{t("Type")}</th>

                      <th>{t("Amount")}</th>

                      <th>{t("Actions")}</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredTransactions.map(
                      (
                        transaction
                      ) => {
                        const info =
                          TRANSACTION_TYPES[
                            transaction.type
                          ] ||
                          TRANSACTION_TYPES.expense;

                        const Icon =
                          info.icon;

                        const positive =
                          transaction.type ===
                            "income" ||
                          transaction.type ===
                            "credit";

                        return (
                          <tr
                            key={
                              transaction.id
                            }
                          >
                            <td
                              className={
                                styles.dateCell
                              }
                            >
                              <FaCalendarAlt />

                              <span>
                                {formatDate(
                                  transaction.date
                                )}
                              </span>
                            </td>

                            <td>
                              <div
                                className={
                                  styles.descriptionCell
                                }
                              >
                                <strong>
                                  {
                                    transaction.title
                                  }
                                </strong>

                                {transaction.description && (
                                  <span>
                                    {
                                      transaction.description
                                    }
                                  </span>
                                )}
                              </div>
                            </td>

                            <td>
                              <span
                                className={
                                  styles.category
                                }
                              >
                                {
                                  transaction.category
                                }
                              </span>
                            </td>

                            <td>
                              <span
                                className={`${styles.typeBadge} ${styles[`type_${transaction.type}`]}`}
                              >
                                <Icon />

                                {
                                  info.label
                                }
                              </span>
                            </td>

                            <td>
                              <strong
                                className={`${styles.amount} ${
                                  positive
                                    ? styles.positive
                                    : styles.negative
                                }`}
                              >
                                {positive
                                  ? "+"
                                  : "-"}
                                {formatMoney(
                                  transaction.amount
                                )}
                              </strong>
                            </td>

                            <td>
                              <div
                                className={
                                  styles.actionButtons
                                }
                              >
                                <button
                                  type="button"
                                  className={
                                    styles.editButton
                                  }
                                  title={t("Edit record")}
                                  onClick={() =>
                                    openEditModal(
                                      transaction
                                    )
                                  }
                                >
                                  <FaEdit />
                                </button>

                                <button
                                  type="button"
                                  className={
                                    styles.deleteButton
                                  }
                                  title={t("Delete record")}
                                  onClick={() =>
                                    openDeleteModal(
                                      transaction.id
                                    )
                                  }
                                >
                                  <FaTrash />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* BOTTOM SUMMARY */}

          <section
            className={
              styles.bottomSummary
            }
          >
            <div>
              <span>{t("Opening Balance")}</span>

              <strong>
                {formatMoney(
                  openingBalance
                )}
              </strong>
            </div>

            <div>
              <span>{t("Income")}</span>

              <strong>
                {formatMoney(
                  totals.income
                )}
              </strong>
            </div>

            <div>
              <span>{t("Expense")}</span>

              <strong>
                {formatMoney(
                  totals.expenses
                )}
              </strong>
            </div>

            <div>
              <span>{t("Credit")}</span>

              <strong>
                {formatMoney(
                  totals.credits
                )}
              </strong>
            </div>

            <div>
              <span>{t("Debt")}</span>

              <strong>
                {formatMoney(
                  totals.debts
                )}
              </strong>
            </div>

            <div>
              <span>{t("Available Balance")}</span>

              <strong>
                {formatMoney(
                  totals.balance
                )}
              </strong>
            </div>
          </section>
        </div>

        {/* ====================================================
            ADD / EDIT MODAL
        ==================================================== */}

        {showModal && (
          <div
            className={
              styles.modalOverlay
            }
            onMouseDown={(e) => {
              if (
                e.target ===
                e.currentTarget
              ) {
                closeModal();
              }
            }}
          >
            <div
              className={
                styles.modal
              }
            >
              <div
                className={
                  styles.modalHeader
                }
              >
                <div>
                  <span
                    className={
                      styles.sectionLabel
                    }
                  >{t("FINANCIAL RECORD")}</span>

                  <h2>
                    {editingId
                      ? t("Edit Record")
                      : t("Add Record")}
                  </h2>
                </div>

                <button
                  type="button"
                  className={
                    styles.closeButton
                  }
                  onClick={
                    closeModal
                  }
                  disabled={loading}
                >
                  <FaTimes />
                </button>
              </div>

              {errorMessage && (
                <div
                  className={
                    styles.modalError
                  }
                >
                  {errorMessage}
                </div>
              )}

              {/* TYPE */}

              <div
                className={
                  styles.typeSelector
                }
              >
                {Object.entries(
                  TRANSACTION_TYPES
                ).map(
                  ([
                    key,
                    info,
                  ]) => {
                    const Icon =
                      info.icon;

                    const active =
                      form.type ===
                      key;

                    return (
                      <button
                        type="button"
                        key={key}
                        className={
                          active
                            ? `${styles.typeOption} ${styles.typeOptionActive}`
                            : styles.typeOption
                        }
                        onClick={() =>
                          setForm(
                            (
                              previous
                            ) => ({
                              ...previous,
                              type: key,
                            })
                          )
                        }
                      >
                        <Icon />

                        <span>
                          {
                            info.label
                          }
                        </span>
                      </button>
                    );
                  }
                )}
              </div>

              <form
                className={
                  styles.form
                }
                onSubmit={
                  handleSubmit
                }
              >
                <div
                  className={
                    styles.formGrid
                  }
                >
                  <label
                    className={
                      styles.formGroup
                    }
                  >
                    <span>{t("Title *")}</span>

                    <input
                      type="text"
                      name="title"
                      value={
                        form.title
                      }
                      onChange={
                        handleFormChange
                      }
                      placeholder={t("e.g. Salary")}
                      maxLength={120}
                      required
                    />
                  </label>

                  <label
                    className={
                      styles.formGroup
                    }
                  >
                    <span>{t("Amount ({CURRENCY}) *", { CURRENCY })}</span>

                    <input
                      type="number"
                      name="amount"
                      value={
                        form.amount
                      }
                      onChange={
                        handleFormChange
                      }
                      placeholder="0"
                      min="0.01"
                      step="0.01"
                      required
                    />
                  </label>

                  <label
                    className={
                      styles.formGroup
                    }
                  >
                    <span>{t("Category")}</span>

                    <select
                      name="category"
                      value={
                        form.category
                      }
                      onChange={
                        handleFormChange
                      }
                    >
                      {CATEGORIES.map(
                        (
                          category
                        ) => (
                          <option
                            key={
                              category
                            }
                            value={
                              category
                            }
                          >
                            {
                              category
                            }
                          </option>
                        )
                      )}
                    </select>
                  </label>

                  <label
                    className={
                      styles.formGroup
                    }
                  >
                    <span>{t("Date *")}</span>

                    <input
                      type="date"
                      name="date"
                      value={
                        form.date
                      }
                      onChange={
                        handleFormChange
                      }
                      required
                    />
                  </label>
                </div>

                <label
                  className={
                    styles.formGroup
                  }
                >
                  <span>{t("Description")}</span>

                  <textarea
                    name="description"
                    value={
                      form.description
                    }
                    onChange={
                      handleFormChange
                    }
                    placeholder={t("Additional details...")}
                    rows={4}
                    maxLength={500}
                  />
                </label>

                <div
                  className={
                    styles.modalActions
                  }
                >
                  <button
                    type="button"
                    className={
                      styles.cancelButton
                    }
                    onClick={
                      closeModal
                    }
                    disabled={loading}
                  >{t("Cancel")}</button>

                  <button
                    type="submit"
                    className={
                      styles.primaryButton
                    }
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span
                          className={
                            styles.buttonSpinner
                          }
                        />{t("Saving...")}</>
                    ) : (
                      <>
                        <FaCheckCircle />

                        {editingId
                          ? t("Update Record")
                          : t("Save Record")}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ====================================================
            STARTING BALANCE
        ==================================================== */}

        {showBalanceModal && (
          <div
            className={
              styles.modalOverlay
            }
            onMouseDown={(e) => {
              if (
                e.target ===
                e.currentTarget
              ) {
                setShowBalanceModal(
                  false
                );
              }
            }}
          >
            <div
              className={
                styles.smallModal
              }
            >
              <div
                className={
                  styles.modalHeader
                }
              >
                <div>
                  <span
                    className={
                      styles.sectionLabel
                    }
                  >{t("ACCOUNT SETUP")}</span>

                  <h2>{t("Opening Balance")}</h2>
                </div>

                <button
                  type="button"
                  className={
                    styles.closeButton
                  }
                  onClick={() =>
                    setShowBalanceModal(
                      false
                    )
                  }
                >
                  <FaTimes />
                </button>
              </div>

              {errorMessage && (
                <div
                  className={
                    styles.modalError
                  }
                >
                  {errorMessage}
                </div>
              )}

              <div
                className={
                  styles.balanceInfo
                }
              >
                <FaWallet />

                <p>{t("Andika amafaranga wari usanganwe mbere yo gutangira gukoresha financial manager.")}</p>
              </div>

              <label
                className={
                  styles.formGroup
                }
              >
                <span>{t("Opening Balance ({CURRENCY})", { CURRENCY })}</span>

                <input
                  type="number"
                  value={
                    balanceInput
                  }
                  onChange={(e) =>
                    setBalanceInput(
                      e.target.value
                    )
                  }
                  min="0"
                  step="0.01"
                  placeholder="0"
                />
              </label>

              <div
                className={
                  styles.modalActions
                }
              >
                <button
                  type="button"
                  className={
                    styles.cancelButton
                  }
                  onClick={() =>
                    setShowBalanceModal(
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
                    handleSaveOpeningBalance
                  }
                  disabled={
                    savingBalance
                  }
                >
                  {savingBalance
                    ? t("Saving...")
                    : t("Save Balance")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================
            DELETE CONFIRMATION
        ==================================================== */}

        {showDeleteModal && (
          <div
            className={
              styles.modalOverlay
            }
            onMouseDown={(e) => {
              if (
                e.target ===
                e.currentTarget
              ) {
                closeDeleteModal();
              }
            }}
          >
            <div
              className={
                styles.confirmModal
              }
            >
              <div
                className={
                  styles.deleteIcon
                }
              >
                <FaTrash />
              </div>

              <h2>{t("Delete Record?")}</h2>

              <p>{t("Ugiye gusiba iyi financial record. Iki gikorwa ntigishobora gusubizwa.")}</p>

              {errorMessage && (
                <div
                  className={
                    styles.modalError
                  }
                >
                  {errorMessage}
                </div>
              )}

              <div
                className={
                  styles.modalActions
                }
              >
                <button
                  type="button"
                  className={
                    styles.cancelButton
                  }
                  onClick={
                    closeDeleteModal
                  }
                  disabled={loading}
                >{t("Cancel")}</button>

                <button
                  type="button"
                  className={
                    styles.dangerButton
                  }
                  onClick={
                    handleDelete
                  }
                  disabled={loading}
                >
                  {loading
                    ? t("Deleting...")
                    : t("Yes, Delete")}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
