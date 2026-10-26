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
  const [checkTab, setCheckTab] = useState("comeback");

  const p = data.profile || {};
  const dayNumber = getDayIndex(p.startDate, today);
  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  })();
  const quote = QUOTES[(dayNumber - 1) % QUOTES.length];
  const isRestDay = !(p.workoutDays || ["Mon", "Wed", "Fri"]).includes(getWeekdayShort(today));

  const chartSeries = useMemo(() => {
    return Array.from({ length: 14 }, (_, idx) => {
      const iso = addDaysISO(today, -(13 - idx));
      const dObj = (data.days && data.days[iso]) || {};
      const moodEntry = (data.moods || []).find((m) => m.date === iso);
      let value = 0;
      if (chartMetric === "score") value = calcDailyScore(dObj, p);
      else if (chartMetric === "mood") value = Number(moodEntry?.score || dObj.mood || 0);
      else if (chartMetric === "sleep") value = Number(dObj.sleepH || 0);
      else if (chartMetric === "steps") value = Number(dObj.steps || 0);
      return { key: iso, label: getWeekdayShort(iso), fullLabel: fmtDate(iso), value };
    });
  }, [data.days, data.moods, chartMetric, p, today]);

  const radarAxes = useMemo(() => {
    const habitPct = todayHabits.length ? percent(doneHabits, todayHabits.length) : 60;
    const sleepPct = Math.min(100, Math.round((safeNum(todayDayObj.sleepH, 7) / 8) * 100));
    const bodyPct = Math.min(100, Math.round((todayBreakdown.fitnessBody / 32) * 100));
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
  }, [todayHabits.length, doneHabits, todayDayObj, todayBreakdown, streaks.cleanLast30, todayMood]);

  const displayedScoredChecks = data.badDayMode
    ? SCORED_CHECKS.filter((item) => MINIMUM_DAY_IDS.includes(item.id))
    : SCORED_CHECKS;

  const toggleScoredCheck = (id, checked) => {
    updateDay(today, (prev) => ({
      ...prev,
      c: { ...(prev.c || {}), [id]: checked },
    }));
  };

  return (
    <>
      <Heading
        eyebrow={`${new Date().toLocaleDateString(undefined, {
          weekday: "long", month: "long", day: "numeric",
        }).toUpperCase()} · DAY ${dayNumber} OF 90`}
        title={`${greeting}, ${p.name || "Bhai"}.`}
        description="A little structure. A little care. Your 90-day comeback, one day at a time."
        action={
          <div className="heading-btn-group">
            <Button onClick={() => setData((old) => ({ ...old, badDayMode: !old.badDayMode }))}>
              {data.badDayMode ? "★ Bad Day Mode: ON" : "Low Energy / Bad Day Mode"}
            </Button>
            <Button kind="primary" onClick={onAddTask}><span>＋</span> Add a task</Button>
          </div>
        }
      />

      <div className="hero-banner">
        <div className="hero-copy">
          <div className="hero-kicker"><span className="sparkle">✳</span> DAY {dayNumber} OF 90 · NEVER MISS TWICE</div>
          <h2>Become who you want to be,<br /><em>one day at a time.</em></h2>
          <p>{dm(quote)}</p>
          <div className="hero-progress-wrap">
            <Progress value={percent(Math.min(dayNumber, 90), 90)} />
            <small>{Math.min(dayNumber, 90)}/90 days in current cycle</small>
          </div>
          <div className="hero-cta-row">
            <button type="button" className="hero-link" onClick={() => onNavigate("Reflection")}>Take a moment to reflect <span>↗</span></button>
            <button type="button" className="hero-link" onClick={() => onNavigate("Quest")}>Open Comeback Quest <span>✦</span></button>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="art-sun" /><div className="art-hill hill-back" /><div className="art-hill hill-front" />
          <div className="art-stem" /><div className="art-leaf leaf-a" /><div className="art-leaf leaf-b" /><div className="art-leaf leaf-c" /><div className="art-pot" />
        </div>
        <div className="hero-index">{String(dayNumber).padStart(2, "0")} <span>/ 90-DAY PRACTICE</span></div>
      </div>

      <div className="stats-grid">
        <Stat icon="◉" label="Comeback daily score" value={`${todayBreakdown.total}/100`} detail={`Routine streak: ${streaks.currentRoutine}d (best ${streaks.bestRoutine}d)`} color="sage" />
        <Stat icon="🛡" label={dm("Clean streak")} value={`${streaks.currentClean} days`} detail={`Best: ${streaks.bestClean}d · Total clean: ${streaks.totalClean}d`} color="blue" />
        <Stat icon="✓" label="Habits & tasks today" value={`${doneHabits + doneTasks}/${todayHabits.length + activeTasks.length}`} detail={`${doneHabits}/${todayHabits.length} habits · ${doneTasks}/${activeTasks.length} tasks`} color="peach" />
        <Stat icon="♡" label="Mood & energy" value={todayMood ? `${todayMood.score}/5` : `${todayDayObj.mood || 3}/5`} detail={todayMood ? ["", "Very low", "Low", "Okay", "Good", "Great"][Number(todayMood.score)] : "Tap to log mood check-in"} color="lavender" />
      </div>

      <div className="dashboard-grid">
        <Card className="modern-chart-card">
          <div className="section-head">
            <div><div className="eyebrow">INTERACTIVE TREND ANALYTICS</div><h2>14-Day performance curve</h2><p>Hover any point to inspect your daily trajectory.</p></div>
            <div className="tabs">
              {[["score", "Score"], ["mood", "Mood"], ["sleep", "Sleep"], ["steps", "Steps"]].map(([k, lbl]) => (
                <button type="button" key={k} className={chartMetric === k ? "selected" : ""} onClick={() => setChartMetric(k)}>{lbl}</button>
              ))}
            </div>
          </div>
          <ModernAreaChart data={chartSeries} maxVal={chartMetric === "score" ? 100 : chartMetric === "mood" ? 5 : chartMetric === "sleep" ? 10 : p.targets?.steps || 8000} unit={chartMetric === "score" ? " pts" : chartMetric === "mood" ? "/5" : chartMetric === "sleep" ? " h" : " steps"} />
        </Card>
        <Card className="modern-chart-card">
          <div className="section-head"><div><div className="eyebrow">SCORE & BALANCE</div><h2>Today&apos;s 100-pt breakdown</h2><p>How your daily actions add up across 4 pillars.</p></div></div>
          <ModernDonutChart breakdown={todayBreakdown} />
        </Card>
      </div>

      <div className="dashboard-grid">
        <Card className="habits-panel">
          <div className="section-head">
            <div><div className="eyebrow">SHOW UP FOR YOURSELF</div><h2>Today&apos;s check-ins</h2><p>{isRestDay ? "Rest day: 20-min brisk walk counts as workout." : "Workout day: log your training session."}</p></div>
            <div className="tabs">
              <button type="button" className={checkTab === "comeback" ? "selected" : ""} onClick={() => setCheckTab("comeback")}>100-Pt Core ({displayedScoredChecks.length})</button>
              <button type="button" className={checkTab === "custom" ? "selected" : ""} onClick={() => setCheckTab("custom")}>Custom Habits ({todayHabits.length})</button>
            </div>
          </div>

          {checkTab === "comeback" ? (
            <div className="habit-list">
              {displayedScoredChecks.map((item) => {
                const checked = Boolean(todayDayObj.c && todayDayObj.c[item.id]);
                return <div className={`habit-row ${checked ? "checked" : ""}`} key={item.id}>
                  <button type="button" className="check-circle" aria-label={`${checked ? "Uncheck" : "Complete"} ${item.title}`} onClick={() => toggleScoredCheck(item.id, !checked)}>{checked ? "✓" : ""}</button>
                  <div className="habit-info"><strong>{item.id === "workout" && isRestDay ? item.restTitle : dm(item.title)}</strong><small>{dm(item.sub)}</small></div>
                  <span className={`status-pill ${checked ? "complete" : ""}`}>+{item.weight} pts</span>
                </div>;
              })}
            </div>
          ) : todayHabits.length ? (
            <div className="habit-list">{todayHabits.map((h) => <div className={`habit-row ${h.doneDate === today ? "checked" : ""}`} key={h.id}>
              <button type="button" className="check-circle" onClick={() => onHabit(h)} aria-label={`${h.doneDate === today ? "Uncheck" : "Complete"} ${h.name}`}>{h.doneDate === today ? "✓" : ""}</button>
              <div className="habit-info"><strong>{h.name}</strong><small>{h.category || "Personal"}{h.target ? ` · ${h.target}` : ""}</small></div>
              <span className={`status-pill ${h.doneDate === today ? "complete" : ""}`}>{h.doneDate === today ? "Done" : "Not yet"}</span>
            </div>)}</div>
          ) : <Empty icon="✳" title="Start with one small habit" description="Choose a daily action that supports the person you're becoming." action={<Button kind="primary" onClick={onAddHabit}>＋ Create a habit</Button>} />}

          <div className="panel-foot"><div><span className="foot-dot" /><span>Today&apos;s Comeback Score: {todayBreakdown.total}/100 pts</span></div><Progress value={todayBreakdown.total} /></div>
        </Card>

        <div className="stack-col">
          <Card className="tasks-panel">
            <div className="section-head"><div><div className="eyebrow">FOCUS ON WHAT MATTERS</div><h2>Today&apos;s focus tasks</h2><p>Make the next step clear.</p></div><button type="button" className="add-round" onClick={onAddTask} aria-label="Add task">＋</button></div>
            {activeTasks.length ? <div className="task-list">{activeTasks.slice(0, 5).map((t) => <div className={`task-row ${t.done ? "task-done" : ""}`} key={t.id}>
              <button type="button" className={`task-check ${t.done ? "on" : ""}`} onClick={() => onTask(t.id)} aria-label={`${t.done ? "Mark incomplete" : "Complete"} ${t.title}`}>{t.done ? "✓" : ""}</button>
              <div className="task-main"><strong>{t.title}</strong><small>{t.due ? fmtDate(t.due) : "No due date"} <span className={`priority ${t.priority || "normal"}`}>● {t.priority || "normal"}</span></small></div>
            </div>)}</div> : <Empty icon="↗" title="Clear a little space" description="Add a task to turn an intention into an action." action={<Button onClick={onAddTask}>＋ Add your first task</Button>} />}
            <button type="button" className="panel-bottom-link" onClick={() => onNavigate("Habits")}>Open full daily metrics (Steps, Water, Screen, Schedule) <span>→</span></button>
          </Card>
          <Card><div className="section-head"><div><div className="eyebrow">6-AXIS LIFE RADAR</div><h2>Holistic balance</h2></div></div><ModernRadarChart axes={radarAxes} /></Card>
          <div className="lower-grid-single">
            <Card className="goals-card">
              <div className="section-head">
                <div><div className="eyebrow">90-DAY COMEBACK MAP</div><h2>Your 90-day consistency grid</h2><p>Click any day to inspect or edit it in the tracker.</p></div>
                <button type="button" className="text-link" onClick={() => onNavigate("Goals")}>All goals ↗</button>
              </div>
              <Heatmap90 startDate={p.startDate} daysMap={data.days} profile={p} selectedDate={selectedISO} onSelectDate={(iso) => { setSelectedISO(iso); onNavigate("Habits"); }} />
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

export { TodayPage };
