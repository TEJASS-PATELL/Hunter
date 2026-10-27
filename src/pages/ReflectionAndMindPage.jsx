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

const COGNITIVE_DISTORTIONS = [
  {
    id: "spotlight",
    label: "Spotlight Effect",
    desc: "Thinking everyone is watching and judging your flaws.",
  },
  {
    id: "mind_reading",
    label: "Mind Reading",
    desc: "Assuming you know what others think negatively about you without evidence.",
  },
  {
    id: "all_or_nothing",
    label: "All-or-Nothing Thinking",
    desc: "Believing one slip or missed workout ruins the entire 90-day streak.",
  },
  {
    id: "catastrophizing",
    label: "Catastrophizing",
    desc: "Expecting the worst-case disaster from an ordinary situation.",
  },
  {
    id: "comparison",
    label: "Comparison Trap",
    desc: "Comparing your real day-1 body/life to edited social media highlights.",
  },
  {
    id: "labeling",
    label: "Harsh Self-Labeling",
    desc: "Calling yourself a 'loser' or 'failure' instead of noting a specific habit gap.",
  },
];

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
  const [journalSearch, setJournalSearch] = useState("");
  const [onlyGratitude, setOnlyGratitude] = useState(false);

  const [thoughtInput, setThoughtInput] = useState({
    situation: "",
    thought: "",
    distortion: "spotlight",
    intensity: 7,
    afterIntensity: 3,
    balanced: "",
  });

  const [activeScreen, setActiveScreen] = useState("phq9");
  const [phqAnswers, setPhqAnswers] = useState(Array(9).fill(0));
  const [gadAnswers, setGadAnswers] = useState(Array(7).fill(0));

  const moods = useMemo(
    () => [...(data.moods || [])].sort((a, b) => a.date.localeCompare(b.date)),
    [data.moods]
  );

  const recent = useMemo(
    () =>
      moods.filter(
        (m) => dayDiff(m.date, today) >= 0 && dayDiff(m.date, today) < range
      ),
    [moods, today, range]
  );

  const average = recent.length
    ? (
        recent.reduce((s, m) => s + Number(m.score || 0), 0) / recent.length
      ).toFixed(1)
    : "—";

  const avgEnergy = recent.length
    ? (
        recent.reduce((s, m) => s + Number(m.energy || 3), 0) / recent.length
      ).toFixed(1)
    : "—";

  const avgStress = recent.length
    ? (
        recent.reduce((s, m) => s + Number(m.stress || 3), 0) / recent.length
      ).toFixed(1)
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

  const energyChartData = useMemo(() => {
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
        value: m ? Number(m.energy || 3) : dObj?.energy || 0,
      };
    });
  }, [range, today, moods, data.days]);

  /* Filtered Journals */
  const filteredJournals = useMemo(() => {
    const q = journalSearch.trim().toLowerCase();
    return [...(data.journals || [])]
      .filter((j) => {
        if (onlyGratitude && !j.gratitude) return false;
        if (!q) return true;
        return (
          (j.title || "").toLowerCase().includes(q) ||
          (j.content || "").toLowerCase().includes(q) ||
          (j.gratitude || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [data.journals, journalSearch, onlyGratitude]);

  /* Social Exposure Ladder Handlers */
  const ladder = data.ladder || {};
  const completedLadderCount = EXPOSURE_LADDER.filter((item) =>
    Boolean(ladder[item.id]?.done)
  ).length;
  const totalLadderReps = EXPOSURE_LADDER.reduce(
    (sum, item) => sum + safeNum(ladder[item.id]?.reps, 0),
    0
  );

  const handleLadderToggle = (stepId, done) => {
    setData((old) => {
      const prevStep = (old.ladder || {})[stepId] || {};
      const nextReps =
        done && !prevStep.reps ? 1 : safeNum(prevStep.reps, 0);
      return {
        ...old,
        ladder: {
          ...(old.ladder || {}),
          [stepId]: { ...prevStep, done, reps: nextReps, lastDate: today },
        },
      };
    });
  };

  const handleLadderRepDelta = (stepId, delta) => {
    setData((old) => {
      const prevStep = (old.ladder || {})[stepId] || {};
      const nextReps = Math.max(0, safeNum(prevStep.reps, 0) + delta);
      return {
        ...old,
        ladder: {
          ...(old.ladder || {}),
          [stepId]: {
            ...prevStep,
            reps: nextReps,
            done: nextReps > 0 ? true : prevStep.done,
            lastDate: today,
          },
        },
      };
    });
  };

  const handleLadderNoteChange = (stepId, note) => {
    setData((old) => ({
      ...old,
      ladder: {
        ...(old.ladder || {}),
        [stepId]: { ...((old.ladder || {})[stepId] || {}), note },
      },
    }));
  };

  /* CBT Thought Record Handlers */
  const handleSaveThought = () => {
    if (!thoughtInput.thought.trim()) return;
    const entry = {
      id: uid(),
      date: today,
      ...thoughtInput,
      intensity: safeNum(thoughtInput.intensity, 7),
      afterIntensity: safeNum(thoughtInput.afterIntensity, 3),
    };
    setData((old) => ({ ...old, thoughts: [entry, ...(old.thoughts || [])] }));
    setThoughtInput({
      situation: "",
      thought: "",
      distortion: "spotlight",
      intensity: 7,
      afterIntensity: 3,
      balanced: "",
    });
    notify("CBT thought record saved");
  };

  const handleDeleteThought = (id) => {
    setData((old) => ({
      ...old,
      thoughts: (old.thoughts || []).filter((t) => t.id !== id),
    }));
    notify("Thought record deleted");
  };

  /* PHQ-9 & GAD-7 Screening Handlers */
  const currentScreenArr = activeScreen === "phq9" ? phqAnswers : gadAnswers;
  const currentScreenTotal = currentScreenArr.reduce((a, b) => a + b, 0);
  const currentScreenMax = activeScreen === "phq9" ? 27 : 21;
  const currentScreenBand =
    currentScreenTotal >= 15
      ? "Severe"
      : currentScreenTotal >= 10
      ? "Moderate"
      : currentScreenTotal >= 5
      ? "Mild"
      : "Minimal";

  const handleSaveScreening = () => {
    const isPhq = activeScreen === "phq9";
    const arr = isPhq ? phqAnswers : gadAnswers;
    const total = arr.reduce((a, b) => a + b, 0);
    const band =
      total >= 15
        ? "Severe"
        : total >= 10
        ? "Moderate"
        : total >= 5
        ? "Mild"
        : "Minimal";
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

  const handleDeleteScreening = (id) => {
    setData((old) => ({
      ...old,
      mentalCheckins: (old.mentalCheckins || []).filter((x) => x.id !== id),
    }));
  };

  return (
    <>
      <Heading
        eyebrow="LOOK BACK WITH KINDNESS"
        title="Reflection, mood & social confidence"
        description="Mood & energy analytics, searchable private journal, 10-step social exposure ladder, CBT cognitive restructuring, and PHQ-9/GAD-7 tracking."
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
          [
            "ladder",
            `Social Confidence Ladder (${completedLadderCount}/10)`,
          ],
          ["cbt", `CBT Thought Record (${(data.thoughts || []).length})`],
          [
            "screening",
            `PHQ-9 & GAD-7 Check (${(data.mentalCheckins || []).length})`,
          ],
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
          TAB 1: MOOD CHARTS & SEARCHABLE JOURNAL
          ===================================================================== */}
      {subTab === "insights" && (
        <>
          <div className="stats-grid" style={{ marginBottom: 16 }}>
            <Stat
              icon="♡"
              label={`Avg Mood (${range}d)`}
              value={`${average}/5`}
              detail={`${recent.length} mood check-ins in range`}
              color="lavender"
            />
            <Stat
              icon="⚡"
              label={`Avg Energy (${range}d)`}
              value={`${avgEnergy}/5`}
              detail="Dashed copper line on chart"
              color="peach"
            />
            <Stat
              icon="◌"
              label={`Avg Stress (${range}d)`}
              value={`${avgStress}/5`}
              detail="Lower is calmer"
              color="blue"
            />
            <Stat
              icon="▤"
              label="Total Reflections"
              value={(data.journals || []).length}
              detail="Saved privately on device"
              color="sage"
            />
          </div>

          <div className="insight-grid">
            <Card className="mood-chart-card">
              <div className="section-head">
                <div>
                  <div className="eyebrow">EMOTIONAL WEATHER &amp; VITALITY</div>
                  <h2>Mood &amp; energy over time (Dual spline chart)</h2>
                  <p>
                    Solid purple tracks Mood (/5); dashed copper tracks Energy
                    (/5).
                  </p>
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
                <span>
                  Average mood across {range} days · Energy avg: {avgEnergy}/5
                </span>
              </div>
              <ModernAreaChart
                data={moodChartData}
                maxVal={5}
                unit="/5"
                color="#766694"
                secondaryData={energyChartData}
                secondaryUnit="/5 energy"
                secondaryColor="#c89572"
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
                  <strong>
                    {(data.checkins || []).filter((c) => c.done).length}
                  </strong>
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
              <div className="heading-btn-group">
                <input
                  type="search"
                  className="clean-input"
                  placeholder="Search journal entries..."
                  value={journalSearch}
                  onChange={(e) => setJournalSearch(e.target.value)}
                />
                <Button
                  kind={onlyGratitude ? "primary" : "secondary"}
                  onClick={() => setOnlyGratitude((v) => !v)}
                >
                  ♡ Gratitude only
                </Button>
                <Button kind="primary" onClick={onJournal}>
                  ＋ New entry
                </Button>
              </div>
            </div>

            {filteredJournals.length ? (
              filteredJournals.map((j) => (
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
                title={
                  journalSearch || onlyGratitude
                    ? "No matching journal entries"
                    : "Your story, in your own words"
                }
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

      {/* =====================================================================
          TAB 2: 10-STEP SOCIAL CONFIDENCE LADDER (WITH REP COUNTER & NOTES)
          ===================================================================== */}
      {subTab === "ladder" && (
        <div className="stack-col">
          <Card>
            <div className="section-head">
              <div>
                <div className="eyebrow">GRADUAL SOCIAL EXPOSURE</div>
                <h2>10-Step social confidence ladder</h2>
                <p>
                  Repetition beats social anxiety. Practice one small step at a
                  time and log your real-world reps.
                </p>
              </div>
              <span className="status-pill complete">
                {completedLadderCount}/10 Steps · {totalLadderReps} Total Reps
              </span>
            </div>

            <div style={{ marginTop: 10, marginBottom: 16 }}>
              <Progress value={percent(completedLadderCount, 10)} />
            </div>

            <div className="habit-list" style={{ marginTop: 14 }}>
              {EXPOSURE_LADDER.map((item) => {
                const stepObj = ladder[item.id] || {};
                const done = Boolean(stepObj.done);
                const reps = safeNum(stepObj.reps, 0);

                return (
                  <div
                    className={`habit-row ${done ? "checked" : ""}`}
                    key={item.id}
                    style={{ alignItems: "flex-start" }}
                  >
                    <button
                      type="button"
                      className="check-circle"
                      onClick={() => handleLadderToggle(item.id, !done)}
                    >
                      {done ? "✓" : ""}
                    </button>

                    <div className="habit-info" style={{ flex: 1 }}>
                      <strong>
                        Step {item.step}: {item.title}
                      </strong>
                      <small>{item.desc}</small>
                      <input
                        type="text"
                        className="clean-input"
                        style={{ marginTop: 8, fontSize: "0.85rem" }}
                        placeholder="Quick note: How did it feel when you tried this?"
                        value={stepObj.note || ""}
                        onChange={(e) =>
                          handleLadderNoteChange(item.id, e.target.value)
                        }
                      />
                    </div>

                    <div className="heading-btn-group">
                      <Button
                        onClick={() => handleLadderRepDelta(item.id, -1)}
                        disabled={reps <= 0}
                      >
                        −
                      </Button>
                      <span
                        className={`status-pill ${done ? "complete" : ""}`}
                      >
                        {reps} reps
                      </span>
                      <Button
                        kind="primary"
                        onClick={() => handleLadderRepDelta(item.id, 1)}
                      >
                        ＋1 Rep
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* =====================================================================
          TAB 3: CBT THOUGHT RECORD & COGNITIVE DISTORTION DETECTOR
          ===================================================================== */}
      {subTab === "cbt" && (
        <div className="dashboard-grid">
          <Card>
            <div className="eyebrow">COGNITIVE RESTRUCTURING</div>
            <h2>Reframe automatic negative thoughts</h2>
            <div className="stack-col" style={{ marginTop: 14 }}>
              <Field label="1. Situation (What happened?)">
                <input
                  type="text"
                  value={thoughtInput.situation}
                  placeholder="e.g. Walked into the gym / Sat in class"
                  onChange={(e) =>
                    setThoughtInput({
                      ...thoughtInput,
                      situation: e.target.value,
                    })
                  }
                />
              </Field>

              <Field label="2. Automatic Negative Thought (ANT)">
                <input
                  type="text"
                  value={thoughtInput.thought}
                  placeholder="e.g. Everyone is judging how skinny I am"
                  onChange={(e) =>
                    setThoughtInput({
                      ...thoughtInput,
                      thought: e.target.value,
                    })
                  }
                />
              </Field>

              <Field
                label="3. Spot the Cognitive Trap (Distortion)"
                hint={
                  COGNITIVE_DISTORTIONS.find(
                    (d) => d.id === thoughtInput.distortion
                  )?.desc
                }
              >
                <select
                  value={thoughtInput.distortion}
                  onChange={(e) =>
                    setThoughtInput({
                      ...thoughtInput,
                      distortion: e.target.value,
                    })
                  }
                >
                  {COGNITIVE_DISTORTIONS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="form-grid">
                <Field
                  label={`Distress Before (1–10): ${thoughtInput.intensity}/10`}
                >
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={thoughtInput.intensity}
                    onChange={(e) =>
                      setThoughtInput({
                        ...thoughtInput,
                        intensity: Number(e.target.value),
                      })
                    }
                  />
                </Field>
                <Field
                  label={`Distress After Reframe (1–10): ${thoughtInput.afterIntensity}/10`}
                >
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={thoughtInput.afterIntensity}
                    onChange={(e) =>
                      setThoughtInput({
                        ...thoughtInput,
                        afterIntensity: Number(e.target.value),
                      })
                    }
                  />
                </Field>
              </div>

              <Field label="4. Balanced, Realistic Truth (Evidence-based)">
                <input
                  type="text"
                  value={thoughtInput.balanced}
                  placeholder="e.g. Everyone is focused on their own workout; showing up builds my frame"
                  onChange={(e) =>
                    setThoughtInput({
                      ...thoughtInput,
                      balanced: e.target.value,
                    })
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
                {(data.thoughts || []).map((t) => {
                  const distLabel =
                    COGNITIVE_DISTORTIONS.find((d) => d.id === t.distortion)
                      ?.label || "Cognitive Reframe";
                  return (
                    <div key={t.id} className="routine-step-box">
                      <div className="row-between">
                        <small className="eyebrow">
                          {fmtDate(t.date)} · {distLabel}
                        </small>
                        <div className="heading-btn-group">
                          <span className="status-pill complete">
                            Distress {t.intensity || 7}/10 →{" "}
                            {t.afterIntensity ?? "—"}/10
                          </span>
                          <button
                            type="button"
                            className="danger-text"
                            onClick={() => handleDeleteThought(t.id)}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                      {t.situation && (
                        <p>
                          <strong>Situation:</strong> {t.situation}
                        </p>
                      )}
                      <p>
                        <strong>Thought:</strong> {t.thought}
                      </p>
                      <p>
                        <strong>Balanced Truth:</strong> {t.balanced}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* =====================================================================
          TAB 4: PHQ-9 & GAD-7 SELF-CHECK + LONGITUDINAL HISTORY
          ===================================================================== */}
      {subTab === "screening" && (
        <div className="stack-col">
          <Card>
            <div className="section-head">
              <div>
                <div className="eyebrow">
                  BIWEEKLY SELF-CHECK (NOT A MEDICAL DIAGNOSIS)
                </div>
                <h2>
                  {activeScreen === "phq9"
                    ? "PHQ-9 Mood Check"
                    : "GAD-7 Anxiety Check"}
                </h2>
                <p>
                  Over the last 2 weeks, how often have you been bothered by any
                  of the following problems?
                </p>
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

            {/* Live Score Preview Bar */}
            <div
              className="mini-stat-row"
              style={{ marginTop: 12, marginBottom: 16 }}
            >
              <div>
                <span className="mini-stat-number">
                  {currentScreenTotal}/{currentScreenMax}
                </span>
                <span>Current Live Score</span>
              </div>
              <div>
                <span className="mini-stat-number">{currentScreenBand}</span>
                <span>Severity Band</span>
              </div>
              <div>
                <span className="mini-stat-number">
                  {(data.mentalCheckins || []).length}
                </span>
                <span>Saved Check-ins</span>
              </div>
            </div>

            {/* Crisis Safety Callout if PHQ-9 Question 9 > 0 */}
            {activeScreen === "phq9" && phqAnswers[8] > 0 && (
              <div className="intro-callout" style={{ marginBottom: 16 }}>
                <div className="callout-icon">♡</div>
                <div>
                  <strong>You matter, and confidential support is available right now</strong>
                  <p>
                    Please reach out to <strong>Tele-MANAS</strong> at{" "}
                    <strong>14416</strong> or <strong>1800-891-4416</strong>{" "}
                    (free, 24×7 in Hindi &amp; English) or talk to a trusted
                    family member or doctor today.
                  </p>
                </div>
              </div>
            )}

            <div className="stack-col">
              {(activeScreen === "phq9" ? PHQ9_QUESTIONS : GAD7_QUESTIONS).map(
                (q, idx) => {
                  const arr =
                    activeScreen === "phq9" ? phqAnswers : gadAnswers;
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
                }
              )}
              <div className="heading-btn-group">
                <Button kind="primary" onClick={handleSaveScreening}>
                  Save check-in score ({currentScreenTotal} ·{" "}
                  {currentScreenBand})
                </Button>
                <Button
                  onClick={() =>
                    activeScreen === "phq9"
                      ? setPhqAnswers(Array(9).fill(0))
                      : setGadAnswers(Array(7).fill(0))
                  }
                >
                  Reset answers
                </Button>
              </div>
            </div>
          </Card>

          {/* SAVED SCREENING HISTORY */}
          <Card>
            <div className="section-head">
              <div>
                <div className="eyebrow">LONGITUDINAL SELF-CHECK HISTORY</div>
                <h2>Past PHQ-9 &amp; GAD-7 scores</h2>
              </div>
            </div>

            {(data.mentalCheckins || []).length === 0 ? (
              <Empty
                icon="♡"
                title="No saved check-ins yet"
                description="Save a biweekly PHQ-9 or GAD-7 check above to track your progress over the 90 days."
              />
            ) : (
              <div className="habit-list" style={{ marginTop: 12 }}>
                {(data.mentalCheckins || []).map((mc) => (
                  <div className="habit-row checked" key={mc.id}>
                    <span className="status-pill complete">{mc.type}</span>
                    <div className="habit-info">
                      <strong>
                        Score: {mc.total} ({mc.band})
                      </strong>
                      <small>{fmtDate(mc.date)}</small>
                    </div>
                    <button
                      type="button"
                      className="danger-text"
                      onClick={() => handleDeleteScreening(mc.id)}
                    >
                      Delete
                    </button>
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

export { ReflectionAndMindPage };