// pages/post-analyzer.js

import { useState } from "react";
import Head from "next/head";

import AnalyzerInput from "../components/PostAnalyzer/AnalyzerInput";
import AnalysisReport from "../components/PostAnalyzer/AnalysisReport";
import { useI18n } from "@/i18n/I18nProvider";

export default function PostAnalyzer() {
  const { t } = useI18n();

  const [report, setReport] =
    useState(null);

  const [analyzedText, setAnalyzedText] =
    useState("");

  const [isAnalyzing, setIsAnalyzing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [analysisSteps, setAnalysisSteps] =
    useState([]);

  const handleAnalyze = async (
    text
  ) => {
    setIsAnalyzing(true);
    setError("");
    setReport(null);
    setAnalyzedText(text);

    setAnalysisSteps([
      {
        text: "Reading content",
        status: "active",
      },
      {
        text: "Counting words and characters",
        status: "pending",
      },
      {
        text: "Analyzing sentences and paragraphs",
        status: "pending",
      },
      {
        text: "Calculating vocabulary and reading time",
        status: "pending",
      },
      {
        text: "Analyzing AI-writing signals",
        status: "pending",
      },
      {
        text: "Checking local source similarity",
        status: "pending",
      },
      {
        text: "Preparing report",
        status: "pending",
      },
    ]);

    try {
      if (
        !text ||
        typeof text !== "string"
      ) {
        throw new Error(
          "Please enter some text to analyze."
        );
      }

      const cleanText =
        text.trim();

      if (!cleanText) {
        throw new Error(
          "The text cannot be empty."
        );
      }

      /*
       * STEP 1
       */
      await new Promise(
        (resolve) =>
          setTimeout(
            resolve,
            250
          )
      );

      setAnalysisSteps(
        (steps) =>
          steps.map(
            (step, index) =>
              index === 0
                ? {
                    ...step,
                    status:
                      "completed",
                  }
                : index === 1
                ? {
                    ...step,
                    status:
                      "active",
                  }
                : step
          )
      );

      /*
       * STEP 2
       */
      await new Promise(
        (resolve) =>
          setTimeout(
            resolve,
            250
          )
      );

      setAnalysisSteps(
        (steps) =>
          steps.map(
            (step, index) =>
              index <= 1
                ? {
                    ...step,
                    status:
                      "completed",
                  }
                : index === 2
                ? {
                    ...step,
                    status:
                      "active",
                  }
                : step
          )
      );

      /*
       * STEP 3
       */
      await new Promise(
        (resolve) =>
          setTimeout(
            resolve,
            250
          )
      );

      setAnalysisSteps(
        (steps) =>
          steps.map(
            (step, index) =>
              index <= 2
                ? {
                    ...step,
                    status:
                      "completed",
                  }
                : index === 3
                ? {
                    ...step,
                    status:
                      "active",
                  }
                : step
          )
      );

      /*
       * ONE API CALL
       */
      const response =
        await fetch(
          "/api/ana",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                text: cleanText,
              }),
          }
        );

      let data;

      try {
        data =
          await response.json();
      } catch {
        throw new Error(
          "The analysis server returned an invalid response."
        );
      }

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Analysis failed."
        );
      }

      if (
        !data?.success
      ) {
        throw new Error(
          data?.error ||
            "Analysis failed."
        );
      }

      /*
       * STEP 4
       */
      setAnalysisSteps(
        (steps) =>
          steps.map(
            (step, index) =>
              index <= 3
                ? {
                    ...step,
                    status:
                      "completed",
                  }
                : index === 4
                ? {
                    ...step,
                    status:
                      "active",
                  }
                : step
          )
      );

      await new Promise(
        (resolve) =>
          setTimeout(
            resolve,
            350
          )
      );

      /*
       * STEP 5
       */
      setAnalysisSteps(
        (steps) =>
          steps.map(
            (step, index) =>
              index <= 4
                ? {
                    ...step,
                    status:
                      "completed",
                  }
                : index === 5
                ? {
                    ...step,
                    status:
                      "active",
                  }
                : step
          )
      );

      await new Promise(
        (resolve) =>
          setTimeout(
            resolve,
            350
          )
      );

      /*
       * STEP 6
       */
      setAnalysisSteps(
        (steps) =>
          steps.map(
            (step, index) =>
              index <= 5
                ? {
                    ...step,
                    status:
                      "completed",
                  }
                : index === 6
                ? {
                    ...step,
                    status:
                      "active",
                  }
                : step
          )
      );

      await new Promise(
        (resolve) =>
          setTimeout(
            resolve,
            350
          )
      );

      setAnalysisSteps(
        (steps) =>
          steps.map(
            (step) => ({
              ...step,
              status:
                "completed",
            })
          )
      );

      setReport(data);
    } catch (err) {
      console.error(
        "Post analysis error:",
        err
      );

      setError(
        err?.message ||
          t("An error occurred during analysis.")
      );

      setAnalysisSteps([]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <>
      <Head>
        <title>{t("Post Analyzer")}</title>

        <meta
          name="description"
          content="Analyze Kinyarwanda text, statistics, vocabulary, reading time and AI-writing signals."
        />

        <meta
          name="viewport"
          content="width=device-width, initial-scale=1"
        />

        <meta
          name="robots"
          content="noindex,nofollow"
        />
      </Head>

      <main
        style={{
          minHeight:
            "100vh",

          background:
            "radial-gradient(ellipse at top, rgba(99,102,241,0.12) 0%, rgba(7,11,18,1) 70%)",

          backgroundColor:
            "#070b12",

          color:
            "#e2e8f0",

          padding:
            "2rem 1rem 4rem",
        }}
      >
        <div
          style={{
            width:
              "100%",

            maxWidth:
              "1100px",

            margin:
              "70px auto 0",
          }}
        >
          <header
            style={{
              textAlign:
                "center",

              marginBottom:
                "3rem",
            }}
          >
            <h1
              style={{
                fontSize:
                  "clamp(1.75rem,5vw,2.7rem)",

                fontWeight:
                  800,

                lineHeight:
                  1.2,

                background:
                  "linear-gradient(135deg,#818cf8 0%,#c084fc 50%,#22d3ee 100%)",

                WebkitBackgroundClip:
                  "text",

                WebkitTextFillColor:
                  "transparent",

                margin:
                  "0 0 .75rem",
              }}
            >{t("Post Analyzer")}</h1>

            <p
              style={{
                color:
                  "#94a3b8",

                fontSize:
                  "clamp(.875rem,2vw,1rem)",

                maxWidth:
                  "700px",

                margin:
                  "0 auto",

                lineHeight:
                  1.7,
              }}
            >{t("Analyze Kinyarwanda writing, text statistics, vocabulary, reading time, AI-writing signals and local source similarity.")}</p>
          </header>

          <AnalyzerInput
            onAnalyze={
              handleAnalyze
            }
            isAnalyzing={
              isAnalyzing
            }
          />

          {error && (
            <div
              role="alert"
              style={{
                background:
                  "rgba(239,68,68,.1)",

                border:
                  "1px solid rgba(239,68,68,.35)",

                color:
                  "#fca5a5",

                padding:
                  "1rem",

                borderRadius:
                  "10px",

                marginTop:
                  "1.25rem",

                lineHeight:
                  1.6,
              }}
            >
              <strong>{t("Analysis Error")}</strong>

              <div
                style={{
                  marginTop:
                    ".35rem",
                }}
              >
                {error}
              </div>
            </div>
          )}

          {isAnalyzing && (
            <section
              aria-live="polite"
              style={{
                background:
                  "linear-gradient(135deg,#0b1220,#111827)",

                border:
                  "1px solid #1e293b",

                borderRadius:
                  "14px",

                padding:
                  "clamp(1.25rem,4vw,2rem)",

                marginTop:
                  "1.5rem",
              }}
            >
              <h2
                style={{
                  textAlign:
                    "center",

                  margin:
                    "0 0 1.5rem",
                }}
              >{t("Analyzing Post...")}</h2>

              <div
                style={{
                  display:
                    "flex",

                  flexDirection:
                    "column",

                  gap:
                    ".85rem",
                }}
              >
                {analysisSteps.map(
                  (
                    step,
                    index
                  ) => {
                    const completed =
                      step.status ===
                      "completed";

                    const active =
                      step.status ===
                      "active";

                    return (
                      <div
                        key={
                          `${index}-${step.text}`
                        }
                        style={{
                          display:
                            "flex",

                          alignItems:
                            "center",

                          gap:
                            ".9rem",

                          color:
                            completed
                              ? "#10b981"
                              : active
                              ? "#818cf8"
                              : "#475569",
                        }}
                      >
                        <span
                          style={{
                            width:
                              "24px",

                            height:
                              "24px",

                            display:
                              "inline-flex",

                            alignItems:
                              "center",

                            justifyContent:
                              "center",
                          }}
                        >
                          {completed
                            ? "✓"
                            : active
                            ? "●"
                            : "○"}
                        </span>

                        <span>
                          {
                            step.text
                          }
                        </span>

                        {active && (
                          <span
                            style={{
                              marginLeft:
                                "auto",

                              color:
                                "#64748b",

                              fontSize:
                                ".75rem",
                            }}
                          >{t("Working...")}</span>
                        )}
                      </div>
                    );
                  }
                )}
              </div>
            </section>
          )}

          {report &&
            !isAnalyzing && (
              <section
                style={{
                  marginTop:
                    "1.5rem",
                }}
              >
                <AnalysisReport
                  report={
                    report
                  }
                  text={
                    analyzedText
                  }
                />
              </section>
            )}

          {!isAnalyzing &&
            !report &&
            !error && (
              <div
                style={{
                  textAlign:
                    "center",

                  marginTop:
                    "2rem",

                  color:
                    "#64748b",

                  fontSize:
                    ".8rem",

                  lineHeight:
                    1.6,
                }}
              >{t("AI-writing detection is statistical analysis, not proof of authorship.")}</div>
            )}
        </div>
      </main>
    </>
  );
}
