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

function ModernWorkoutBarLineChart({ data = [], height = 210 }) {
  const [hoverIdx, setHoverIdx] = useState(null);
  const w = 640;
  const h = height;
  const padL = 38;
  const padR = 20;
  const padT = 24;
  const padB = 30;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  const maxReps = useMemo(() => {
    const vals = data.map((d) => safeNum(d.reps, 0));
    return Math.max(160, ...vals, 1);
  }, [data]);

  const points = useMemo(() => {
    const step = plotW / Math.max(1, data.length);
    return data.map((d, i) => {
      const reps = Math.max(0, safeNum(d.reps, 0));
      const sets = Math.max(0, safeNum(d.sets, 0));
      const x = padL + i * step + step / 2;
      const barH = Math.min(plotH, (reps / maxReps) * plotH);
      const y = padT + plotH - barH;
      const targetY =
        padT + plotH - Math.min(1, safeNum(d.target, 120) / maxReps) * plotH;
      return {
        ...d,
        x,
        y,
        barH,
        reps,
        sets,
        targetY,
        barW: Math.min(26, step * 0.58),
      };
    });
  }, [data, plotW, plotH, maxReps]);

  const linePath = useMemo(() => {
    if (!points.length) return "";
    return points
      .map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`)
      .join(" ");
  }, [points]);

  const active = hoverIdx !== null && points[hoverIdx] ? points[hoverIdx] : null;

  return (
    <div className="modern-chart-wrap">
      {active && (
        <div className="modern-chart-tooltip">
          <span>{active.fullLabel}</span>
          <strong>{active.reps} reps</strong>
          <em>· {active.sets} sets</em>
        </div>
      )}
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="modern-svg-chart"
        onMouseLeave={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient id="workoutBarGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--sage)" stopOpacity="0.88" />
            <stop offset="100%" stopColor="var(--sage)" stopOpacity="0.25" />
          </linearGradient>
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
          const y = padT + plotH * (1 - ratio);
          const val = Math.round(maxReps * ratio);
          return (
            <g key={idx}>
              <line
                x1={padL}
                y1={y}
                x2={w - padR}
                y2={y}
                stroke="var(--line)"
                strokeDasharray={ratio === 0 ? undefined : "4 4"}
              />
              <text
                x={padL - 8}
                y={y + 3}
                textAnchor="end"
                className="chart-axis-text"
              >
                {val}
              </text>
            </g>
          );
        })}

        {points.map((pt, i) => (
          <g
            key={pt.key || i}
            onMouseEnter={() => setHoverIdx(i)}
            style={{ cursor: "pointer" }}
          >
            <rect
              x={pt.x - pt.barW / 2}
              y={padT}
              width={pt.barW}
              height={plotH}
              rx="6"
              fill="var(--canvas)"
              opacity="0.55"
            />
            <rect
              x={pt.x - pt.barW / 2}
              y={pt.y}
              width={pt.barW}
              height={Math.max(4, pt.barH)}
              rx="6"
              fill={pt.reps > 0 ? "url(#workoutBarGrad)" : "var(--line)"}
            />
            <text
              x={pt.x}
              y={h - 8}
              textAnchor="middle"
              className="chart-axis-text"
            >
              {pt.label}
            </text>
          </g>
        ))}

        {points.length > 1 && (
          <path
            d={linePath}
            fill="none"
            stroke="#c89572"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        )}

        {points.map((pt, i) => (
          <circle
            key={`dot-${i}`}
            cx={pt.x}
            cy={pt.y}
            r={hoverIdx === i ? 5.5 : 3.5}
            fill="var(--paper)"
            stroke="#c89572"
            strokeWidth="2.2"
            pointerEvents="none"
          />
        ))}
      </svg>
    </div>
  );
}

function LifestyleAndBodyPage({
  data,
  setData,
  updateProfile,
  onAddRoutine,
  onAddMetric,
  onAddStep,
  onLog,
  onEdit,
  onDelete,
  notify,
}) {
  const [tab, setTab] = useState("workouts"); // workouts | calc | diet | frame | routines | metrics
  const [category, setCategory] = useState("all");

  const today = todayISO();
  const currentWeekday = getWeekdayShort(today);
  const [selectedDayKey, setSelectedDayKey] = useState(
    DAILY_HOME_WORKOUTS[currentWeekday] ? currentWeekday : "Mon"
  );
  const [restSeconds, setRestSeconds] = useState(90);
  const [measureChartKey, setMeasureChartKey] = useState("weight"); // weight | shoulder | waist | chest | arm | ratio

  /* 1RM & Overload Calculator State */
  const [liftInput, setLiftInput] = useState({ weight: 20, reps: 10 });

  /* Custom Food Input State */
  const [customFood, setCustomFood] = useState({
    name: "",
    protein: "",
    kcal: "",
  });

  /* Interactive Calcium Check State */
  const [calciumChecks, setCalciumChecks] = useState({});

  const p = data.profile || {};
  const measures = data.measures || [];
  const bodyMetrics = useMemo(() => calcBodyMetrics(p, measures), [p, measures]);

  /* Advanced Body Composition (US Navy Body Fat %, Lean Mass, FFMI, Ideal Shoulder Target) */
  const advancedBodyComp = useMemo(() => {
    const latest =
      measures.length > 0
        ? measures[measures.length - 1]
        : {
            weight: p.weightKg || 56,
            waist: 74,
            neck: 35.5,
            shoulder: 105,
            chest: 87,
            arm: 27.5,
          };

    const h = Math.max(140, safeNum(p.heightCm, 172));
    const wKg = Math.max(35, safeNum(latest.weight, p.weightKg || 56));
    const waist = Math.max(55, safeNum(latest.waist, 74));
    const neck = Math.max(28, safeNum(latest.neck, 35.5));
    const shoulder = Math.max(80, safeNum(latest.shoulder, 105));

    // US Navy Male Body Fat Formula (metric)
    const diff = Math.max(12, waist - neck);
    const rawBf =
      495 /
        (1.0324 -
          0.19077 * Math.log10(diff) +
          0.15456 * Math.log10(h)) -
      450;
    const bodyFatPct = +Math.max(5, Math.min(40, rawBf)).toFixed(1);
    const fatMassKg = +((wKg * bodyFatPct) / 100).toFixed(1);
    const leanMassKg = +(wKg - fatMassKg).toFixed(1);
    const heightM = h / 100;
    const ffmi = +(leanMassKg / (heightM * heightM)).toFixed(1);

    const athleticShoulderTarget = +(waist * 1.45).toFixed(1);
    const goldenShoulderTarget = +(waist * 1.618).toFixed(1);
    const cmToAthletic = +Math.max(0, athleticShoulderTarget - shoulder).toFixed(
      1
    );

    // Daily Macro Split based on target calories
    const targetKcal = Math.round((bodyMetrics.calMin + bodyMetrics.calMax) / 2);
    const proteinG = Math.round(
      (bodyMetrics.proteinMin + bodyMetrics.proteinMax) / 2
    );
    const fatG = Math.round((targetKcal * 0.25) / 9);
    const carbG = Math.max(
      100,
      Math.round((targetKcal - proteinG * 4 - fatG * 9) / 4)
    );

    return {
      bodyFatPct,
      fatMassKg,
      leanMassKg,
      ffmi,
      athleticShoulderTarget,
      goldenShoulderTarget,
      cmToAthletic,
      targetKcal,
      proteinG,
      fatG,
      carbG,
    };
  }, [measures, p.heightCm, p.weightKg, bodyMetrics]);

  const activeDayPlan =
    DAILY_HOME_WORKOUTS[selectedDayKey] || DAILY_HOME_WORKOUTS.Mon;
  const todayDayObj = (data.days && data.days[today]) || {};
  const savedWorkoutLog = todayDayObj.homeWorkoutLog || {
    setsDone: {},
    repsByEx: {},
    loadByEx: {},
    completed: false,
  };

  const getExReps = (ex) =>
    savedWorkoutLog.repsByEx && savedWorkoutLog.repsByEx[ex.id] !== undefined
      ? savedWorkoutLog.repsByEx[ex.id]
      : ex.defaultReps;

  const getExLoad = (ex) =>
    savedWorkoutLog.loadByEx && savedWorkoutLog.loadByEx[ex.id] !== undefined
      ? savedWorkoutLog.loadByEx[ex.id]
      : 0;

  const isSetChecked = (exId, setIdx) =>
    Boolean(
      savedWorkoutLog.setsDone && savedWorkoutLog.setsDone[`${exId}-${setIdx}`]
    );

  const toggleWorkoutSet = (ex, setIdx) => {
    const key = `${ex.id}-${setIdx}`;
    const nextSetsDone = {
      ...(savedWorkoutLog.setsDone || {}),
      [key]: !isSetChecked(ex.id, setIdx),
    };
    const nextRepsByEx = {
      ...(savedWorkoutLog.repsByEx || {}),
      [ex.id]: getExReps(ex),
    };
    const nextLoadByEx = {
      ...(savedWorkoutLog.loadByEx || {}),
      [ex.id]: getExLoad(ex),
    };
    recalcAndSaveTodayWorkout(
      nextSetsDone,
      nextRepsByEx,
      nextLoadByEx,
      savedWorkoutLog.completed
    );
  };

  const updateExerciseReps = (ex, newReps) => {
    const cleanReps = Math.max(1, safeNum(newReps, ex.defaultReps));
    const nextRepsByEx = {
      ...(savedWorkoutLog.repsByEx || {}),
      [ex.id]: cleanReps,
    };
    recalcAndSaveTodayWorkout(
      savedWorkoutLog.setsDone || {},
      nextRepsByEx,
      savedWorkoutLog.loadByEx || {},
      savedWorkoutLog.completed
    );
  };

  const updateExerciseLoad = (ex, newLoad) => {
    const cleanLoad = Math.max(0, safeNum(newLoad, 0));
    const nextLoadByEx = {
      ...(savedWorkoutLog.loadByEx || {}),
      [ex.id]: cleanLoad,
    };
    recalcAndSaveTodayWorkout(
      savedWorkoutLog.setsDone || {},
      savedWorkoutLog.repsByEx || {},
      nextLoadByEx,
      savedWorkoutLog.completed
    );
  };

  const recalcAndSaveTodayWorkout = (
    setsDoneMap,
    repsMap,
    loadMap = {},
    markCompleted = false
  ) => {
    let totalSets = 0;
    let totalReps = 0;
    let totalTonnageKg = 0;
    Object.values(DAILY_HOME_WORKOUTS).forEach((dayPlan) => {
      dayPlan.exercises.forEach((ex) => {
        const r =
          repsMap[ex.id] !== undefined ? repsMap[ex.id] : ex.defaultReps;
        const loadKg = safeNum(loadMap[ex.id], 0);
        for (let s = 1; s <= ex.sets; s += 1) {
          if (setsDoneMap[`${ex.id}-${s}`]) {
            totalSets += 1;
            totalReps += Number(r) || 0;
            totalTonnageKg += (Number(r) || 0) * loadKg;
          }
        }
      });
    });

    setData((old) => {
      const prevDay = (old.days && old.days[today]) || {};
      return {
        ...old,
        days: {
          ...(old.days || {}),
          [today]: {
            ...prevDay,
            c: {
              ...(prevDay.c || {}),
              workout:
                markCompleted ||
                totalSets >= 3 ||
                Boolean(prevDay.c?.workout),
            },
            homeWorkoutLog: {
              dayKey: selectedDayKey,
              setsDone: setsDoneMap,
              repsByEx: repsMap,
              loadByEx: loadMap,
              totalSets,
              totalReps,
              totalTonnageKg,
              completed: markCompleted || totalSets >= 6,
              updatedAt: Date.now(),
            },
          },
        },
      };
    });
  };

  const completeAllSetsForToday = () => {
    const nextSetsDone = { ...(savedWorkoutLog.setsDone || {}) };
    const nextRepsByEx = { ...(savedWorkoutLog.repsByEx || {}) };
    const nextLoadByEx = { ...(savedWorkoutLog.loadByEx || {}) };
    activeDayPlan.exercises.forEach((ex) => {
      if (nextRepsByEx[ex.id] === undefined) {
        nextRepsByEx[ex.id] = ex.defaultReps;
      }
      for (let s = 1; s <= ex.sets; s += 1) {
        nextSetsDone[`${ex.id}-${s}`] = true;
      }
    });
    recalcAndSaveTodayWorkout(nextSetsDone, nextRepsByEx, nextLoadByEx, true);
    notify(`${activeDayPlan.day} Home Workout logged! (+12 Comeback pts)`);
  };

  /* 14-Day Workout Graph Data */
  const workoutGraphSeries = useMemo(() => {
    return Array.from({ length: 14 }, (_, idx) => {
      const iso = addDaysISO(today, -(13 - idx));
      const dObj = (data.days && data.days[iso]) || {};
      const wkName = getWeekdayShort(iso);
      const planForDay = DAILY_HOME_WORKOUTS[wkName] || DAILY_HOME_WORKOUTS.Mon;
      const log = dObj.homeWorkoutLog;

      let reps = safeNum(log?.totalReps, 0);
      let sets = safeNum(log?.totalSets, 0);
      if (reps === 0 && dObj.c?.workout) {
        reps = planForDay.targetReps;
        sets = 14;
      }

      return {
        key: iso,
        label: wkName.slice(0, 2),
        fullLabel: `${fmtDate(iso)} (${wkName})`,
        reps,
        sets,
        target: planForDay.targetReps,
      };
    });
  }, [data.days, today]);

  const weeklyWorkoutStats = useMemo(() => {
    const last7 = workoutGraphSeries.slice(-7);
    const totalReps7d = last7.reduce((acc, d) => acc + d.reps, 0);
    const totalSets7d = last7.reduce((acc, d) => acc + d.sets, 0);
    const activeDays7d = last7.filter((d) => d.reps > 0).length;
    const estKcal = Math.round(totalSets7d * 14 + totalReps7d * 0.45);
    return { totalReps7d, totalSets7d, activeDays7d, estKcal };
  }, [workoutGraphSeries]);

  /* Diet Live Macro & Protein Tracker State (Stored per day) */
  const todayDietLog = todayDayObj.dietItems || [];
  const loggedProteinToday = todayDietLog.reduce(
    (s, item) => s + safeNum(item.protein, 0),
    0
  );
  const loggedKcalToday = todayDietLog.reduce(
    (s, item) => s + safeNum(item.kcal, 0),
    0
  );

  const addQuickFoodToday = (food) => {
    setData((old) => {
      const prevDay = (old.days && old.days[today]) || {};
      const nextList = [
        ...(prevDay.dietItems || []),
        { ...food, uid: uid(), time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
      ];
      const newProt = nextList.reduce((s, x) => s + safeNum(x.protein, 0), 0);
      return {
        ...old,
        days: {
          ...(old.days || {}),
          [today]: {
            ...prevDay,
            dietItems: nextList,
            c: {
              ...(prevDay.c || {}),
              protein:
                newProt >= bodyMetrics.proteinMin ||
                Boolean(prevDay.c?.protein),
            },
          },
        },
      };
    });
    notify(`Added ${food.name} (+${food.protein}g protein)`);
  };

  const handleAddCustomFood = () => {
    const name = customFood.name.trim();
    const prot = Math.max(0, safeNum(customFood.protein, 0));
    const kcal = Math.max(0, safeNum(customFood.kcal, prot * 4));
    if (!name || (prot === 0 && kcal === 0)) return;
    addQuickFoodToday({
      id: `cust-${uid()}`,
      name,
      protein: prot,
      kcal,
    });
    setCustomFood({ name: "", protein: "", kcal: "" });
  };

  const removeFoodItemToday = (itemUid) => {
    setData((old) => {
      const prevDay = (old.days && old.days[today]) || {};
      const nextList = (prevDay.dietItems || []).filter(
        (x) => x.uid !== itemUid
      );
      return {
        ...old,
        days: {
          ...(old.days || {}),
          [today]: { ...prevDay, dietItems: nextList },
        },
      };
    });
  };

  const clearTodayDiet = () => {
    setData((old) => {
      const prevDay = (old.days && old.days[today]) || {};
      return {
        ...old,
        days: {
          ...(old.days || {}),
          [today]: { ...prevDay, dietItems: [] },
        },
      };
    });
  };

  /* Measurements Form & Multi-Metric Chart */
  const [newMeas, setNewMeas] = useState({
    date: today,
    weight: p.weightKg || 56,
    waist: 74,
    chest: 87,
    arm: 27.5,
    neck: 35.5,
    shoulder: 105,
  });

  const handleSaveMeasurement = () => {
    const entry = {
      date: newMeas.date || today,
      weight: safeNum(newMeas.weight, p.weightKg),
      waist: safeNum(newMeas.waist, 74),
      chest: safeNum(newMeas.chest, 87),
      arm: safeNum(newMeas.arm, 27.5),
      neck: safeNum(newMeas.neck, 35.5),
      shoulder: safeNum(newMeas.shoulder, 105),
    };
    setData((old) => ({
      ...old,
      measures: [...(old.measures || []), entry].sort((a, b) =>
        String(a.date).localeCompare(String(b.date))
      ),
      profile: { ...old.profile, weightKg: entry.weight },
    }));
    notify("Body measurements logged");
  };

  const selectedMeasureSeries = useMemo(() => {
    return measures.map((m) => {
      let val = m.weight;
      if (measureChartKey === "shoulder") val = m.shoulder;
      else if (measureChartKey === "waist") val = m.waist;
      else if (measureChartKey === "chest") val = m.chest;
      else if (measureChartKey === "arm") val = m.arm;
      else if (measureChartKey === "ratio")
        val = m.waist > 0 ? +(m.shoulder / m.waist).toFixed(2) : 1.35;
      return {
        key: m.date,
        label: String(m.date).slice(5),
        fullLabel: fmtDate(m.date),
        value: safeNum(val, 0),
      };
    });
  }, [measures, measureChartKey]);

  /* Epley 1RM Calculation */
  const estOneRepMax = useMemo(() => {
    const w = Math.max(1, safeNum(liftInput.weight, 20));
    const r = Math.max(1, Math.min(30, safeNum(liftInput.reps, 10)));
    if (r === 1) return w;
    return Math.round(w * (1 + r / 30));
  }, [liftInput]);

  /* Interactive Calcium Total */
  const calciumMgValues = [300, 340, 200, 120, 90, 60];
  const totalCalciumMg = useMemo(() => {
    return CALCIUM_TABLE.reduce((sum, _, idx) => {
      const servings = safeNum(calciumChecks[idx], 0);
      return sum + servings * (calciumMgValues[idx] || 100);
    }, 0);
  }, [calciumChecks]);

  const categories = [
    "all",
    "face",
    "hair",
    "body",
    "sleep",
    "movement",
    "nutrition",
    "other",
  ];
  const routines = (data.routines || []).filter(
    (r) => category === "all" || r.category === category
  );

  return (
    <>
      <Heading
        eyebrow="CARE & TRAINING SYSTEM"
        title="Body, daily home workouts & nutrition"
        description="7-day home workout split with live volume graph, progressive overload engine, TDEE & Navy body-fat analytics, Indian diet tracker, and care routines."
        action={
          <div className="heading-btn-group">
            <Button onClick={onAddRoutine}>＋ Care routine</Button>
            <Button kind="primary" onClick={onAddMetric}>
              ＋ Indicator
            </Button>
          </div>
        }
      />

      <div className="lifestyle-banner">
        <div>
          <span className="eyebrow">EVIDENCE-BASED BLUEPRINT</span>
          <h2>
            Build a frame and life that
            <br />
            <em>feels strong to live in.</em>
          </h2>
          <p>
            Target Calories:{" "}
            <strong>
              {bodyMetrics.calMin}–{bodyMetrics.calMax} kcal
            </strong>{" "}
            · Daily Protein:{" "}
            <strong>
              {bodyMetrics.proteinMin}–{bodyMetrics.proteinMax}g
            </strong>{" "}
            · BMI: <strong>{bodyMetrics.bmi}</strong> ({bodyMetrics.bmiCategory}) ·
            Est. Body Fat: <strong>{advancedBodyComp.bodyFatPct}%</strong>
          </p>
        </div>
        <div className="lifestyle-orbit">
          <span>V-TAPER</span>
          <i>✳</i>
          <b>
            {bodyMetrics.swRatio
              ? `RATIO ${bodyMetrics.swRatio}`
              : "BODY · MIND"}
          </b>
        </div>
      </div>

      <div className="tabs large-tabs">
        {[
          ["workouts", "Daily Home Workouts & Graph"],
          ["calc", "Body, TDEE & V-Taper Analytics"],
          ["diet", "Indian Diet & Live Protein"],
          ["frame", "Frame & Bone Truth"],
          ["routines", `Care Routines (${(data.routines || []).length})`],
          ["metrics", `Indicators (${(data.metrics || []).length})`],
        ].map(([k, lbl]) => (
          <button
            type="button"
            key={k}
            className={tab === k ? "selected" : ""}
            onClick={() => setTab(k)}
          >
            {lbl}
          </button>
        ))}
      </div>

      {/* =====================================================================
          TAB 1: WORKOUTS (MODERN REACT WORKOUT GRAPH + 7-DAY HOME WORKOUT SPLIT)
          ===================================================================== */}
      {tab === "workouts" && (
        <div className="stack-col">
          {/* TOP STATS FOR WORKOUTS */}
          <div className="stats-grid">
            <Stat
              icon="◉"
              label="7-Day workout volume"
              value={`${weeklyWorkoutStats.totalReps7d} reps`}
              detail={`${weeklyWorkoutStats.totalSets7d} total sets completed`}
              color="sage"
            />
            <Stat
              icon="✓"
              label="Active days (7d)"
              value={`${weeklyWorkoutStats.activeDays7d}/7 days`}
              detail="Consistency builds the frame"
              color="blue"
            />
            <Stat
              icon="↗"
              label="Today's logged sets"
              value={`${safeNum(savedWorkoutLog.totalSets, 0)} sets`}
              detail={`${safeNum(
                savedWorkoutLog.totalReps,
                0
              )} reps · ${safeNum(
                savedWorkoutLog.totalTonnageKg,
                0
              )} kg extra load`}
              color="peach"
            />
            <Stat
              icon="⌁"
              label="Est. weekly burn"
              value={`${weeklyWorkoutStats.estKcal} kcal`}
              detail="Resistance + mobility output"
              color="lavender"
            />
          </div>

          {/* MODERN REACT WORKOUT VOLUME GRAPH + MUSCLE SPLIT */}
          <div className="dashboard-grid">
            <Card className="modern-chart-card">
              <div className="section-head">
                <div>
                  <div className="eyebrow">MODERN REACT WORKOUT ANALYTICS</div>
                  <h2>14-Day Home Workout Volume (Reps &amp; Sets)</h2>
                  <p>
                    Green bars show total daily reps; copper line tracks your
                    progressive overload curve.
                  </p>
                </div>
                <span className="status-pill complete">
                  Today: {safeNum(savedWorkoutLog.totalReps, 0)} reps
                </span>
              </div>
              <ModernWorkoutBarLineChart
                data={workoutGraphSeries}
                height={210}
              />
            </Card>

            <Card>
              <div className="section-head">
                <div>
                  <div className="eyebrow">REST TIMER &amp; MUSCLE TARGET</div>
                  <h2>{activeDayPlan.day} Split Focus</h2>
                  <p>{activeDayPlan.focus}</p>
                </div>
              </div>

              <div className="muscle-split-box">
                {Object.entries(activeDayPlan.muscleSplit).map(
                  ([muscle, pct]) => (
                    <div key={muscle} className="muscle-bar-row">
                      <div className="row-between">
                        <strong>{muscle}</strong>
                        <span>{pct}% focus</span>
                      </div>
                      <Progress value={pct} />
                    </div>
                  )
                )}
              </div>

              <div style={{ marginTop: 14 }}>
                <div className="category-pills" style={{ marginBottom: 8 }}>
                  {[60, 90, 120].map((sec) => (
                    <button
                      type="button"
                      key={sec}
                      className={restSeconds === sec ? "selected" : ""}
                      onClick={() => setRestSeconds(sec)}
                    >
                      {sec}s Rest
                    </button>
                  ))}
                </div>
                <CountdownTimer
                  defaultSeconds={restSeconds}
                  label={`Between-Set Rest Timer (${restSeconds}s)`}
                />
              </div>
            </Card>
          </div>

          {/* MODE SWITCHER: 7-DAY DAILY HOME WORKOUT VS GYM / 4-WEEK OVERVIEW */}
          <div className="toolbar">
            <div className="tabs">
              <button
                type="button"
                className={
                  data.settings?.activePlan !== "gym" ? "selected" : ""
                }
                onClick={() =>
                  setData((old) => ({
                    ...old,
                    settings: { ...old.settings, activePlan: "home" },
                  }))
                }
              >
                🏠 Daily Home Workout (Mon–Sun Interactive)
              </button>
              <button
                type="button"
                className={
                  data.settings?.activePlan === "gym" ? "selected" : ""
                }
                onClick={() =>
                  setData((old) => ({
                    ...old,
                    settings: { ...old.settings, activePlan: "gym" },
                  }))
                }
              >
                🏋️ Gym Full-Body A/B/C Plan
              </button>
            </div>
            <Button kind="primary" onClick={completeAllSetsForToday}>
              ✓ Complete &amp; Log All {activeDayPlan.day} Sets
            </Button>
          </div>

          {data.settings?.activePlan !== "gym" ? (
            <>
              {/* 7-DAY INTERACTIVE DAY SELECTOR (MON - SUN) */}
              <Card>
                <div className="section-head">
                  <div>
                    <div className="eyebrow">
                      GHAR PAR ROZ KYA KAREIN (7-DAY HOME SCHEDULE)
                    </div>
                    <h2>{activeDayPlan.title}</h2>
                    <p>
                      Tap each set button (S1, S2, S3) as you finish it at home
                      — add backpack/dumbbell load (kg) to track progressive
                      overload!
                    </p>
                  </div>
                  <span className="status-pill complete">
                    Target: ~{activeDayPlan.targetReps} reps
                  </span>
                </div>

                <div className="weekday-selector-grid">
                  {WEEKDAY_KEYS.map((dKey) => {
                    const isToday = dKey === currentWeekday;
                    const plan = DAILY_HOME_WORKOUTS[dKey];
                    return (
                      <button
                        type="button"
                        key={dKey}
                        className={`weekday-pill ${
                          selectedDayKey === dKey ? "active" : ""
                        } ${isToday ? "is-today" : ""}`}
                        onClick={() => setSelectedDayKey(dKey)}
                      >
                        <small>{isToday ? "TODAY" : dKey.toUpperCase()}</small>
                        <strong>{dKey}</strong>
                        <span>{plan.title.split("—")[0].trim()}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="home-exercise-list">
                  {activeDayPlan.exercises.map((ex, idx) => {
                    const currentReps = getExReps(ex);
                    const currentLoad = getExLoad(ex);
                    const completedSetsCount = Array.from(
                      { length: ex.sets },
                      (_, sIdx) => isSetChecked(ex.id, sIdx + 1)
                    ).filter(Boolean).length;
                    const allDone = completedSetsCount === ex.sets;
                    const overloadReady =
                      allDone && currentReps >= ex.defaultReps + 2;

                    return (
                      <div
                        key={ex.id}
                        className={`home-exercise-card ${
                          allDone ? "ex-complete" : ""
                        }`}
                      >
                        <div className="home-ex-main">
                          <span className="status-pill complete">
                            0{idx + 1}
                          </span>
                          <div className="habit-info">
                            <strong>
                              {ex.name}{" "}
                              {overloadReady && (
                                <span
                                  className="status-pill peach-pill"
                                  style={{ marginLeft: 6 }}
                                >
                                  🔥 Overload Unlocked (+2 reps / +2kg next
                                  time)
                                </span>
                              )}
                            </strong>
                            <small>
                              🎯 {ex.repsLabel} · 💡 {ex.cue}
                            </small>
                          </div>
                        </div>

                        <div className="home-ex-controls">
                          <div className="set-chips-row">
                            {Array.from({ length: ex.sets }, (_, sIdx) => {
                              const setNum = sIdx + 1;
                              const done = isSetChecked(ex.id, setNum);
                              return (
                                <button
                                  type="button"
                                  key={setNum}
                                  className={`set-check-btn ${
                                    done ? "done" : ""
                                  }`}
                                  onClick={() => toggleWorkoutSet(ex, setNum)}
                                  title={`Toggle Set ${setNum}`}
                                >
                                  {done ? `✓ S${setNum}` : `S${setNum}`}
                                </button>
                              );
                            })}
                          </div>

                          <div className="reps-stepper">
                            <small>Reps/Set:</small>
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={currentReps}
                              onChange={(e) =>
                                updateExerciseReps(ex, e.target.value)
                              }
                            />
                          </div>

                          <div className="reps-stepper">
                            <small>+Bag/DB (kg):</small>
                            <input
                              type="number"
                              min="0"
                              max="120"
                              step="1"
                              value={currentLoad}
                              onChange={(e) =>
                                updateExerciseLoad(ex, e.target.value)
                              }
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* 4-WEEK PROGRESSION REFERENCE */}
              <div className="record-grid">
                <Card>
                  <div className="eyebrow">WEEKS 1–2 FOUNDATION</div>
                  <h2>Beginner Bodyweight Rules</h2>
                  <p>
                    Stop 2 reps before failure. Focus on clean form and posture.
                  </p>
                  <div className="habit-list" style={{ marginTop: 12 }}>
                    {HOME_WORKOUT_PLAN.weeks1to2.map((ex, i) => (
                      <div className="habit-row" key={i}>
                        <div className="habit-info">
                          <strong>{ex.name}</strong>
                          <small>{ex.note}</small>
                        </div>
                        <span className="status-pill complete">
                          {ex.sets} · {ex.reps}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
                <Card>
                  <div className="eyebrow">WEEKS 3–4 PROGRESSION</div>
                  <h2>Advanced Home Overload</h2>
                  <p>
                    Once basic sets feel easy, switch to these harder
                    variations.
                  </p>
                  <div className="habit-list" style={{ marginTop: 12 }}>
                    {HOME_WORKOUT_PLAN.weeks3to4.map((ex, i) => (
                      <div className="habit-row" key={i}>
                        <div className="habit-info">
                          <strong>{ex.name}</strong>
                          <small>{ex.note}</small>
                        </div>
                        <span className="status-pill complete">
                          {ex.sets} · {ex.reps}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </>
          ) : (
            <>
              <Accordion
                title="First-Time Gym Darr Checklist (How to start without awkwardness)"
                badge="Tips"
              >
                {GYM_DARR_TIPS.map((t, i) => (
                  <p key={i} className="bullet-line">
                    • {t}
                  </p>
                ))}
              </Accordion>

              <div className="record-grid three-col-grid">
                {Object.entries(GYM_WORKOUT_PLAN.sessions).map(
                  ([sessKey, list]) => (
                    <Card key={sessKey}>
                      <div className="eyebrow">GYM SESSION {sessKey}</div>
                      <h2>Full-Body {sessKey}</h2>
                      <p>{GYM_WORKOUT_PLAN.restNote}</p>
                      <div className="habit-list" style={{ marginTop: 12 }}>
                        {list.map((ex, i) => (
                          <div className="habit-row" key={i}>
                            <div className="habit-info">
                              <strong>{ex.name}</strong>
                              <small>
                                {ex.sets} · {ex.reps}
                              </small>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )
                )}
              </div>

              {/* EPLEY 1-REP MAX & WORKING WEIGHT CALCULATOR */}
              <Card>
                <div className="section-head">
                  <div>
                    <div className="eyebrow">
                      STRENGTH &amp; HYPERTROPHY LOAD CALCULATOR (EPLEY FORMULA)
                    </div>
                    <h2>Estimate 1-Rep Max (1RM) &amp; Hypertrophy Working Sets</h2>
                    <p>
                      Apna dumbbell ya barbell weight aur clean reps enter karo
                      taaki 8–12 rep hypertrophy working weight pata chale.
                    </p>
                  </div>
                  <span className="status-pill complete">
                    Est. 1RM: {estOneRepMax} kg
                  </span>
                </div>

                <div className="form-grid" style={{ maxWidth: 460 }}>
                  <Field label="Weight Lifted (kg)">
                    <input
                      type="number"
                      min="1"
                      value={liftInput.weight}
                      onChange={(e) =>
                        setLiftInput({
                          ...liftInput,
                          weight: safeNum(e.target.value, 20),
                        })
                      }
                    />
                  </Field>
                  <Field label="Clean Reps Performed (1–20)">
                    <input
                      type="number"
                      min="1"
                      max="25"
                      value={liftInput.reps}
                      onChange={(e) =>
                        setLiftInput({
                          ...liftInput,
                          reps: safeNum(e.target.value, 10),
                        })
                      }
                    />
                  </Field>
                </div>

                <div
                  className="mini-stat-row"
                  style={{ marginTop: 14, marginBottom: 0 }}
                >
                  <div>
                    <span className="mini-stat-number">{estOneRepMax} kg</span>
                    <span>Estimated 1RM (100%)</span>
                  </div>
                  <div>
                    <span className="mini-stat-number">
                      {Math.round(estOneRepMax * 0.85)} kg
                    </span>
                    <span>Strength (5 Reps · 85%)</span>
                  </div>
                  <div>
                    <span className="mini-stat-number">
                      {Math.round(estOneRepMax * 0.75)} kg
                    </span>
                    <span>Hypertrophy (10 Reps · 75%)</span>
                  </div>
                  <div>
                    <span className="mini-stat-number">
                      {Math.round(estOneRepMax * 0.65)} kg
                    </span>
                    <span>Endurance / Form (15 Reps · 65%)</span>
                  </div>
                </div>
              </Card>
            </>
          )}
        </div>
      )}

      {/* =====================================================================
          TAB 2: BODY & TDEE ANALYTICS (MULTI-METRIC GRAPH SWITCHER)
          ===================================================================== */}
      {tab === "calc" && (
        <div className="stack-col">
          {/* TOP BODY COMPOSITION & V-TAPER STATS */}
          <div className="stats-grid">
            <Stat
              icon="⚖"
              label="U.S. Navy Body Fat %"
              value={`${advancedBodyComp.bodyFatPct}%`}
              detail={`Lean Mass: ${advancedBodyComp.leanMassKg} kg · Fat: ${advancedBodyComp.fatMassKg} kg`}
              color="sage"
            />
            <Stat
              icon="💪"
              label="Natural Muscle Index (FFMI)"
              value={advancedBodyComp.ffmi}
              detail={
                advancedBodyComp.ffmi < 18
                  ? "Slim base — high room for newbie muscle gains"
                  : "Solid athletic muscle density"
              }
              color="blue"
            />
            <Stat
              icon="📐"
              label="Current V-Taper Ratio"
              value={bodyMetrics.swRatio || "1.42"}
              detail={`Athletic Target (1.45x): ${advancedBodyComp.athleticShoulderTarget} cm shoulders`}
              color="peach"
            />
            <Stat
              icon="🔥"
              label="Daily Macro Split"
              value={`${advancedBodyComp.proteinG}P / ${advancedBodyComp.carbG}C / ${advancedBodyComp.fatG}F`}
              detail={`For ~${advancedBodyComp.targetKcal} kcal/day`}
              color="lavender"
            />
          </div>

          <div className="dashboard-grid">
            <Card>
              <div className="eyebrow">MIFFLIN-ST JEOR CALCULATOR</div>
              <h2>Calorie surplus &amp; protein calculator</h2>
              <div className="form-grid" style={{ marginTop: 14 }}>
                <Field label="Height (cm)">
                  <input
                    type="number"
                    value={p.heightCm}
                    onChange={(e) =>
                      updateProfile({
                        heightCm: safeNum(e.target.value, 172),
                      })
                    }
                  />
                </Field>
                <Field label="Weight (kg)">
                  <input
                    type="number"
                    value={p.weightKg}
                    onChange={(e) =>
                      updateProfile({
                        weightKg: safeNum(e.target.value, 56),
                      })
                    }
                  />
                </Field>
                <Field label="Age">
                  <input
                    type="number"
                    value={p.age}
                    onChange={(e) =>
                      updateProfile({ age: safeNum(e.target.value, 22) })
                    }
                  />
                </Field>
                <Field label="Activity Level">
                  <select
                    value={p.activity}
                    onChange={(e) =>
                      updateProfile({ activity: e.target.value })
                    }
                  >
                    <option value="1.2">Sedentary</option>
                    <option value="1.375">
                      Lightly active (1–3 days/wk)
                    </option>
                    <option value="1.55">
                      Moderately active (3–5 days/wk)
                    </option>
                    <option value="1.725">Very active (6–7 days/wk)</option>
                  </select>
                </Field>
              </div>

              <div className="category-pills" style={{ marginTop: 12 }}>
                {[
                  ["gain", "Lean Bulk (+350 kcal)"],
                  ["maintain", "Maintenance (TDEE)"],
                  ["lose", "Fat Loss (-450 kcal)"],
                ].map(([gKey, gLbl]) => (
                  <button
                    type="button"
                    key={gKey}
                    className={
                      bodyMetrics.effectiveGoal === gKey ? "selected" : ""
                    }
                    onClick={() => updateProfile({ calcGoal: gKey })}
                  >
                    {gLbl}
                  </button>
                ))}
              </div>

              {bodyMetrics.loseBlocked && (
                <p
                  className="muted-text"
                  style={{ marginTop: 8, color: "#c89572" }}
                >
                  ⚠️ BMI is under 18.5 (Underweight). Calorie deficit is
                  automatically locked to Lean Bulk for bone &amp; hormone
                  safety.
                </p>
              )}

              <div
                className="mini-stat-row"
                style={{ marginTop: 18, marginBottom: 0 }}
              >
                <div>
                  <span className="mini-stat-number">
                    {bodyMetrics.bmr} kcal
                  </span>
                  <span>Basal BMR</span>
                </div>
                <div>
                  <span className="mini-stat-number">
                    {bodyMetrics.tdee} kcal
                  </span>
                  <span>Maintenance TDEE</span>
                </div>
                <div>
                  <span className="mini-stat-number">
                    {bodyMetrics.calMin}–{bodyMetrics.calMax}
                  </span>
                  <span>Target Daily kcal</span>
                </div>
              </div>
            </Card>

            <Card>
              <div className="eyebrow">MONTHLY TAPE MEASUREMENTS</div>
              <h2>Log weight, arms, chest &amp; V-taper (cm)</h2>
              <div
                className="form-grid three-col-grid"
                style={{ marginTop: 14 }}
              >
                <Field label="Weight (kg)">
                  <input
                    type="number"
                    value={newMeas.weight}
                    onChange={(e) =>
                      setNewMeas({
                        ...newMeas,
                        weight: safeNum(e.target.value, 56),
                      })
                    }
                  />
                </Field>
                <Field label="Shoulders (cm)">
                  <input
                    type="number"
                    value={newMeas.shoulder}
                    onChange={(e) =>
                      setNewMeas({
                        ...newMeas,
                        shoulder: safeNum(e.target.value, 105),
                      })
                    }
                  />
                </Field>
                <Field label="Waist (cm)">
                  <input
                    type="number"
                    value={newMeas.waist}
                    onChange={(e) =>
                      setNewMeas({
                        ...newMeas,
                        waist: safeNum(e.target.value, 74),
                      })
                    }
                  />
                </Field>
                <Field label="Chest (cm)">
                  <input
                    type="number"
                    value={newMeas.chest}
                    onChange={(e) =>
                      setNewMeas({
                        ...newMeas,
                        chest: safeNum(e.target.value, 87),
                      })
                    }
                  />
                </Field>
                <Field label="Arm / Bicep (cm)">
                  <input
                    type="number"
                    value={newMeas.arm}
                    onChange={(e) =>
                      setNewMeas({
                        ...newMeas,
                        arm: safeNum(e.target.value, 27.5),
                      })
                    }
                  />
                </Field>
                <Field label="Neck (cm)">
                  <input
                    type="number"
                    value={newMeas.neck}
                    onChange={(e) =>
                      setNewMeas({
                        ...newMeas,
                        neck: safeNum(e.target.value, 35.5),
                      })
                    }
                  />
                </Field>
              </div>
              <div
                className="row-between"
                style={{ marginTop: 14, flexWrap: "wrap", gap: 10 }}
              >
                <Button kind="primary" onClick={handleSaveMeasurement}>
                  Save measurement entry
                </Button>
                <small className="muted-text">
                  {advancedBodyComp.cmToAthletic > 0
                    ? `Add +${advancedBodyComp.cmToAthletic} cm to shoulders (via lateral raises & rows) to hit 1.45x V-taper.`
                    : "✓ Athletic 1.45x Shoulder-to-Waist V-taper achieved!"}
                </small>
              </div>
            </Card>
          </div>

          <Card>
            <div className="section-head">
              <div>
                <div className="eyebrow">
                  INTERACTIVE BODY TRANSFORMATION GRAPH
                </div>
                <h2>Select any body measurement to inspect trend</h2>
              </div>
              <div className="tabs">
                {[
                  ["weight", "Weight (kg)"],
                  ["shoulder", "Shoulders (cm)"],
                  ["chest", "Chest (cm)"],
                  ["arm", "Arms (cm)"],
                  ["waist", "Waist (cm)"],
                  ["ratio", "V-Taper Ratio"],
                ].map(([k, lbl]) => (
                  <button
                    type="button"
                    key={k}
                    className={measureChartKey === k ? "selected" : ""}
                    onClick={() => setMeasureChartKey(k)}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
            <ModernAreaChart
              data={selectedMeasureSeries}
              maxVal={
                measureChartKey === "ratio"
                  ? 1.65
                  : Math.max(
                      ...selectedMeasureSeries.map((d) => d.value),
                      60
                    ) * 1.1
              }
              unit={
                measureChartKey === "weight"
                  ? " kg"
                  : measureChartKey === "ratio"
                  ? ""
                  : " cm"
              }
            />
          </Card>
        </div>
      )}

      {/* =====================================================================
          TAB 3: INDIAN DIET & INTERACTIVE DAILY PROTEIN BUILDER
          ===================================================================== */}
      {tab === "diet" && (
        <div className="stack-col">
          <Card>
            <div className="section-head">
              <div>
                <div className="eyebrow">INTERACTIVE DAILY MACRO TRACKER</div>
                <h2>
                  Today&apos;s Protein: {loggedProteinToday}g /{" "}
                  {bodyMetrics.proteinMin}–{bodyMetrics.proteinMax}g
                </h2>
                <p>
                  Tap any Indian food below as you eat it today — reaching{" "}
                  {bodyMetrics.proteinMin}g automatically checks off your daily
                  protein habit (+8 pts).
                </p>
              </div>
              {todayDietLog.length > 0 && (
                <Button onClick={clearTodayDiet}>
                  Reset Today&apos;s Food
                </Button>
              )}
            </div>

            <div className="macro-progress-grid">
              <div>
                <div className="row-between" style={{ marginBottom: 6 }}>
                  <strong>Protein Progress ({loggedProteinToday}g)</strong>
                  <span>Target: {bodyMetrics.proteinMin}g+</span>
                </div>
                <Progress
                  value={percent(loggedProteinToday, bodyMetrics.proteinMin)}
                />
              </div>
              <div>
                <div className="row-between" style={{ marginBottom: 6 }}>
                  <strong>Logged Calories ({loggedKcalToday} kcal)</strong>
                  <span>Target: {bodyMetrics.calMin} kcal</span>
                </div>
                <Progress
                  value={percent(loggedKcalToday, bodyMetrics.calMin)}
                />
              </div>
            </div>

            <div className="quick-food-grid">
              {QUICK_PROTEIN_FOODS.map((food) => (
                <button
                  type="button"
                  key={food.id}
                  className="quick-food-btn"
                  onClick={() => addQuickFoodToday(food)}
                >
                  <strong>＋ {food.name}</strong>
                  <span>
                    {food.protein}g protein · {food.kcal} kcal
                  </span>
                </button>
              ))}
            </div>

            {/* CUSTOM INDIAN MEAL / SNACK ENTRY */}
            <div
              className="form-grid three-col-grid"
              style={{ marginTop: 16 }}
            >
              <Field label="Custom Food / Ghar ka Khana">
                <input
                  type="text"
                  placeholder="e.g. 2 Besan Chilla + Curd"
                  value={customFood.name}
                  onChange={(e) =>
                    setCustomFood({ ...customFood, name: e.target.value })
                  }
                />
              </Field>
              <Field label="Protein (grams)">
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 14"
                  value={customFood.protein}
                  onChange={(e) =>
                    setCustomFood({ ...customFood, protein: e.target.value })
                  }
                />
              </Field>
              <Field label="Calories (kcal)">
                <div className="inline-add-row" style={{ marginTop: 0 }}>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 280"
                    value={customFood.kcal}
                    onChange={(e) =>
                      setCustomFood({ ...customFood, kcal: e.target.value })
                    }
                  />
                  <Button kind="primary" onClick={handleAddCustomFood}>
                    ＋ Log
                  </Button>
                </div>
              </Field>
            </div>

            {/* TODAY'S EATEN ITEMS LIST */}
            {todayDietLog.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div className="eyebrow" style={{ marginBottom: 8 }}>
                  TODAY&apos;S LOGGED MEALS ({todayDietLog.length} ITEMS)
                </div>
                <div className="category-pills">
                  {todayDietLog.map((item) => (
                    <span
                      key={item.uid}
                      className="status-pill complete"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      {item.name} ({item.protein}g P · {item.kcal} kcal)
                      <button
                        type="button"
                        onClick={() => removeFoodItemToday(item.uid)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontWeight: 700,
                        }}
                        title="Remove item"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Card>

          <div className="record-grid">
            <Card>
              <div className="eyebrow">VEGETARIAN HIGH-PROTEIN PLAN</div>
              <h2>Sample Veg Day (~100g+ protein)</h2>
              <div className="habit-list" style={{ marginTop: 12 }}>
                {DIET_PLANS.veg.map((m, i) => (
                  <div className="habit-row" key={i}>
                    <div className="habit-info">
                      <strong>{m.meal}</strong>
                      <small>{m.items}</small>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
            <Card>
              <div className="eyebrow">NON-VEG HIGH-PROTEIN PLAN</div>
              <h2>Sample Non-Veg Day (~108g+ protein)</h2>
              <div className="habit-list" style={{ marginTop: 12 }}>
                {DIET_PLANS.nonVeg.map((m, i) => (
                  <div className="habit-row" key={i}>
                    <div className="habit-info">
                      <strong>{m.meal}</strong>
                      <small>{m.items}</small>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="dashboard-grid">
            <Card>
              <div className="eyebrow">INDIAN PROTEIN REFERENCE</div>
              <h2>Approximate protein per serving</h2>
              <div className="table-wrap" style={{ marginTop: 12 }}>
                <table className="clean-table">
                  <thead>
                    <tr>
                      <th>Food Item</th>
                      <th>Protein</th>
                      <th>Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PROTEIN_TABLE.map((row, i) => (
                      <tr key={i}>
                        <td>{row.item}</td>
                        <td>
                          <strong>{row.protein}</strong>
                        </td>
                        <td>
                          <span className="status-pill">{row.type}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card>
              <div className="eyebrow">HARDGAINER SURPLUS RULES</div>
              <h2>How to gain clean weight when appetite is low</h2>
              <div className="habit-list" style={{ marginTop: 12 }}>
                {WEIGHT_GAIN_TIPS.map((tip, i) => (
                  <div className="habit-row" key={i}>
                    <span className="status-pill complete">0{i + 1}</span>
                    <div className="habit-info">
                      <strong>{tip}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 4: FRAME & BONE TRUTH
          ===================================================================== */}
      {tab === "frame" && (
        <div className="stack-col">
          <div className="dashboard-grid">
            <Card>
              <div className="eyebrow">THE HONEST TRUTH</div>
              <h2>Frame, bone structure &amp; visual width</h2>
              <p style={{ marginTop: 8 }}>{FRAME_BONE_CONTENT.honestTruth}</p>
              <div className="habit-list" style={{ marginTop: 14 }}>
                {FRAME_BONE_CONTENT.priorities.map((pr, i) => (
                  <div className="habit-row" key={i}>
                    <span className="status-pill complete">0{i + 1}</span>
                    <div className="habit-info">
                      <strong>{pr}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <div className="eyebrow">BONE DENSITY &amp; HORMONAL BASE</div>
              <h2>Peak bone mass rules in your 20s</h2>
              <div className="habit-list" style={{ marginTop: 12 }}>
                {FRAME_BONE_CONTENT.boneHealth.map((bh, i) => (
                  <div className="habit-row" key={i}>
                    <span className="status-pill complete">✓</span>
                    <div className="habit-info">
                      <strong>{bh}</strong>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16 }}>
                <div className="row-between" style={{ marginBottom: 6 }}>
                  <strong>
                    Today&apos;s Calcium Check: {totalCalciumMg} / 1000 mg
                  </strong>
                  <span>{percent(totalCalciumMg, 1000)}% of daily target</span>
                </div>
                <Progress value={percent(totalCalciumMg, 1000)} />
              </div>
            </Card>
          </div>

          <Card>
            <div className="section-head">
              <div>
                <div className="eyebrow">PEAK BONE MASS &amp; CALCIUM</div>
                <h2>Dietary calcium sources (~1000 mg/day target)</h2>
                <p>
                  Tap <strong>＋ Serving</strong> on the foods you had today to
                  calculate your daily calcium intake.
                </p>
              </div>
              {totalCalciumMg > 0 && (
                <Button onClick={() => setCalciumChecks({})}>
                  Reset Calcium Check
                </Button>
              )}
            </div>
            <div className="table-wrap" style={{ marginTop: 12 }}>
              <table className="clean-table">
                <thead>
                  <tr>
                    <th>Home Food Source</th>
                    <th>Approx. Calcium</th>
                    <th>Servings Today</th>
                  </tr>
                </thead>
                <tbody>
                  {CALCIUM_TABLE.map((c, i) => {
                    const count = safeNum(calciumChecks[i], 0);
                    return (
                      <tr key={i}>
                        <td>{c.food}</td>
                        <td>
                          <strong>{c.calcium}</strong>
                        </td>
                        <td>
                          <div className="heading-btn-group">
                            <Button
                              onClick={() =>
                                setCalciumChecks({
                                  ...calciumChecks,
                                  [i]: Math.max(0, count - 1),
                                })
                              }
                            >
                              −
                            </Button>
                            <span className="status-pill complete">
                              {count}x
                            </span>
                            <Button
                              kind="primary"
                              onClick={() =>
                                setCalciumChecks({
                                  ...calciumChecks,
                                  [i]: count + 1,
                                })
                              }
                            >
                              ＋ Serving
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* =====================================================================
          TAB 5: CARE ROUTINES
          ===================================================================== */}
      {tab === "routines" && (
        <>
          <div className="category-pills">
            {categories.map((c) => (
              <button
                type="button"
                key={c}
                className={category === c ? "selected" : ""}
                onClick={() => setCategory(c)}
              >
                {c === "all" ? "All areas" : c[0].toUpperCase() + c.slice(1)}
              </button>
            ))}
          </div>
          <div className="record-grid">
            {routines.map((r) => (
              <Card className="record-card" key={r.id}>
                <div className="record-top">
                  <span className="record-symbol sage">✳</span>
                  <button
                    type="button"
                    className="dots-button"
                    onClick={() => onEdit({ ...r, kind: "routine" })}
                  >
                    •••
                  </button>
                </div>
                <span className="eyebrow">
                  {r.category || "OTHER"} · {r.schedule || "daily"}
                </span>
                <h3>{r.name}</h3>
                <p>{r.description || "A routine you can return to."}</p>
                {(r.steps || []).length > 0 && (
                  <div className="step-list">
                    {r.steps.map((s, i) => (
                      <div key={s.id || i}>
                        <span>{String(i + 1).padStart(2, "0")}</span>
                        {s.title || s.stepTitle}
                      </div>
                    ))}
                  </div>
                )}
                <div className="record-actions">
                  <Button
                    kind="primary"
                    onClick={() => onLog({ ...r, kind: "routine" })}
                  >
                    Log today
                  </Button>
                  <Button onClick={() => onAddStep(r)}>＋ Step</Button>
                  <Button onClick={() => onEdit({ ...r, kind: "routine" })}>
                    Edit
                  </Button>
                  <Button onClick={() => onDelete("routines", r.id)}>
                    Delete
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* =====================================================================
          TAB 6: MEASURABLE INDICATORS
          ===================================================================== */}
      {tab === "metrics" && (
        <div className="record-grid">
          {(data.metrics || []).map((m) => (
            <Card className="record-card" key={m.id}>
              <div className="record-top">
                <span className="record-symbol blue">⌁</span>
                <button
                  type="button"
                  className="dots-button"
                  onClick={() => onEdit({ ...m, kind: "metric" })}
                >
                  •••
                </button>
              </div>
              <span className="eyebrow">{m.category || "OTHER"}</span>
              <h3>{m.name}</h3>
              <div className="metric-value">
                {m.logs?.length ? m.logs[0].value : "—"} <small>{m.unit}</small>
              </div>
              {m.target !== "" && m.target != null && (
                <>
                  <Progress
                    value={percent(
                      Number(m.logs?.[0]?.value || 0),
                      Number(m.target)
                    )}
                  />
                  <small className="muted-text">
                    Target · {m.target} {m.unit}
                  </small>
                </>
              )}
              <div className="record-actions">
                <Button
                  kind="primary"
                  onClick={() => onLog({ ...m, kind: "metric" })}
                >
                  Add measurement
                </Button>
                <Button onClick={() => onEdit({ ...m, kind: "metric" })}>
                  Edit
                </Button>
                <Button onClick={() => onDelete("metrics", m.id)}>
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

export { LifestyleAndBodyPage };