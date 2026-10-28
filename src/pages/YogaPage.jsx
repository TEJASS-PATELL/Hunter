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
  QUICK_PROTEIN_FOODS,
} from "../shared";

const APT_WALL_TEST_LEVELS = [
  {
    id: "neutral",
    label: "1. Neutral Pelvis (Sirf 2 Ungliyan Jati Hain)",
    badge: "Optimal Alignment ✓",
    badgeClass: "complete",
    advice:
      "Aapki lumbar curve balanced hai! Daily Full-Body Flow aur sitting breaks se isko maintain rakhein.",
  },
  {
    id: "mild",
    label: "2. Mild–Moderate APT (Poora Flat Haath Ropar-Paar Jata Hai)",
    badge: "Moderate APT · Focus on 5 Core Poses",
    badgeClass: "peach-pill",
    advice:
      "Hip flexors tight hain aur glutes thode weak hain. Roz 'Low Lunge (APT Tuck)' aur 'Glute Bridge' ke 3-3 sets zaroor karein.",
  },
  {
    id: "high",
    label: "3. Pronounced APT (Band Mutthi / Fist Kamar Ke Peeche Aa Jati Hai)",
    badge: "High APT · Priority Daily Correction",
    badgeClass: "peach-pill",
    advice:
      "Pelvis aage tilt hai jisse pet bahar dikhta hai aur lower back par load aata hai. Roz 5 APT poses + har 50 min sitting ke baad 30s Standing Pelvic Tuck karein.",
  },
];

function playCompletionChime(freq = 528) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.16, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.85);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.85);
  } catch {
    /* fallback if audio blocked */
  }
}

