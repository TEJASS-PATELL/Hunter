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

const POMODORO_PRESETS = [
  { id: "p25", label: "25m Pomodoro", mins: 25, sec: 1500 },
  { id: "p50", label: "50m Deep Work", mins: 50, sec: 3000 },
  { id: "p90", label: "90m Mock / Coding", mins: 90, sec: 5400 },
  { id: "b10", label: "10m Walk Break", mins: 10, sec: 600 },
];

const LAB_MARKERS_GUIDE = [
  {
    id: "vitD",
    name: "Vitamin D (25-OH)",
    unit: "ng/mL",
    minOpt: 40,
    maxOpt: 80,
    lowCut: 20,
    hint: "Optimal: 40–70 ng/mL (Below 20 is deficient)",
  },
  {
    id: "vitB12",
    name: "Vitamin B12",
    unit: "pg/mL",
    minOpt: 450,
    maxOpt: 900,
    lowCut: 250,
    hint: "Optimal: 450–800 pg/mL for nerve & focus energy",
  },
  {
    id: "ferritin",
    name: "Serum Ferritin (Iron stores)",
    unit: "ng/mL",
    minOpt: 60,
    maxOpt: 150,
    lowCut: 30,
    hint: "Optimal: 60–120 ng/mL (Low ferritin triggers hair fall & fatigue)",
  },
  {
    id: "tsh",
    name: "Thyroid TSH",
    unit: "mIU/L",
    minOpt: 0.8,
    maxOpt: 2.5,
    lowCut: 0.4,
    highCut: 4.5,
    hint: "Optimal: 0.8–2.5 mIU/L (Above 4.5 needs doctor review)",
  },
  {
    id: "testo",
    name: "Morning Total Testosterone",
    unit: "ng/dL",
    minOpt: 500,
    maxOpt: 950,
    lowCut: 300,
    hint: "Test 8–10 AM fasting. Sleep + heavy squats/rows boost baseline.",
  },
];

function parseTimeMins(timeStr = "07:00") {
  const parts = String(timeStr).split(":");
  const h = safeNum(parts[0], 7);
  const m = safeNum(parts[1], 0);
  return h * 60 + m;
}

