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

function GoalsAndRoadmapPage({
  data,
  setData,
  onAdd,
  onEdit,
  onMilestone,
  onMeasure,
  onDelete,
  notify,
}) {
  const [subTab, setSubTab] = useState("goals"); // goals | roadmap | review
  const [rev, setRev] = useState({ q1: "", q2: "", q3: "" });

  const goals = (data.goals || []).filter((g) => !g.archived);
  const weeklyReviews = data.weeklyReviews || [];

  const handleSaveReview = () => {
    if (!rev.q1.trim() && !rev.q3.trim()) return;
    const entry = {
      week: weeklyReviews.length + 1,
      date: todayISO(),
      ...rev,
    };
    setData((old) => ({
      ...old,
      weeklyReviews: [entry, ...(old.weeklyReviews || [])],
    }));
    setRev({ q1: "", q2: "", q3: "" });
    notify("Weekly review saved");
  };

  return (
    <>
      <Heading
        eyebrow="DIRECTION, NOT PRESSURE"
        title="Goals & 90-day roadmap"
        description="Turn what matters to you into milestones, phased 90-day checkpoints, and weekly reviews."
        action={
          <Button kind="primary" onClick={onAdd}>
            ＋ Create goal
          </Button>
        }
      />

      <div className="tabs large-tabs">
        <button
          type="button"
          className={subTab === "goals" ? "selected" : ""}
          onClick={() => setSubTab("goals")}
        >
          Personal Goals & Milestones <span>{goals.length}</span>
        </button>
        <button
          type="button"
          className={subTab === "roadmap" ? "selected" : ""}
          onClick={() => setSubTab("roadmap")}
        >
          90-Day Phased Roadmap <span>3 Phases</span>
        </button>
        <button
          type="button"
          className={subTab === "review" ? "selected" : ""}
          onClick={() => setSubTab("review")}
        >
          Sunday Weekly Review <span>{weeklyReviews.length}</span>
        </button>
      </div>

      {subTab === "goals" && (
        <>
          <div className="goals-summary">
            <div>
              <span>{goals.length}</span>
              <small>Active goals</small>
            </div>
            <div>
              <span>
                {(data.milestones || []).filter((m) => m.done).length}/
                {(data.milestones || []).length}
              </span>
              <small>Milestones complete</small>
            </div>
            <div>
              <span>{(data.measurements || []).length}</span>
              <small>Progress entries</small>
            </div>
          </div>

          <div className="record-grid goal-grid">
            {goals.map((g) => {
              const ms = (data.milestones || []).filter((m) => m.goalId === g.id);
              const latest = (data.measurements || [])
                .filter((m) => m.goalId === g.id)
                .sort((a, b) => (b.date || "").localeCompare(a.date || ""))[0];
              const pct = g.target
                ? percent(Number(latest?.value || g.progress || 0), Number(g.target))
                : g.progress || 0;
              return (
                <Card className="goal-card" key={g.id}>
                  <div className="goal-card-head">
                    <span className="record-symbol sage">⚑</span>
                    <button
                      type="button"
                      className="dots-button"
                      onClick={() => onEdit(g)}
                    >
                      •••
                    </button>
                  </div>
                  <span className="eyebrow">
                    IN PROGRESS{g.due ? ` · DUE ${fmtDate(g.due).toUpperCase()}` : ""}
                  </span>
                  <h3>{g.title}</h3>
                  <p>{g.why || "Keep taking the next useful step."}</p>
                  {g.target && (
                    <div className="goal-progress-detail">
                      <div>
                        <span>Current progress</span>
                        <strong>
                          {latest
                            ? `${latest.value} / ${g.target} ${g.unit || ""}`
                            : `0 / ${g.target} ${g.unit || ""}`}
                        </strong>
                      </div>
                      <Progress value={pct} />
                    </div>
                  )}
                  <div className="milestone-head">
                    <strong>Milestones</strong>
                    <span>
                      {ms.filter((m) => m.done).length}/{ms.length}
                    </span>
                  </div>
                  {ms.length ? (
                    ms.map((m) => (
                      <label className="milestone-row" key={m.id}>
                        <input
                          type="checkbox"
                          checked={!!m.done}
                          onChange={() => onDelete("milestones", m.id, "toggle")}
                        />
                        <span className={m.done ? "struck" : ""}>{m.title}</span>
                        {m.due && <small>{fmtDate(m.due)}</small>}
                      </label>
                    ))
                  ) : (
                    <p className="muted-text milestone-empty">
                      Add meaningful steps to break this goal down.
                    </p>
                  )}
                  <div className="record-actions">
                    <Button kind="primary" onClick={() => onMilestone(g)}>
                      ＋ Milestone
                    </Button>
                    <Button onClick={() => onMeasure(g)}>Log progress</Button>
                    <Button onClick={() => onEdit(g)}>Edit</Button>
                    <Button onClick={() => onDelete("goals", g.id)}>Archive</Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {subTab === "roadmap" && (
        <div className="stack-col">
          {ROADMAP_PHASES.map((ph) => (
            <Card key={ph.id}>
              <div className="eyebrow">{ph.days.toUpperCase()}</div>
              <h2>{ph.title}</h2>
              <p style={{ marginBottom: 12 }}>{ph.focus}</p>
              <div className="habit-list">
                {ph.tasks.map((t, i) => (
                  <div className="habit-row" key={i}>
                    <span className="status-pill complete">0{i + 1}</span>
                    <div className="habit-info">
                      <strong>{t}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {subTab === "review" && (
        <div className="dashboard-grid">
          <Card>
            <div className="eyebrow">SUNDAY ACCOUNTABILITY</div>
            <h2>Write this week&apos;s review</h2>
            <div className="stack-col" style={{ marginTop: 14 }}>
              <Field label="1. Biggest win or lesson from this week">
                <input
                  type="text"
                  value={rev.q1}
                  placeholder="e.g. Completed all 3 workouts and woke up at 7am"
                  onChange={(e) => setRev({ ...rev, q1: e.target.value })}
                />
              </Field>
              <Field label="2. Where did you struggle, and what triggered it?">
                <input
                  type="text"
                  value={rev.q2}
                  placeholder="e.g. Late night boredom on Thursday"
                  onChange={(e) => setRev({ ...rev, q2: e.target.value })}
                />
              </Field>
              <Field label="3. ONE priority action for next week">
                <input
                  type="text"
                  value={rev.q3}
                  placeholder="e.g. Charge phone in the living room every single night"
                  onChange={(e) => setRev({ ...rev, q3: e.target.value })}
                />
              </Field>
              <Button kind="primary" onClick={handleSaveReview}>
                Save weekly review
              </Button>
            </div>
          </Card>

          <Card>
            <div className="eyebrow">PAST REVIEWS</div>
            <h2>Weekly history</h2>
            {weeklyReviews.length === 0 ? (
              <Empty
                icon="▤"
                title="No weekly reviews yet"
                description="Spend 3 minutes every Sunday reviewing your week."
              />
            ) : (
              <div className="stack-col" style={{ marginTop: 12 }}>
                {weeklyReviews.map((w, i) => (
                  <div key={i} className="routine-step-box">
                    <strong>
                      Week {w.week} · {fmtDate(w.date)}
                    </strong>
                    <p>
                      <strong>Win:</strong> {w.q1}
                    </p>
                    <p>
                      <strong>Trigger:</strong> {w.q2}
                    </p>
                    <p>
                      <strong>Next Focus:</strong> {w.q3}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </>
  );
}

export { GoalsAndRoadmapPage };
