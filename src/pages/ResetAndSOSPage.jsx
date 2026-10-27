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

const BREATH_PATTERNS = {
  "478": {
    label: "4-7-8 Nervous System Reset",
    phases: [
      { name: "Inhale through nose", secs: 4, color: "#3f6952", scale: 1.18 },
      { name: "Hold breath calmly", secs: 7, color: "#7d8ec4", scale: 1.18 },
      { name: "Long slow mouth exhale", secs: 8, color: "#c89572", scale: 0.88 },
    ],
  },
  "446": {
    label: "4-4-6 Gentle Calm Breath",
    phases: [
      { name: "Inhale gently", secs: 4, color: "#3f6952", scale: 1.15 },
      { name: "Soft hold", secs: 4, color: "#7d8ec4", scale: 1.15 },
      { name: "Slow steady exhale", secs: 6, color: "#c89572", scale: 0.9 },
    ],
  },
  box: {
    label: "4-4-4-4 Box Breathing",
    phases: [
      { name: "Inhale (1-2-3-4)", secs: 4, color: "#3f6952", scale: 1.16 },
      { name: "Hold full lungs", secs: 4, color: "#7d8ec4", scale: 1.16 },
      { name: "Exhale completely", secs: 4, color: "#c89572", scale: 0.88 },
      { name: "Hold empty lungs", secs: 4, color: "#689677", scale: 0.88 },
    ],
  },
};

