import { useEffect, useState } from "react";
import styles from "./WritingCoach.module.css";
import { useI18n } from "@/i18n/I18nProvider";

const WRITING_TIPS = [
  "Ntukabwire umusomyi uko ibintu bimeze, ahubwo ubyerekene. Aho kuvuga ngo 'yararakaye', garagaza uko yakomeje ibipfunsi, yahindutse mu maso cyangwa yazamuye ijwi.",
  "Jya usoma ibyo wanditse uranguruye ijwi. Iyo hari ahakugoye gusoma, akenshi ni ho hakenera gukosorwa.",
  "Mu nyandiko ya mbere, andika udafite ubwoba bwo gukora amakosa. Nyuma uzayisubiremo uyitunganye witonze.",
  "Buri gice cy'inkuru kigomba kugira umumaro, nko guteza inkuru imbere, guteza imbere umukinankuru cyangwa gukora byombi.",
  "Abanditsi beza bigira ku bandi, ariko abanditsi b'indashyikirwa bafata ibyo bize bakabihindura umwihariko wabo.",
  "Ntugaharanire ko inyandiko ya mbere iba itunganye. Icy'ingenzi ni ukuyirangiza, gutunganya bikaza nyuma.",
  "Jya ugendana agatabo cyangwa ukoreshe telefone wandikemo ibitekerezo. Ibitekerezo byiza bishobora kuza igihe icyo ari cyo cyose.",
  "Tangira wandike ibyo usanzwe uzi, ariko ujye ushaka no kwiga ibishya kugira ngo ubashe kwandika ibyo utari uzi.",
  "Ha buri mukinankuru intego cyangwa icyo ashaka kugeraho. Ni byo bituma ibikorwa bye bigira icyerekezo.",
  "Umwanditsi mwiza agerageza kumva no gusobanukirwa amarangamutima n'ubuzima bw'abandi.",
  "Ntutegereze guhumekerwa n'igitekerezo. Gira gahunda ihoraho yo kwandika, kuko ari yo ituma utera imbere.",
  "Niba inkuru ifite ikibazo, ntukihishe inyuma yo guhindura amagambo gusa. Kosora ikibazo kiri mu nkuru ubwayo.",
  "Buri mukinankuru yumva ari we muntu w'ingenzi mu buzima bwe. Jya ubyubaha igihe umwubaka.",
  "Koresha ibisobanuro bisobanutse kandi bifatika. Amagambo yihariye afasha umusomyi kubona ishusho nyayo y'ibiri kuba.",
  "Ha umusomyi amahirwe yo kwivumburira ibiri kuba. Ntumusobanurire buri kantu kose."
];

const COMMON_MISTAKES = [
  {
    mistake: "Kwibwira aho kwerekana",
    explanation:
      "Aho kuvuga uti 'Yari afite agahinda', erekana ibimenyetso byabyo. Urugero: 'Yacuritse umutwe, aceceka igihe kirekire, amarira atangira kumuzenga mu maso.'"
  },
  {
    mistake: "Gukoresha amagambo adafite umumaro",
    explanation:
      "Hitamo amagambo afite imbaraga. Aho kuvuga ngo 'Yirutse vuba cyane', andika ngo 'Yirukankanye imbaraga ze zose'."
  },
  {
    mistake: "Guhindagura icyerekezo cy'inkuru",
    explanation:
      "Irinde gusimbukira mu bitekerezo by'abakinankuru benshi mu gice kimwe. Kurikiza icyerekezo cy'umukinankuru umwe kugira ngo umusomyi atabitiranya."
  },
  {
    mistake: "Gusobanura buri kantu",
    explanation:
      "Ntusobanurire umusomyi ibintu byose. Muhe ibimenyetso bihagije, umureke na we yitekerereze ku bice bimwe by'inkuru."
  },
  {
    mistake: "Gutangiza inkuru mu buryo busanzwe",
    explanation:
      "Irinde gutangiza inkuru uvuga umuntu ukangutse cyangwa warose. Ahubwo tangira ahari igikorwa, ikibazo cyangwa ikintu gitera amatsiko."
  },
  {
    mistake: "Gukoresha imvugo imenyerewe cyane",
    explanation:
      "Shaka uburyo bushya bwo gusobanura ibintu aho gukoresha interuro zisanzwe zisomwa kenshi."
  },
  {
    mistake: "Gusuka amateka yose icyarimwe",
    explanation:
      "Amakuru y'ibyabaye mbere uyatangire buhoro buhoro uko inkuru igenda itera imbere."
  },
  {
    mistake: "Gutuma abakinankuru bose bavuga kimwe",
    explanation:
      "Buri mukinankuru akwiye kugira imvugo ye, amagambo n'imiterere bimuranga."
  },
  {
    mistake: "Kwihutira kurangiza inkuru",
    explanation:
      "Ha amakimbirane n'impinduka z'abakinankuru umwanya uhagije mbere yo kugera ku musozo."
  }
];

