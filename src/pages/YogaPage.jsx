import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  STORAGE_KEY,
  QUEST_KEY,
  SCHEMA_VERSION,
  WEEKDAY_KEYS,
  todayISO,
  uid,
  parseLocalISO,
  addDaysISO,
  dayDiff,
  getDayIndex,
  getWeekdayShort,
  fmtDate,
  percent,
  safeNum,
  discreetText,
  DISCLAIMER_TEXT,
  QUOTES,
  MINIMUM_DAY_IDS,
  SCORED_CHECKS,
  LIFE_BASICS,
  CONTROL_LOOPS,
  FACE_HABITS,
  DEFAULT_SCHEDULE,
  MOOD_ACTIVITIES,
  URGE_STEPS,
  URGE_TRIGGERS,
  URGE_LOCATIONS,
  SOS_TEXT_TEMPLATES,
  ENV_CHECKLIST,
  HOME_WORKOUT_PLAN,
  YOGA_POSES,
  AVOID_IN_APT,
  GYM_WORKOUT_PLAN,
  GYM_DARR_TIPS,
  FRAME_BONE_CONTENT,
  CALCIUM_TABLE,
  PROTEIN_TABLE,
  DIET_PLANS,
  WEIGHT_GAIN_TIPS,
  FACE_SACH_CARD,
  FACE_AUDIT_QUESTIONS,
  FACE_ROUTINE_STEPS,
  FACE_SHAPES_GUIDE,
  SKIN_ROUTINES,
  WARDROBE_CAPSULE,
  WEEK1_QUICK_WINS,
  WEEKLY_GROOM_CHECKS,
  EXPOSURE_LADDER,
  PHQ9_QUESTIONS,
  GAD7_QUESTIONS,
  ROADMAP_PHASES,
  QUESTS,
  HEALTH_TESTS,
  SUPPLEMENT_TIERS,
  createEmptyDay,
  createInitialData,
  readUnifiedStore,
  calcDailyScoreBreakdown,
  calcDailyScore,
  calcStreaks,
  calcBodyMetrics,
  buildSmoothSvgPath,
  ModernAreaChart,
  ModernDonutChart,
  ModernRadarChart,
  Icon,
  Button,
  Card,
  Heading,
  Empty,
  Progress,
  Field,
  Modal,
  Stat,
  Accordion,
  CountdownTimer,
  Heatmap90,
  NAV,
  DAILY_HOME_WORKOUTS,
  QUICK_PROTEIN_FOODS
} from "../shared";

