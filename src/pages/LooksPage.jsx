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

const FIT_RULES_CHECKLIST = [
  {
    id: "fit-seam",
    title: "Shoulder seam sits exactly on the outer shoulder bone",
    sub: "Drooping seams make a slim frame look narrower and slouchy.",
  },
  {
    id: "fit-sleeve",
    title: "T-shirt sleeves hug mid-bicep (not flaring out like wings)",
    sub: "Roll the sleeve cuff once if it flares out.",
  },
  {
    id: "fit-length",
    title: "Shirt / T-shirt hem ends mid-fly (around hip bone)",
    sub: "Overly long tees make legs look shorter and torso thinner.",
  },
  {
    id: "fit-trouser",
    title: "Straight or slim-tapered trousers with a slight half-break on shoes",
    sub: "Avoid ultra-skinny jeans on thin legs; straight/tapered builds proportion.",
  },
];

const HEIGHT_DECOMPRESSION_STEPS = [
  {
    id: "ht-1",
    name: "1. Bar Dead Hang / Doorframe Spinal Traction",
    durationSec: 45,
    reps: "3 sets × 30–45 sec",
    gainTag: "+0.6 to 1.0 cm (Disc Decompression)",
    instruction:
      "Pull-up bar ya majboot दरवाजे ke frame ko pakad kar shoulders ko kaanon ke paas dhila chhod do. Lower back aur hips ko hawa mein bhaari latakne do (feet halka zameen ko touch kar sakte hain). Gravity aapke 23 spinal discs ke beech space kholegi.",
  },
  {
    id: "ht-2",
    name: "2. Wall Crown-to-Ceiling Reach (Thoracic & Neck Unfold)",
    durationSec: 60,
    reps: "3 sets × 20 sec hold",
    gainTag: "+0.5 to 0.8 cm (Fixes Tech-Neck)",
    instruction:
      "Deewar se heels, glutes aur upper back chipkao. Chin ko andar tuck karo (double chin jaisa) aur apne sir ke sabse upari hisse (crown) ko chhat (ceiling) ki taraf 1 inch upar kheench kar hold karo.",
  },
  {
    id: "ht-3",
    name: "3. APT Pelvic Tuck + Kneeling Hip-Flexor Release",
    durationSec: 60,
    reps: "45 sec / side",
    gainTag: "+0.5 to 1.0 cm (Straightens Lumbar Curve)",
    instruction:
      "Lambi sitting se pelvis aage tilt ho jata hai (APT) jisse kamar ki S-curve dab kar height chura leti hai. Belt buckle ko naabhi ki taraf upar tuck karo, glutes 80% squeeze karo aur front hip flexor ko lamba stretch do.",
  },
  {
    id: "ht-4",
    name: "4. Cobra Thoracic Extension to Downward Dog Wave",
    durationSec: 60,
    reps: "8 slow waves (60 sec)",
    gainTag: "+0.4 cm (Upper Back Extension)",
    instruction:
      "Glutes tight rakh kar chest ko upar uthao (Sphinx/Baby Cobra—sirf upper back kholo, lower back pinch mat karo) aur fir hips upar push karke Downward Dog mein spine ko lamba stretch do.",
  },
  {
    id: "ht-5",
    name: "5. Nighttime Disc Rehydration (Pillow Under Knees)",
    durationSec: 90,
    reps: "Every night before sleep",
    gainTag: "Locks Morning Height Gain",
    instruction:
      "Raat ko sote waqt spinal discs paani absorb karke wapas phoolti hain. Peeth ke bal let kar ghutno ke neeche 1 takiya (pillow) lagao aur 3L+ daily hydration rakho taaki subah 1.5 cm full disc height mile.",
  },
];

const VISUAL_HEIGHT_HACKS = [
  {
    id: "vh-sole",
    title: "Wear chunky minimal sneakers with a 3 to 3.5 cm outsole",
    sub: "White/neutral court sneakers, running soles, or Chelsea boots add 3+ cm instantly without fake insoles.",
  },
  {
    id: "vh-monochrome",
    title: "Use monochrome or tonal dark outfits (Navy, Charcoal, Olive, Black)",
    sub: "Wearing similar colour tones on top and bottom creates an unbroken vertical line that makes you look 2–3 cm taller.",
  },
  {
    id: "vh-waistline",
    title: "Mid-rise straight trousers + T-shirt ending right at the belt bone",
    sub: "Long baggy tees cut your leg length in half. Longer visual legs = taller perceived height.",
  },
  {
    id: "vh-crown",
    title: "Add 2–3 cm textured volume on top of hair with neat tapered sides",
    sub: "A short quiff or textured crop with low-tapered sides adds both actual and visual vertical height.",
  },
  {
    id: "vh-lats",
    title: "Build side delts & upper-back posture (Invisible String Cue)",
    sub: "Walk as if an invisible thread is pulling the crown of your head toward the sky.",
  },
];

function parseAvgRupeeRange(str = "") {
  const nums = String(str)
    .replace(/,/g, "")
    .match(/\d+/g);
  if (!nums || !nums.length) return 800;
  if (nums.length === 1) return Number(nums[0]);
  return Math.round((Number(nums[0]) + Number(nums[1])) / 2);
}