function ResetAndSOSPage({
  data,
  setData,
  today,
  dm,
  updateDay,
  onAdd,
  onEdit,
  onDelete,
  onOpenSOS,
  notify,
}) {
  const [subTab, setSubTab] = useState("overview"); // overview | breathe | protocol
  const [showAllEnv, setShowAllEnv] = useState(true);
  const [historyFilter, setHistoryFilter] = useState("all"); // all | passed | alternative | slip

  /* Breathing Pacer State */
  const [breathMode, setBreathMode] = useState("478");
  const [breathRunning, setBreathRunning] = useState(false);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [phaseSecLeft, setPhaseSecLeft] = useState(
    BREATH_PATTERNS["478"].phases[0].secs
  );
  const [completedCycles, setCompletedCycles] = useState(0);

  /* Quick On-Page Wave Logger State */
  const [quickUrge, setQuickUrge] = useState({
    trigger: URGE_TRIGGERS[0],
    location: URGE_LOCATIONS[0],
    before: 8,
    after: 2,
    slip: false,
  });

  /* 7-Step Protocol & 5-4-3-2-1 Grounding State */
  const [doneSteps, setDoneSteps] = useState({});
  const [grounding, setGrounding] = useState({
    see5: "",
    touch4: "",
    hear3: "",
    smell2: "",
    breath1: "",
  });

  const activePattern = BREATH_PATTERNS[breathMode] || BREATH_PATTERNS["478"];
  const currentPhase =
    activePattern.phases[phaseIdx] || activePattern.phases[0];

  useEffect(() => {
    const first = (BREATH_PATTERNS[breathMode] || BREATH_PATTERNS["478"])
      .phases[0];
    setPhaseIdx(0);
    setPhaseSecLeft(first.secs);
    setBreathRunning(false);
  }, [breathMode]);

  useEffect(() => {
    if (!breathRunning) return undefined;
    const id = window.setInterval(() => {
      setPhaseSecLeft((prev) => {
        if (prev > 1) return prev - 1;
        const phases = activePattern.phases;
        const nextIdx = (phaseIdx + 1) % phases.length;
        setPhaseIdx(nextIdx);
        if (nextIdx === 0) {
          setCompletedCycles((c) => c + 1);
        }
        return phases[nextIdx].secs;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [breathRunning, phaseIdx, activePattern]);

  const logs = data.resetLogs || [];
  const urges = data.urges || [];
  const passed =
    logs.filter((l) => l.outcome === "urge_passed").length +
    urges.filter((u) => !u.slip).length;
  const alternative = logs.filter(
    (l) => l.outcome === "alternative_chosen"
  ).length;

  const avgDrop = useMemo(() => {
    if (!urges.length) return null;
    const totalDrop = urges.reduce(
      (acc, u) => acc + Math.max(0, safeNum(u.before, 7) - safeNum(u.after, 3)),
      0
    );
    return (totalDrop / urges.length).toFixed(1);
  }, [urges]);

  const triggers = useMemo(() => {
    const counts = {};
    logs.forEach((l) => {
      const k = l.trigger?.trim();
      if (k) counts[k] = (counts[k] || 0) + 1;
    });
    urges.forEach((u) => {
      const k = u.trigger?.trim();
      if (k) counts[k] = (counts[k] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [logs, urges]);

  const locationPatterns = useMemo(() => {
    const counts = {};
    urges.forEach((u) => {
      const k = u.location?.trim();
      if (k) counts[k] = (counts[k] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
  }, [urges]);

  const activeShieldsCount = Object.values(data.env || {}).filter(
    Boolean
  ).length;
  const visibleEnvItems = showAllEnv
    ? ENV_CHECKLIST
    : ENV_CHECKLIST.slice(0, 6);

  const handleSaveQuickUrge = () => {
    const entry = {
      id: uid(),
      ts: Date.now(),
      trigger: quickUrge.trigger,
      location: quickUrge.location,
      before: safeNum(quickUrge.before, 8),
      after: safeNum(quickUrge.after, 2),
      slip: Boolean(quickUrge.slip),
    };
    setData((old) => ({
      ...old,
      urges: [entry, ...(old.urges || [])],
    }));
    if (typeof updateDay === "function") {
      updateDay(today, (prev) => ({
        ...prev,
        slip: quickUrge.slip ? true : prev.slip,
        c: {
          ...(prev.c || {}),
          noPorn: quickUrge.slip ? false : true,
        },
      }));
    }
    notify(
      quickUrge.slip
        ? "Reset logged without shame. Focus on the next clean hour."
        : "Urge surfed & logged! Clean streak protected."
    );
  };

  const handleDeleteUrge = (id) => {
    setData((old) => ({
      ...old,
      urges: (old.urges || []).filter((u) => u.id !== id),
    }));
    notify("SOS entry removed");
  };

  const copyTemplate = async (text) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        notify("Message copied! Send it to a friend now.");
      }
    } catch {
      notify("Copy manually and text a friend.");
    }
  };

  const filteredUrges = urges.filter((u) => {
    if (historyFilter === "passed") return !u.slip;
    if (historyFilter === "slip") return Boolean(u.slip);
    if (historyFilter === "alternative") return false;
    return true;
  });

  const filteredLogs = logs.filter((l) => {
    if (historyFilter === "passed") return l.outcome === "urge_passed";
    if (historyFilter === "alternative")
      return l.outcome === "alternative_chosen";
    if (historyFilter === "slip") return l.outcome === "behavior_occurred";
    return true;
  });

  return (
    <>
      <Heading
        eyebrow="NOTICE · PAUSE · CHOOSE"
        title={dm("Reset & Urge SOS")}
        description="A discreet, shame-free space to ride out urges, practice 4-7-8 breathing, set up 12 digital blockers, and understand your triggers."
        action={
          <div className="heading-btn-group">
            <Button onClick={onAdd}>＋ Manual check-in</Button>
            <Button kind="primary" onClick={onOpenSOS}>
              🛡 Launch 10-Min Urge SOS
            </Button>
          </div>
        }
      />

      <div className="reset-banner">
        <div className="reset-symbol">↻</div>
        <div>
          <span className="eyebrow">NO SHAME. JUST INFORMATION.</span>
          <h2>
            An urge is a moment, <em>not your identity.</em>
          </h2>
          <p>
            Notice what happened. Learn from it. Choose the next useful step.
            Progress is never erased by one difficult moment.
          </p>
        </div>
      </div>

      <div className="stats-grid reset-stats">
        <Stat
          icon="↻"
          label="Total check-ins"
          value={logs.length + urges.length}
          detail={
            avgDrop
              ? `Avg intensity drop: -${avgDrop} pts`
              : "Your private record"
          }
          color="sage"
        />
        <Stat
          icon="✓"
          label="Urges rode out"
          value={passed}
          detail="Waves you surfed"
          color="blue"
        />
        <Stat
          icon="↗"
          label="Alternative chosen"
          value={alternative}
          detail="Redirected energy"
          color="peach"
        />
        <Stat
          icon="🛡"
          label="Blockers active"
          value={`${activeShieldsCount}/${ENV_CHECKLIST.length}`}
          detail={`${percent(
            activeShieldsCount,
            ENV_CHECKLIST.length
          )}% shield strength`}
          color="lavender"
        />
      </div>

      <div className="tabs large-tabs">
        {[
          ["overview", "Patterns, 12 Shields & History"],
          ["breathe", "4-7-8 Breathing & 10m Wave Timer"],
          ["protocol", "7-Step SOS Protocol & Grounding"],
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
          TAB 1: PATTERNS, 12 DIGITAL SHIELDS & PRIVATE HISTORY
          ===================================================================== */}
      {subTab === "overview" && (
        <div className="stack-col">
          <div className="dashboard-grid">
            <Card>
              <div className="section-head">
                <div>
                  <div className="eyebrow">YOUR PATTERNS</div>
                  <h2>Most noted triggers &amp; locations</h2>
                  <p>Patterns from your own saved SOS and reset check-ins.</p>
                </div>
              </div>
              {triggers.length ? (
                <>
                  {triggers.map(([label, count]) => (
                    <div className="trigger-row" key={label}>
                      <span>{dm(label)}</span>
                      <div className="trigger-track">
                        <span
                          style={{
                            width: `${percent(count, triggers[0][1])}%`,
                          }}
                        />
                      </div>
                      <b>{count}</b>
                    </div>
                  ))}

                  {locationPatterns.length > 0 && (
                    <div
                      style={{
                        marginTop: 18,
                        paddingTop: 12,
                        borderTop: "1px solid var(--line)",
                      }}
                    >
                      <div className="eyebrow" style={{ marginBottom: 8 }}>
                        HIGH-RISK LOCATIONS TO GUARD
                      </div>
                      {locationPatterns.map(([loc, cnt]) => (
                        <div className="trigger-row" key={loc}>
                          <span>📍 {loc}</span>
                          <div className="trigger-track">
                            <span
                              style={{
                                width: `${percent(
                                  cnt,
                                  locationPatterns[0][1]
                                )}%`,
                              }}
                            />
                          </div>
                          <b>{cnt}</b>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Empty
                  icon="⌁"
                  title="Patterns take time"
                  description="Use the Urge SOS button or add a check-in to spot your peak triggers."
                />
              )}
            </Card>

            <Card>
              <div className="section-head">
                <div>
                  <div className="eyebrow">
                    ENVIRONMENT &amp; FRICTION SHIELDS
                  </div>
                  <h2 className="reset-reminder-title">
                    Digital blocker checklist ({activeShieldsCount}/
                    {ENV_CHECKLIST.length})
                  </h2>
                </div>
                <Button onClick={() => setShowAllEnv((v) => !v)}>
                  {showAllEnv
                    ? "Show Top 6"
                    : `Show All ${ENV_CHECKLIST.length}`}
                </Button>
              </div>

              <div style={{ marginBottom: 12 }}>
                <Progress
                  value={percent(activeShieldsCount, ENV_CHECKLIST.length)}
                />
              </div>

              <div className="habit-list">
                {visibleEnvItems.map((item) => {
                  const checked = Boolean(data.env && data.env[item.id]);
                  return (
                    <div
                      className={`habit-row ${checked ? "checked" : ""}`}
                      key={item.id}
                    >
                      <button
                        type="button"
                        className="check-circle"
                        onClick={() =>
                          setData((old) => ({
                            ...old,
                            env: { ...(old.env || {}), [item.id]: !checked },
                          }))
                        }
                      >
                        {checked ? "✓" : ""}
                      </button>
                      <div className="habit-info">
                        <strong>{item.title}</strong>
                        <small>{item.sub}</small>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          <Card className="history-card">
            <div className="section-head">
              <div>
                <div className="eyebrow">YOUR PRIVATE HISTORY</div>
                <h2>Saved reset &amp; SOS check-ins</h2>
              </div>
              <div className="tabs">
                {[
                  ["all", "All"],
                  ["passed", "Urge Passed"],
                  ["alternative", "Alternative"],
                  ["slip", "Resets"],
                ].map(([k, lbl]) => (
                  <button
                    type="button"
                    key={k}
                    className={historyFilter === k ? "selected" : ""}
                    onClick={() => setHistoryFilter(k)}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>

            {filteredLogs.length === 0 && filteredUrges.length === 0 ? (
              <Empty
                icon="↻"
                title="Your story starts when you're ready"
                description="Record an urge, a trigger, and what you chose to do next."
                action={
                  <Button kind="primary" onClick={onAdd}>
                    ＋ Record a check-in
                  </Button>
                }
              />
            ) : (
              <>
                {filteredUrges.map((u) => (
                  <div className="reset-log" key={u.id}>
                    <div className="reset-log-date">
                      <strong>
                        {fmtDate(todayISO(new Date(u.ts || Date.now())))}
                      </strong>
                      <small>
                        Intensity {u.before}/10 → {u.after}/10
                      </small>
                    </div>
                    <div className="reset-log-content">
                      <strong>
                        {dm(
                          u.slip
                            ? "Slip / Reset Logged"
                            : "Urge Surfed via SOS"
                        )}
                      </strong>
                      <p>
                        Trigger: {dm(u.trigger)} · Location: {u.location}
                      </p>
                      <span
                        className={`status-pill ${!u.slip ? "complete" : ""}`}
                      >
                        {!u.slip ? "Urge passed" : "Reset logged"}
                      </span>
                    </div>
                    <div className="row-actions">
                      <button
                        type="button"
                        className="danger-text"
                        onClick={() => handleDeleteUrge(u.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}

                {filteredLogs.map((l) => (
                  <div className="reset-log" key={l.id}>
                    <div className="reset-log-date">
                      <strong>{fmtDate(l.date)}</strong>
                      <small>Intensity {l.intensity}/10</small>
                    </div>
                    <div className="reset-log-content">
                      <strong>{dm(l.behavior)}</strong>
                      <p>
                        {l.trigger
                          ? `Trigger: ${l.trigger}`
                          : "No trigger note"}
                        {l.response ? ` · Response: ${l.response}` : ""}
                      </p>
                      <span
                        className={`status-pill ${
                          l.outcome === "urge_passed" ? "complete" : ""
                        }`}
                      >
                        {l.outcome === "urge_passed"
                          ? "Urge passed"
                          : l.outcome === "alternative_chosen"
                          ? "Alternative chosen"
                          : "Behavior occurred"}
                      </span>
                    </div>
                    <div className="row-actions">
                      <button type="button" onClick={() => onEdit(l)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="danger-text"
                        onClick={() => onDelete(l.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </Card>
        </div>
      )}

      {/* =====================================================================
          TAB 2: INTERACTIVE 4-7-8 BREATHING PACER & 10-MIN WAVE TIMER
          ===================================================================== */}
      {subTab === "breathe" && (
        <div className="dashboard-grid">
          <Card>
            <div className="section-head">
              <div>
                <div className="eyebrow">PARASYMPATHETIC BREATH PACER</div>
                <h2>{activePattern.label}</h2>
                <p>
                  A long exhale tells your vagus nerve and brain that there is
                  no emergency.
                </p>
              </div>
              <span className="status-pill complete">
                {completedCycles} cycles done
              </span>
            </div>

            <div className="category-pills" style={{ marginBottom: 14 }}>
              {Object.entries(BREATH_PATTERNS).map(([key, obj]) => (
                <button
                  type="button"
                  key={key}
                  className={breathMode === key ? "selected" : ""}
                  onClick={() => setBreathMode(key)}
                >
                  {obj.label}
                </button>
              ))}
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "24px 12px",
                background: "var(--canvas)",
                borderRadius: 16,
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  width: 148,
                  height: 148,
                  borderRadius: "50%",
                  border: `4px solid ${currentPhase.color}`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  transform: `scale(${
                    breathRunning ? currentPhase.scale : 1
                  })`,
                  transition: "transform 0.9s ease, border-color 0.4s ease",
                  background: "var(--paper)",
                }}
              >
                <strong style={{ fontSize: "2rem" }}>{phaseSecLeft}s</strong>
                <small className="muted-text" style={{ textAlign: "center" }}>
                  {breathRunning ? currentPhase.name : "Tap Start below"}
                </small>
              </div>
            </div>

            <div className="heading-btn-group">
              <Button
                kind="primary"
                onClick={() => setBreathRunning((r) => !r)}
              >
                {breathRunning ? "Pause Breathing" : "▶ Start Breathing Guide"}
              </Button>
              <Button
                onClick={() => {
                  setBreathRunning(false);
                  setPhaseIdx(0);
                  setPhaseSecLeft(activePattern.phases[0].secs);
                  setCompletedCycles(0);
                }}
              >
                Reset
              </Button>
            </div>
          </Card>

          <Card>
            <div className="eyebrow">10-MINUTE URGE SURFING WAVE</div>
            <h2>Outlast the peak &amp; log your victory</h2>
            <p style={{ marginBottom: 12 }}>
              Every urge wave peaks and drops within 10 minutes if you do not
              feed it with screen stimulation.
            </p>

            <CountdownTimer
              defaultSeconds={600}
              label="10-Minute Urge Surfing Timer"
              onComplete={() =>
                notify("10 minutes complete! The peak wave has passed.")
              }
            />

            <div
              className="form-grid"
              style={{
                marginTop: 16,
                paddingTop: 14,
                borderTop: "1px solid var(--line)",
              }}
            >
              <Field label="What triggered the wave?">
                <select
                  value={quickUrge.trigger}
                  onChange={(e) =>
                    setQuickUrge({ ...quickUrge, trigger: e.target.value })
                  }
                >
                  {URGE_TRIGGERS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Where were you?">
                <select
                  value={quickUrge.location}
                  onChange={(e) =>
                    setQuickUrge({ ...quickUrge, location: e.target.value })
                  }
                >
                  {URGE_LOCATIONS.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label={`Intensity Before: ${quickUrge.before}/10`}>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={quickUrge.before}
                  onChange={(e) =>
                    setQuickUrge({
                      ...quickUrge,
                      before: Number(e.target.value),
                    })
                  }
                />
              </Field>

              <Field label={`Intensity Now: ${quickUrge.after}/10`}>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={quickUrge.after}
                  onChange={(e) =>
                    setQuickUrge({
                      ...quickUrge,
                      after: Number(e.target.value),
                    })
                  }
                />
              </Field>
            </div>

            <div
              className="row-between"
              style={{ marginTop: 12, flexWrap: "wrap", gap: 10 }}
            >
              <label className="archive-toggle">
                <input
                  type="checkbox"
                  checked={quickUrge.slip}
                  onChange={(e) =>
                    setQuickUrge({ ...quickUrge, slip: e.target.checked })
                  }
                />
                A slip occurred (log honestly to learn)
              </label>

              <Button kind="primary" onClick={handleSaveQuickUrge}>
                ✓ Save Wave Log
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* =====================================================================
          TAB 3: 7-STEP EMERGENCY PROTOCOL, 5-4-3-2-1 GROUNDING & SOS TEXTS
          ===================================================================== */}
      {subTab === "protocol" && (
        <div className="stack-col">
          <div className="dashboard-grid">
            <Card>
              <div className="section-head">
                <div>
                  <div className="eyebrow">STEP-BY-STEP CIRCUIT BREAKER</div>
                  <h2>7-Step physical &amp; mental urge reset</h2>
                  <p>
                    Check off each step in real time as you execute it right
                    now.
                  </p>
                </div>
                <Button onClick={() => setDoneSteps({})}>Reset Steps</Button>
              </div>

              <div className="habit-list" style={{ marginTop: 12 }}>
                {URGE_STEPS.map((s) => {
                  const checked = Boolean(doneSteps[s.step]);
                  return (
                    <div
                      className={`habit-row ${checked ? "checked" : ""}`}
                      key={s.step}
                    >
                      <button
                        type="button"
                        className="check-circle"
                        onClick={() =>
                          setDoneSteps({
                            ...doneSteps,
                            [s.step]: !checked,
                          })
                        }
                      >
                        {checked ? "✓" : ""}
                      </button>
                      <div className="habit-info">
                        <strong>
                          Step {s.step}: {s.title}
                        </strong>
                        <small>{s.detail}</small>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <div className="stack-col">
              <Card>
                <div className="eyebrow">5-4-3-2-1 SENSORY GROUNDING</div>
                <h2>Pull your mind back into the room</h2>
                <div className="stack-col" style={{ marginTop: 12 }}>
                  <Field label="👀 5 Things you can SEE right now">
                    <input
                      type="text"
                      placeholder="e.g. Wall clock, water bottle, notebook, window, fan"
                      value={grounding.see5}
                      onChange={(e) =>
                        setGrounding({ ...grounding, see5: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="✋ 4 Things you can physically FEEL / TOUCH">
                    <input
                      type="text"
                      placeholder="e.g. Feet on cool floor, cotton shirt, desk edge"
                      value={grounding.touch4}
                      onChange={(e) =>
                        setGrounding({ ...grounding, touch4: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="👂 3 Sounds you can HEAR">
                    <input
                      type="text"
                      placeholder="e.g. Ceiling fan hum, outside traffic, my breathing"
                      value={grounding.hear3}
                      onChange={(e) =>
                        setGrounding({ ...grounding, hear3: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="🌿 2 Scents you SMELL & 1 Long Deep Breath">
                    <input
                      type="text"
                      placeholder="e.g. Fresh air / soap + 1 slow 4-7-8 breath done"
                      value={grounding.smell2}
                      onChange={(e) =>
                        setGrounding({ ...grounding, smell2: e.target.value })
                      }
                    />
                  </Field>
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export { ResetAndSOSPage };