function YogaPage({ data, setData, today: propToday, updateDay, notify }) {
  const today = propToday || todayISO();

  const [filter, setFilter] = useState("all"); // all | apt | daily
  const [completedSets, setCompletedSets] = useState(() => {
    try {
      const saved = localStorage.getItem("cb90_yoga_sets");
      if (!saved) return {};
      const parsed = JSON.parse(saved);
      // Reset automatically on a new calendar date while preserving structure
      if (parsed._date && parsed._date !== todayISO()) {
        return { _date: todayISO() };
      }
      return parsed;
    } catch {
      return { _date: todayISO() };
    }
  });

  // Timer & Guided Flow states
  const [activePoseId, setActivePoseId] = useState(YOGA_POSES[0].id);
  const [activePoseTitle, setActivePoseTitle] = useState(
    "Low Lunge with Posterior Pelvic Tilt"
  );
  const [timerSec, setTimerSec] = useState(45);
  const [initialSec, setInitialSec] = useState(45);
  const [isRunning, setIsRunning] = useState(false);
  const [activeSide, setActiveSide] = useState("Left Side"); // Left Side | Right Side
  const [autoCheckSet, setAutoCheckSet] = useState(true);
  const [openAccordion, setOpenAccordion] = useState(true);

  const todayDayObj = (data?.days && data.days[today]) || createEmptyDay();
  const deskBreaksToday = safeNum(todayDayObj.yogaLog?.deskBreaks, 0);
  const currentWallTest = data?.aptWallTest || "mild";

  // Sync completedSets to localStorage & unified store
  const syncYogaToGlobalStore = useCallback(
    (setsMap) => {
      const cleanKeys = Object.keys(setsMap).filter(
        (k) => k !== "_date" && Boolean(setsMap[k])
      );
      const setsCount = cleanKeys.length;
      const posesDoneCount = YOGA_POSES.filter((p) =>
        Array.from({ length: p.sets }).every(
          (_, idx) => setsMap[`${p.id}-set-${idx}`]
        )
      ).length;

      if (typeof updateDay === "function") {
        updateDay(today, (prev) => ({
          ...prev,
          c: {
            ...(prev.c || {}),
            workout: setsCount >= 5 || Boolean(prev.c?.workout),
          },
          life: {
            ...(prev.life || {}),
            eyePosture: setsCount >= 3 || Boolean(prev.life?.eyePosture),
          },
          yogaLog: {
            ...(prev.yogaLog || {}),
            setsDone: setsCount,
            posesDone: posesDoneCount,
            updatedAt: Date.now(),
          },
        }));
      }
    },
    [today, updateDay]
  );

  useEffect(() => {
    try {
      localStorage.setItem(
        "cb90_yoga_sets",
        JSON.stringify({ ...completedSets, _date: today })
      );
    } catch {
      /* ignore storage errors */
    }
  }, [completedSets, today]);

  // Countdown Timer Effect with Auto-Set Check & Chime
  useEffect(() => {
    if (!isRunning) return undefined;
    if (timerSec <= 0) {
      setIsRunning(false);
      playCompletionChime(528);

      if (autoCheckSet && activePoseId) {
        const poseObj = YOGA_POSES.find((p) => p.id === activePoseId);
        if (poseObj) {
          let markedIdx = -1;
          for (let i = 0; i < poseObj.sets; i += 1) {
            if (!completedSets[`${poseObj.id}-set-${i}`]) {
              markedIdx = i;
              break;
            }
          }
          if (markedIdx !== -1) {
            const nextMap = {
              ...completedSets,
              [`${poseObj.id}-set-${markedIdx}`]: true,
            };
            setCompletedSets(nextMap);
            syncYogaToGlobalStore(nextMap);
            if (typeof notify === "function") {
              notify(
                `✓ ${poseObj.title} — Set ${markedIdx + 1} completed (${activeSide})!`
              );
            }
          }
        }
      }
      return undefined;
    }

    const id = setInterval(() => setTimerSec((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [
    isRunning,
    timerSec,
    autoCheckSet,
    activePoseId,
    activeSide,
    completedSets,
    syncYogaToGlobalStore,
    notify,
  ]);

  const toggleSet = (poseId, setIdx) => {
    const key = `${poseId}-set-${setIdx}`;
    setCompletedSets((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      syncYogaToGlobalStore(next);
      return next;
    });
  };

  const completeAllPoseSets = (pose) => {
    setCompletedSets((prev) => {
      const next = { ...prev };
      for (let i = 0; i < pose.sets; i += 1) {
        next[`${pose.id}-set-${i}`] = true;
      }
      syncYogaToGlobalStore(next);
      return next;
    });
    if (typeof notify === "function") {
      notify(`All ${pose.sets} sets of ${pose.title} logged!`);
    }
  };

  const resetAllProgress = () => {
    const empty = { _date: today };
    setCompletedSets(empty);
    syncYogaToGlobalStore(empty);
    if (typeof notify === "function") {
      notify("Today's yoga sets reset");
    }
  };

  const loadPoseTimer = (pose, scrollUp = true) => {
    setIsRunning(false);
    setActivePoseId(pose.id);
    setInitialSec(pose.holdSec);
    setTimerSec(pose.holdSec);
    setActivePoseTitle(pose.title);
    if (scrollUp) {
      window.scrollTo({ top: 240, behavior: "smooth" });
    }
  };

  const stepActivePose = (dir) => {
    const list =
      filter === "all"
        ? YOGA_POSES
        : YOGA_POSES.filter((p) => p.category === filter);
    const curIdx = list.findIndex((p) => p.id === activePoseId);
    const nextIdx = (curIdx + dir + list.length) % list.length;
    loadPoseTimer(list[nextIdx], false);
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

  const logStandingDeskBreak = () => {
    if (typeof updateDay === "function") {
      updateDay(today, (prev) => ({
        ...prev,
        life: { ...(prev.life || {}), eyePosture: true },
        yogaLog: {
          ...(prev.yogaLog || {}),
          deskBreaks: safeNum(prev.yogaLog?.deskBreaks, 0) + 1,
        },
      }));
    }
    if (typeof notify === "function") {
      notify(
        "30s Standing Pelvic Tuck logged! Sitting hip-flexor tightness reset."
      );
    }
  };

  const handleWallTestSelect = (levelId) => {
    if (typeof setData === "function") {
      setData((old) => ({
        ...old,
        aptWallTest: levelId,
      }));
    }
    if (typeof notify === "function") {
      notify("APT Wall-Test baseline updated");
    }
  };

  // Calculate live metrics
  const totalSetsCount = YOGA_POSES.reduce((acc, p) => acc + p.sets, 0);
  const doneSetsCount = Object.entries(completedSets).filter(
    ([k, v]) => k !== "_date" && Boolean(v)
  ).length;
  const completionPct = Math.round((doneSetsCount / totalSetsCount) * 100);

  const posesFullyDone = YOGA_POSES.filter((p) =>
    Array.from({ length: p.sets }).every(
      (_, idx) => completedSets[`${p.id}-set-${idx}`]
    )
  ).length;

  const aptPosesDone = YOGA_POSES.filter(
    (p) =>
      p.category === "apt" &&
      Array.from({ length: p.sets }).every(
        (_, idx) => completedSets[`${p.id}-set-${idx}`]
      )
  ).length;

  // 7-Day Yoga & Posture Consistency Strip
  const recent7Days = useMemo(() => {
    return Array.from({ length: 7 }, (_, idx) => {
      const iso = addDaysISO(today, -(6 - idx));
      const dObj = (data?.days && data.days[iso]) || {};
      const done =
        (iso === today && doneSetsCount >= 3) ||
        safeNum(dObj.yogaLog?.setsDone, 0) >= 3 ||
        Boolean(dObj.life?.eyePosture);
      return {
        iso,
        label: getWeekdayShort(iso).slice(0, 1),
        dayNum: iso.slice(8),
        done,
      };
    });
  }, [data?.days, today, doneSetsCount]);

  const filteredPoses = YOGA_POSES.filter((p) =>
    filter === "all" ? true : p.category === filter
  );

  const selectedWallLevel =
    APT_WALL_TEST_LEVELS.find((l) => l.id === currentWallTest) ||
    APT_WALL_TEST_LEVELS[1];

  return (
    <main className="main-area">
      <div className="content-wrap">
        {/* PAGE HEADING */}
        <header className="page-heading">
          <div>
            <h1>
              Yoga <span className="yoga-icon">&amp;</span> Pelvic Alignment
            </h1>
            <p>
              Improve pelvic control, build core strength, and boost
              full-body mobility with a guided daily yoga routine,
              interactive hold timer, and posture self-assessment.
            </p>
          </div>

          <div className="heading-btn-group">
            <button
              type="button"
              className="btn primary"
              onClick={logStandingDeskBreak}
            >
              <span className="yoga-icon" aria-hidden="true">＋</span>
              Log 30s Study Break ({deskBreaksToday})
            </button>

            <button
              type="button"
              className="btn"
              onClick={() => setFilter("apt")}
            >
              <span className="yoga-icon" aria-hidden="true">✳</span>
              APT 5-Pose Protocol
            </button>

            <button
              type="button"
              className="btn danger-soft-btn"
              onClick={resetAllProgress}
            >
              <span className="yoga-icon" aria-hidden="true">⟳</span>
              Reset Today
            </button>
          </div>
        </header>

        {/* HERO BANNER */}
        <section className="lifestyle-banner">
          <div>

            <h2>
              Stretch the Front, <em>Strengthen the Back.</em>
            </h2>

            <p>
              Har pose mein controlled movement aur proper form par
              focus karo. Remember:{" "}
              <strong>
                "Keep your pelvis controlled, gently engage your glutes
                and lower abs, and breathe naturally."
              </strong>{" "}
              Pelvis ko forcefully tuck mat karo. Comfortable range mein
              exercise karo aur apni natural spinal alignment maintain
              rakho.
            </p>
          </div>
        </section>

        {/* LIVE STATS */}
        <section className="stats-grid" style={{ gap: "20px" }}>
          <div className="card stat-card blue">
            <div className="stat-top">
              <span className="stat-icon" aria-hidden="true">
                <span className="yoga-icon">✦</span>
              </span>
              <span>Poses Completed</span>
            </div>

            <div className="stat-value">
              {posesFullyDone}/{YOGA_POSES.length}
            </div>

            <div className="stat-detail">
              {doneSetsCount} of {totalSetsCount} total sets completed
            </div>
          </div>

          <div className="card stat-card sage">
            <div className="stat-top">
              <span className="stat-icon" aria-hidden="true">
                <span className="yoga-icon">◈</span>
              </span>
              <span>APT Protocol Progress</span>
            </div>

            <div className="stat-value">{aptPosesDone}/5</div>

            <div className="stat-detail">
              {doneSetsCount >= 5
                ? "✓ Workout tracking updated today"
                : "Complete 5 sets to trigger workout tracking"}
            </div>
          </div>

          <div className="card stat-card peach">
            <div className="stat-top">
              <span className="stat-icon" aria-hidden="true">
                <span className="yoga-icon">◷</span>
              </span>
              <span>Study Break Tucks</span>
            </div>

            <div className="stat-value">{deskBreaksToday}x</div>

            <div className="stat-detail">
              30-second standing movement breaks today
            </div>
          </div>

          <div className="card stat-card lavender">
            <div className="stat-top">
              <span className="stat-icon" aria-hidden="true">
                <span className="yoga-icon">↗</span>
              </span>
              <span>Today's Progress</span>
            </div>

            <div className="stat-value">{completionPct}%</div>

            <div
              className="progress"
              role="progressbar"
              aria-label="Today's yoga completion"
              aria-valuenow={completionPct}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <span style={{ width: `${completionPct}%` }} />
            </div>
          </div>
        </section>

        {/* TIMER & ANATOMY DASHBOARD */}
        <section className="dashboard-grid" style={{ gap: "20px" }}>
          {/* GUIDED HOLD TIMER */}
          <div className="card">
            <div className="section-head">
              <div>
                <h2>

                  Guided Pose Timer
                </h2>

                <p>
                  Current Pose: <strong>{activePoseTitle}</strong>{" "}
                  <span className="status-pill">{activeSide}</span>
                </p>
              </div>

              <div className="heading-btn-group">
                <button
                  type="button"
                  className="preset-chip"
                  onClick={() => stepActivePose(-1)}
                  title="Previous Pose"
                >
                  ⏮ Prev
                </button>

                <button
                type="button"
                className="preset-chip"
                onClick={() => stepActivePose(1)}
                title="Next Pose"
              >
                Next ⏭
              </button>

                <span
                  className={`status-pill ${isRunning ? "complete" : ""}`}
                  aria-live="polite"
                >
                  {isRunning ? "Holding Pose..." : "Ready to Start"}
                </span>
              </div>
            </div>

            <div className="timer-strip">
              <div>
                <span className="eyebrow">
                  HOLD COUNTDOWN <span className="yoga-icon">✳</span>{" "}
                  {activeSide}
                </span>

                <div className="timer-readout">
                  {formatTime(timerSec)}
                </div>

                <small className="stat-detail">
                  Stay relaxed, breathe steadily, and maintain good form.
                </small>
              </div>

              <div className="timer-btns">
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => {
                    if (isRunning) {
                      setIsRunning(false);
                    } else {
                      if (timerSec <= 0) {
                        setTimerSec(initialSec);
                      }
                      setIsRunning(true);
                    }
                  }}
                >
                  {isRunning ? (
                    <>
                      <span className="yoga-icon" aria-hidden="true">Ⅱ</span>
                      Pause Timer
                    </>
                  ) : (
                    <>
                      <span className="yoga-icon" aria-hidden="true">▶</span>
                      Start Hold
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="btn"
                  onClick={() =>
                    setActiveSide((s) =>
                      s === "Left Side" ? "Right Side" : "Left Side"
                    )
                  }
                >
                  <span className="yoga-icon" aria-hidden="true">↔</span>
                  {activeSide === "Left Side"
                    ? "Switch to Right"
                    : "Switch to Left"}
                </button>

                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setIsRunning(false);
                    setTimerSec(initialSec);
                  }}
                >
                  <span className="yoga-icon" aria-hidden="true">⟳</span>
                  Reset
                </button>
              </div>
            </div>

            <div
              className="progress"
              role="progressbar"
              aria-label="Hold timer progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={
                initialSec > 0
                  ? Math.min(
                    100,
                    Math.max(
                      0,
                      ((initialSec - timerSec) / initialSec) * 100
                    )
                  )
                  : 0
              }
            >
              <span
                style={{
                  width: `${initialSec > 0
                    ? Math.min(
                      100,
                      Math.max(
                        0,
                        ((initialSec - timerSec) / initialSec) * 100
                      )
                    )
                    : 0
                    }%`,
                }}
              />
            </div>

            <div className="row-between">
              <label className="archive-toggle">
                <input
                  type="checkbox"
                  checked={autoCheckSet}
                  onChange={(e) => setAutoCheckSet(e.target.checked)}
                />
                Auto-check next set at 00:00
              </label>

              <div className="timer-preset-row">
                {[
                  [20, "20s Rest"],
                  [30, "30s"],
                  [45, "45s"],
                  [60, "60s"],
                  [180, "3 min"],
                ].map(([sec, lbl]) => (
                  <button
                    key={sec}
                    type="button"
                    className={`preset-chip ${initialSec === sec ? "active" : ""
                      }`}
                    aria-pressed={initialSec === sec}
                    onClick={() => setPresetTimer(sec)}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ANATOMY & WEEKLY CONSISTENCY */}
          <div className="card">
            <div className="section-head">
              <div>
                <h2>

                  APT Anatomy &amp; 7-Day Streak
                </h2>

                <p>
                  Understand your muscle groups, improve movement control,
                  and track your daily consistency.
                </p>
              </div>

              <span className="status-pill complete">
                {recent7Days.filter((d) => d.done).length}/7 Days Active
              </span>
            </div>

            <div className="yoga-anatomy-grid" style={{ gap: "16px" }}>
              <div className="anatomy-box tight-box">
                <span className="status-pill peach-pill">
                  01 <span className="yoga-icon">✦</span> Mobility Focus
                </span>

                <strong>Hip Flexors &amp; Lower Back</strong>

                <small>
                  Long hours of sitting can contribute to hip stiffness.
                  Gentle stretches and regular movement breaks may help
                  improve your mobility and comfort.
                </small>
              </div>

              <div className="anatomy-box weak-box">
                <span className="status-pill complete">
                  02 <span className="yoga-icon">✦</span> Strength Focus
                </span>

                <strong>Glutes &amp; Deep Core</strong>

                <small>
                  Glute and abdominal strengthening can support pelvic
                  control. Train gradually, breathe naturally, and avoid
                  forcing your lower back into an exaggerated position.
                </small>
              </div>
            </div>

            <div className="quest-week-row" style={{ gap: "8px" }}>
              {recent7Days.map((d) => (
                <div
                  key={d.iso}
                  className={`quest-day-pill ${d.done ? "done" : ""}`}
                  title={d.iso}
                >
                  <small>{d.label}</small>
                  <strong>
                    {d.done ? (
                      <span className="yoga-icon">✓</span>
                    ) : (
                      <span className="yoga-icon">·</span>
                    )}
                  </strong>
                  <span>{d.dayNum}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* WALL TEST */}
        <section className="card">
          <div className="section-head">
            <div>
              <h2>

                30-Second Wall Test
              </h2>

              <p>
                Wall ke paas naturally stand karo, shoulders relaxed rakho,
                aur lower back ke natural gap ko observe karo. The gap
                varies from person to person, so this test alone cannot
                diagnose Anterior Pelvic Tilt.
              </p>
            </div>

            <span
              className={`status-pill ${selectedWallLevel.badgeClass}`}
            >
              {selectedWallLevel.badge}
            </span>
          </div>

          <div className="category-pills">
            {APT_WALL_TEST_LEVELS.map((lvl) => (
              <button
                type="button"
                key={lvl.id}
                className={currentWallTest === lvl.id ? "selected" : ""}
                aria-pressed={currentWallTest === lvl.id}
                onClick={() => handleWallTestSelect(lvl.id)}
              >
                {lvl.label}
              </button>
            ))}
          </div>

          <div className="apt-cue-alert">
            <strong>
              <span className="yoga-icon" aria-hidden="true">✳</span>
              Your Custom Action Plan:
            </strong>{" "}
            {selectedWallLevel.advice}
          </div>
        </section>

        {/* FILTER TABS */}
        <div className="toolbar">
          <div className="tabs" role="tablist" aria-label="Yoga pose filters">
            <button
              type="button"
              role="tab"
              aria-selected={filter === "all"}
              className={filter === "all" ? "selected" : ""}
              onClick={() => setFilter("all")}
            >
              All Yoga Poses <span>{YOGA_POSES.length}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={filter === "apt"}
              className={filter === "apt" ? "selected" : ""}
              onClick={() => setFilter("apt")}
            >
              APT Correction <span>5</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={filter === "daily"}
              className={filter === "daily" ? "selected" : ""}
              onClick={() => setFilter("daily")}
            >
              Daily Full-Body Flow <span>5</span>
            </button>
          </div>

          <small>
            Quick tip: Choose "Load Timer" on any pose card to set its
            hold duration instantly.
          </small>
        </div>

        {/* DETAILED POSE CARDS */}
        <section
          className="yoga-pose-list"
          style={{
            display: "grid",
            gap: "20px",
          }}
        >
          {filteredPoses.map((pose, index) => {
            const isPoseComplete = Array.from({
              length: pose.sets,
            }).every(
              (_, i) => completedSets[`${pose.id}-set-${i}`]
            );

            const isCurrentlyLoaded = activePoseId === pose.id;

            return (
              <article
                key={pose.id}
                className={`yoga-pose-card ${isPoseComplete ? "pose-complete" : ""
                  }`}
              >
                {/* POSE HEADER */}
                <div className="yoga-pose-header">
                  <div className="yoga-title-group">
                    <h3>
                      <span>
                        {index + 1}. {pose.title}
                      </span>

                      <span className="sanskrit-name">
                        ({pose.sanskrit})
                      </span>
                    </h3>
                  </div>

                  <div className="yoga-badges">
                    <span className={`role-pill ${pose.roleType}`}>
                      {pose.roleLabel}
                    </span>

                    {isCurrentlyLoaded && (
                      <span className="status-pill">
                        <span className="yoga-icon">◷</span>
                        Active in Timer
                      </span>
                    )}

                    {isPoseComplete && (
                      <span className="status-pill complete">
                        <span className="yoga-icon">✓</span>
                        Completed
                      </span>
                    )}
                  </div>
                </div>

                {/* PRESCRIPTION DETAILS */}
                <div className="prescription-bar">
                  <div>
                    <span>
                      <span className="yoga-icon">▤</span>
                      Sets &amp; Reps
                    </span>
                    <strong>{pose.prescription}</strong>
                  </div>

                  <div>
                    <span>
                      <span className="yoga-icon">◷</span>
                      Rest Duration
                    </span>
                    <strong>{pose.rest}</strong>
                  </div>

                  <div>
                    <span>
                      <span className="yoga-icon">◈</span>
                      Recommended Time
                    </span>
                    <strong>{pose.bestTime}</strong>
                  </div>
                </div>

                {/* STEPS & BENEFITS */}
                <div className="yoga-details-grid">
                  <div className="yoga-steps-box">
                    <span className="yoga-box-label">
                      <span className="yoga-icon">✳</span>
                      How to Perform — Step by Step
                    </span>

                    <div className="step-list">
                      {pose.steps.map((step, sIdx) => (
                        <div key={sIdx}>
                          <span>
                            {String(sIdx + 1).padStart(2, "0")}
                          </span>

                          <p
                            style={{
                              color: "var(--tx)",
                              fontSize: "0.875rem",
                            }}
                          >
                            {step}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="yoga-benefits-box">
                    <span className="yoga-box-label">
                      <span className="yoga-icon">✦</span>
                      Benefits &amp; Form Cues
                    </span>

                    <ul className="yoga-benefit-list">
                      {pose.benefits.map((b, bIdx) => (
                        <li key={bIdx}>{b}</li>
                      ))}
                    </ul>

                    <div className="apt-cue-alert">
                      <strong>
                        <span className="yoga-icon">!</span>
                        Alignment Cue:
                      </strong>{" "}
                      {pose.aptCue}
                    </div>
                  </div>
                </div>

                {/* SET TRACKING & TIMER ACTIONS */}
                <div className="yoga-pose-footer">
                  <div className="set-chips-row">
                    {Array.from({ length: pose.sets }).map((_, setIdx) => {
                      const done = Boolean(
                        completedSets[`${pose.id}-set-${setIdx}`]
                      );

                      return (
                        <button
                          key={setIdx}
                          type="button"
                          className={`set-check-btn ${done ? "done" : ""}`}
                          aria-pressed={done}
                          onClick={() => toggleSet(pose.id, setIdx)}
                        >
                          {done && (
                            <span className="yoga-icon">✓</span>
                          )}
                          Set {setIdx + 1}
                        </button>
                      );
                    })}
                  </div>

                  <div className="heading-btn-group">
                    {!isPoseComplete && (
                      <button
                        type="button"
                        className="btn"
                        onClick={() => completeAllPoseSets(pose)}
                      >
                        <span className="yoga-icon">✓</span>
                        Complete All {pose.sets} Sets
                      </button>
                    )}

                    <button
                      type="button"
                      className="btn primary"
                      onClick={() => loadPoseTimer(pose)}
                    >
                      <span className="yoga-icon">◷</span>
                      Load {pose.holdSec}s Timer
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        {/* MOVEMENTS TO MODIFY & DAILY HABITS */}
        <section className="accordion-box">
          <button
            type="button"
            className="accordion-head"
            aria-expanded={openAccordion}
            onClick={() => setOpenAccordion((o) => !o)}
          >
            <div>
              <h3>

                Poses to Modify &amp; Daily Habits
              </h3>

              <p>
                Learn which movements may aggravate discomfort and explore
                suitable alternatives for your daily mobility routine.
              </p>
            </div>

            <div className="accordion-right">
              <span className="status-pill">
                {openAccordion ? "Hide" : "Show"}
                <span className="yoga-icon">
                  {openAccordion ? "−" : "+"}
                </span>
              </span>
            </div>
          </button>

          {openAccordion && (
            <div className="accordion-body">
              <div
                className="avoid-grid"
                style={{ gap: "16px" }}
              >
                {AVOID_IN_APT.map((item, idx) => (
                  <div key={idx} className="avoid-card">
                    <strong>
                      <span className="yoga-icon">×</span>
                      Modify if uncomfortable: {item.name}
                    </strong>

                    <small>{item.reason}</small>

                    <small
                      style={{
                        color: "var(--tx)",
                        fontWeight: 500,
                      }}
                    >
                      <span className="yoga-icon">✓</span>
                      Alternative: {item.alternative}
                    </small>
                  </div>
                ))}
              </div>

              <div
                className="routine-step-box"
                style={{ marginTop: "8px" }}
              >
                <strong>

                  3 Daily Habits for Better Mobility
                </strong>

                <small>
                  <strong>01. Comfortable Sleeping Position:</strong>{" "}
                  Agar back par sote waqt discomfort hota hai, knees ke
                  neeche pillow rakh kar dekho. Choose a comfortable
                  sleeping position that works for you.
                </small>

                <small>
                  <strong>02. Study &amp; Coding Breaks:</strong>{" "}
                  Long sitting ke dauran regular movement breaks lo.
                  Stand up, walk briefly, and try gentle movements
                  within a comfortable range.
                </small>

                <small>
                  <strong>03. Relaxed Standing Posture:</strong>{" "}
                  Knees ko forcefully lock mat karo. Maintain a relaxed
                  stance, distribute your weight comfortably, and
                  breathe naturally.
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