function minsToTimeStr(totalMins) {
  const norm = ((totalMins % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function MoreAndSettingsPage({
  data,
  setData,
  updateProfile,
  exportData,
  importData,
  resetAll,
  notify,
}) {
  const [subTab, setSubTab] = useState("sleep"); // sleep | control | health | help
  const [taskName, setTaskName] = useState("Apna Kaam (25m Deep Focus)");
  const [selectedPreset, setSelectedPreset] = useState(POMODORO_PRESETS[0]);
  const [manualMins, setManualMins] = useState(45);
  const [ifThenForm, setIfThenForm] = useState({ trigger: "", action: "" });

  const today = todayISO();
  const p = data.profile || {};
  const activeLoops = data.settings?.activeLoops || [];
  const focusSessions = data.focusSessions || [];
  const labValues = data.labResults || {};

  const toggleLoop = (loopId) => {
    setData((old) => {
      const cur = old.settings?.activeLoops || [];
      const next = cur.includes(loopId)
        ? cur.filter((x) => x !== loopId)
        : [...cur, loopId];
      return {
        ...old,
        settings: { ...(old.settings || {}), activeLoops: next },
      };
    });
  };

  const setAllLoops = (mode) => {
    const next =
      mode === "all"
        ? CONTROL_LOOPS.map((x) => x.id)
        : ["junk", "lateCaff", "doomscroll"];
    setData((old) => ({
      ...old,
      settings: { ...(old.settings || {}), activeLoops: next },
    }));
    notify(
      mode === "all"
        ? "All 13 control loops activated"
        : "Reset to top 3 core loops"
    );
  };

  /* Log completed or manual focus session */
  const logFocusSession = (minsToLog, labelToLog) => {
    const cleanMins = Math.max(5, safeNum(minsToLog, 25));
    const entry = {
      id: uid(),
      date: today,
      task: (labelToLog || taskName || "Deep Work Block").trim(),
      mins: cleanMins,
      ts: Date.now(),
    };
    setData((old) => ({
      ...old,
      focusSessions: [entry, ...(old.focusSessions || [])],
    }));
    notify(`${cleanMins}-min focus block logged!`);
  };

  const deleteFocusSession = (id) => {
    setData((old) => ({
      ...old,
      focusSessions: (old.focusSessions || []).filter((s) => s.id !== id),
    }));
  };

  /* Focus Analytics (Today, 7-Day Chart & All-time) */
  const focusAnalytics = useMemo(() => {
    const todayMins = focusSessions
      .filter((s) => s.date === today)
      .reduce((acc, s) => acc + safeNum(s.mins, 0), 0);

    const series7d = Array.from({ length: 7 }, (_, idx) => {
      const iso = addDaysISO(today, -(6 - idx));
      const dayTotal = focusSessions
        .filter((s) => s.date === iso)
        .reduce((acc, s) => acc + safeNum(s.mins, 0), 0);
      return {
        key: iso,
        label: getWeekdayShort(iso).slice(0, 2),
        fullLabel: fmtDate(iso),
        value: dayTotal,
      };
    });

    const weekMins = series7d.reduce((acc, d) => acc + d.value, 0);
    const totalAllTimeMins = focusSessions.reduce(
      (acc, s) => acc + safeNum(s.mins, 0),
      0
    );

    return {
      todayMins,
      weekMins,
      totalAllTimeHours: +(totalAllTimeMins / 60).toFixed(1),
      series7d,
    };
  }, [focusSessions, today]);

  /* Circadian Sleep & 90-Min Cycle Calculations */
  const sleepMetrics = useMemo(() => {
    const wakeMins = parseTimeMins(p.wakeTime || "07:00");
    const bedMins = parseTimeMins(p.bedtime || "23:00");

    let durationMins = wakeMins - bedMins;
    if (durationMins <= 0) durationMins += 1440;

    const durationHours = +(durationMins / 60).toFixed(1);
    const cycles = +(durationMins / 90).toFixed(1);

    const caffeineCutoff = minsToTimeStr(bedMins - 480); // 8 hrs before bed
    const screenSunset = minsToTimeStr(bedMins - 90); // 90 mins before bed
    const sunlightWindowEnd = minsToTimeStr(wakeMins + 45);

    // Ideal bedtimes for 5 cycles (7.5h) and 6 cycles (9h) + 15m fall-asleep buffer
    const fiveCycleBed = minsToTimeStr(wakeMins - 465);
    const sixCycleBed = minsToTimeStr(wakeMins - 555);

    return {
      durationHours,
      cycles,
      caffeineCutoff,
      screenSunset,
      sunlightWindowEnd,
      fiveCycleBed,
      sixCycleBed,
    };
  }, [p.wakeTime, p.bedtime]);

  /* If-Then Implementation Intentions */
  const handleAddIfThen = () => {
    const t = ifThenForm.trigger.trim();
    const a = ifThenForm.action.trim();
    if (!t || !a) return;
    setData((old) => ({
      ...old,
      ifThen: [{ id: `ift-${uid()}`, trigger: t, action: a }, ...(old.ifThen || [])],
    }));
    setIfThenForm({ trigger: "", action: "" });
    notify("If-Then rule saved");
  };

  const handleDeleteIfThen = (id) => {
    setData((old) => ({
      ...old,
      ifThen: (old.ifThen || []).filter((x) => x.id !== id),
    }));
  };

  /* Lab Biomarker Evaluators */
  const updateLabValue = (markerId, val) => {
    setData((old) => ({
      ...old,
      labResults: {
        ...(old.labResults || {}),
        [markerId]: val,
        updatedAt: today,
      },
    }));
  };

  const getMarkerStatus = (m, rawVal) => {
    if (rawVal === "" || rawVal === undefined || rawVal === null) {
      return { label: "Not logged", cls: "" };
    }
    const v = Number(rawVal);
    if (!Number.isFinite(v) || v <= 0) return { label: "Not logged", cls: "" };
    if (m.highCut && v > m.highCut) {
      return { label: "High · Consult Doctor", cls: "peach-pill" };
    }
    if (v < m.lowCut) {
      return { label: "Deficient / Low", cls: "peach-pill" };
    }
    if (v >= m.minOpt && v <= m.maxOpt) {
      return { label: "Optimal Range ✓", cls: "complete" };
    }
    return { label: "Sub-optimal / Borderline", cls: "" };
  };

  return (
    <>
      <Heading
        eyebrow="SYSTEM TOOLKIT & HEALTH"
        title="Sleep, Pomodoro, health & settings"
        description="Circadian sleep anchors, multi-block focus timer with analytics, blood biomarker tracker, crisis support, and data backup."
      />

      <div className="tabs large-tabs">
        {[
          ["sleep", "Sleep & Deep Work Pomodoro"],
          ["control", "Dopamine Control & If-Then"],
          ["health", "Blood Tests & Lab Tracker"],
          ["help", "Helplines & System Vault"],
        ].map(([k, lbl]) => (
          <button
            type="button"
            key={k}
            className={subTab === k ? "selected" : ""}
            onClick={() => setSubTab(k)}
          >
            {lbl}
          </button>
        ))}
      </div>

      {/* =====================================================================
          TAB 1: SLEEP & DEEP WORK POMODORO
          ===================================================================== */}
      {subTab === "sleep" && (
        <div className="stack-col">
          <div className="stats-grid">
            <Stat
              icon="◈"
              label="Today's Deep Focus"
              value={`${focusAnalytics.todayMins} mins`}
              detail={`${(focusAnalytics.todayMins / 60).toFixed(1)} hrs logged today`}
              color="sage"
            />
            <Stat
              icon="↗"
              label="7-Day Focus Volume"
              value={`${focusAnalytics.weekMins} mins`}
              detail={`All-time: ${focusAnalytics.totalAllTimeHours} hrs`}
              color="blue"
            />
            <Stat
              icon="☾"
              label="Planned Sleep Window"
              value={`${sleepMetrics.durationHours} hrs`}
              detail={`~${sleepMetrics.cycles} REM/Deep cycles (90m)`}
              color="peach"
            />
            <Stat
              icon="☕"
              label="Caffeine & Screen Cutoffs"
              value={sleepMetrics.caffeineCutoff}
              detail={`Grayscale ON at ${sleepMetrics.screenSunset}`}
              color="lavender"
            />
          </div>

          <div className="dashboard-grid">
            <Card>
              <div className="eyebrow">DEEP WORK POMODORO</div>
              <h2>Distraction-free focus sprint</h2>

              <div className="category-pills" style={{ marginTop: 10 }}>
                {POMODORO_PRESETS.map((pr) => (
                  <button
                    type="button"
                    key={pr.id}
                    className={selectedPreset.id === pr.id ? "selected" : ""}
                    onClick={() => {
                      setSelectedPreset(pr);
                      setTaskName(`Apna Kaam (${pr.label})`);
                    }}
                  >
                    {pr.label}
                  </button>
                ))}
              </div>

              <Field label="Current Focus Task">
                <input
                  type="text"
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                />
              </Field>

              <div style={{ marginTop: 14 }}>
                <CountdownTimer
                  defaultSeconds={selectedPreset.sec}
                  label={taskName}
                  onComplete={() => {
                    logFocusSession(selectedPreset.mins, taskName);
                  }}
                />
              </div>

              {/* Manual offline study logger */}
              <div
                className="inline-add-row"
                style={{
                  marginTop: 16,
                  paddingTop: 12,
                  borderTop: "1px solid var(--line)",
                }}
              >
                <input
                  type="number"
                  min="5"
                  max="240"
                  step="5"
                  className="clean-input"
                  style={{ maxWidth: 110 }}
                  value={manualMins}
                  onChange={(e) => setManualMins(safeNum(e.target.value, 45))}
                />
                <Button
                  onClick={() => logFocusSession(manualMins, taskName)}
                >
                  ＋ Log {manualMins}m Offline Study Block
                </Button>
              </div>
            </Card>

            <Card>
              <div className="eyebrow">CIRCADIAN SLEEP ANCHORS</div>
              <h2>Sleep window &amp; 90-min cycle planner</h2>
              <div className="form-grid" style={{ marginTop: 12 }}>
                <Field label="Fixed Wake Time">
                  <input
                    type="time"
                    value={p.wakeTime || "07:00"}
                    onChange={(e) =>
                      updateProfile({ wakeTime: e.target.value })
                    }
                  />
                </Field>
                <Field label="Planned Bedtime">
                  <input
                    type="time"
                    value={p.bedtime || "23:00"}
                    onChange={(e) => updateProfile({ bedtime: e.target.value })}
                  />
                </Field>
              </div>

              <div
                className="category-pills"
                style={{ marginTop: 12, marginBottom: 8 }}
              >
                <button
                  type="button"
                  onClick={() =>
                    updateProfile({ bedtime: sleepMetrics.fiveCycleBed })
                  }
                >
                  Set 5 Cycles (7.5h): {sleepMetrics.fiveCycleBed}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    updateProfile({ bedtime: sleepMetrics.sixCycleBed })
                  }
                >
                  Set 6 Cycles (9h): {sleepMetrics.sixCycleBed}
                </button>
              </div>

              <p style={{ marginTop: 10 }}>
                • <strong>Morning Sunlight:</strong> Step outside for 10–20 mins
                before <strong>{sleepMetrics.sunlightWindowEnd}</strong>.
                <br />• <strong>Caffeine Cutoff:</strong> Stop tea, coffee, and
                energy drinks by <strong>{sleepMetrics.caffeineCutoff}</strong>{" "}
                (8 hrs before sleep).
                <br />• <strong>Digital Sunset:</strong> Turn on Grayscale &amp;
                keep phone outside bedroom by{" "}
                <strong>{sleepMetrics.screenSunset}</strong>.
              </p>
            </Card>
          </div>

          <div className="dashboard-grid">
            <Card>
              <div className="section-head">
                <div>
                  <div className="eyebrow">7-DAY FOCUS ANALYTICS</div>
                  <h2>Deep work minutes over the last 7 days</h2>
                </div>
                <span className="status-pill complete">
                  {focusAnalytics.weekMins}m this week
                </span>
              </div>
              <ModernAreaChart
                data={focusAnalytics.series7d}
                maxVal={Math.max(
                  120,
                  ...focusAnalytics.series7d.map((d) => d.value)
                )}
                unit="m"
                height={180}
              />
            </Card>

            <Card>
              <div className="section-head">
                <div>
                  <div className="eyebrow">RECENT FOCUS HISTORY</div>
                  <h2>Completed deep work blocks</h2>
                </div>
                <span className="status-pill">
                  {focusSessions.length} sessions
                </span>
              </div>
              {focusSessions.length === 0 ? (
                <Empty
                  icon="◈"
                  title="No focus sessions logged yet"
                  description="Complete a Pomodoro sprint or log an offline study block above."
                />
              ) : (
                <div className="habit-list">
                  {focusSessions.slice(0, 6).map((s) => (
                    <div className="habit-row checked" key={s.id}>
                      <div className="habit-info">
                        <strong>{s.task}</strong>
                        <small>{fmtDate(s.date)}</small>
                      </div>
                      <span className="status-pill complete">{s.mins} mins</span>
                      <button
                        type="button"
                        className="danger-text"
                        onClick={() => deleteFocusSession(s.id)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: DOPAMINE CONTROL PANEL & IF-THEN BUILDER
          ===================================================================== */}
      {subTab === "control" && (
        <div className="stack-col">
          <Card>
            <div className="section-head">
              <div>
                <div className="eyebrow">
                  SELECT LOOPS TO MONITOR IN DAILY LOG
                </div>
                <h2>13 Compulsive loops &amp; life hygiene guards</h2>
                <p>
                  Active loops appear directly inside your daily Comeback 90
                  tracker so you can guard against cheap dopamine spikes.
                </p>
              </div>
              <div className="heading-btn-group">
                <Button onClick={() => setAllLoops("all")}>
                  Select All 13
                </Button>
                <Button onClick={() => setAllLoops("default")}>
                  Reset Top 3
                </Button>
              </div>
            </div>

            <div className="habit-list" style={{ marginTop: 14 }}>
              {CONTROL_LOOPS.map((item) => {
                const active = activeLoops.includes(item.id);
                return (
                  <div
                    className={`habit-row ${active ? "checked" : ""}`}
                    key={item.id}
                  >
                    <button
                      type="button"
                      className="check-circle"
                      onClick={() => toggleLoop(item.id)}
                    >
                      {active ? "✓" : ""}
                    </button>
                    <div className="habit-info">
                      <strong>{item.title}</strong>
                      <small>{item.sub}</small>
                    </div>
                    <span className={`status-pill ${active ? "complete" : ""}`}>
                      {active ? "Tracking" : "Inactive"}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <div className="section-head">
              <div>
                <div className="eyebrow">
                  PRE-COMMITMENT DEFENSE (IF–THEN RULES)
                </div>
                <h2>Program your automatic response to triggers</h2>
                <p>
                  Don&apos;t rely on willpower at midnight. Decide right now what
                  you will do the second a trigger hits.
                </p>
              </div>
            </div>

            <div className="form-grid">
              <Field label="IF (Trigger / Situation occurs...)">
                <input
                  type="text"
                  placeholder="e.g. I feel the urge to scroll reels alone at night"
                  value={ifThenForm.trigger}
                  onChange={(e) =>
                    setIfThenForm({ ...ifThenForm, trigger: e.target.value })
                  }
                />
              </Field>
              <Field label="THEN (I will immediately...)">
                <div className="inline-add-row" style={{ marginTop: 0 }}>
                  <input
                    type="text"
                    placeholder="e.g. Put phone on the living room table & do 15 push-ups"
                    value={ifThenForm.action}
                    onChange={(e) =>
                      setIfThenForm({ ...ifThenForm, action: e.target.value })
                    }
                  />
                  <Button kind="primary" onClick={handleAddIfThen}>
                    ＋ Add Rule
                  </Button>
                </div>
              </Field>
            </div>

            <div className="habit-list" style={{ marginTop: 14 }}>
              {(data.ifThen || []).map((rule) => (
                <div className="habit-row checked" key={rule.id}>
                  <span className="status-pill complete">IF → THEN</span>
                  <div className="habit-info">
                    <strong>If: {rule.trigger}</strong>
                    <small>Then: {rule.action}</small>
                  </div>
                  <button
                    type="button"
                    className="danger-text"
                    onClick={() => handleDeleteIfThen(rule.id)}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* =====================================================================
          TAB 3: BLOOD TESTS, BIOMARKER TRACKER & SUPPLEMENTS
          ===================================================================== */}
      {subTab === "health" && (
        <div className="stack-col">
          <div className="dashboard-grid">
            <Card>
              <div className="eyebrow">TEST FIRST, DON&apos;T GUESS</div>
              <h2>Essential blood tests to discuss with a doctor</h2>
              <div className="habit-list" style={{ marginTop: 12 }}>
                {HEALTH_TESTS.map((t, i) => (
                  <div className="habit-row" key={i}>
                    <div className="habit-info">
                      <strong>{t.name}</strong>
                      <small>{t.detail}</small>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <div className="eyebrow">EVIDENCE-BASED SUPPLEMENT TIERS</div>
              <h2>What works vs. what to avoid</h2>
              <div className="stack-col" style={{ marginTop: 12 }}>
                {SUPPLEMENT_TIERS.map((st, i) => (
                  <div key={i} className="routine-step-box">
                    <strong>{st.tier}</strong>
                    {st.items.map((it, idx) => (
                      <p key={idx}>• {it}</p>
                    ))}
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card>
            <div className="section-head">
              <div>
                <div className="eyebrow">
                  PRIVATE LAB BIOMARKER LOG &amp; REFERENCE GUIDE
                </div>
                <h2>Track your blood report numbers</h2>
                <p>
                  Enter your lab test values below to see how they compare with
                  general reference ranges. Always consult a qualified doctor
                  before starting any supplement.
                </p>
              </div>
              {labValues.updatedAt && (
                <span className="status-pill">
                  Last updated: {fmtDate(labValues.updatedAt)}
                </span>
              )}
            </div>

            <div className="habit-list" style={{ marginTop: 12 }}>
              {LAB_MARKERS_GUIDE.map((m) => {
                const rawVal = labValues[m.id] ?? "";
                const st = getMarkerStatus(m, rawVal);
                return (
                  <div className="habit-row" key={m.id}>
                    <div className="habit-info">
                      <strong>
                        {m.name} <small>({m.unit})</small>
                      </strong>
                      <small>{m.hint}</small>
                    </div>

                    <div className="heading-btn-group">
                      <input
                        type="number"
                        step="0.1"
                        className="clean-input"
                        style={{ width: 110 }}
                        placeholder={m.unit}
                        value={rawVal}
                        onChange={(e) => updateLabValue(m.id, e.target.value)}
                      />
                      <span className={`status-pill ${st.cls}`}>
                        {st.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* =====================================================================
          TAB 4: HELPLINES & SYSTEM SETTINGS / BACKUP VAULT
          ===================================================================== */}
      {subTab === "help" && (
        <div className="stack-col">
          <Card>
            <div className="eyebrow">CONFIDENTIAL 24×7 SUPPORT (INDIA)</div>
            <h2>You never have to fight alone</h2>
            <div className="intro-callout" style={{ marginTop: 14 }}>
              <div className="callout-icon">♡</div>
              <div>
                <strong>Tele-MANAS (National Mental Health Helpline)</strong>
                <p>
                  Free, confidential 24×7 support in Hindi, English, and
                  regional languages: <strong>14416</strong> or{" "}
                  <strong>1800-891-4416</strong>. Emergency:{" "}
                  <strong>112</strong>.
                </p>
              </div>
            </div>
            <div className="record-actions">
              <a href="tel:14416" className="btn primary">
                Call Tele-MANAS (14416)
              </a>
              <a href="tel:18008914416" className="btn">
                Toll-Free (1800-891-4416)
              </a>
              <a href="tel:112" className="btn">
                Emergency (112)
              </a>
            </div>
          </Card>

          <div className="dashboard-grid">
            <Card>
              <div className="eyebrow">SYSTEM PREFERENCES &amp; PRIVACY</div>
              <h2>Discreet mode, Bad Day mode &amp; daily targets</h2>
              <div className="habit-list" style={{ marginTop: 12 }}>
                <div
                  className={`habit-row ${p.discreet ? "checked" : ""}`}
                >
                  <button
                    type="button"
                    className="check-circle"
                    onClick={() =>
                      updateProfile({ discreet: !Boolean(p.discreet) })
                    }
                  >
                    {p.discreet ? "✓" : ""}
                  </button>
                  <div className="habit-info">
                    <strong>Discreet UI Labels (Privacy Shield)</strong>
                    <small>
                      Replaces sensitive habit/urge words with neutral labels
                      like &ldquo;Streak A&rdquo; and &ldquo;Reset&rdquo;.
                    </small>
                  </div>
                </div>

                <div
                  className={`habit-row ${data.badDayMode ? "checked" : ""}`}
                >
                  <button
                    type="button"
                    className="check-circle"
                    onClick={() =>
                      setData((old) => ({
                        ...old,
                        badDayMode: !Boolean(old.badDayMode),
                      }))
                    }
                  >
                    {data.badDayMode ? "✓" : ""}
                  </button>
                  <div className="habit-info">
                    <strong>Bad Day Mode (3 Minimum Basics Only)</strong>
                    <small>
                      Low energy or exam pressure? Focus only on Sunlight,
                      Phone Outside Bedroom, and Bed on Time.
                    </small>
                  </div>
                </div>
              </div>

              <div
                className="form-grid three-col-grid"
                style={{ marginTop: 14 }}
              >
                <Field label="Daily Steps Target">
                  <input
                    type="number"
                    step="500"
                    value={p.targets?.steps || 8000}
                    onChange={(e) =>
                      updateProfile({
                        targets: {
                          ...(p.targets || {}),
                          steps: Math.max(2000, safeNum(e.target.value, 8000)),
                        },
                      })
                    }
                  />
                </Field>
                <Field label="Daily Water Target (L)">
                  <input
                    type="number"
                    step="0.25"
                    value={p.targets?.waterL || 3}
                    onChange={(e) =>
                      updateProfile({
                        targets: {
                          ...(p.targets || {}),
                          waterL: Math.max(1.5, safeNum(e.target.value, 3)),
                        },
                      })
                    }
                  />
                </Field>
                <Field label="Screen Limit (Hours)">
                  <input
                    type="number"
                    step="0.5"
                    value={p.targets?.screenH || 3}
                    onChange={(e) =>
                      updateProfile({
                        targets: {
                          ...(p.targets || {}),
                          screenH: Math.max(0.5, safeNum(e.target.value, 3)),
                        },
                      })
                    }
                  />
                </Field>
              </div>
            </Card>

            <Card>
              <div className="eyebrow">100% OFFLINE LOCAL DATA VAULT</div>
              <h2>Backup, restore or reset your data</h2>
              <p style={{ marginTop: 8 }}>
                All your habits, logs, journals, and metrics stay privately in
                your browser&apos;s local storage. Export a JSON backup anytime.
              </p>

              <div className="record-actions" style={{ marginTop: 16 }}>
                <Button kind="primary" onClick={exportData}>
                  ⬇ Export JSON Backup
                </Button>

                <label className="btn secondary" style={{ cursor: "pointer" }}>
                  ⬆ Restore from Backup
                  <input
                    type="file"
                    accept="application/json,.json"
                    style={{ display: "none" }}
                    onChange={(e) => importData(e.target.files?.[0])}
                  />
                </label>

                <Button onClick={resetAll}>Reset All Local Data</Button>
              </div>

              <small
                className="muted-text"
                style={{ display: "block", marginTop: 14 }}
              >
                {DISCLAIMER_TEXT}
              </small>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}

export { MoreAndSettingsPage };