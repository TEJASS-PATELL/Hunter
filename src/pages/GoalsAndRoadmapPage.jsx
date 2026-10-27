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
  const [showArchivedGoals, setShowArchivedGoals] = useState(false);
  const [rev, setRev] = useState({ q1: "", q2: "", q3: "" });

  const today = todayISO();
  const allGoals = data.goals || [];
  const goals = allGoals.filter((g) => !!g.archived === showArchivedGoals);
  const weeklyReviews = data.weeklyReviews || [];
  const roadmapProgress = data.roadmapProgress || {};

  const handleSaveReview = () => {
    if (!rev.q1.trim() && !rev.q3.trim()) return;
    const entry = {
      id: `rev-${uid()}`,
      week: weeklyReviews.length + 1,
      date: today,
      ...rev,
    };
    setData((old) => ({
      ...old,
      weeklyReviews: [entry, ...(old.weeklyReviews || [])],
    }));
    setRev({ q1: "", q2: "", q3: "" });
    notify("Sunday weekly review saved");
  };

  const handleDeleteReview = (id) => {
    setData((old) => ({
      ...old,
      weeklyReviews: (old.weeklyReviews || []).filter((r) => r.id !== id),
    }));
    notify("Weekly review deleted");
  };

  const toggleRoadmapTask = (phaseId, taskIdx) => {
    const key = `${phaseId}-${taskIdx}`;
    setData((old) => ({
      ...old,
      roadmapProgress: {
        ...(old.roadmapProgress || {}),
        [key]: !((old.roadmapProgress || {})[key]),
      },
    }));
  };

  /* Automated Weekly KPI Snapshot for Sunday Review */
  const weeklySnapshot = useMemo(() => {
    const daysMap = data.days || {};
    let totalScore7d = 0;
    let workouts7d = 0;
    let cleanDays7d = 0;

    for (let i = 0; i < 7; i += 1) {
      const iso = addDaysISO(today, -i);
      const d = daysMap[iso];
      if (d) {
        totalScore7d += calcDailyScore(d, data.profile);
        if (d.c?.workout) workouts7d += 1;
        if (d.c?.noPorn && !d.slip) cleanDays7d += 1;
      }
    }

    return {
      avgScore: Math.round(totalScore7d / 7),
      workouts: workouts7d,
      cleanDays: cleanDays7d,
    };
  }, [data.days, data.profile, today]);

  return (
    <>
      <Heading
        eyebrow="DIRECTION, NOT PRESSURE"
        title="Goals & 90-day roadmap"
        description="Turn what matters to you into milestones, phased 90-day checkpoints with interactive task tracking, and Sunday weekly reviews."
        action={
          <div className="heading-btn-group">
            <Button kind="primary" onClick={onAdd}>
              ＋ Create goal
            </Button>
          </div>
        }
      />

      <div className="tabs large-tabs">
        <button
          type="button"
          className={subTab === "goals" ? "selected" : ""}
          onClick={() => setSubTab("goals")}
        >
          Personal Goals &amp; Milestones <span>{goals.length}</span>
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
              <span>{allGoals.filter((g) => !g.archived).length}</span>
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

          <div className="toolbar" style={{ marginBottom: 16 }}>
            <div className="tabs">
              <button
                type="button"
                className={!showArchivedGoals ? "selected" : ""}
                onClick={() => setShowArchivedGoals(false)}
              >
                Active Goals ({allGoals.filter((g) => !g.archived).length})
              </button>
              <button
                type="button"
                className={showArchivedGoals ? "selected" : ""}
                onClick={() => setShowArchivedGoals(true)}
              >
                Archived ({allGoals.filter((g) => g.archived).length})
              </button>
            </div>
          </div>

          <div className="record-grid goal-grid">
            {goals.map((g) => {
              const ms = (data.milestones || []).filter(
                (m) => m.goalId === g.id
              );
              const latest = (data.measurements || [])
                .filter((m) => m.goalId === g.id)
                .sort((a, b) => (b.date || "").localeCompare(a.date || ""))[0];

              const currentVal = Number(latest?.value || g.progress || 0);
              const targetVal = Number(g.target || 100);
              const pct = g.target ? percent(currentVal, targetVal) : g.progress || 0;

              /* Velocity / Required Daily Pace */
              let paceText = "";
              if (g.due && targetVal > 0) {
                const daysRemaining = dayDiff(today, g.due);
                const unitsLeft = targetVal - currentVal;
                if (daysRemaining > 0 && unitsLeft > 0) {
                  const dailyPace = (unitsLeft / daysRemaining).toFixed(1);
                  paceText = `Pace needed: ~${dailyPace} ${
                    g.unit || "units"
                  }/day (${daysRemaining}d left)`;
                } else if (daysRemaining <= 0) {
                  paceText = "Target date reached";
                }
              }

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
                    {g.archived
                      ? "ARCHIVED"
                      : `IN PROGRESS${
                          g.due
                            ? ` · DUE ${fmtDate(g.due).toUpperCase()}`
                            : ""
                        }`}
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
                      {paceText && (
                        <small className="muted-text" style={{ marginTop: 4 }}>
                          {paceText}
                        </small>
                      )}
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
                        <span className={m.done ? "struck" : ""}>
                          {m.title}
                        </span>
                        {m.due && <small>{fmtDate(m.due)}</small>}
                      </label>
                    ))
                  ) : (
                    <p className="muted-text milestone-empty">
                      Add meaningful steps to break this goal down.
                    </p>
                  )}

                  <div className="record-actions">
                    {!g.archived && (
                      <>
                        <Button kind="primary" onClick={() => onMilestone(g)}>
                          ＋ Milestone
                        </Button>
                        <Button onClick={() => onMeasure(g)}>Log progress</Button>
                      </>
                    )}
                    <Button onClick={() => onEdit(g)}>Edit</Button>
                    <Button
                      onClick={() =>
                        onDelete(
                          "goals",
                          g.id,
                          g.archived ? "restore" : "archive"
                        )
                      }
                    >
                      {g.archived ? "Restore" : "Archive"}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>

          {!goals.length && (
            <Empty
              icon="⚑"
              title={
                showArchivedGoals ? "No archived goals" : "No active goals yet"
              }
              description="Define what you want to achieve over the next 90 days."
              action={
                !showArchivedGoals && (
                  <Button kind="primary" onClick={onAdd}>
                    ＋ Create your first goal
                  </Button>
                )
              }
            />
          )}
        </>
      )}

      {subTab === "roadmap" && (
        <div className="stack-col">
          {ROADMAP_PHASES.map((ph) => {
            const completedCount = ph.tasks.filter((_, tIdx) =>
              Boolean(roadmapProgress[`${ph.id}-${tIdx}`])
            ).length;
            const pct = percent(completedCount, ph.tasks.length);

            return (
              <Card key={ph.id}>
                <div className="section-head">
                  <div>
                    <div className="eyebrow">{ph.days.toUpperCase()}</div>
                    <h2>{ph.title}</h2>
                    <p>{ph.focus}</p>
                  </div>
                  <span className="status-pill complete">
                    {completedCount}/{ph.tasks.length} Done ({pct}%)
                  </span>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <Progress value={pct} />
                </div>

                <div className="habit-list">
                  {ph.tasks.map((t, i) => {
                    const taskKey = `${ph.id}-${i}`;
                    const checked = Boolean(roadmapProgress[taskKey]);
                    return (
                      <div
                        key={i}
                        className={`habit-row ${checked ? "checked" : ""}`}
                      >
                        <button
                          type="button"
                          className="check-circle"
                          onClick={() => toggleRoadmapTask(ph.id, i)}
                        >
                          {checked ? "✓" : ""}
                        </button>
                        <div className="habit-info">
                          <strong>{t}</strong>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {subTab === "review" && (
        <div className="dashboard-grid">
          <Card>
            <div className="eyebrow">SUNDAY ACCOUNTABILITY &amp; KPI SNAPSHOT</div>
            <h2>Write this week&apos;s review</h2>

            {/* Automated Weekly Snapshot Box */}
            <div
              className="mini-stat-row"
              style={{ marginTop: 12, marginBottom: 16 }}
            >
              <div>
                <span className="mini-stat-number">
                  {weeklySnapshot.avgScore}/100
                </span>
                <span>7-Day Avg Score</span>
              </div>
              <div>
                <span className="mini-stat-number">
                  {weeklySnapshot.workouts}/3
                </span>
                <span>Workouts Done</span>
              </div>
              <div>
                <span className="mini-stat-number">
                  {weeklySnapshot.cleanDays}/7
                </span>
                <span>Clean Core Days</span>
              </div>
            </div>

            <div className="stack-col">
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
            <h2>Weekly history ({weeklyReviews.length})</h2>
            {weeklyReviews.length === 0 ? (
              <Empty
                icon="▤"
                title="No weekly reviews yet"
                description="Spend 3 minutes every Sunday reviewing your week."
              />
            ) : (
              <div className="stack-col" style={{ marginTop: 12 }}>
                {weeklyReviews.map((w) => (
                  <div key={w.id || w.week} className="routine-step-box">
                    <div className="row-between">
                      <strong>
                        Week {w.week} · {fmtDate(w.date)}
                      </strong>
                      <button
                        type="button"
                        className="danger-text"
                        onClick={() => handleDeleteReview(w.id)}
                      >
                        Delete
                      </button>
                    </div>
                    {w.q1 && (
                      <p>
                        <strong>Win:</strong> {w.q1}
                      </p>
                    )}
                    {w.q2 && (
                      <p>
                        <strong>Trigger:</strong> {w.q2}
                      </p>
                    )}
                    {w.q3 && (
                      <p>
                        <strong>Next Focus:</strong> {w.q3}
                      </p>
                    )}
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