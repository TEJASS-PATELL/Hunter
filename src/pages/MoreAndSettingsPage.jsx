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

  const p = data.profile || {};
  const activeLoops = data.settings?.activeLoops || [];

  const toggleLoop = (loopId) => {
    setData((old) => {
      const cur = old.settings?.activeLoops || [];
      const next = cur.includes(loopId)
        ? cur.filter((x) => x !== loopId)
        : [...cur, loopId];
      return { ...old, settings: { ...(old.settings || {}), activeLoops: next } };
    });
  };

  return (
    <>
      <Heading
        eyebrow="SYSTEM TOOLKIT & HEALTH"
        title="Sleep, Pomodoro, health & settings"
        description="Circadian sleep anchors, 25-minute focus timer, blood test guide, and crisis support."
      />

      <div className="tabs large-tabs">
        {[
          ["sleep", "Sleep & 25m Pomodoro"],
          ["control", "Dopamine Control Panel"],
          ["health", "Blood Tests & Supplements"],
          ["help", "Helplines & Support"],
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

      {subTab === "sleep" && (
        <div className="dashboard-grid">
          <Card>
            <div className="eyebrow">DEEP WORK POMODORO</div>
            <h2>25-Minute distraction-free focus</h2>
            <Field label="Current Focus Task">
              <input
                type="text"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
              />
            </Field>
            <div style={{ marginTop: 14 }}>
              <CountdownTimer
                defaultSeconds={1500}
                label={taskName}
                onComplete={() => {
                  setData((old) => ({
                    ...old,
                    focusSessions: [
                      { id: uid(), date: todayISO(), task: taskName, mins: 25 },
                      ...(old.focusSessions || []),
                    ],
                  }));
                  notify("25-min Pomodoro completed & logged!");
                }}
              />
            </div>
          </Card>

          <Card>
            <div className="eyebrow">CIRCADIAN SLEEP ANCHORS</div>
            <h2>Sleep window planner</h2>
            <div className="form-grid" style={{ marginTop: 12 }}>
              <Field label="Fixed Wake Time">
                <input
                  type="time"
                  value={p.wakeTime || "07:00"}
                  onChange={(e) => updateProfile({ wakeTime: e.target.value })}
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
            <p style={{ marginTop: 14 }}>
              • Get 10–20 mins of outdoor sunlight within 1 hour of waking.
              <br />• Cut off tea, coffee, and energy drinks 8 hours before sleep.
              <br />• Charge your phone outside the bedroom every night.
            </p>
          </Card>
        </div>
      )}

      {subTab === "control" && (
        <Card>
          <div className="eyebrow">SELECT LOOPS TO MONITOR IN DAILY LOG</div>
          <h2>13 Compulsive loops & life hygiene guards</h2>
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
      )}

      {subTab === "health" && (
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
      )}

      {subTab === "help" && (
        <Card>
          <div className="eyebrow">CONFIDENTIAL 24×7 SUPPORT (INDIA)</div>
          <h2>You never have to fight alone</h2>
          <div className="intro-callout" style={{ marginTop: 14 }}>
            <div className="callout-icon">♡</div>
            <div>
              <strong>Tele-MANAS (National Mental Health Helpline)</strong>
              <p>
                Free, confidential 24×7 support in Hindi, English, and regional languages:{" "}
                <strong>14416</strong> or <strong>1800-891-4416</strong>. Emergency: <strong>112</strong>.
              </p>
            </div>
          </div>
          <div className="record-actions">
            <a href="tel:14416" className="btn primary">
              Call Tele-MANAS (14416)
            </a>
            <a href="tel:112" className="btn">
              Emergency (112)
            </a>
          </div>
        </Card>
      )}
    </>
  );
}

export { MoreAndSettingsPage };
