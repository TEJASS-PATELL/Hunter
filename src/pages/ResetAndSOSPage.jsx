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
  const logs = data.resetLogs || [];
  const urges = data.urges || [];
  const passed =
    logs.filter((l) => l.outcome === "urge_passed").length +
    urges.filter((u) => !u.slip).length;
  const alternative = logs.filter((l) => l.outcome === "alternative_chosen").length;

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

  return (
    <>
      <Heading
        eyebrow="NOTICE · PAUSE · CHOOSE"
        title={dm("Reset & Urge SOS")}
        description="A discreet, shame-free space to ride out urges, set up digital blockers, and understand your triggers."
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
            Notice what happened. Learn from it. Choose the next useful step. Progress is never
            erased by one difficult moment.
          </p>
        </div>
      </div>

      <div className="stats-grid reset-stats">
        <Stat
          icon="↻"
          label="Total check-ins"
          value={logs.length + urges.length}
          detail="Your private record"
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
          value={`${Object.values(data.env || {}).filter(Boolean).length}/${ENV_CHECKLIST.length}`}
          detail="Environment shields"
          color="lavender"
        />
      </div>

      <div className="dashboard-grid">
        <Card>
          <div className="section-head">
            <div>
              <div className="eyebrow">YOUR PATTERNS</div>
              <h2>Most noted triggers</h2>
              <p>Patterns from your own saved SOS and reset check-ins.</p>
            </div>
          </div>
          {triggers.length ? (
            triggers.map(([label, count]) => (
              <div className="trigger-row" key={label}>
                <span>{dm(label)}</span>
                <div className="trigger-track">
                  <span style={{ width: `${percent(count, triggers[0][1])}%` }} />
                </div>
                <b>{count}</b>
              </div>
            ))
          ) : (
            <Empty
              icon="⌁"
              title="Patterns take time"
              description="Use the Urge SOS button or add a check-in to spot your peak triggers."
            />
          )}
        </Card>

        <Card>
          <div className="eyebrow">ENVIRONMENT & FRICTION SHIELDS</div>
          <h2 className="reset-reminder-title">Digital blocker checklist</h2>
          <div className="habit-list">
            {ENV_CHECKLIST.slice(0, 6).map((item) => {
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
            <h2>Saved reset & SOS check-ins</h2>
          </div>
        </div>
        {logs.length === 0 && urges.length === 0 ? (
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
            {urges.map((u) => (
              <div className="reset-log" key={u.id}>
                <div className="reset-log-date">
                  <strong>{fmtDate(todayISO(new Date(u.ts || Date.now())))}</strong>
                  <small>
                    Intensity {u.before}/10 → {u.after}/10
                  </small>
                </div>
                <div className="reset-log-content">
                  <strong>{dm(u.slip ? "Slip / Reset Logged" : "Urge Surfed via SOS")}</strong>
                  <p>
                    Trigger: {dm(u.trigger)} · Location: {u.location}
                  </p>
                  <span className={`status-pill ${!u.slip ? "complete" : ""}`}>
                    {!u.slip ? "Urge passed" : "Reset logged"}
                  </span>
                </div>
              </div>
            ))}
            {logs.map((l) => (
              <div className="reset-log" key={l.id}>
                <div className="reset-log-date">
                  <strong>{fmtDate(l.date)}</strong>
                  <small>Intensity {l.intensity}/10</small>
                </div>
                <div className="reset-log-content">
                  <strong>{dm(l.behavior)}</strong>
                  <p>
                    {l.trigger ? `Trigger: ${l.trigger}` : "No trigger note"}
                    {l.response ? ` · Response: ${l.response}` : ""}
                  </p>
                  <span
                    className={`status-pill ${l.outcome === "urge_passed" ? "complete" : ""
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
    </>
  );
}

export { ResetAndSOSPage };