function YogaPage() {
  const [filter, setFilter] = useState("all");
  const [completedSets, setCompletedSets] = useState(() => {
    try {
      const saved = localStorage.getItem("cb90_yoga_sets");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Timer states
  const [timerSec, setTimerSec] = useState(45);
  const [initialSec, setInitialSec] = useState(45);
  const [isRunning, setIsRunning] = useState(false);
  const [activePoseTitle, setActivePoseTitle] = useState("Low Lunge (APT Tuck)");
  const [openAccordion, setOpenAccordion] = useState(true);

  useEffect(() => {
    try {
      localStorage.setItem("cb90_yoga_sets", JSON.stringify(completedSets));
    } catch {
      // ignore storage errors
    }
  }, [completedSets]);

  useEffect(() => {
    if (!isRunning) return;
    if (timerSec <= 0) {
      setIsRunning(false);
      // Web Audio gentle chime on completion
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(528, ctx.currentTime);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.8);
      } catch {
        // fallback if audio blocked
      }
      return;
    }
    const id = setInterval(() => setTimerSec((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [isRunning, timerSec]);

  const toggleSet = (poseId, setIdx) => {
    const key = `${poseId}-set-${setIdx}`;
    setCompletedSets((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const resetAllProgress = () => {
    setCompletedSets({});
  };

  const loadPoseTimer = (pose) => {
    setIsRunning(false);
    setInitialSec(pose.holdSec);
    setTimerSec(pose.holdSec);
    setActivePoseTitle(pose.title);
    window.scrollTo({ top: 280, behavior: "smooth" });
  };

  const setPresetTimer = (sec, label) => {
    setIsRunning(false);
    setInitialSec(sec);
    setTimerSec(sec);
    if (label) setActivePoseTitle(label);
  };

  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // Calculate live metrics
  const totalSetsCount = YOGA_POSES.reduce((acc, p) => acc + p.sets, 0);
  const doneSetsCount = Object.values(completedSets).filter(Boolean).length;
  const completionPct = Math.round((doneSetsCount / totalSetsCount) * 100);

  const posesFullyDone = YOGA_POSES.filter((p) =>
    Array.from({ length: p.sets }).every((_, idx) => completedSets[`${p.id}-set-${idx}`])
  ).length;

  const aptPosesDone = YOGA_POSES.filter(
    (p) =>
      p.category === "apt" &&
      Array.from({ length: p.sets }).every((_, idx) => completedSets[`${p.id}-set-${idx}`])
  ).length;

  const filteredPoses = YOGA_POSES.filter((p) =>
    filter === "all" ? true : p.category === filter
  );

  return (
    <main className="main-area">
      <div className="content-wrap">
        {/* ───────── PAGE HEADING ───────── */}
        <header className="page-heading">
          <div>
            <h1>Yoga & Pelvic Alignment</h1>
            <p>
              Anterior Pelvic Tilt (APT) corrective therapy aur daily full-body mobility protocol—step-by-step Hinglish guide ke saath.
            </p>
          </div>
          <div className="heading-btn-group">
            <button
              type="button"
              className="btn"
              onClick={() => setFilter("apt")}
            >
              APT 5-Pose Fix
            </button>
            <button
              type="button"
              className="btn danger-soft-btn"
              onClick={resetAllProgress}
            >
              Reset Today
            </button>
          </div>
        </header>

        {/* ───────── HERO / LIFESTYLE CALLOUT ───────── */}
        <section className="lifestyle-banner">
          <div>
            <span className="status-pill peach-pill">
              Golden Rule for Anterior Pelvic Tilt
            </span>
            <h2 style={{ marginTop: "10px" }}>
              Stretch the Front, <em>Strengthen the Back</em>.
            </h2>
            <p>
              Jab bhi koi yoga pose karo, ek cue hamesha yaad rakho:{" "}
              <strong>"Belt Buckle ko Naabhi (Navel) ki taraf upar kheencho aur Glutes squeeze rakho."</strong>{" "}
              Sirf is 2-inch ke pelvic tuck se aapki lower back par se 80% galat pressure hat jata hai.
            </p>
          </div>
        </section>

        {/* ───────── 4 LIVE STATS CARDS ───────── */}
        <section className="stats-grid">
          <div className="card stat-card blue">
            <div className="stat-top">
              <span className="stat-icon">🧘</span>
              <span>Poses Completed</span>
            </div>
            <div className="stat-value">
              {posesFullyDone}/{YOGA_POSES.length}
            </div>
            <div className="stat-detail">{doneSetsCount} of {totalSetsCount} total sets done</div>
          </div>

          <div className="card stat-card sage">
            <div className="stat-top">
              <span className="stat-icon">🎯</span>
              <span>APT Fix Score</span>
            </div>
            <div className="stat-value">{aptPosesDone}/5</div>
            <div className="stat-detail">Core pelvic corrective poses</div>
          </div>

          <div className="card stat-card peach">
            <div className="stat-top">
              <span className="stat-icon">⏱️</span>
              <span>Daily Session Time</span>
            </div>
            <div className="stat-value">18–22m</div>
            <div className="stat-detail">Recommended hold + breathing time</div>
          </div>

          <div className="card stat-card lavender">
            <div className="stat-top">
              <span className="stat-icon">📈</span>
              <span>Today's Progress</span>
            </div>
            <div className="stat-value">{completionPct}%</div>
            <div className="progress">
              <span style={{ width: `${completionPct}%` }} />
            </div>
          </div>
        </section>

        {/* ───────── INTERACTIVE TIMER & ANATOMY BREAKDOWN ───────── */}
        <section className="dashboard-grid">
          {/* Left: Live Yoga Hold Timer */}
          <div className="card">
            <div className="section-head">
              <div>
                <h2>Live Asana Hold Timer</h2>
                <p>Active Pose: <strong>{activePoseTitle}</strong></p>
              </div>
              <span className={`status-pill ${isRunning ? "complete" : ""}`}>
                {isRunning ? "Holding Pose..." : "Ready"}
              </span>
            </div>

            <div className="timer-strip">
              <div>
                <span className="eyebrow">Hold Countdown</span>
                <div className="timer-readout">{formatTime(timerSec)}</div>
              </div>
              <div className="timer-btns">
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => setIsRunning((r) => !r)}
                >
                  {isRunning ? "Pause" : "Start Hold"}
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setIsRunning(false);
                    setTimerSec(initialSec);
                  }}
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="progress">
              <span
                style={{
                  width: `${
                    initialSec > 0
                      ? ((initialSec - timerSec) / initialSec) * 100
                      : 0
                  }%`
                }}
              />
            </div>

            <div className="row-between">
              <small>Quick Hold Presets:</small>
              <div className="timer-preset-row">
                {[30, 45, 60, 90, 180].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    className={`preset-chip ${initialSec === sec ? "active" : ""}`}
                    onClick={() => setPresetTimer(sec)}
                  >
                    {sec < 60 ? `${sec}s` : `${sec / 60}m`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: APT Biomechanics Blueprint */}
          <div className="card">
            <div className="section-head">
              <div>
                <h2>APT Anatomy Blueprint</h2>
                <p>Kyun hota hai Anterior Pelvic Tilt aur kya target karein</p>
              </div>
            </div>

            <div className="yoga-anatomy-grid">
              <div className="anatomy-box tight-box">
                <span className="status-pill peach-pill">1. Tight (Stretch Karo)</span>
                <strong>Hip Flexors & Lower Back</strong>
                <small>
                  Lambi sitting se Iliopsoas (front thigh ke upar) chhota ho jata hai aur pelvis ko aage neeche kheencha rakhta hai.
                </small>
              </div>

              <div className="anatomy-box weak-box">
                <span className="status-pill complete">2. Weak (Strong Karo)</span>
                <strong>Glutes & Deep Lower Abs</strong>
                <small>
                  Glutes aur Transverse Abdominis so jate hain, jisse pelvis ko wapas seedha kheenchne wali taqat khatam ho jati hai.
                </small>
              </div>
            </div>
          </div>
        </section>

        {/* ───────── FILTER TABS ───────── */}
        <div className="toolbar">
          <div className="tabs" role="tablist">
            <button
              type="button"
              className={filter === "all" ? "selected" : ""}
              onClick={() => setFilter("all")}
            >
              All Yoga Poses <span>10</span>
            </button>
            <button
              type="button"
              className={filter === "apt" ? "selected" : ""}
              onClick={() => setFilter("apt")}
            >
              APT Correction Protocol <span>5</span>
            </button>
            <button
              type="button"
              className={filter === "daily" ? "selected" : ""}
              onClick={() => setFilter("daily")}
            >
              Daily Full-Body Flow <span>5</span>
            </button>
          </div>
          <small>Tip: Kisi bhi pose ke "Load Timer" button par click karke timer set karein.</small>
        </div>

        {/* ───────── DETAILED YOGA POSE CARDS ───────── */}
        <section className="yoga-pose-list">
          {filteredPoses.map((pose, index) => {
            const isPoseComplete = Array.from({ length: pose.sets }).every(
              (_, i) => completedSets[`${pose.id}-set-${i}`]
            );

            return (
              <article
                key={pose.id}
                className={`yoga-pose-card ${isPoseComplete ? "pose-complete" : ""}`}
              >
                {/* Header */}
                <div className="yoga-pose-header">
                  <div className="yoga-title-group">
                    <h3>
                      <span>{index + 1}. {pose.title}</span>
                      <span className="sanskrit-name">({pose.sanskrit})</span>
                    </h3>
                  </div>

                  <div className="yoga-badges">
                    <span className={`role-pill ${pose.roleType}`}>
                      {pose.roleLabel}
                    </span>
                    {isPoseComplete && (
                      <span className="status-pill complete">Completed ✓</span>
                    )}
                  </div>
                </div>

                {/* Prescription Bar (Sets, Reps, Rest, Timing) */}
                <div className="prescription-bar">
                  <div>
                    <span>📋 Kitna Karna Hai:</span>
                    <strong>{pose.prescription}</strong>
                  </div>
                  <div>
                    <span>⏳ Rest:</span>
                    <strong>{pose.rest}</strong>
                  </div>
                  <div>
                    <span>🕒 Best Time:</span>
                    <strong>{pose.bestTime}</strong>
                  </div>
                </div>

                {/* Two-Column Breakdown: Steps + Benefits/Cues */}
                <div className="yoga-details-grid">
                  {/* Left: Step-by-Step Instructions */}
                  <div className="yoga-steps-box">
                    <span className="yoga-box-label">
                      Kaise Karna Hai (Step-by-Step Proper Form)
                    </span>
                    <div className="step-list">
                      {pose.steps.map((step, sIdx) => (
                        <div key={sIdx}>
                          <span>0{sIdx + 1}</span>
                          <p style={{ color: "var(--tx)", fontSize: "0.875rem" }}>
                            {step}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right: Benefits + APT Form Alert */}
                  <div className="yoga-benefits-box">
                    <span className="yoga-box-label">
                      Fayde / Uses (Kyun Work Karta Hai)
                    </span>
                    <ul className="yoga-benefit-list">
                      {pose.benefits.map((b, bIdx) => (
                        <li key={bIdx}>{b}</li>
                      ))}
                    </ul>

                    <div className="apt-cue-alert">
                      <strong>⚠️ APT Alignment Cue: </strong>
                      {pose.aptCue}
                    </div>
                  </div>
                </div>

                {/* Footer: Interactive Set Buttons & Timer Trigger */}
                <div className="yoga-pose-footer">
                  <div className="set-chips-row">
                    {Array.from({ length: pose.sets }).map((_, setIdx) => {
                      const done = !!completedSets[`${pose.id}-set-${setIdx}`];
                      return (
                        <button
                          key={setIdx}
                          type="button"
                          className={`set-check-btn ${done ? "done" : ""}`}
                          onClick={() => toggleSet(pose.id, setIdx)}
                        >
                          {done ? `✓ Set ${setIdx + 1}` : `Set ${setIdx + 1}`}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    className="btn"
                    onClick={() => loadPoseTimer(pose)}
                  >
                    ⏱️ Load {pose.holdSec}s in Timer
                  </button>
                </div>
              </article>
            );
          })}
        </section>

        {/* ───────── ACCORDION: POSES TO AVOID IN APT + DAILY HABITS ───────── */}
        <section className="accordion-box">
          <button
            type="button"
            className="accordion-head"
            onClick={() => setOpenAccordion((o) => !o)}
          >
            <div>
              <h3>🚫 APT Mein Kaunse Yoga Poses AVOID Karne Chahiye + Daily Fixes</h3>
              <p>Galat yoga poses karne se Anterior Pelvic Tilt aur lower back pain badh sakta hai</p>
            </div>
            <div className="accordion-right">
              <span className="status-pill">{openAccordion ? "Hide" : "Show"}</span>
            </div>
          </button>

          {openAccordion && (
            <div className="accordion-body">
              <div className="avoid-grid">
                {AVOID_IN_APT.map((item, idx) => (
                  <div key={idx} className="avoid-card">
                    <strong>❌ Avoid: {item.name}</strong>
                    <small>{item.reason}</small>
                    <small style={{ color: "var(--tx)", fontWeight: 500 }}>
                      ✅ Do Instead: {item.alternative}
                    </small>
                  </div>
                ))}
              </div>

              <div className="routine-step-box" style={{ marginTop: "8px" }}>
                <strong>💡 3 Daily Habits Jo Yoga Ke Asar Ko 2x Fast Karenge:</strong>
                <small>
                  1. <strong>Sleeping Hack:</strong> Agar peeth ke bal sote ho toh ghutno ke neeche 1 takiya (pillow) rakho—isse raat bhar pelvis neutral rehta hai. Pet ke bal (stomach sleeping) bilkul mat soyo.
                </small>
                <small>
                  2. <strong>Study/Coding Break Rule:</strong> Har 50 minute baithne ke baad uth kar sirf 30 second ke liye Standing Glute Squeeze + Pelvic Tuck karo.
                </small>
                <small>
                  3. <strong>Standing Cue:</strong> Khade hote waqt ghutno ko hyper-lock (ekdum piche tight) mat rakho; knees ko 2% soft rakho aur weight heels + midfoot par barabar baanto.
                </small>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export { YogaPage };
