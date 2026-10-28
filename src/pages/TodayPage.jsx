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

function TodayPage({
  data,
  setData,
  today,
  todayHabits,
  doneHabits,
  activeTasks,
  doneTasks,
  todayMood,
  activeGoals,
  todayDayObj,
  todayBreakdown,
  streaks,
  dm,
  updateDay,
  onHabit,
  onTask,
  onAddTask,
  onAddHabit,
  onMood,
  onNavigate,
  onOpenSOS,
  selectedISO,
  setSelectedISO,
}) {
  const [chartMetric, setChartMetric] = useState("score");
  const [checkTab, setCheckTab] = useState("comeback"); // comeback | custom | loops
  const [taskFilter, setTaskFilter] = useState("all"); // all | high
  const [quickTaskTitle, setQuickTaskTitle] = useState("");
  const [showInlinePomodoro, setShowInlinePomodoro] = useState(false);
  const [nowTimeStr, setNowTimeStr] = useState(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(
      d.getMinutes()
    ).padStart(2, "0")}`;
  });

  useEffect(() => {
    const id = window.setInterval(() => {
      const d = new Date();
      setNowTimeStr(
        `${String(d.getHours()).padStart(2, "0")}:${String(
          d.getMinutes()
        ).padStart(2, "0")}`
      );
    }, 60000);
    return () => window.clearInterval(id);
  }, []);

  const p = data.profile || {};
  const dayNumber = getDayIndex(p.startDate, today);
  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  })();
  const quote = QUOTES[(dayNumber - 1) % QUOTES.length];
  const currentWeekday = getWeekdayShort(today);
  const isRestDay = !(p.workoutDays || ["Mon", "Wed", "Fri"]).includes(
    currentWeekday
  );
  const todayWorkoutPlan =
    DAILY_HOME_WORKOUTS[currentWeekday] || DAILY_HOME_WORKOUTS.Mon;

  /* Current & Next Schedule Time-Block Detector */
  const scheduleBlocks = useMemo(() => {
    const list = data.schedule || DEFAULT_SCHEDULE;
    let activeIdx = 0;
    for (let i = 0; i < list.length; i += 1) {
      if ((list[i].time || "00:00") <= nowTimeStr) {
        activeIdx = i;
      }
    }
    return {
      current: list[activeIdx] || list[0],
      next: list[(activeIdx + 1) % list.length] || null,
    };
  }, [data.schedule, nowTimeStr]);

  /* Check Yesterday's Score for "Never Miss Twice" Alert */
  const yesterdayScore = useMemo(() => {
    const yISO = addDaysISO(today, -1);
    const yObj = data.days && data.days[yISO];
    return yObj ? calcDailyScore(yObj, p) : null;
  }, [data.days, p, today]);

  /* 14-Day Chart Series + 7-Day Average */
  const chartSeries = useMemo(() => {
    return Array.from({ length: 14 }, (_, idx) => {
      const iso = addDaysISO(today, -(13 - idx));
      const dObj = (data.days && data.days[iso]) || {};
      const moodEntry = (data.moods || []).find((m) => m.date === iso);
      let value = 0;
      if (chartMetric === "score") value = calcDailyScore(dObj, p);
      else if (chartMetric === "mood")
        value = Number(moodEntry?.score || dObj.mood || 0);
      else if (chartMetric === "sleep") value = Number(dObj.sleepH || 0);
      else if (chartMetric === "steps") value = Number(dObj.steps || 0);
      return {
        key: iso,
        label: getWeekdayShort(iso),
        fullLabel: fmtDate(iso),
        value,
      };
    });
  }, [data.days, data.moods, chartMetric, p, today]);

  const radarAxes = useMemo(() => {
    const habitPct = todayHabits.length
      ? percent(doneHabits, todayHabits.length)
      : 60;
    const sleepPct = Math.min(
      100,
      Math.round((safeNum(todayDayObj.sleepH, 7) / 8) * 100)
    );
    const bodyPct = Math.min(
      100,
      Math.round((todayBreakdown.fitnessBody / 32) * 100)
    );
    const cleanPct = Math.min(100, streaks.cleanLast30 * 4);
    const looksPct = todayDayObj.c?.skincare ? 90 : 45;
    const mindPct = todayMood ? Number(todayMood.score) * 20 : 65;
    return [
      { label: "Habits", value: habitPct },
      { label: "Body", value: bodyPct },
      { label: "Sleep", value: sleepPct },
      { label: "Clean", value: cleanPct },
      { label: "Looks", value: looksPct },
      { label: "Mind", value: mindPct },
    ];
  }, [
    todayHabits.length,
    doneHabits,
    todayDayObj,
    todayBreakdown,
    streaks.cleanLast30,
    todayMood,
  ]);

  const displayedScoredChecks = data.badDayMode
    ? SCORED_CHECKS.filter((item) => MINIMUM_DAY_IDS.includes(item.id))
    : SCORED_CHECKS;

  const activeControlLoops = useMemo(() => {
    const activeIds = data.settings?.activeLoops || [];
    return CONTROL_LOOPS.filter((l) => activeIds.includes(l.id));
  }, [data.settings?.activeLoops]);

  const toggleScoredCheck = (id, checked) => {
    updateDay(today, (prev) => ({
      ...prev,
      slip: id === "noPorn" && checked ? false : prev.slip,
      c: { ...(prev.c || {}), [id]: checked },
    }));
  };

  const toggleControlLoopToday = (loopId) => {
    updateDay(today, (prev) => {
      const cur = Boolean(prev.loops && prev.loops[loopId]);
      return {
        ...prev,
        loops: { ...(prev.loops || {}), [loopId]: !cur },
      };
    });
  };

  const lockThreeMinimumBasics = () => {
    updateDay(today, (prev) => {
      const nextC = { ...(prev.c || {}) };
      MINIMUM_DAY_IDS.forEach((id) => {
        nextC[id] = true;
      });
      return { ...prev, c: nextC };
    });
  };

  /* Quick Biometric Loggers on Today Dashboard */
  const targetSteps = p.targets?.steps || 8000;
  const targetWater = p.targets?.waterL || 3;
  const targetScreen = p.targets?.screenH || 3;

  const addStepsQuick = (delta) => {
    const next = Math.max(0, safeNum(todayDayObj.steps, 0) + delta);
    updateDay(today, (prev) => ({
      ...prev,
      steps: next,
      c: { ...(prev.c || {}), steps: next >= targetSteps },
    }));
  };

  const addWaterQuick = (deltaL) => {
    const next = +(safeNum(todayDayObj.waterL, 0) + deltaL).toFixed(2);
    updateDay(today, (prev) => ({
      ...prev,
      waterL: next,
      c: { ...(prev.c || {}), water: next >= targetWater },
    }));
  };

  const setSleepQuick = (hrs) => {
    updateDay(today, (prev) => ({
      ...prev,
      sleepH: hrs,
      c: {
        ...(prev.c || {}),
        wakeOnTime: hrs >= 7 || Boolean(prev.c?.wakeOnTime),
      },
    }));
  };

  /* Inline Quick Task Add */
  const handleQuickAddTask = (e) => {
    if (e) e.preventDefault();
    const clean = quickTaskTitle.trim();
    if (!clean) return;
    const newTask = {
      id: uid(),
      createdAt: Date.now(),
      title: clean,
      notes: "",
      due: today,
      priority: taskFilter === "high" ? "high" : "normal",
      done: false,
      archived: false,
    };
    setData((old) => ({
      ...old,
      tasks: [newTask, ...(old.tasks || [])],
    }));
    setQuickTaskTitle("");
  };

  const visibleTasks = useMemo(() => {
    const filtered =
      taskFilter === "high"
        ? activeTasks.filter((t) => t.priority === "high")
        : activeTasks;
    return filtered.slice(0, 6);
  }, [activeTasks, taskFilter]);

  const minDayDoneCount = MINIMUM_DAY_IDS.filter(
    (id) => todayDayObj.c && todayDayObj.c[id]
  ).length;

  return (
    <>
      <Heading
        eyebrow={`${new Date()
          .toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
          })
          .toUpperCase()} · DAY ${dayNumber} OF 90`}
        title={`${greeting}, ${p.name || "Bhai"}.`}
        description="A little structure. A little care. Your 90-day comeback, one day at a time."
        action={
          <div className="heading-btn-group">
            <Button
              onClick={() =>
                setData((old) => ({ ...old, badDayMode: !old.badDayMode }))
              }
            >
              {data.badDayMode
                ? "★ Bad Day Mode: ON"
                : "Low Energy / Bad Day Mode"}
            </Button>
            
            <Button kind="primary" onClick={onAddTask}>
              <span>＋</span> Add a task
            </Button>
          </div>
        }
      />

      <div className="hero-banner">
        <div className="hero-copy">
          <div className="hero-kicker">
            <span className="sparkle">✳</span> DAY {dayNumber} OF 90 · NEVER
            MISS TWICE
          </div>
          <h2>
            Become who you want to be,
            <br />
            <em>one day at a time.</em>
          </h2>
          <p>{dm(quote)}</p>
          <div className="hero-progress-wrap">
            <Progress value={percent(Math.min(dayNumber, 90), 90)} />
            <small>{Math.min(dayNumber, 90)}/90 days in current cycle</small>
          </div>
          <div className="hero-cta-row">
            <button
              type="button"
              className="hero-link"
              onClick={() => onNavigate("Reflection")}
            >
              Take a moment to reflect <span>↗</span>
            </button>
            <button
              type="button"
              className="hero-link"
              onClick={() => onNavigate("Quest")}
            >
              Open Comeback Quest <span>✦</span>
            </button>
            <button
              type="button"
              className="hero-link"
              onClick={() => setShowInlinePomodoro((v) => !v)}
            >
              {showInlinePomodoro
                ? "Hide 25m Focus Timer"
                : "Start 25m Deep Work"}{" "}
              <span>◈</span>
            </button>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="art-sun" />
          <div className="art-hill hill-back" />
          <div className="art-hill hill-front" />
          <div className="art-stem" />
          <div className="art-leaf leaf-a" />
          <div className="art-leaf leaf-b" />
          <div className="art-leaf leaf-c" />
          <div className="art-pot" />
        </div>
        <div className="hero-index">
          {String(dayNumber).padStart(2, "0")} <span>/ 90-DAY PRACTICE</span>
        </div>
      </div>

      {/* LIVE SCHEDULE ANCHOR & OPTIONAL INLINE 25M POMODORO */}
      <Card style={{ marginBottom: 18 }}>
        <div
          className="row-between"
          style={{ flexWrap: "wrap", gap: 12, alignItems: "center" }}
        >
          <div>
            <span className="eyebrow">
              LIVE SCHEDULE ANCHOR ({nowTimeStr}) · {todayWorkoutPlan.day.toUpperCase()}
            </span>
            <h3 style={{ margin: "4px 0" }}>
              Now ({scheduleBlocks.current?.time}):{" "}
              {scheduleBlocks.current?.label}
            </h3>
            {scheduleBlocks.next && (
              <small className="muted-text">
                Up Next ({scheduleBlocks.next.time}): {scheduleBlocks.next.label}{" "}
                · Today&apos;s Training: <strong>{todayWorkoutPlan.title}</strong>
              </small>
            )}
          </div>

          <div className="heading-btn-group">
            {minDayDoneCount < 3 && (
              <Button onClick={lockThreeMinimumBasics}>
                Lock 3 Minimum Basics ({minDayDoneCount}/3)
              </Button>
            )}
            <Button onClick={() => onNavigate("Lifestyle")}>
              Open Today&apos;s Workout
            </Button>
          </div>
        </div>

        {showInlinePomodoro && (
          <div
            style={{
              marginTop: 14,
              paddingTop: 14,
              borderTop: "1px solid var(--line)",
            }}
          >
            <CountdownTimer
              defaultSeconds={1500}
              label="Apna Kaam · 25-Minute Distraction-Free Sprint"
              onComplete={() => {
                setData((old) => ({
                  ...old,
                  focusSessions: [
                    {
                      id: uid(),
                      date: today,
                      task: "Dashboard 25m Sprint",
                      mins: 25,
                    },
                    ...(old.focusSessions || []),
                  ],
                }));
              }}
            />
          </div>
        )}
      </Card>

      {/* NEVER MISS TWICE RECOVERY CALLOUT (IF YESTERDAY WAS LOW) */}
      {yesterdayScore !== null &&
        yesterdayScore < 50 &&
        todayBreakdown.total < 50 && (
          <div className="intro-callout" style={{ marginBottom: 18 }}>
            <div className="callout-icon">↻</div>
            <div>
              <strong>
                Never Miss Twice Rule: Yesterday was {yesterdayScore}/100 pts
              </strong>
              <p>
                Ek din kam score hona normal hai—bus lagatar do din miss mat
                hone do. Aaj sabse pehle 3 Minimum Basics (Morning Sunlight,
                Phone Outside Bedroom, Bed on Time) lock karo.
              </p>
            </div>
          </div>
        )}

      <div className="stats-grid">
        <Stat
          icon="◉"
          label="Comeback daily score"
          value={`${todayBreakdown.total}/100`}
          detail={`Routine streak: ${streaks.currentRoutine}d (best ${streaks.bestRoutine}d)`}
          color="sage"
        />
        <Stat
          icon="🛡"
          label={dm("Clean streak")}
          value={`${streaks.currentClean} days`}
          detail={`Best: ${streaks.bestClean}d · Total clean: ${streaks.totalClean}d`}
          color="blue"
        />
        <Stat
          icon="✓"
          label="Habits & tasks today"
          value={`${doneHabits + doneTasks}/${
            todayHabits.length + activeTasks.length
          }`}
          detail={`${doneHabits}/${todayHabits.length} habits · ${doneTasks}/${activeTasks.length} tasks`}
          color="peach"
        />
        <div
          onClick={onMood}
          style={{ cursor: "pointer" }}
          title="Click to log mood & energy check-in"
        >
          <Stat
            icon="♡"
            label="Mood & energy"
            value={
              todayMood
                ? `${todayMood.score}/5`
                : `${todayDayObj.mood || 3}/5`
            }
            detail={
              todayMood
                ? ["", "Very low", "Low", "Okay", "Good", "Great"][
                    Number(todayMood.score)
                  ]
                : "Tap to log mood check-in"
            }
            color="lavender"
          />
        </div>
      </div>

      {/* QUICK BIOMETRIC & FUEL LOGGING STRIP */}
      <Card style={{ marginBottom: 18 }}>
        <div className="section-head">
          <div>
            <div className="eyebrow">ONE-TAP DAILY NUMBERS DOCK</div>
            <h2>
              Steps ({todayDayObj.steps || 0}/{targetSteps}) · Water (
              {todayDayObj.waterL || 0}L/{targetWater}L) · Sleep (
              {todayDayObj.sleepH || 0}h) · Screen ({todayDayObj.screenH || 0}h/≤
              {targetScreen}h)
            </h2>
          </div>
          <Button onClick={() => onNavigate("Habits")}>
            Full Tracker →
          </Button>
        </div>

        <div className="category-pills">
          <button type="button" onClick={() => addStepsQuick(1000)}>
            👟 +1,000 Steps
          </button>
          <button type="button" onClick={() => addStepsQuick(2500)}>
            👟 +2,500 Steps
          </button>
          <button type="button" onClick={() => addWaterQuick(0.25)}>
            💧 +250ml Water
          </button>
          <button type="button" onClick={() => addWaterQuick(0.5)}>
            💧 +500ml Bottle
          </button>
          <button type="button" onClick={() => setSleepQuick(7.5)}>
            ☾ Log 7.5h Sleep
          </button>
          <button
            type="button"
            className={todayDayObj.c?.screenUnderLimit ? "selected" : ""}
            onClick={() =>
              updateDay(today, (prev) => ({
                ...prev,
                screenH: prev.screenH || 2,
                c: {
                  ...(prev.c || {}),
                  screenUnderLimit: !prev.c?.screenUnderLimit,
                },
              }))
            }
          >
            📱 Screen ≤ {targetScreen}h (+8 pts)
          </button>
          <button
            type="button"
            className={todayDayObj.c?.protein ? "selected" : ""}
            onClick={() =>
              toggleScoredCheck("protein", !Boolean(todayDayObj.c?.protein))
            }
          >
            🥚 Hit Protein Target (+8 pts)
          </button>
        </div>
      </Card>

      <div className="dashboard-grid">
        <Card className="modern-chart-card">
          <div className="section-head">
            <div>
              <div className="eyebrow">INTERACTIVE TREND ANALYTICS</div>
              <h2>14-Day performance curve</h2>
              <p>Hover any point to inspect your daily trajectory.</p>
            </div>
            <div className="tabs">
              {[
                ["score", "Score"],
                ["mood", "Mood"],
                ["sleep", "Sleep"],
                ["steps", "Steps"],
              ].map(([k, lbl]) => (
                <button
                  type="button"
                  key={k}
                  className={chartMetric === k ? "selected" : ""}
                  onClick={() => setChartMetric(k)}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>
          <ModernAreaChart
            data={chartSeries}
            maxVal={
              chartMetric === "score"
                ? 100
                : chartMetric === "mood"
                ? 5
                : chartMetric === "sleep"
                ? 10
                : p.targets?.steps || 8000
            }
            unit={
              chartMetric === "score"
                ? " pts"
                : chartMetric === "mood"
                ? "/5"
                : chartMetric === "sleep"
                ? " h"
                : " steps"
            }
          />
        </Card>

        <Card className="modern-chart-card">
          <div className="section-head">
            <div>
              <div className="eyebrow">SCORE &amp; BALANCE</div>
              <h2>Today&apos;s 100-pt breakdown</h2>
              <p>How your daily actions add up across 4 pillars.</p>
            </div>
          </div>
          <ModernDonutChart breakdown={todayBreakdown} />
        </Card>
      </div>

      <div className="dashboard-grid">
        <Card className="habits-panel">
          <div className="section-head">
            <div>
              <div className="eyebrow">SHOW UP FOR YOURSELF</div>
              <h2>Today&apos;s check-ins</h2>
              <p>
                {isRestDay
                  ? "Rest day: 20-min brisk walk counts as workout."
                  : "Workout day: log your training session."}
              </p>
            </div>
            <div className="tabs">
              <button
                type="button"
                className={checkTab === "comeback" ? "selected" : ""}
                onClick={() => setCheckTab("comeback")}
              >
                100-Pt Core ({displayedScoredChecks.length})
              </button>
              <button
                type="button"
                className={checkTab === "custom" ? "selected" : ""}
                onClick={() => setCheckTab("custom")}
              >
                Custom Habits ({todayHabits.length})
              </button>
              <button
                type="button"
                className={checkTab === "loops" ? "selected" : ""}
                onClick={() => setCheckTab("loops")}
              >
                Guards ({activeControlLoops.length})
              </button>
            </div>
          </div>

          {checkTab === "comeback" ? (
            <div className="habit-list">
              {displayedScoredChecks.map((item) => {
                const checked = Boolean(
                  todayDayObj.c && todayDayObj.c[item.id]
                );
                return (
                  <div
                    className={`habit-row ${checked ? "checked" : ""}`}
                    key={item.id}
                  >
                    <button
                      type="button"
                      className="check-circle"
                      aria-label={`${checked ? "Uncheck" : "Complete"} ${
                        item.title
                      }`}
                      onClick={() => toggleScoredCheck(item.id, !checked)}
                    >
                      {checked ? "✓" : ""}
                    </button>
                    <div className="habit-info">
                      <strong>
                        {item.id === "workout" && isRestDay
                          ? item.restTitle
                          : dm(item.title)}
                      </strong>
                      <small>{dm(item.sub)}</small>
                    </div>
                    <span
                      className={`status-pill ${checked ? "complete" : ""}`}
                    >
                      +{item.weight} pts
                    </span>
                  </div>
                );
              })}
            </div>
          ) : checkTab === "custom" ? (
            todayHabits.length ? (
              <div className="habit-list">
                {todayHabits.map((h) => (
                  <div
                    className={`habit-row ${
                      h.doneDate === today ? "checked" : ""
                    }`}
                    key={h.id}
                  >
                    <button
                      type="button"
                      className="check-circle"
                      onClick={() => onHabit(h)}
                      aria-label={`${
                        h.doneDate === today ? "Uncheck" : "Complete"
                      } ${h.name}`}
                    >
                      {h.doneDate === today ? "✓" : ""}
                    </button>
                    <div className="habit-info">
                      <strong>{h.name}</strong>
                      <small>
                        {h.category || "Personal"}
                        {h.target ? ` · ${h.target}` : ""}
                      </small>
                    </div>
                    <span
                      className={`status-pill ${
                        h.doneDate === today ? "complete" : ""
                      }`}
                    >
                      {h.doneDate === today ? "Done" : "Not yet"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <Empty
                icon="✳"
                title="Start with one small habit"
                description="Choose a daily action that supports the person you're becoming."
                action={
                  <Button kind="primary" onClick={onAddHabit}>
                    ＋ Create a habit
                  </Button>
                }
              />
            )
          ) : (
            <div className="habit-list">
              {activeControlLoops.map((loop) => {
                const checked = Boolean(
                  todayDayObj.loops && todayDayObj.loops[loop.id]
                );
                return (
                  <div
                    className={`habit-row ${checked ? "checked" : ""}`}
                    key={loop.id}
                  >
                    <button
                      type="button"
                      className="check-circle"
                      onClick={() => toggleControlLoopToday(loop.id)}
                    >
                      {checked ? "✓" : ""}
                    </button>
                    <div className="habit-info">
                      <strong>{dm(loop.title)}</strong>
                      <small>{dm(loop.sub)}</small>
                    </div>
                    <span
                      className={`status-pill ${checked ? "complete" : ""}`}
                    >
                      {checked ? "Guarded" : "Active"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="panel-foot">
            <div>
              <span className="foot-dot" />
              <span>Today&apos;s Comeback Score: {todayBreakdown.total}/100 pts</span>
            </div>
            <Progress value={todayBreakdown.total} />
          </div>
        </Card>

        <div className="stack-col">
          <Card className="tasks-panel">
            <div className="section-head">
              <div>
                <div className="eyebrow">FOCUS ON WHAT MATTERS</div>
                <h2>Today&apos;s focus tasks</h2>
                <p>Make the next step clear.</p>
              </div>
              <div className="heading-btn-group">
                <div className="tabs">
                  <button
                    type="button"
                    className={taskFilter === "all" ? "selected" : ""}
                    onClick={() => setTaskFilter("all")}
                  >
                    All ({activeTasks.length})
                  </button>
                  <button
                    type="button"
                    className={taskFilter === "high" ? "selected" : ""}
                    onClick={() => setTaskFilter("high")}
                  >
                    High
                  </button>
                </div>
                <button
                  type="button"
                  className="add-round"
                  onClick={onAddTask}
                  aria-label="Add task details"
                >
                  ＋
                </button>
              </div>
            </div>

            {/* Inline Quick Task Input */}
            <form
              className="inline-add-row"
              style={{ marginBottom: 12 }}
              onSubmit={handleQuickAddTask}
            >
              <input
                type="text"
                className="clean-input"
                placeholder="Quick add a task & press Enter..."
                value={quickTaskTitle}
                onChange={(e) => setQuickTaskTitle(e.target.value)}
              />
              <Button kind="primary" onClick={handleQuickAddTask}>
                Add
              </Button>
            </form>

            {visibleTasks.length ? (
              <div className="task-list">
                {visibleTasks.map((t) => (
                  <div
                    className={`task-row ${t.done ? "task-done" : ""}`}
                    key={t.id}
                  >
                    <button
                      type="button"
                      className={`task-check ${t.done ? "on" : ""}`}
                      onClick={() => onTask(t.id)}
                      aria-label={`${
                        t.done ? "Mark incomplete" : "Complete"
                      } ${t.title}`}
                    >
                      {t.done ? "✓" : ""}
                    </button>
                    <div className="task-main">
                      <strong>{t.title}</strong>
                      <small>
                        {t.due ? fmtDate(t.due) : "No due date"}{" "}
                        <span className={`priority ${t.priority || "normal"}`}>
                          ● {t.priority || "normal"}
                        </span>
                      </small>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Empty
                icon="↗"
                title="Clear a little space"
                description="Add a task to turn an intention into an action."
                action={
                  <Button onClick={onAddTask}>＋ Add your first task</Button>
                }
              />
            )}

            <button
              type="button"
              className="panel-bottom-link"
              onClick={() => onNavigate("Habits")}
            >
              Open full daily metrics (Steps, Water, Screen, Schedule){" "}
              <span>→</span>
            </button>
          </Card>

          <Card>
            <div className="section-head">
              <div>
                <div className="eyebrow">6-AXIS LIFE RADAR</div>
                <h2>Holistic balance</h2>
              </div>
              {activeGoals && activeGoals.length > 0 && (
                <button
                  type="button"
                  className="text-link"
                  onClick={() => onNavigate("Goals")}
                >
                  {activeGoals.length} active goal
                  {activeGoals.length > 1 ? "s" : ""} ↗
                </button>
              )}
            </div>
            <ModernRadarChart axes={radarAxes} />
          </Card>

          <div className="lower-grid-single">
            <Card className="goals-card">
              <div className="section-head">
                <div>
                  <div className="eyebrow">90-DAY COMEBACK MAP</div>
                  <h2>Your 90-day consistency grid</h2>
                  <p>Click any day to inspect or edit it in the tracker.</p>
                </div>
                <button
                  type="button"
                  className="text-link"
                  onClick={() => onNavigate("Goals")}
                >
                  All goals ↗
                </button>
              </div>
              <Heatmap90
                startDate={p.startDate}
                daysMap={data.days}
                profile={p}
                selectedDate={selectedISO}
                onSelectDate={(iso) => {
                  setSelectedISO(iso);
                  onNavigate("Habits");
                }}
              />
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

export { TodayPage };