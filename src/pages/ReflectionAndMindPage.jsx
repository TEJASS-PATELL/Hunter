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

function ReflectionAndMindPage({
  data,
  setData,
  today,
  onJournal,
  onEditJournal,
  onDelete,
  onMood,
  notify,
}) {
  const [subTab, setSubTab] = useState("insights"); // insights | ladder | cbt | screening
  const [range, setRange] = useState(14);
  const [thoughtInput, setThoughtInput] = useState({
    situation: "",
    thought: "",
    intensity: 7,
    balanced: "",
  });
  const [activeScreen, setActiveScreen] = useState("phq9");
  const [phqAnswers, setPhqAnswers] = useState(Array(9).fill(0));
  const [gadAnswers, setGadAnswers] = useState(Array(7).fill(0));

  const moods = [...(data.moods || [])].sort((a, b) => a.date.localeCompare(b.date));
  const recent = moods.filter(
    (m) => dayDiff(m.date, today) >= 0 && dayDiff(m.date, today) < range
  );
  const average = recent.length
    ? (recent.reduce((s, m) => s + Number(m.score), 0) / recent.length).toFixed(1)
    : "—";

  const moodChartData = useMemo(() => {
    return Array.from({ length: range }, (_, i) => {
      const iso = addDaysISO(today, -(range - 1 - i));
      const m = moods.find((x) => x.date === iso);
      const dObj = data.days && data.days[iso];
      return {
        key: iso,
        label: new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, {
          weekday: "narrow",
        }),
        fullLabel: fmtDate(iso),
        value: m ? Number(m.score) : dObj?.mood || 0,
      };
    });
  }, [range, today, moods, data.days]);

  const ladder = data.ladder || {};
  const handleLadderToggle = (stepId, done) => {
    setData((old) => ({
      ...old,
      ladder: {
        ...(old.ladder || {}),
        [stepId]: { ...((old.ladder || {})[stepId] || {}), done },
      },
    }));
  };

  const handleSaveThought = () => {
    if (!thoughtInput.thought.trim()) return;
    const entry = { id: uid(), date: today, ...thoughtInput };
    setData((old) => ({ ...old, thoughts: [entry, ...(old.thoughts || [])] }));
    setThoughtInput({ situation: "", thought: "", intensity: 7, balanced: "" });
    notify("CBT thought record saved");
  };

  const handleSaveScreening = () => {
    const isPhq = activeScreen === "phq9";
    const arr = isPhq ? phqAnswers : gadAnswers;
    const total = arr.reduce((a, b) => a + b, 0);
    const band =
      total >= 15 ? "Severe" : total >= 10 ? "Moderate" : total >= 5 ? "Mild" : "Minimal";
    const entry = {
      id: uid(),
      date: today,
      type: isPhq ? "PHQ-9" : "GAD-7",
      total,
      band,
    };
    setData((old) => ({
      ...old,
      mentalCheckins: [entry, ...(old.mentalCheckins || [])],
    }));
    notify(`${entry.type} saved (${total} - ${band})`);
  };

  return (
    <>
      <Heading
        eyebrow="LOOK BACK WITH KINDNESS"
        title="Reflection, mood & social confidence"
        description="Mood analytics, private journal, 10-step social exposure ladder, and CBT thought tools."
        action={
          <div className="heading-btn-group">
            <Button onClick={onMood}>♡ Mood check-in</Button>
            <Button kind="primary" onClick={onJournal}>
              ＋ Write reflection
            </Button>
          </div>
        }
      />

      <div className="tabs large-tabs">
        {[
          ["insights", "Mood Charts & Journal"],
          ["ladder", "Social Confidence Ladder (10 Steps)"],
          ["cbt", "CBT Thought Record"],
          ["screening", "PHQ-9 & GAD-7 Check"],
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

      {subTab === "insights" && (
        <>
          <div className="insight-grid">
            <Card className="mood-chart-card">
              <div className="section-head">
                <div>
                  <div className="eyebrow">EMOTIONAL WEATHER</div>
                  <h2>Mood over time (Modern spline chart)</h2>
                </div>
                <select
                  className="compact-select"
                  value={range}
                  onChange={(e) => setRange(Number(e.target.value))}
                >
                  <option value="7">7 days</option>
                  <option value="14">14 days</option>
                  <option value="30">30 days</option>
                </select>
              </div>
              <div className="mood-average">
                <strong>
                  {average}
                  <small>/5</small>
                </strong>
                <span>Average mood across {range} days</span>
              </div>
              <ModernAreaChart
                data={moodChartData}
                maxVal={5}
                unit="/5"
                color="#766694"
                height={180}
              />
            </Card>

            <Card className="completion-card">
              <div className="eyebrow">SHOWING UP</div>
              <h2>Habit completion rate</h2>
              <p>Completed check-ins across your saved history.</p>
              <div className="big-number">
                {percent(
                  (data.checkins || []).filter((c) => c.done).length,
                  (data.checkins || []).length
                )}
                <small>%</small>
              </div>
              <Progress
                value={percent(
                  (data.checkins || []).filter((c) => c.done).length,
                  (data.checkins || []).length
                )}
              />
              <div className="completion-stats">
                <div>
                  <strong>{(data.checkins || []).filter((c) => c.done).length}</strong>
                  <span>Completed</span>
                </div>
                <div>
                  <strong>{(data.journals || []).length}</strong>
                  <span>Journal entries</span>
                </div>
              </div>
            </Card>
          </div>

          <Card className="journal-card">
            <div className="section-head">
              <div>
                <div className="eyebrow">YOUR WORDS, YOUR SPACE</div>
                <h2>Journal history</h2>
              </div>
              <Button onClick={onJournal}>＋ New entry</Button>
            </div>
            {(data.journals || []).length ? (
              [...data.journals]
                .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
                .map((j) => (
                  <article className="journal-entry" key={j.id}>
                    <div className="journal-date">{fmtDate(j.date)}</div>
                    <div className="journal-entry-body">
                      <h3>{j.title}</h3>
                      <p>{j.content}</p>
                      {j.gratitude && (
                        <div className="gratitude">
                          <span>♡</span> {j.gratitude}
                        </div>
                      )}
                    </div>
                    <div className="row-actions">
                      <button type="button" onClick={() => onEditJournal(j)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="danger-text"
                        onClick={() => onDelete("journals", j.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))
            ) : (
              <Empty
                icon="▤"
                title="Your story, in your own words"
                description="Start with a few lines about what felt important today."
                action={
                  <Button kind="primary" onClick={onJournal}>
                    ＋ Write your first reflection
                  </Button>
                }
              />
            )}
          </Card>
        </>
      )}

      {subTab === "ladder" && (
        <Card>
          <div className="eyebrow">GRADUAL SOCIAL EXPOSURE</div>
          <h2>10-Step social confidence ladder</h2>
          <p>Repetition beats social anxiety. Practice one small step at a time.</p>
          <div className="habit-list" style={{ marginTop: 14 }}>
            {EXPOSURE_LADDER.map((item) => {
              const done = Boolean(ladder[item.id]?.done);
              return (
                <div className={`habit-row ${done ? "checked" : ""}`} key={item.id}>
                  <button
                    type="button"
                    className="check-circle"
                    onClick={() => handleLadderToggle(item.id, !done)}
                  >
                    {done ? "✓" : ""}
                  </button>
                  <div className="habit-info">
                    <strong>
                      Step {item.step}: {item.title}
                    </strong>
                    <small>{item.desc}</small>
                  </div>
                  <span className={`status-pill ${done ? "complete" : ""}`}>
                    {done ? "Completed" : "Practice"}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {subTab === "cbt" && (
        <div className="dashboard-grid">
          <Card>
            <div className="eyebrow">COGNITIVE RESTRUCTURING</div>
            <h2>Reframe automatic negative thoughts</h2>
            <div className="stack-col" style={{ marginTop: 14 }}>
              <Field label="Situation (What happened?)">
                <input
                  type="text"
                  value={thoughtInput.situation}
                  placeholder="e.g. Walked into the gym"
                  onChange={(e) =>
                    setThoughtInput({ ...thoughtInput, situation: e.target.value })
                  }
                />
              </Field>
              <Field label="Automatic negative thought">
                <input
                  type="text"
                  value={thoughtInput.thought}
                  placeholder="e.g. Everyone is judging how skinny I am"
                  onChange={(e) =>
                    setThoughtInput({ ...thoughtInput, thought: e.target.value })
                  }
                />
              </Field>
              <Field label="Balanced, realistic truth">
                <input
                  type="text"
                  value={thoughtInput.balanced}
                  placeholder="e.g. Everyone is focused on their own workout; showing up builds my frame"
                  onChange={(e) =>
                    setThoughtInput({ ...thoughtInput, balanced: e.target.value })
                  }
                />
              </Field>
              <Button kind="primary" onClick={handleSaveThought}>
                Save thought record
              </Button>
            </div>
          </Card>

          <Card>
            <div className="eyebrow">SAVED THOUGHT RECORDS</div>
            <h2>Your balanced truths</h2>
            {(data.thoughts || []).length === 0 ? (
              <Empty
                icon="▤"
                title="No thought records yet"
                description="Write down anxious thoughts to separate facts from fear."
              />
            ) : (
              <div className="stack-col" style={{ marginTop: 12 }}>
                {(data.thoughts || []).map((t) => (
                  <div key={t.id} className="routine-step-box">
                    <small className="eyebrow">{fmtDate(t.date)}</small>
                    <p>
                      <strong>Thought:</strong> {t.thought}
                    </p>
                    <p>
                      <strong>Balanced Truth:</strong> {t.balanced}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {subTab === "screening" && (
        <Card>
          <div className="section-head">
            <div>
              <div className="eyebrow">BIWEEKLY SELF-CHECK (NOT A MEDICAL DIAGNOSIS)</div>
              <h2>{activeScreen === "phq9" ? "PHQ-9 Mood Check" : "GAD-7 Anxiety Check"}</h2>
            </div>
            <div className="tabs">
              <button
                type="button"
                className={activeScreen === "phq9" ? "selected" : ""}
                onClick={() => setActiveScreen("phq9")}
              >
                PHQ-9
              </button>
              <button
                type="button"
                className={activeScreen === "gad7" ? "selected" : ""}
                onClick={() => setActiveScreen("gad7")}
              >
                GAD-7
              </button>
            </div>
          </div>
          <div className="stack-col">
            {(activeScreen === "phq9" ? PHQ9_QUESTIONS : GAD7_QUESTIONS).map((q, idx) => {
              const arr = activeScreen === "phq9" ? phqAnswers : gadAnswers;
              return (
                <div key={idx} className="audit-q-box">
                  <strong>{q}</strong>
                  <div className="category-pills" style={{ marginTop: 8 }}>
                    {[
                      [0, "Not at all (0)"],
                      [1, "Several days (1)"],
                      [2, "More than half (2)"],
                      [3, "Nearly every day (3)"],
                    ].map(([val, lbl]) => (
                      <button
                        type="button"
                        key={val}
                        className={arr[idx] === val ? "selected" : ""}
                        onClick={() => {
                          const next = [...arr];
                          next[idx] = val;
                          if (activeScreen === "phq9") setPhqAnswers(next);
                          else setGadAnswers(next);
                        }}
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            <Button kind="primary" onClick={handleSaveScreening}>
              Save check-in score
            </Button>
          </div>
        </Card>
      )}
    </>
  );
}

export { ReflectionAndMindPage };