function LooksPage({ data, setData, notify }) {
  const [subTab, setSubTab] = useState("face"); // face | height | hair | skin | groom
  const [doneRoutineSteps, setDoneRoutineSteps] = useState({});
  const [doneHeightSteps, setDoneHeightSteps] = useState({});
  const [budgetTier, setBudgetTier] = useState("low"); // low | mid
  const [shapeQuiz, setShapeQuiz] = useState({
    lengthVsWidth: "balanced",
    jawShape: "rounded",
    foreheadVsJaw: "equal",
  });

  /* Reclaimable Height Estimator State */
  const [heightAudit, setHeightAudit] = useState({
    sittingHours: "high", // low | med | high
    aptLevel: "moderate", // none | moderate | high
    neckSlouch: "yes", // no | yes
  });

  const today = todayISO();
  const p = data.profile || {};
  const groom = data.groom || {};
  const auditAnswers = (data.faceAudit && data.faceAudit.answers) || {};
  const todayDayObj = (data.days && data.days[today]) || createEmptyDay();

  const [heightForm, setHeightForm] = useState({
    morningCm: groom.morningHeightCm || +(safeNum(p.heightCm, 172) + 1.5).toFixed(1),
    eveningCm: groom.eveningHeightCm || safeNum(p.heightCm, 172),
  });

  const setGroom = (patch) =>
    setData((old) => ({
      ...old,
      groom: { ...(old.groom || {}), ...patch },
    }));

  const handleAuditChange = (qId, val) => {
    setData((old) => ({
      ...old,
      faceAudit: {
        answers: {
          ...((old.faceAudit && old.faceAudit.answers) || {}),
          [qId]: val,
        },
        updatedAt: todayISO(),
      },
    }));
  };

  const selectedSkinType = SKIN_ROUTINES[groom.skinType]
    ? groom.skinType
    : "oily";
  const selectedFaceShape = FACE_SHAPES_GUIDE[groom.faceShape]
    ? groom.faceShape
    : "oval";

  /* Face Audit Analytics & Dentist Alert */
  const auditSummary = useMemo(() => {
    let healthyCount = 0;
    let answeredCount = 0;
    const dentistAlerts = [];

    FACE_AUDIT_QUESTIONS.forEach((q) => {
      const ans = auditAnswers[q.id];
      if (ans) {
        answeredCount += 1;
        if (ans === q.options[0].value) {
          healthyCount += 1;
        }
        if (q.dentistOn && ans === q.dentistOn) {
          dentistAlerts.push(q);
        }
      }
    });

    return { healthyCount, answeredCount, dentistAlerts };
  }, [auditAnswers]);

  /* Sync Face Routine with Daily Tracker */
  const isFaceRoutineLoggedToday = Boolean(
    todayDayObj.face && todayDayObj.face.faceRoutineDone
  );

  const toggleFaceStepDone = (stepId) => {
    const next = { ...doneRoutineSteps, [stepId]: !doneRoutineSteps[stepId] };
    setDoneRoutineSteps(next);
    const completedCount = Object.values(next).filter(Boolean).length;
    if (completedCount >= FACE_ROUTINE_STEPS.length) {
      markFullFaceRoutineToday(true);
    }
  };

  const markFullFaceRoutineToday = (val = true) => {
    const nextSteps = {};
    if (val) {
      FACE_ROUTINE_STEPS.forEach((s) => {
        nextSteps[s.id] = true;
      });
    }
    setDoneRoutineSteps(nextSteps);

    setData((old) => {
      const prevDay = (old.days && old.days[today]) || createEmptyDay();
      return {
        ...old,
        days: {
          ...(old.days || {}),
          [today]: {
            ...prevDay,
            face: {
              ...(prevDay.face || {}),
              faceRoutineDone: val,
              lipsTogether: val ? true : prevDay.face?.lipsTogether,
            },
          },
        },
      };
    });
    if (val && typeof notify === "function") {
      notify("5–8 min Face & Posture routine logged for today!");
    }
  };

  /* Height Decompression Routine Sync */
  const isHeightRoutineDoneToday = Boolean(
    todayDayObj.life && todayDayObj.life.eyePosture && groom.heightDoneDate === today
  );

  const toggleHeightStepDone = (stepId) => {
    const next = { ...doneHeightSteps, [stepId]: !doneHeightSteps[stepId] };
    setDoneHeightSteps(next);
    const doneCount = Object.values(next).filter(Boolean).length;
    if (doneCount >= 3) {
      markFullHeightRoutineToday(true, next);
    }
  };

  const markFullHeightRoutineToday = (val = true, customMap = null) => {
    const nextMap = customMap || {};
    if (val && !customMap) {
      HEIGHT_DECOMPRESSION_STEPS.forEach((s) => {
        nextMap[s.id] = true;
      });
    }
    setDoneHeightSteps(nextMap);

    setData((old) => {
      const prevDay = (old.days && old.days[today]) || createEmptyDay();
      return {
        ...old,
        groom: {
          ...(old.groom || {}),
          heightDoneDate: val ? today : "",
        },
        days: {
          ...(old.days || {}),
          [today]: {
            ...prevDay,
            life: {
              ...(prevDay.life || {}),
              eyePosture: val ? true : prevDay.life?.eyePosture,
            },
          },
        },
      };
    });

    if (val && typeof notify === "function") {
      notify("Spinal Decompression & Height Protocol logged for today!");
    }
  };

  /* Reclaimable Height Calculation (Age 22 Biomechanics) */
  const heightPotential = useMemo(() => {
    let discGain = 0.6;
    if (heightAudit.sittingHours === "high") discGain = 1.1;
    else if (heightAudit.sittingHours === "med") discGain = 0.8;

    let aptGain = 0.2;
    if (heightAudit.aptLevel === "high") aptGain = 1.0;
    else if (heightAudit.aptLevel === "moderate") aptGain = 0.6;

    const neckGain = heightAudit.neckSlouch === "yes" ? 0.6 : 0.2;

    const totalReclaimCm = +(discGain + aptGain + neckGain).toFixed(1);
    const baseHeight = safeNum(p.heightCm, 172);
    const potentialHeight = +(baseHeight + totalReclaimCm).toFixed(1);

    return {
      discGain,
      aptGain,
      neckGain,
      totalReclaimCm,
      baseHeight,
      potentialHeight,
    };
  }, [heightAudit, p.heightCm]);

  const handleSaveHeightLog = () => {
    const mCm = Math.max(130, Math.min(220, safeNum(heightForm.morningCm, 173.5)));
    const eCm = Math.max(130, Math.min(220, safeNum(heightForm.eveningCm, 172)));
    const entry = {
      id: uid(),
      date: today,
      morningCm: mCm,
      eveningCm: eCm,
      dropCm: +Math.max(0, mCm - eCm).toFixed(1),
    };

    setData((old) => ({
      ...old,
      profile: {
        ...(old.profile || {}),
        heightCm: eCm,
      },
      groom: {
        ...(old.groom || {}),
        morningHeightCm: mCm,
        eveningHeightCm: eCm,
        heightLogs: [entry, ...(old.groom?.heightLogs || []).slice(0, 14)],
      },
    }));

    if (typeof notify === "function") {
      notify(`Height logged: Morning ${mCm} cm · Evening ${eCm} cm`);
    }
  };

  /* Face Shape Quiz Recommender */
  const applyRecommendedFaceShape = () => {
    let rec = "oval";
    if (shapeQuiz.lengthVsWidth === "long") {
      rec = "oblong";
    } else if (shapeQuiz.foreheadVsJaw === "widerForehead") {
      rec = "heart";
    } else if (shapeQuiz.jawShape === "angular") {
      rec = "square";
    } else if (
      shapeQuiz.lengthVsWidth === "wide" &&
      shapeQuiz.jawShape === "soft"
    ) {
      rec = "round";
    }
    setGroom({ faceShape: rec });
    if (typeof notify === "function") {
      notify(`Matched face shape: ${FACE_SHAPES_GUIDE[rec].label}`);
    }
  };

  /* Haircut Cycle Calculator */
  const haircutStatus = useMemo(() => {
    if (!groom.lastHaircutDate) return null;
    const daysSince = Math.max(0, dayDiff(groom.lastHaircutDate, today));
    const nextIdealISO = addDaysISO(groom.lastHaircutDate, 28);
    const daysLeft = dayDiff(today, nextIdealISO);
    return { daysSince, nextIdealISO, daysLeft };
  }, [groom.lastHaircutDate, today]);

  const copyBarberInstructions = async () => {
    const guide = FACE_SHAPES_GUIDE[selectedFaceShape];
    const text = `Barber Notes (${guide.label}):\n• Haircut: ${guide.haircut}\n• Sides: Low/Mid taper fade (#1.5 to #3 guard), keep upper-side structure.\n• Beard: ${guide.beard} (Neckline 1 finger above Adam's apple).`;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        notify("Barber cheat-sheet copied to clipboard!");
      }
    } catch {
      notify("Copy manually from the card.");
    }
  };

  /* Daily AM/PM Skincare Tracker (Synced with +5 pts in todayDayObj.c.skincare) */
  const todaySkinLog = todayDayObj.skinCareSteps || {
    amCleanse: false,
    amSpf: false,
    pmWash: false,
    pmMoist: false,
  };

  const toggleSkinStepToday = (key) => {
    const nextLog = { ...todaySkinLog, [key]: !todaySkinLog[key] };
    const bothDone =
      (nextLog.amCleanse || nextLog.amSpf) &&
      (nextLog.pmWash || nextLog.pmMoist);

    setData((old) => {
      const prevDay = (old.days && old.days[today]) || createEmptyDay();
      return {
        ...old,
        days: {
          ...(old.days || {}),
          [today]: {
            ...prevDay,
            skinCareSteps: nextLog,
            c: {
              ...(prevDay.c || {}),
              skincare: bothDone || Boolean(prevDay.c?.skincare),
            },
          },
        },
      };
    });

    if (bothDone && !todayDayObj.c?.skincare && typeof notify === "function") {
      notify("AM + PM Skincare complete! (+5 Comeback pts unlocked)");
    }
  };

  /* Capsule Wardrobe Closet & Cost Estimator */
  const ownedWardrobe = groom.ownedWardrobe || {};
  const fitChecks = groom.fitChecks || {};
  const visualHeightChecks = groom.visualHeightChecks || {};

  const wardrobeSummary = useMemo(() => {
    let ownedCount = 0;
    let remainingCost = 0;

    WARDROBE_CAPSULE.forEach((row, idx) => {
      const isOwned = Boolean(ownedWardrobe[idx]);
      if (isOwned) {
        ownedCount += 1;
      } else {
        const rangeStr = budgetTier === "low" ? row.low : row.mid;
        remainingCost += parseAvgRupeeRange(rangeStr);
      }
    });

    return {
      ownedCount,
      totalItems: WARDROBE_CAPSULE.length,
      pct: percent(ownedCount, WARDROBE_CAPSULE.length),
      remainingCost,
    };
  }, [ownedWardrobe, budgetTier]);

  const quickWinsDoneCount = WEEK1_QUICK_WINS.filter((qw) =>
    Boolean(groom.quickWins && groom.quickWins[qw.id])
  ).length;

  const weeklyGroomDoneCount = WEEKLY_GROOM_CHECKS.filter((wg) =>
    Boolean(groom.weeklyChecks && groom.weeklyChecks[wg.id])
  ).length;

  return (
    <>
      <Heading
        eyebrow="PRACTICAL GROOMING · MAX 15 MIN/DAY"
        title="Looks, height posture & style"
        description="Focus on what actually works: posture, spinal decompression (+1–2 cm height), skin clarity, haircut framing, and well-fitted clothes."
      />

      <div className="stats-grid" style={{ marginBottom: 18 }}>
        <Stat
          icon="◌"
          label="Today's Face Routine"
          value={isFaceRoutineLoggedToday ? "Done ✓" : "5–8 mins"}
          detail={`${
            Object.values(doneRoutineSteps).filter(Boolean).length
          }/${FACE_ROUTINE_STEPS.length} steps checked today`}
          color="sage"
        />
        <Stat
          icon="↕"
          label="Height & Decompression"
          value={`+${heightPotential.totalReclaimCm} cm`}
          detail={`${heightPotential.baseHeight} → ${heightPotential.potentialHeight} cm potential`}
          color="blue"
        />
        <Stat
          icon="☀"
          label="AM + PM Skincare"
          value={todayDayObj.c?.skincare ? "+5 pts ✓" : "In Progress"}
          detail={`Profile: ${SKIN_ROUTINES[selectedSkinType].label}`}
          color="peach"
        />
        <Stat
          icon="👕"
          label="Capsule Wardrobe"
          value={`${wardrobeSummary.ownedCount}/${wardrobeSummary.totalItems} Owned`}
          detail={`Week-1 Quick Wins: ${quickWinsDoneCount}/${WEEK1_QUICK_WINS.length}`}
          color="lavender"
        />
      </div>

      <div className="tabs large-tabs">
        {[
          ["face", "Face & Posture Routine"],
          ["height", "Height (+1–2 cm Protocol)"],
          ["hair", "Hair & Beard Guide"],
          ["skin", "Skin & Tan Control"],
          ["groom", "Wardrobe & Quick Wins"],
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
          TAB 1: FACE & POSTURE ROUTINE + 7-QUESTION HABIT AUDIT
          ===================================================================== */}
      {subTab === "face" && (
        <div className="stack-col">
          <div className="intro-callout">
            <div className="callout-icon">◌</div>
            <div>
              <strong>The truth about facial symmetry</strong>
              <p>{FACE_SACH_CARD.intro}</p>
            </div>
          </div>

          <div className="dashboard-grid">
            <Card>
              <div className="section-head">
                <div>
                  <div className="eyebrow">DAILY 5–8 MIN ROUTINE</div>
                  <h2>Gentle neck, jaw &amp; posture stepper</h2>
                  <p>Stop immediately if you feel any jaw clicking or pain.</p>
                </div>
                <Button
                  kind={isFaceRoutineLoggedToday ? "secondary" : "primary"}
                  onClick={() =>
                    markFullFaceRoutineToday(!isFaceRoutineLoggedToday)
                  }
                >
                  {isFaceRoutineLoggedToday
                    ? "✓ Logged for Today"
                    : "✓ Complete All 5 Steps"}
                </Button>
              </div>

              <div className="stack-col" style={{ marginTop: 14 }}>
                {FACE_ROUTINE_STEPS.map((s) => {
                  const stepDone =
                    Boolean(doneRoutineSteps[s.id]) || isFaceRoutineLoggedToday;
                  return (
                    <div
                      key={s.id}
                      className="routine-step-box"
                      style={
                        stepDone
                          ? { borderLeft: "4px solid var(--sage)" }
                          : undefined
                      }
                    >
                      <div className="row-between">
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                          }}
                        >
                          <button
                            type="button"
                            className="check-circle"
                            onClick={() => toggleFaceStepDone(s.id)}
                          >
                            {stepDone ? "✓" : ""}
                          </button>
                          <strong>{s.name}</strong>
                        </div>
                        <span className="status-pill complete">{s.reps}</span>
                      </div>
                      <p style={{ marginTop: 6 }}>{s.instruction}</p>
                      <CountdownTimer
                        defaultSeconds={s.durationSec}
                        label={s.name}
                        onComplete={() => {
                          setDoneRoutineSteps((prev) => ({
                            ...prev,
                            [s.id]: true,
                          }));
                          if (typeof notify === "function") {
                            notify(`${s.name} completed!`);
                          }
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </Card>

            <div className="stack-col">
              <Card>
                <div className="eyebrow">ORDERED BY REAL IMPACT</div>
                <h2>What actually improves your face</h2>
                <div className="habit-list" style={{ marginTop: 12 }}>
                  {FACE_SACH_CARD.impactOrder.map((item) => (
                    <div className="habit-row" key={item.rank}>
                      <span className="status-pill complete">#{item.rank}</span>
                      <div className="habit-info">
                        <strong>{item.title}</strong>
                        <small>{item.detail}</small>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {auditSummary.dentistAlerts.length > 0 && (
                <div className="intro-callout" style={{ marginBottom: 0 }}>
                  <div className="callout-icon">⚠️</div>
                  <div>
                    <strong>
                      TMJ / Dental Check Recommended (
                      {auditSummary.dentistAlerts.length} flag
                      {auditSummary.dentistAlerts.length > 1 ? "s" : ""})
                    </strong>
                    <p>
                      You noted jaw clicking, teeth clenching, or an uneven
                      bite. Skip all jaw-resistance exercises and consult a
                      dentist for a safe evaluation.
                    </p>
                  </div>
                </div>
              )}

              <Accordion
                title={`Interactive 7-Question Face & Jaw Habit Audit (${auditSummary.healthyCount}/7 Optimal)`}
                badge="Audit"
                defaultOpen={auditSummary.answeredCount < 7}
              >
                <div className="stack-col">
                  {FACE_AUDIT_QUESTIONS.map((q) => {
                    const currentAns = auditAnswers[q.id] || "";
                    const isDentistFlag =
                      q.dentistOn && currentAns === q.dentistOn;
                    return (
                      <div key={q.id} className="audit-q-box">
                        <strong>{q.question}</strong>
                        <div
                          className="category-pills"
                          style={{ marginTop: 8 }}
                        >
                          {q.options.map((opt) => (
                            <button
                              type="button"
                              key={opt.value}
                              className={
                                currentAns === opt.value ? "selected" : ""
                              }
                              onClick={() => handleAuditChange(q.id, opt.value)}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                        {currentAns && (
                          <small
                            className="muted-text"
                            style={
                              isDentistFlag ? { color: "#c89572" } : undefined
                            }
                          >
                            {isDentistFlag ? "⚠️ Dentist Note: " : "💡 Tip: "}
                            {q.tip}
                          </small>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Accordion>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2 (NEW): HEIGHT (+1 TO 2.5 CM BIOMECHANICAL PROTOCOL AT AGE 22)
          ===================================================================== */}
      {subTab === "height" && (
        <div className="stack-col">
          <div className="intro-callout">
            <div className="callout-icon">↕</div>
            <div>
              <strong>
                Age 22 Par 1–2 cm Height Badhane Ka Honest Scientific Sach
              </strong>
              <p>
                22 ki umar mein leg bones ki growth plates fuse ho chuki hoti
                hain, isliye fake height pills se door raho. Lekin aapki{" "}
                <strong>23 Spinal Discs (reerh ki gaddiyan)</strong>,{" "}
                <strong>Anterior Pelvic Tilt (APT)</strong>, aur{" "}
                <strong>Forward Neck Slouch</strong> mein{" "}
                <strong>1.5 se 2.5 cm</strong> asli standing height dabi hoti
                hai—jise Spinal Decompression aur Alignment se 4–6 weeks mein
                reclaim kiya ja sakta hai.
              </p>
            </div>
          </div>

          <div className="dashboard-grid">
            {/* LEFT: 5-STEP SPINAL DECOMPRESSION & ALIGNMENT PROTOCOL */}
            <Card>
              <div className="section-head">
                <div>
                  <div className="eyebrow">
                    EVIDENCE-BASED SPINAL DECOMPRESSION
                  </div>
                  <h2>Daily 6-Min Height &amp; Spine Lengthening Routine</h2>
                  <p>
                    Best done after long study sessions or before sleep to
                    decompress your 23 intervertebral discs.
                  </p>
                </div>
                <Button
                  kind={isHeightRoutineDoneToday ? "secondary" : "primary"}
                  onClick={() =>
                    markFullHeightRoutineToday(!isHeightRoutineDoneToday)
                  }
                >
                  {isHeightRoutineDoneToday
                    ? "✓ Logged Today"
                    : "✓ Complete All 5 Steps"}
                </Button>
              </div>

              <div className="stack-col" style={{ marginTop: 12 }}>
                {HEIGHT_DECOMPRESSION_STEPS.map((s) => {
                  const stepDone =
                    Boolean(doneHeightSteps[s.id]) || isHeightRoutineDoneToday;
                  return (
                    <div
                      key={s.id}
                      className="routine-step-box"
                      style={
                        stepDone
                          ? { borderLeft: "4px solid var(--sage)" }
                          : undefined
                      }
                    >
                      <div className="row-between">
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                          }}
                        >
                          <button
                            type="button"
                            className={`check-circle ${
                              stepDone ? "checked" : ""
                            }`}
                            onClick={() => toggleHeightStepDone(s.id)}
                          >
                            {stepDone ? "✓" : ""}
                          </button>
                          <strong>{s.name}</strong>
                        </div>
                        <span className="status-pill complete">
                          {s.gainTag}
                        </span>
                      </div>

                      <small className="muted-text">
                        Prescription: <strong>{s.reps}</strong>
                      </small>
                      <p>{s.instruction}</p>

                      <CountdownTimer
                        defaultSeconds={s.durationSec}
                        label={s.name}
                        onComplete={() => {
                          toggleHeightStepDone(s.id);
                          if (typeof notify === "function") {
                            notify(`${s.name} hold complete!`);
                          }
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* RIGHT: HIDDEN HEIGHT CALCULATOR + MORNING VS EVENING LOG + VISUAL +3CM */}
            <div className="stack-col">
              <Card>
                <div className="eyebrow">
                  HIDDEN POSTURAL HEIGHT CALCULATOR
                </div>
                <h2>
                  Kitne cm height aapki posture mein dabi hui hai? (+
                  {heightPotential.totalReclaimCm} cm)
                </h2>
                <p>
                  Answer 3 quick questions below to see how much vertical
                  stadiometer height you can unlock from decompression &amp;
                  pelvic alignment:
                </p>

                <div className="stack-col" style={{ marginTop: 12 }}>
                  <Field label="1. Roz kitne ghante lagatar chair/bed par baith kar padhte ho?">
                    <select
                      value={heightAudit.sittingHours}
                      onChange={(e) =>
                        setHeightAudit({
                          ...heightAudit,
                          sittingHours: e.target.value,
                        })
                      }
                    >
                      <option value="high">
                        6–10+ hours/day (High disc compression: ~1.1 cm)
                      </option>
                      <option value="med">
                        3–6 hours/day (Moderate compression: ~0.8 cm)
                      </option>
                      <option value="low">
                        Under 3 hours/day (Minimal compression: ~0.6 cm)
                      </option>
                    </select>
                  </Field>

                  <Field label="2. Kya aapki lower back arch hoti hai aur pet aage nikalta hai (APT)?">
                    <select
                      value={heightAudit.aptLevel}
                      onChange={(e) =>
                        setHeightAudit({
                          ...heightAudit,
                          aptLevel: e.target.value,
                        })
                      }
                    >
                      <option value="high">
                        Yes, noticeable lower-back arch (~1.0 cm hidden)
                      </option>
                      <option value="moderate">
                        Slight pelvic tilt from sitting (~0.6 cm hidden)
                      </option>
                      <option value="none">
                        No, flat neutral pelvis (~0.2 cm)
                      </option>
                    </select>
                  </Field>

                  <Field label="3. Phone/Laptop dekhte waqt gardan aur kandhe aage jhukte hain?">
                    <select
                      value={heightAudit.neckSlouch}
                      onChange={(e) =>
                        setHeightAudit({
                          ...heightAudit,
                          neckSlouch: e.target.value,
                        })
                      }
                    >
                      <option value="yes">
                        Yes, tech-neck / rounded shoulders (~0.6 cm hidden)
                      </option>
                      <option value="no">
                        No, ears stay aligned over shoulders (~0.2 cm)
                      </option>
                    </select>
                  </Field>
                </div>

                <div
                  className="mini-stat-row"
                  style={{ marginTop: 14, marginBottom: 0 }}
                >
                  <div>
                    <span className="mini-stat-number">
                      {heightPotential.baseHeight} cm
                    </span>
                    <span>Current Compressed Height</span>
                  </div>
                  <div>
                    <span className="mini-stat-number">
                      +{heightPotential.totalReclaimCm} cm
                    </span>
                    <span>Reclaimable Spine + APT</span>
                  </div>
                  <div>
                    <span className="mini-stat-number">
                      {heightPotential.potentialHeight} cm
                    </span>
                    <span>Decompressed Peak Height</span>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="eyebrow">
                  DIURNAL SPINE TRACKER (MORNING VS. NIGHT)
                </div>
                <h2>Measure your 1.5 cm morning vs. evening gap</h2>
                <p>
                  Har insaan subah uthte hi <strong>1.5 se 2 cm lamba</strong>{" "}
                  hota hai kyunki raat mein discs phool jati hain. Goal ye hai
                  ki Dead Hangs aur Core/Glute strength se aap subah wali height
                  din bhar hold kar sako.
                </p>

                <div className="form-grid" style={{ marginTop: 12 }}>
                  <Field label="Morning Height (Right after waking up - cm)">
                    <input
                      type="number"
                      step="0.1"
                      value={heightForm.morningCm}
                      onChange={(e) =>
                        setHeightForm({
                          ...heightForm,
                          morningCm: e.target.value,
                        })
                      }
                    />
                  </Field>
                  <Field label="Evening Height (Before bed - cm)">
                    <input
                      type="number"
                      step="0.1"
                      value={heightForm.eveningCm}
                      onChange={(e) =>
                        setHeightForm({
                          ...heightForm,
                          eveningCm: e.target.value,
                        })
                      }
                    />
                  </Field>
                </div>

                <div
                  className="row-between"
                  style={{ marginTop: 12, flexWrap: "wrap", gap: 10 }}
                >
                  <Button kind="primary" onClick={handleSaveHeightLog}>
                    Save Height Measurement
                  </Button>
                  <span className="status-pill complete">
                    Daily Disc Shrinkage:{" "}
                    {Math.max(
                      0,
                      safeNum(heightForm.morningCm, 173.5) -
                        safeNum(heightForm.eveningCm, 172)
                    ).toFixed(1)}{" "}
                    cm
                  </span>
                </div>

                {(groom.heightLogs || []).length > 0 && (
                  <div className="habit-list" style={{ marginTop: 12 }}>
                    {(groom.heightLogs || []).slice(0, 4).map((hl) => (
                      <div key={hl.id} className="habit-row checked">
                        <div className="habit-info">
                          <strong>
                            ☀ AM: {hl.morningCm} cm · ☾ PM: {hl.eveningCm} cm
                          </strong>
                          <small>{fmtDate(hl.date)}</small>
                        </div>
                        <span className="status-pill">
                          Δ {hl.dropCm} cm gap
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card>
                <div className="eyebrow">
                  INSTANT VISUAL HEIGHT (+2.5 TO 3.5 CM PERCEIVED)
                </div>
                <h2>5 Optical &amp; Footwear Rules to Look Taller Today</h2>
                <div className="habit-list" style={{ marginTop: 12 }}>
                  {VISUAL_HEIGHT_HACKS.map((vh) => {
                    const checked = Boolean(visualHeightChecks[vh.id]);
                    return (
                      <div
                        key={vh.id}
                        className={`habit-row ${checked ? "checked" : ""}`}
                      >
                        <button
                          type="button"
                          className="check-circle"
                          onClick={() =>
                            setGroom({
                              visualHeightChecks: {
                                ...visualHeightChecks,
                                [vh.id]: !checked,
                              },
                            })
                          }
                        >
                          {checked ? "✓" : ""}
                        </button>
                        <div className="habit-info">
                          <strong>{vh.title}</strong>
                          <small>{vh.sub}</small>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 3: HAIR & BEARD GUIDE + FACE SHAPE FINDER & HAIRCUT TRACKER
          ===================================================================== */}
      {subTab === "hair" && (
        <div className="stack-col">
          <div className="dashboard-grid">
            <Card>
              <div className="section-head">
                <div>
                  <div className="eyebrow">FACE SHAPE SELECTOR</div>
                  <h2>Haircut &amp; beard framing guide</h2>
                </div>
                <Button onClick={copyBarberInstructions}>
                  📋 Copy Barber Notes
                </Button>
              </div>

              <div className="category-pills" style={{ marginTop: 12 }}>
                {Object.keys(FACE_SHAPES_GUIDE).map((shape) => (
                  <button
                    type="button"
                    key={shape}
                    className={selectedFaceShape === shape ? "selected" : ""}
                    onClick={() => setGroom({ faceShape: shape })}
                  >
                    {shape.toUpperCase()}
                  </button>
                ))}
              </div>

              <div className="intro-callout" style={{ marginBottom: 14 }}>
                <div className="callout-icon">✂</div>
                <div>
                  <strong>{FACE_SHAPES_GUIDE[selectedFaceShape].label}</strong>
                  <p>
                    <strong>Haircut:</strong>{" "}
                    {FACE_SHAPES_GUIDE[selectedFaceShape].haircut}
                  </p>
                  <p>
                    <strong>Beard:</strong>{" "}
                    {FACE_SHAPES_GUIDE[selectedFaceShape].beard}
                  </p>
                </div>
              </div>

              <Accordion
                title="Not sure about your face shape? Take the 30-sec Finder"
                badge="Quiz"
              >
                <div className="stack-col">
                  <Field label="1. Face Length vs. Cheekbone Width">
                    <select
                      value={shapeQuiz.lengthVsWidth}
                      onChange={(e) =>
                        setShapeQuiz({
                          ...shapeQuiz,
                          lengthVsWidth: e.target.value,
                        })
                      }
                    >
                      <option value="balanced">
                        Slightly longer than wide (Balanced)
                      </option>
                      <option value="long">
                        Noticeably long / narrow cheeks
                      </option>
                      <option value="wide">
                        Almost as wide as it is long
                      </option>
                    </select>
                  </Field>

                  <Field label="2. Jawline Angle">
                    <select
                      value={shapeQuiz.jawShape}
                      onChange={(e) =>
                        setShapeQuiz({ ...shapeQuiz, jawShape: e.target.value })
                      }
                    >
                      <option value="rounded">
                        Slightly curved / balanced chin
                      </option>
                      <option value="angular">
                        Sharp, wide, boxy jaw corners
                      </option>
                      <option value="soft">Soft / full cheeks</option>
                    </select>
                  </Field>

                  <Field label="3. Forehead vs. Jaw Width">
                    <select
                      value={shapeQuiz.foreheadVsJaw}
                      onChange={(e) =>
                        setShapeQuiz({
                          ...shapeQuiz,
                          foreheadVsJaw: e.target.value,
                        })
                      }
                    >
                      <option value="equal">
                        Forehead &amp; jaw are similar width
                      </option>
                      <option value="widerForehead">
                        Forehead is wider; chin is narrower/pointed
                      </option>
                    </select>
                  </Field>

                  <Button kind="primary" onClick={applyRecommendedFaceShape}>
                    Detect My Face Shape
                  </Button>
                </div>
              </Accordion>
            </Card>

            <div className="stack-col">
              <Card>
                <div className="eyebrow">BARBER CHEAT-SHEET</div>
                <h2>What to tell your barber</h2>
                <div className="habit-list" style={{ marginTop: 12 }}>
                  <div className="habit-row">
                    <div className="habit-info">
                      <strong>Show 2 clear photos (front &amp; side)</strong>
                      <small>
                        Visuals work better than technical English hairstyle
                        names.
                      </small>
                    </div>
                  </div>
                  <div className="habit-row">
                    <div className="habit-info">
                      <strong>Low taper fade on sides (#1.5 to #3)</strong>
                      <small>
                        Avoid high skin-zero fades if you have a long or thin
                        face.
                      </small>
                    </div>
                  </div>
                  <div className="habit-row">
                    <div className="habit-info">
                      <strong>
                        Beard neckline 1 finger above Adam&apos;s apple
                      </strong>
                      <small>
                        Creates a clean shadow under the jaw that sharpens your
                        profile.
                      </small>
                    </div>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="eyebrow">28-DAY GROOMING CYCLE</div>
                <h2>Haircut &amp; neckline tracker</h2>
                <div className="form-grid" style={{ marginTop: 12 }}>
                  <Field label="Last Haircut Date">
                    <input
                      type="date"
                      max={today}
                      value={groom.lastHaircutDate || ""}
                      onChange={(e) =>
                        setGroom({ lastHaircutDate: e.target.value })
                      }
                    />
                  </Field>
                </div>
                {haircutStatus && (
                  <p style={{ marginTop: 12 }}>
                    • Days since last haircut:{" "}
                    <strong>{haircutStatus.daysSince} days</strong>
                    <br />• Recommended next trim (4-week cycle):{" "}
                    <strong>{fmtDate(haircutStatus.nextIdealISO)}</strong>{" "}
                    {haircutStatus.daysLeft <= 0 ? (
                      <span className="status-pill peach-pill">
                        Due for a trim!
                      </span>
                    ) : (
                      <span className="status-pill complete">
                        In {haircutStatus.daysLeft} days
                      </span>
                    )}
                  </p>
                )}
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 4: SKIN & TAN CONTROL + DAILY AM/PM SKINCARE CHECKLIST
          ===================================================================== */}
      {subTab === "skin" && (
        <div className="stack-col">
          <Card>
            <div className="section-head">
              <div>
                <div className="eyebrow">
                  TODAY&apos;S SKINCARE LOG (+5 COMEBACK PTS)
                </div>
                <h2>Interactive AM &amp; PM daily check-in ({fmtDate(today)})</h2>
                <p>
                  Complete at least 1 Morning and 1 Night step to automatically
                  earn your +5 daily skincare points.
                </p>
              </div>
              <span
                className={`status-pill ${
                  todayDayObj.c?.skincare ? "complete" : ""
                }`}
              >
                {todayDayObj.c?.skincare ? "✓ +5 pts Unlocked" : "Pending"}
              </span>
            </div>

            <div className="form-grid" style={{ marginTop: 12 }}>
              {[
                [
                  "amCleanse",
                  "AM: Gentle Face Cleanser + Moisturizer",
                  "Wash off night oil; never use harsh body soap on your face",
                ],
                [
                  "amSpf",
                  "AM: 2-Finger SPF 50 PA+++ Sunscreen",
                  "Apply 15 mins before stepping out to prevent UV tan & dark spots",
                ],
                [
                  "pmWash",
                  "PM: Evening Face Wash (Remove sweat & dust)",
                  "Crucial after evening workout or dusty commute",
                ],
                [
                  "pmMoist",
                  "PM: Night Barrier Moisturizer + Lip Care",
                  "Repairs skin barrier overnight while you sleep",
                ],
              ].map(([key, title, sub]) => {
                const checked = Boolean(todaySkinLog[key]);
                return (
                  <div
                    key={key}
                    className={`habit-row ${checked ? "checked" : ""}`}
                  >
                    <button
                      type="button"
                      className="check-circle"
                      onClick={() => toggleSkinStepToday(key)}
                    >
                      {checked ? "✓" : ""}
                    </button>
                    <div className="habit-info">
                      <strong>{title}</strong>
                      <small>{sub}</small>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <div className="eyebrow">AM &amp; PM SKINCARE BUILDER</div>
            <h2>Select your skin type</h2>
            <div className="category-pills" style={{ marginTop: 12 }}>
              {Object.keys(SKIN_ROUTINES).map((st) => (
                <button
                  type="button"
                  key={st}
                  className={selectedSkinType === st ? "selected" : ""}
                  onClick={() => setGroom({ skinType: st })}
                >
                  {SKIN_ROUTINES[st].label}
                </button>
              ))}
            </div>
            <div className="record-grid">
              <div className="routine-step-box">
                <strong>Morning (AM) Routine</strong>
                {SKIN_ROUTINES[selectedSkinType].am.map((line, i) => (
                  <p key={i}>• {line}</p>
                ))}
              </div>
              <div className="routine-step-box">
                <strong>Night (PM) &amp; Weekly Care</strong>
                {SKIN_ROUTINES[selectedSkinType].pm.map((line, i) => (
                  <p key={i}>• {line}</p>
                ))}
                <p style={{ marginTop: 8 }}>
                  <strong>Weekly:</strong>{" "}
                  {SKIN_ROUTINES[selectedSkinType].weekly}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* =====================================================================
          TAB 5: WARDROBE CAPSULE, FIT AUDIT & QUICK WINS
          ===================================================================== */}
      {subTab === "groom" && (
        <div className="stack-col">
          <div className="dashboard-grid">
            <Card>
              <div className="section-head">
                <div>
                  <div className="eyebrow">FAST VISIBLE RESULTS</div>
                  <h2>Week-1 quick wins</h2>
                </div>
                <span className="status-pill complete">
                  {quickWinsDoneCount}/{WEEK1_QUICK_WINS.length}
                </span>
              </div>
              <div className="habit-list" style={{ marginTop: 12 }}>
                {WEEK1_QUICK_WINS.map((qw) => {
                  const checked = Boolean(
                    groom.quickWins && groom.quickWins[qw.id]
                  );
                  return (
                    <div
                      className={`habit-row ${checked ? "checked" : ""}`}
                      key={qw.id}
                    >
                      <button
                        type="button"
                        className="check-circle"
                        onClick={() =>
                          setGroom({
                            quickWins: {
                              ...(groom.quickWins || {}),
                              [qw.id]: !checked,
                            },
                          })
                        }
                      >
                        {checked ? "✓" : ""}
                      </button>
                      <div className="habit-info">
                        <strong>{qw.title}</strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card>
              <div className="section-head">
                <div>
                  <div className="eyebrow">WEEKLY HYGIENE CHECKLIST</div>
                  <h2>Sunday grooming reset</h2>
                </div>
                <div className="heading-btn-group">
                  <span className="status-pill complete">
                    {weeklyGroomDoneCount}/{WEEKLY_GROOM_CHECKS.length}
                  </span>
                  {weeklyGroomDoneCount > 0 && (
                    <Button onClick={() => setGroom({ weeklyChecks: {} })}>
                      Reset Week
                    </Button>
                  )}
                </div>
              </div>
              <div className="habit-list" style={{ marginTop: 12 }}>
                {WEEKLY_GROOM_CHECKS.map((wg) => {
                  const checked = Boolean(
                    groom.weeklyChecks && groom.weeklyChecks[wg.id]
                  );
                  return (
                    <div
                      className={`habit-row ${checked ? "checked" : ""}`}
                      key={wg.id}
                    >
                      <button
                        type="button"
                        className="check-circle"
                        onClick={() =>
                          setGroom({
                            weeklyChecks: {
                              ...(groom.weeklyChecks || {}),
                              [wg.id]: !checked,
                            },
                          })
                        }
                      >
                        {checked ? "✓" : ""}
                      </button>
                      <div className="habit-info">
                        <strong>{wg.title}</strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          <Card>
            <div className="section-head">
              <div>
                <div className="eyebrow">SLIM FRAME CAPSULE WARDROBE</div>
                <h2>
                  Essential pieces &amp; Indian skin tone colours (
                  {wardrobeSummary.ownedCount}/{wardrobeSummary.totalItems}{" "}
                  Owned)
                </h2>
                <p>
                  Best colours:{" "}
                  <strong>
                    Navy Blue, Olive Green, Crisp White, Maroon, Charcoal, Beige
                  </strong>
                  . Check off items you already own to estimate your upgrade
                  budget.
                </p>
              </div>
              <div className="tabs">
                <button
                  type="button"
                  className={budgetTier === "low" ? "selected" : ""}
                  onClick={() => setBudgetTier("low")}
                >
                  Budget Tier
                </button>
                <button
                  type="button"
                  className={budgetTier === "mid" ? "selected" : ""}
                  onClick={() => setBudgetTier("mid")}
                >
                  Mid-Range Tier
                </button>
              </div>
            </div>

            <div style={{ marginTop: 10, marginBottom: 14 }}>
              <div className="row-between" style={{ marginBottom: 6 }}>
                <strong>Closet Readiness ({wardrobeSummary.pct}%)</strong>
                <span>
                  Est. Remaining Upgrade Cost:{" "}
                  <strong>
                    ₹{wardrobeSummary.remainingCost.toLocaleString("en-IN")}
                  </strong>{" "}
                  ({budgetTier === "low" ? "Budget" : "Mid-Range"})
                </span>
              </div>
              <Progress value={wardrobeSummary.pct} />
            </div>

            <div className="table-wrap" style={{ marginTop: 12 }}>
              <table className="clean-table">
                <thead>
                  <tr>
                    <th style={{ width: 64 }}>Owned</th>
                    <th>
                      Capsule Item (Shoulder seam must sit on shoulder bone)
                    </th>
                    <th>Budget</th>
                    <th>Mid-Range</th>
                  </tr>
                </thead>
                <tbody>
                  {WARDROBE_CAPSULE.map((row, i) => {
                    const isOwned = Boolean(ownedWardrobe[i]);
                    return (
                      <tr key={i}>
                        <td>
                          <button
                            type="button"
                            className={`check-circle ${
                              isOwned ? "checked" : ""
                            }`}
                            onClick={() =>
                              setGroom({
                                ownedWardrobe: {
                                  ...ownedWardrobe,
                                  [i]: !isOwned,
                                },
                              })
                            }
                          >
                            {isOwned ? "✓" : ""}
                          </button>
                        </td>
                        <td>
                          <strong className={isOwned ? "struck" : ""}>
                            {row.item}
                          </strong>
                        </td>
                        <td>{row.low}</td>
                        <td>{row.mid}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <div className="eyebrow">PROPORTION &amp; VISUAL STRUCTURE</div>
            <h2>4-Point clothing fit audit for slim frames</h2>
            <div className="habit-list" style={{ marginTop: 12 }}>
              {FIT_RULES_CHECKLIST.map((rule) => {
                const checked = Boolean(fitChecks[rule.id]);
                return (
                  <div
                    key={rule.id}
                    className={`habit-row ${checked ? "checked" : ""}`}
                  >
                    <button
                      type="button"
                      className="check-circle"
                      onClick={() =>
                        setGroom({
                          fitChecks: {
                            ...fitChecks,
                            [rule.id]: !checked,
                          },
                        })
                      }
                    >
                      {checked ? "✓" : ""}
                    </button>
                    <div className="habit-info">
                      <strong>{rule.title}</strong>
                      <small>{rule.sub}</small>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}
    </>
  );
}

export { LooksPage };