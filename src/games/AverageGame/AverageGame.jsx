import { useCallback, useEffect, useRef, useState } from "react";
import { createAttemptId } from "../../scoring/competitionScoring.js";
import "./AverageGame.css";
import skyBackground from "../../assets/home-layers/background.png";
import averagePortal from "../../assets/home-layers/average.png";
const text = {
  en: {
    realm: "MATH WEEK",
    challenge: "AVERAGE CHALLENGE",
    title: "2/3 Average",
    tagline: "Closest to ⅔ of the average wins.",
    stepPlayer: "Start",
    stepChoose: "Pick",
    stepDone: "Locked",
    enterTitle: "Ready to Play?",
    enterSub: "Pick 0–100. Closest to ⅔ of the average wins.",
    nameLabel: "Your Name",
    namePlaceholder: "e.g. Alex Tan",
    idLabel: "Student ID",
    idPlaceholder: "e.g. MAT2404256",
    nameError: "Please enter your name",
    idError: "Please enter your student ID",
    next: "START",
    hintFillAll: "Complete both fields to unlock the portal.",
    ready: "READY",
    chooseTitle: "Pick Your Number",
    chooseSub: "One number · 0–100",
    back: "Back",
    lock: "LOCK NUMBER",
    submitting: "LOCKING…",
    tip: "Aim for ⅔ of everyone’s average.",
    keyHint: "← / → ±1  ·  Shift ±10",
    complete: "LOCKED",
    completeTitle: "Number Locked",
    completeSub: "Scan the QR code to save your number.",
    result: "Results after the challenge.",
    yourNumber: "YOUR PICK",
    newPlayer: "New Player",
    guideTitle: "The Rule",
    guide1: "Pick one number: 0–100.",
    guide2: "Closest to the target wins.",
    guide3: "Scan the QR code after playing.",
    guideNote: "Results after the challenge.",
    target: "TARGET",
  },
  zh: {
    realm: "数学周",
    challenge: "平均数挑战",
    title: "平均数的 ⅔",
    tagline: "最接近全体平均数的 ⅔ 即获胜。",
    stepPlayer: "开始",
    stepChoose: "选数",
    stepDone: "锁定",
    enterTitle: "准备好了吗？",
    enterSub: "选 0–100 的整数，最接近平均数的 ⅔ 即获胜。",
    nameLabel: "姓名",
    namePlaceholder: "例如：陈小明",
    idLabel: "学号",
    idPlaceholder: "例如：MAT2404256",
    nameError: "请输入姓名",
    idError: "请输入学号",
    next: "开始",
    hintFillAll: "填写完整后即可开启传送门。",
    ready: "已准备",
    chooseTitle: "选一个数字",
    chooseSub: "只选一次 · 0–100",
    back: "返回",
    lock: "锁定数字",
    submitting: "锁定中…",
    tip: "目标：全体平均数的 ⅔。",
    keyHint: "← / → ±1  ·  Shift ±10",
    complete: "已锁定",
    completeTitle: "数字已锁定",
    completeSub: "接下来保存个人资料。",
    result: "活动结束后公布结果。",
    yourNumber: "你的选择",
    newPlayer: "新玩家",
    guideTitle: "规则",
    guide1: "选一个 0–100 的数字。",
    guide2: "最接近目标值的玩家获胜。",
    guide3: "游戏后填写资料保存。",
    guideNote: "活动结束后公布结果。",
    target: "目标",
  },
};
const ArrowLeft = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M19 12H5M11 18l-6-6 6-6" />
  </svg>
);
const Check = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);
const Spark = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 2l2.3 7.7L22 12l-7.7 2.3L12 22l-2.3-7.7L2 12l7.7-2.3L12 2Z" />
  </svg>
);
export default function AverageGame() {
  const [language, setLanguage] = useState("en");
  const [stage, setStage] = useState(1);
  const [direction, setDirection] = useState(1);
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [number, setNumber] = useState(50);
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState({ name: false, id: false });
  // Shared Player Registration has already created the first player's row.
  // Average also has an in-game NEW PLAYER flow: that flow must create a
  // *different* session, rather than silently sending it to the old endpoint.
  const averageAttemptRef = useRef(createAttemptId("average"));
  const t = text[language];
  const nameOk = name.trim().length > 0;
  const idOk = studentId.trim().length > 0;
  const formOk = true;
  const goTo = useCallback(
    (nextStage) => {
      setDirection(nextStage >= stage ? 1 : -1);
      setStage(nextStage);
    },
    [stage]
  );
  const submitAnswer = useCallback(() => {
    if (submitting || !Number.isInteger(number) || number < 0 || number > 100) return;
    setSubmitting(true);
    window.dispatchEvent(
      new CustomEvent("mathweek:average-result", {
        detail: {
          attemptId: averageAttemptRef.current,
          playerSlot: "single",
          finalScore: number,
          outcome: "completed",
        },
      })
    );
    goTo(3);
    setSubmitting(false);
  }, [goTo, number, submitting]);
  const resetAll = () => {
    setDirection(1);
    setStage(1);
    setName("");
    setStudentId("");
    setNumber(50);
    setSubmitting(false);
    setTouched({ name: false, id: false });
    averageAttemptRef.current = createAttemptId("average");
  };
  useEffect(() => {
    if (stage !== 2 || submitting) return undefined;
    const onKey = (event) => {
      if (
        event.target instanceof HTMLInputElement &&
        event.target.type === "range"
      ) {
        return;
      }
      const step = event.shiftKey ? 10 : 1;
      if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
        event.preventDefault();
        setNumber((value) => Math.max(0, value - step));
      }
      if (event.key === "ArrowRight" || event.key === "ArrowUp") {
        event.preventDefault();
        setNumber((value) => Math.min(100, value + step));
      }
      if (event.key === "Enter") {
        event.preventDefault();
        submitAnswer();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stage, name, studentId, number, language, submitting, submitAnswer]);
  const progress = [
    { n: 1, label: t.stepPlayer },
    { n: 2, label: t.stepChoose },
    { n: 3, label: t.stepDone },
  ];
  return (
    <div className="average-game">
      <main className="avg-scene">
        <img className="avg-sky" src={skyBackground} alt="" />
        <div className="avg-atmosphere" aria-hidden="true">
          <span className="avg-star s1" />
          <span className="avg-star s2" />
          <span className="avg-star s3" />
          <span className="avg-star s4" />
          <span className="avg-star s5" />
          <span className="avg-light-trail trail-a" />
          <span className="avg-light-trail trail-b" />
        </div>
        <div className="avg-overlay" />
        <header className="avg-topbar">
          <div className="avg-realm-brand">
            <span>{t.realm}</span>
            <small>{t.challenge}</small>
          </div>
          <div className="avg-lang" role="group" aria-label="Language">
            <span
              className="avg-lang-pill"
              data-pos={language === "zh" ? "1" : "0"}
            />
            <button
              type="button"
              className={language === "en" ? "active" : ""}
              onClick={() => setLanguage("en")}
            >
              EN
            </button>
            <button
              type="button"
              className={language === "zh" ? "active" : ""}
              onClick={() => setLanguage("zh")}
            >
              中文
            </button>
          </div>
        </header>
        <section className="avg-content">
          <div className="avg-game-column">
            <div className="avg-hero">
              <div className="avg-hero-copy">
                <h1>{t.title}</h1>
                <p>{t.tagline}</p>
              </div>
              <nav className="avg-progress" aria-label="Progress">
                {progress.map((item, index) => {
                  const active = stage >= item.n;
                  const done = stage > item.n || (item.n === 3 && stage === 3);
                  return (
                    <div className="avg-progress-part" key={item.n}>
                      <div
                        className={`avg-progress-step ${
                          active ? "active" : ""
                        } ${done ? "done" : ""}`}
                      >
                        <span className="avg-progress-dot">
                          {done ? <Check /> : item.n}
                        </span>
                        <small>{item.label}</small>
                      </div>
                      {index < progress.length - 1 && (
                        <span
                          className={`avg-progress-line ${
                            stage > item.n ? "active" : ""
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </nav>
            </div>
            <section className="avg-stage-panel">
              <div className="avg-panel-shine" />
              {stage === 1 && (
                <div
                  className="avg-stage avg-ready-stage"
                  key="stage-1"
                  data-dir={direction}
                >
                  <div className="avg-stage-head">
                    <span className="avg-stage-number">01</span>
                    <div>
                      <h2>{t.enterTitle}</h2>
                      <p>{t.enterSub}</p>
                    </div>
                  </div>
                  <div className="avg-form" hidden>
                    <label
                      className={`avg-field ${
                        touched.name && !nameOk ? "invalid" : ""
                      }`}
                    >
                      <span>{t.nameLabel}</span>
                      <input
                        value={name}
                        maxLength={40}
                        autoComplete="off"
                        placeholder={t.namePlaceholder}
                        onChange={(event) => setName(event.target.value)}
                        onBlur={() =>
                          setTouched((current) => ({
                            ...current,
                            name: true,
                          }))
                        }
                      />
                      {touched.name && !nameOk && (
                        <small>{t.nameError}</small>
                      )}
                    </label>
                    <label
                      className={`avg-field ${
                        touched.id && !idOk ? "invalid" : ""
                      }`}
                    >
                      <span>{t.idLabel}</span>
                      <input
                        value={studentId}
                        maxLength={20}
                        autoComplete="off"
                        placeholder={t.idPlaceholder}
                        onChange={(event) => setStudentId(event.target.value)}
                        onBlur={() =>
                          setTouched((current) => ({
                            ...current,
                            id: true,
                          }))
                        }
                      />
                      {touched.id && !idOk && (
                        <small>{t.idError}</small>
                      )}
                    </label>
                  </div>
                  <div className="avg-intro-symbol" aria-hidden="true">
                    <span className="avg-intro-glow" />
                    <strong>⅔</strong>
                    <span>× AVERAGE</span>
                  </div>
                  <div className="avg-stage-footer">
                    <span className={`avg-status ${formOk ? "ready" : ""}`}>
                      <i />
                      {formOk ? t.ready : t.hintFillAll}
                    </span>
                    <button
                      type="button"
                      className="avg-primary"
                      disabled={!formOk}
                      onClick={() => goTo(2)}
                    >
                      {t.next}
                      <span>→</span>
                    </button>
                  </div>
                </div>
              )}
              {stage === 2 && (
                <div
                  className="avg-stage avg-number-stage"
                  key="stage-2"
                  data-dir={direction}
                >
                  <div className="avg-stage-head">
                    <span className="avg-stage-number">02</span>
                    <div>
                      <h2>{t.chooseTitle}</h2>
                      <p>{t.chooseSub}</p>
                    </div>
                  </div>
                  <div className="avg-number-zone">
                    <button
                      type="button"
                      className="avg-number-button"
                      disabled={submitting || number <= 0}
                      onClick={() =>
                        setNumber((value) => Math.max(0, value - 1))
                      }
                    >
                      −
                    </button>
                    <div className="avg-crystal-number">
                      <span className="avg-crystal-ring ring-1" />
                      <span className="avg-crystal-ring ring-2" />
                      <strong key={number}>{number}</strong>
                      <small>0 — 100</small>
                    </div>
                    <button
                      type="button"
                      className="avg-number-button"
                      disabled={submitting || number >= 100}
                      onClick={() =>
                        setNumber((value) => Math.min(100, value + 1))
                      }
                    >
                      +
                    </button>
                  </div>
                  <div className="avg-slider-wrap">
                    <input
                      type="range"
                      aria-label={language === "zh" ? "选择数字" : "Choose a number"}
                      min="0"
                      max="100"
                      value={number}
                      disabled={submitting}
                      style={{ "--pct": `${number}%` }}
                      onChange={(event) =>
                        setNumber(Number(event.target.value))
                      }
                    />
                    <div className="avg-slider-scale">
                      <span>0</span>
                      <span>50</span>
                      <span>100</span>
                    </div>
                    <small className="avg-key-hint">{t.keyHint}</small>
                  </div>
                  <div className="avg-tip">
                    <Spark />
                    <span>{t.tip}</span>
                  </div>
                  <div className="avg-actions">
                    <button
                      type="button"
                      className="avg-secondary"
                      disabled={submitting}
                      onClick={() => goTo(1)}
                    >
                      <ArrowLeft />
                      {t.back}
                    </button>
                    <button
                      type="button"
                      className="avg-primary"
                      disabled={submitting}
                      onClick={submitAnswer}
                    >
                      {submitting ? t.submitting : t.lock}
                      <Spark />
                    </button>
                  </div>
                </div>
              )}
              {stage === 3 && (
                <div
                  className="avg-stage avg-done-stage"
                  key="stage-3"
                  data-dir={direction}
                >
                  <div className="avg-complete-icon">
                    <Check />
                  </div>
                  <span className="avg-complete-tag">{t.complete}</span>
                  <h2>{t.completeTitle}</h2>
                  <div className="avg-receipt">
                    <div>
                      <small>{t.yourNumber}</small>
                      <strong>{number}</strong>
                    </div>
                    <span className="avg-receipt-divider" />
                    <div className="avg-player-summary">
                      <strong>{name || "—"}</strong>
                      <small>{studentId || "—"}</small>
                    </div>
                  </div>
                  <div className="avg-score-pending" role="status">
                    <i aria-hidden="true" />
                    <strong>SCORE PENDING</strong>
                  </div>
                  <div className="avg-actions">
                    <button
                      type="button"
                      className="avg-primary"
                      onClick={resetAll}
                    >
                      {t.newPlayer}
                      <span>→</span>
                    </button>
                  </div>
                </div>
              )}
            </section>
          </div>
          <aside className="avg-guide">
            <div className="avg-guide-portal" aria-hidden="true">
              <div className="avg-portal-halo" />
              <img src={averagePortal} alt="" />
            </div>
            <div className="avg-guide-copy">
              <span className="avg-guide-kicker">⅔ AVERAGE</span>
              <h2>{t.guideTitle}</h2>
              <div className="avg-guide-steps">
                {[t.guide1, t.guide2].map((item, index) => (
                  <div className="avg-guide-step" key={item}>
                    <span>{index + 1}</span>
                    <p>{item}</p>
                  </div>
                ))}
              </div>
              <div className="avg-target">
                <small>{t.target}</small>
                <div>
                  <strong>⅔</strong>
                  <span>×</span>
                  <b>AVERAGE</b>
                </div>
              </div>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