const WEEKLY_CHALLENGES = [
  "Andika inkuru y'amagambo nibura 500, aho ibiganiro hagati y'abavugwa babiri bahishura ibanga rikomeye.",
  "Andika igice cy'inkuru aho umuvugwa ahatirwa guhitamo hagati y'amahitamo abiri yose amugora.",
  "Andika inkuru y'amagambo 100 ivuga ubuhemu cyangwa ubugambanyi, utavuze ijambo 'ubugambanyi'.",
  "Hitamo inkuru usanzwe uzi, wongere uyandike uyibona mu maso y'umuntu ufatwa nk'umwanzi.",
  "Andika igice cy'inkuru aho umukinankuru avumbura icyumba cyangwa ahantu hihishe hafite ibanga rikomeye.",
  "Andika inkuru yose ibe mu gihe kigice kimwe gusa, ifite amagambo 1600.",
  "Andika inkuru y'urukundo, ariko ugaragaze uko urwo rukundo ruhindura ubuzima bw'abakinankuru mu buryo butunguranye."
];

const ITEMS = [
  ...WRITING_TIPS.map((tip) => ({
    type: "tip",
    label: "WRITING TIP",
    title: "Inama y'uyu munsi",
    text: tip
  })),

  ...COMMON_MISTAKES.map((item) => ({
    type: "mistake",
    label: "COMMON MISTAKE",
    title: item.mistake,
    text: item.explanation
  })),

  ...WEEKLY_CHALLENGES.map((challenge) => ({
    type: "challenge",
    label: "WEEKLY CHALLENGE",
    title: "Imyitozo y'icyumweru",
    text: challenge
  }))
];

export default function WritingCoach() {
  const { t } = useI18n();

  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState("next");
  const [paused, setPaused] = useState(false);

  const item = ITEMS[current];

  const nextItem = () => {
    setDirection("next");
    setCurrent((prev) => (prev + 1) % ITEMS.length);
  };

  const previousItem = () => {
    setDirection("prev");
    setCurrent((prev) => (prev - 1 + ITEMS.length) % ITEMS.length);
  };

  useEffect(() => {
    if (paused) return;

    const timer = setInterval(() => {
      nextItem();
    }, 15000);

    return () => clearInterval(timer);
  }, [paused]);

  return (
    <section
      className={styles.wrapper}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className={styles.header}>
        <div>
          <span className={styles.smallTitle}>{t("WRITER'S CORNER")}</span>
          <h2>{t("Umwanditsi w'umunsi")}</h2>
        </div>

        <div className={styles.counter}>
          {current + 1}/{ITEMS.length}
        </div>
      </div>

      <div
        key={current}
        className={`${styles.card} ${
          direction === "next" ? styles.slideNext : styles.slidePrev
        }`}
      >
        <div className={styles.topRow}>
          <span
            className={`${styles.badge} ${
              item.type === "tip"
                ? styles.tip
                : item.type === "mistake"
                ? styles.mistake
                : styles.challenge
            }`}
          >
            {item.label}
          </span>
        </div>

        <h3>{item.title}</h3>

        <p>{item.text}</p>

        {item.type === "challenge" && (
          <div className={styles.challengeHint}>{t("✍️ Fata ikaramu cyangwa keyboard, tangira nonaha.")}</div>
        )}
      </div>

      <div className={styles.footer}>
        <div className={styles.dots}>
          {ITEMS.slice(0, Math.min(ITEMS.length, 12)).map((_, index) => (
            <span
              key={index}
              className={index === current ? styles.activeDot : styles.dot}
            />
          ))}
        </div>

        <div className={styles.controls}>
          <button
            type="button"
            onClick={previousItem}
            aria-label={t("Inama ibanza")}
            className={styles.control}
          >
            ‹
          </button>

          <button
            type="button"
            onClick={() => setPaused((prev) => !prev)}
            aria-label={paused ? t("Komeza slideshow") : t("Hagarika slideshow")}
            className={styles.pause}
          >
            {paused ? "▶" : "Ⅱ"}
          </button>

          <button
            type="button"
            onClick={nextItem}
            aria-label={t("Inama ikurikira")}
            className={styles.control}
          >
            ›
          </button>
        </div>
      </div>

      <div className={styles.progress}>
        <span style={{ width: `${((current + 1) / ITEMS.length) * 100}%` }} />
      </div>
    </section>
  );
}
