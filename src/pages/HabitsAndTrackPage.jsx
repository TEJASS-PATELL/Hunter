import React, { useState, useMemo, useEffect } from "react";
import {
  uid,
  addDaysISO,
  getWeekdayShort,
  fmtDate,
  percent,
  safeNum,
  MINIMUM_DAY_IDS,
  SCORED_CHECKS,
  LIFE_BASICS,
  CONTROL_LOOPS,
  FACE_HABITS,
  DEFAULT_SCHEDULE,
  MOOD_ACTIVITIES,
  createEmptyDay,
  calcDailyScoreBreakdown,
  calcDailyScore,
  Button,
  Card,
  Heading,
  Empty,
  Progress,
  Field,
  Stat,
} from "../shared";

const HABIT_STACK_PRESETS = [
  {
    anchor: "Subah uth kar paani peene ke turant baad",
    action: "Main bistar saaf karunga aur 15 min dhoop mein walk karunga",
    category: "Morning Anchor",
  },
  {
    anchor: "Dopahar ka khana khane ke baad",
    action: "Main bina phone ke 15 min family ke saath baithunga",
    category: "Social & Mind",
  },
  {
    anchor: "Shaam ko study/kaam khatam karne ke baad",
    action: "Main turant workout kapde pehnunga aur 1st warm-up set shuru karunga",
    category: "Fitness",
  },
  {
    anchor: "Raat ko 10:00 PM alarm bajte hi",
    action: "Main phone bedroom ke bahar charge par lagaunga aur 2-line journal likhunga",
    category: "Sleep Shield",
  },
];

function HabitsAndTrackPage({
  data,
  setData,
  today,
  selectedISO,
  setSelectedISO,
  updateDay,
  dm,
  onAdd,
  onEdit,
  onToggle,
  onDelete,
  showArchived,
  setShowArchived,
  query,
  setQuery,
}) {
  const [viewMode, setViewMode] = useState("tracker"); // tracker | custom | matrix | schedule
  const [filter, setFilter] = useState("all");
  const [newWin, setNewWin] = useState("");
  const [onlyMinDay, setOnlyMinDay] = useState(false);
  const [stackInput, setStackInput] = useState({
    anchor: "",
    action: "",
    category: "Morning Anchor",
  });
  const [currentTimeStr, setCurrentTimeStr] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}`;
  });

  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = new Date();
      setCurrentTimeStr(
        `${String(now.getHours()).padStart(2, "0")}:${String(
          now.getMinutes()
        ).padStart(2, "0")}`
      );
    }, 60000);
    return () => window.clearInterval(timer);
  }, []);

  const p = data.profile || {};
  const dayObj = (data.days && data.days[selectedISO]) || createEmptyDay();

  const breakdown = useMemo(
    () => calcDailyScoreBreakdown(dayObj, p),
    [dayObj, p]
  );

  /* 7-Day Window for Matrix & Trend */
  const last7Dates = useMemo(() => {
    return Array.from({ length: 7 }, (_, idx) => {
      const iso = addDaysISO(selectedISO, -(6 - idx));
      const d = (data.days && data.days[iso]) || createEmptyDay();
      return {
        iso,
        shortDay: getWeekdayShort(iso),
        dayNum: iso.slice(8),
        score: calcDailyScore(d, p),
        dayObj: d,
      };
    });
  }, [selectedISO, data.days, p]);

  const avg7DayScore = useMemo(() => {
    if (!last7Dates.length) return 0;
    const sum = last7Dates.reduce((acc, item) => acc + item.score, 0);
    return Math.round(sum / last7Dates.length);
  }, [last7Dates]);

  const list = (data.habits || []).filter(
    (h) =>
      !!h.archived === showArchived &&
      (filter === "all" || h.kind === filter) &&
      (h.name || "").toLowerCase().includes((query || "").toLowerCase())
  );

  const builds = (data.habits || []).filter(
    (h) => !h.archived && h.kind !== "quit"
  ).length;

  const quits = (data.habits || []).filter(
    (h) => !h.archived && h.kind === "quit"
  ).length;

  const toggleGroup = (groupKey, itemId, val) => {
    updateDay(selectedISO, (prev) => ({
      ...prev,
      [groupKey]: {
        ...(prev[groupKey] || {}),
        [itemId]: val,
      },
    }));
  };

  const toggleCoreCheck = (checkId) => {
    const currentVal = Boolean(dayObj.c && dayObj.c[checkId]);
    const nextVal = !currentVal;
    updateDay(selectedISO, (prev) => ({
      ...prev,
      slip: checkId === "noPorn" && nextVal ? false : prev.slip,
      c: {
        ...(prev.c || {}),
        [checkId]: nextVal,
      },
    }));
  };

  const markMinimumDayDone = () => {
    updateDay(selectedISO, (prev) => {
      const nextC = { ...(prev.c || {}) };
      MINIMUM_DAY_IDS.forEach((id) => {
        nextC[id] = true;
      });
      return { ...prev, c: nextC };
    });
  };

  const handleScheduleChange = (idx, field, val) => {
    setData((old) => {
      const next = [...(old.schedule || DEFAULT_SCHEDULE)];
      next[idx] = { ...next[idx], [field]: val };
      return { ...old, schedule: next };
    });
  };

  const addScheduleBlock = () => {
    setData((old) => {
      const next = [
        ...(old.schedule || DEFAULT_SCHEDULE),
        {
          id: `sch-${uid()}`,
          time: "16:30",
          label: "New focused block / revision session",
        },
      ].sort((a, b) => (a.time || "").localeCompare(b.time || ""));
      return { ...old, schedule: next };
    });
  };

  const removeScheduleBlock = (idx) => {
    setData((old) => {
      const next = [...(old.schedule || DEFAULT_SCHEDULE)].filter(
        (_, i) => i !== idx
      );
      return { ...old, schedule: next };
    });
  };

  const resetDefaultSchedule = () => {
    setData((old) => ({
      ...old,
      schedule: DEFAULT_SCHEDULE.map((x) => ({ ...x })),
    }));
  };

  const toggleScheduleDoneForDay = (blockId) => {
    updateDay(selectedISO, (prev) => {
      const curMap = prev.scheduleDone || {};
      return {
        ...prev,
        scheduleDone: {
          ...curMap,
          [blockId]: !curMap[blockId],
        },
      };
    });
  };

  /* Habit Stacks (stored in data.habitStacks) */
  const habitStacks = data.habitStacks || [];

  const addHabitStack = (anchorText, actionText, categoryText = "Routine") => {
    const a = (anchorText || "").trim();
    const b = (actionText || "").trim();
    if (!a || !b) return;
    const newStack = {
      id: `stk-${uid()}`,
      anchor: a,
      action: b,
      category: categoryText,
    };
    setData((old) => ({
      ...old,
      habitStacks: [newStack, ...(old.habitStacks || [])],
    }));
    setStackInput({ anchor: "", action: "", category: "Morning Anchor" });
  };

  const removeHabitStack = (stackId) => {
    setData((old) => ({
      ...old,
      habitStacks: (old.habitStacks || []).filter((s) => s.id !== stackId),
    }));
  };

  /* Helper to calculate custom habit streak & 7-day history */
  const getHabitStats = (habitId) => {
    const checkins = (data.checkins || []).filter(
      (c) => c.habitId === habitId && c.done
    );
    const doneDatesSet = new Set(checkins.map((c) => c.date));
    const hObj = (data.habits || []).find((h) => h.id === habitId);
    if (hObj?.doneDate) doneDatesSet.add(hObj.doneDate);

    let streak = 0;
    let cursor = doneDatesSet.has(today) ? today : addDaysISO(today, -1);
    while (doneDatesSet.has(cursor)) {
      streak += 1;
      cursor = addDaysISO(cursor, -1);
    }

    const missedYesterday =
      !doneDatesSet.has(addDaysISO(today, -1)) && !doneDatesSet.has(today);

    const last7 = last7Dates.map((d) => ({
      iso: d.iso,
      shortDay: d.shortDay,
      done: doneDatesSet.has(d.iso),
    }));

    const rate7d = percent(
      last7.filter((x) => x.done).length,
      last7.length
    );

    return { streak, missedYesterday, last7, rate7d };
  };

  const activeLoopsList = CONTROL_LOOPS.filter((loop) =>
    (data.settings?.activeLoops || []).includes(loop.id)
  );

  const visibleScoredChecks = onlyMinDay
    ? SCORED_CHECKS.filter((item) => MINIMUM_DAY_IDS.includes(item.id))
    : SCORED_CHECKS;

  const minDayDoneCount = MINIMUM_DAY_IDS.filter(
    (id) => dayObj.c && dayObj.c[id]
  ).length;

  const targetSteps = p.targets?.steps || 8000;
  const targetWater = p.targets?.waterL || 3;
  const targetScreen = p.targets?.screenH || 3;
  const recommendedWaterByWeight = +(
    Math.max(45, safeNum(p.weightKg, 56)) * 0.04
  ).toFixed(1);

  /* Determine active schedule block index for today */
  const scheduleRows = data.schedule || DEFAULT_SCHEDULE;
  const activeScheduleIdx = useMemo(() => {
    if (selectedISO !== today) return -1;
    let found = -1;
    for (let i = 0; i < scheduleRows.length; i += 1) {
      if ((scheduleRows[i].time || "00:00") <= currentTimeStr) {
        found = i;
      }
    }
    return found;
  }, [scheduleRows, currentTimeStr, selectedISO, today]);

  return (
    <>
      <Heading
        eyebrow="CONSISTENCY OVER INTENSITY"
        title="Habits & daily tracker"
        description="Track your 100-point Comeback core, custom habits, 7-day consistency matrix, habit stacks, and daily time blocks."
        action={
          <div className="heading-btn-group">
            <Button
              onClick={() => setSelectedISO(addDaysISO(selectedISO, -1))}
              title="Previous Day"
            >
              ← Prev
            </Button>

            <input
              type="date"
              className="date-picker-input"
              value={selectedISO}
              max={today}
              onChange={(e) => setSelectedISO(e.target.value || today)}
            />

            {selectedISO !== today && (
              <Button onClick={() => setSelectedISO(today)}>
                Jump to Today
              </Button>
            )}

            <Button kind="primary" onClick={onAdd}>
              ＋ Create habit
            </Button>
          </div>
        }
      />

      <div className="mini-stat-row">
        <div>
          <span className="mini-stat-number">{breakdown.total}/100</span>
          <span>Score on {fmtDate(selectedISO)}</span>
        </div>

        <div>
          <span className="mini-stat-number">{avg7DayScore} pts</span>
          <span>7-Day avg score</span>
        </div>

        <div>
          <span className="mini-stat-number">{builds}</span>
          <span>Building habits</span>
        </div>

        <div>
          <span className="mini-stat-number">{quits}</span>
          <span>Letting go</span>
        </div>

        <div>
          <span className="mini-stat-number">
            {(data.checkins || []).filter((c) => c.done).length}
          </span>
          <span>Total check-ins</span>
        </div>
      </div>

      <div className="tabs large-tabs">
        <button
          type="button"
          className={viewMode === "tracker" ? "selected" : ""}
          onClick={() => setViewMode("tracker")}
        >
          Comeback 90 Daily Log <span>{breakdown.total} pts</span>
        </button>

        <button
          type="button"
          className={viewMode === "custom" ? "selected" : ""}
          onClick={() => setViewMode("custom")}
        >
          Custom Habits &amp; Stacks <span>{(data.habits || []).length}</span>
        </button>

        <button
          type="button"
          className={viewMode === "matrix" ? "selected" : ""}
          onClick={() => setViewMode("matrix")}
        >
          7-Day Consistency Matrix <span>{avg7DayScore}%</span>
        </button>

        <button
          type="button"
          className={viewMode === "schedule" ? "selected" : ""}
          onClick={() => setViewMode("schedule")}
        >
          Daily Time-Block Schedule <span>{scheduleRows.length}</span>
        </button>
      </div>

      {/* ================= TRACKER TAB ================= */}

      {viewMode === "tracker" && (
        <div className="tracker-layout stack-col">
          {/* 4-PILLAR SCORE BREAKDOWN & MINIMUM DAY ANCHOR */}
          <Card>
            <div className="section-head">
              <div>
                <div className="eyebrow">
                  100-POINT COMEBACK SCORE ENGINE ({fmtDate(selectedISO)})
                </div>
                <h2>Live 4-Pillar Score Breakdown: {breakdown.total}/100 pts</h2>
                <p>
                  Low energy ya exam load wale din sirf 3 Minimum Day basics poore
                  karo taaki momentum kabhi zero na ho.
                </p>
              </div>
              <div className="heading-btn-group">
                <Button
                  kind={onlyMinDay ? "primary" : "secondary"}
                  onClick={() => setOnlyMinDay((v) => !v)}
                >
                  {onlyMinDay
                    ? "Showing 3 Minimum Basics"
                    : `Minimum Day Filter (${minDayDoneCount}/3)`}
                </Button>
                {minDayDoneCount < 3 && (
                  <Button onClick={markMinimumDayDone}>
                    ✓ Lock 3 Minimum Basics (+19 pts)
                  </Button>
                )}
              </div>
            </div>

            <div className="stats-grid" style={{ marginBottom: 16 }}>
              <Stat
                icon="🛡"
                label="1. Clean Streak Core"
                value={`${breakdown.coreClean}/20 pts`}
                detail={
                  dayObj.c?.noPorn && !dayObj.slip
                    ? "Clean day locked in"
                    : "Tap 'No porn today' below"
                }
                color="sage"
              />
              <Stat
                icon="💪"
                label="2. Workout, Steps & Fuel"
                value={`${breakdown.fitnessBody}/32 pts`}
                detail="Workout (12) · Steps (8) · Protein (8) · Water (4)"
                color="peach"
              />
              <Stat
                icon="☾"
                label="3. Sleep & Screen Anchor"
                value={`${breakdown.sleepScreen}/35 pts`}
                detail="Wake (8) · Sun (8) · Screen (8) · Bed (6) · Phone (5)"
                color="blue"
              />
              <Stat
                icon="✦"
                label="4. Mind, Skincare & Social"
                value={`${breakdown.mindCare}/13 pts`}
                detail="Skincare (5) · Brave Social (4) · Journal (4)"
                color="lavender"
              />
            </div>

            <div className="habit-list">
              {visibleScoredChecks.map((item) => {
                const checked = Boolean(dayObj.c && dayObj.c[item.id]);
                const isMin = MINIMUM_DAY_IDS.includes(item.id);
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
                      aria-pressed={checked}
                      onClick={() => toggleCoreCheck(item.id)}
                    >
                      {checked ? "✓" : ""}
                    </button>

                    <div className="habit-info">
                      <strong>
                        {dm(item.title)}{" "}
                        {isMin && (
                          <span
                            className="status-pill peach-pill"
                            style={{ marginLeft: 6 }}
                          >
                            Minimum Day Basic
                          </span>
                        )}
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
          </Card>

          {/* Daily metrics with Quick-Increment Buttons */}
          <Card>
            <div className="section-head">
              <div>
                <div className="eyebrow">DAILY NUMBERS &amp; BIOMETRICS</div>
                <h2>
                  Steps, hydration, screen &amp; sleep ({fmtDate(selectedISO)})
                </h2>
                <p>
                  Partial progress automatically calculates towards your
                  100-point score. Use the quick-tap buttons for instant logging.
                </p>
              </div>
              <span className="status-pill complete">
                Weight-based water guide: ~{recommendedWaterByWeight}L/day
              </span>
            </div>

            <div className="form-grid four-col-grid tracker-metrics">
              <div>
                <Field label={`Steps (Target: ${targetSteps})`}>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={dayObj.steps}
                    onChange={(e) => {
                      const v = Math.max(0, safeNum(e.target.value, 0));
                      updateDay(selectedISO, {
                        steps: v,
                        c: {
                          ...(dayObj.c || {}),
                          steps: v >= targetSteps,
                        },
                      });
                    }}
                  />
                </Field>
                <div style={{ marginTop: 8 }}>
                  <Progress value={percent(dayObj.steps || 0, targetSteps)} />
                  <div className="category-pills" style={{ marginTop: 8 }}>
                    {[1000, 2500, targetSteps].map((val) => (
                      <button
                        type="button"
                        key={val}
                        onClick={() => {
                          const nextSteps =
                            val === targetSteps
                              ? targetSteps
                              : Math.max(0, safeNum(dayObj.steps, 0) + val);
                          updateDay(selectedISO, {
                            steps: nextSteps,
                            c: {
                              ...(dayObj.c || {}),
                              steps: nextSteps >= targetSteps,
                            },
                          });
                        }}
                      >
                        {val === targetSteps ? `Hit ${targetSteps}` : `+${val}`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <Field label={`Water in Litres (Target: ${targetWater}L)`}>
                  <input
                    type="number"
                    min="0"
                    step="0.25"
                    value={dayObj.waterL}
                    onChange={(e) => {
                      const v = Math.max(0, safeNum(e.target.value, 0));
                      updateDay(selectedISO, {
                        waterL: v,
                        c: {
                          ...(dayObj.c || {}),
                          water: v >= targetWater,
                        },
                      });
                    }}
                  />
                </Field>
                <div style={{ marginTop: 8 }}>
                  <Progress value={percent(dayObj.waterL || 0, targetWater)} />
                  <div className="category-pills" style={{ marginTop: 8 }}>
                    {[
                      [0.25, "+250ml"],
                      [0.5, "+500ml"],
                      [targetWater, `Hit ${targetWater}L`],
                    ].map(([amt, lbl]) => (
                      <button
                        type="button"
                        key={lbl}
                        onClick={() => {
                          const nextW =
                            amt === targetWater
                              ? targetWater
                              : +(safeNum(dayObj.waterL, 0) + Number(amt)).toFixed(
                                  2
                                );
                          updateDay(selectedISO, {
                            waterL: nextW,
                            c: {
                              ...(dayObj.c || {}),
                              water: nextW >= targetWater,
                            },
                          });
                        }}
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <Field
                  label={`Recreational Screen (Limit ≤ ${targetScreen}h)`}
                >
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={dayObj.screenH}
                    onChange={(e) => {
                      const v = Math.max(0, safeNum(e.target.value, 0));
                      updateDay(selectedISO, {
                        screenH: v,
                        c: {
                          ...(dayObj.c || {}),
                          screenUnderLimit: v > 0 && v <= targetScreen,
                        },
                      });
                    }}
                  />
                </Field>
                <div style={{ marginTop: 8 }}>
                  <Progress
                    value={
                      dayObj.screenH > 0
                        ? Math.min(100, percent(dayObj.screenH, targetScreen))
                        : 0
                    }
                  />
                  <div className="category-pills" style={{ marginTop: 8 }}>
                    {[1, 2, targetScreen].map((hr) => (
                      <button
                        type="button"
                        key={hr}
                        onClick={() =>
                          updateDay(selectedISO, {
                            screenH: hr,
                            c: {
                              ...(dayObj.c || {}),
                              screenUnderLimit: hr <= targetScreen,
                            },
                          })
                        }
                      >
                        {hr}h logged
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <Field label="Last Night's Sleep (Hours)">
                  <input
                    type="number"
                    min="0"
                    max="16"
                    step="0.5"
                    value={dayObj.sleepH}
                    onChange={(e) =>
                      updateDay(selectedISO, {
                        sleepH: Math.max(0, safeNum(e.target.value, 0)),
                      })
                    }
                  />
                </Field>
                <div style={{ marginTop: 8 }}>
                  <Progress value={percent(dayObj.sleepH || 0, 8)} />
                  <div className="category-pills" style={{ marginTop: 8 }}>
                    {[6.5, 7.5, 8].map((sh) => (
                      <button
                        type="button"
                        key={sh}
                        onClick={() =>
                          updateDay(selectedISO, {
                            sleepH: sh,
                            c: {
                              ...(dayObj.c || {}),
                              wakeOnTime: sh >= 7 || Boolean(dayObj.c?.wakeOnTime),
                            },
                          })
                        }
                      >
                        {sh}h
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Two main columns */}
          <div className="tracker-sections">
            {/* LEFT COLUMN */}
            <div className="tracker-life-column">
              <Card>
                <div className="section-head">
                  <div>
                    <div className="eyebrow">LIFE BASICS &amp; FACE POSTURE</div>
                    <h2>Daily grounding &amp; jaw care</h2>
                  </div>
                  <span className="status-pill">
                    {
                      [...LIFE_BASICS, ...FACE_HABITS].filter((item) => {
                        const isFace = FACE_HABITS.some((f) => f.id === item.id);
                        const grp = isFace ? "face" : "life";
                        return Boolean(dayObj[grp] && dayObj[grp][item.id]);
                      }).length
                    }
                    /{LIFE_BASICS.length + FACE_HABITS.length} done
                  </span>
                </div>

                <div className="habit-list">
                  {[...LIFE_BASICS, ...FACE_HABITS].map((item) => {
                    const isFace = FACE_HABITS.some((f) => f.id === item.id);
                    const group = isFace ? "face" : "life";
                    const checked = Boolean(
                      dayObj[group] && dayObj[group][item.id]
                    );

                    return (
                      <div
                        className={`habit-row ${checked ? "checked" : ""}`}
                        key={item.id}
                      >
                        <button
                          type="button"
                          className="check-circle"
                          aria-label={`${
                            checked ? "Uncheck" : "Complete"
                          } ${item.title}`}
                          aria-pressed={checked}
                          onClick={() => toggleGroup(group, item.id, !checked)}
                        >
                          {checked ? "✓" : ""}
                        </button>

                        <div className="habit-info">
                          <strong>{item.title}</strong>
                          <small>{item.sub}</small>
                        </div>

                        <span className="status-pill">
                          {isFace ? "Face" : "Life"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>

            {/* RIGHT COLUMN */}
            <div className="tracker-right-column">
              {/* Control loops */}
              <Card>
                <div className="section-head">
                  <div>
                    <div className="eyebrow">ACTIVE CONTROL LOOPS</div>
                    <h2>Dopamine &amp; impulse guards</h2>
                  </div>
                  <span className="status-pill complete">
                    {
                      activeLoopsList.filter(
                        (item) => dayObj.loops && dayObj.loops[item.id]
                      ).length
                    }
                    /{activeLoopsList.length} clean
                  </span>
                </div>

                <div className="habit-list">
                  {activeLoopsList.map((item) => {
                    const checked = Boolean(
                      dayObj.loops && dayObj.loops[item.id]
                    );

                    return (
                      <div
                        className={`habit-row ${checked ? "checked" : ""}`}
                        key={item.id}
                      >
                        <button
                          type="button"
                          className="check-circle"
                          aria-label={`${
                            checked ? "Uncheck" : "Complete"
                          } ${item.title}`}
                          aria-pressed={checked}
                          onClick={() => toggleGroup("loops", item.id, !checked)}
                        >
                          {checked ? "✓" : ""}
                        </button>

                        <div className="habit-info">
                          <strong>{dm(item.title)}</strong>
                          <small>{dm(item.sub)}</small>
                        </div>
                      </div>
                    );
                  })}

                  {!activeLoopsList.length && (
                    <div className="empty">
                      <strong>No active control loops</strong>
                      <p>
                        Activate a control loop in your settings to track it
                        here.
                      </p>
                    </div>
                  )}
                </div>
              </Card>

              {/* Mood and journal cards below control loops */}
              <div className="tracker-bottom-grid">
                {/* Mood-lifting card */}
                <Card>
                  <div className="section-head">
                    <div>
                      <div className="eyebrow">BEHAVIORAL ACTIVATION</div>
                      <h2>Mood-lifting action &amp; wins</h2>
                      <p>
                        Action precedes mood. Pick one small uplift today.
                      </p>
                    </div>
                  </div>

                  <div className="category-pills">
                    {MOOD_ACTIVITIES.map((act) => (
                      <button
                        type="button"
                        key={act.id}
                        className={
                          dayObj.activity?.id === act.id ? "selected" : ""
                        }
                        aria-pressed={dayObj.activity?.id === act.id}
                        onClick={() =>
                          updateDay(selectedISO, {
                            activity: {
                              ...(dayObj.activity || {}),
                              id: act.id,
                            },
                          })
                        }
                      >
                        {act.label}
                      </button>
                    ))}
                  </div>

                  <div className="inline-add-row">
                    <input
                      type="text"
                      className="clean-input"
                      placeholder="Add a small win from today..."
                      value={newWin}
                      onChange={(e) => setNewWin(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newWin.trim()) {
                          e.preventDefault();
                          updateDay(selectedISO, {
                            wins: [...(dayObj.wins || []), newWin.trim()],
                          });
                          setNewWin("");
                        }
                      }}
                    />

                    <Button
                      kind="primary"
                      onClick={() => {
                        if (!newWin.trim()) return;
                        updateDay(selectedISO, {
                          wins: [...(dayObj.wins || []), newWin.trim()],
                        });
                        setNewWin("");
                      }}
                    >
                      ＋ Add win
                    </Button>
                  </div>

                  {(dayObj.wins || []).length > 0 && (
                    <div className="category-pills tracker-saved-wins">
                      {dayObj.wins.map((w, idx) => (
                        <span
                          key={`${idx}-${w}`}
                          className="status-pill complete"
                        >
                          ✓ {w}
                        </span>
                      ))}
                    </div>
                  )}
                </Card>

                {/* Journal card */}
                <Card>
                  <div className="section-head">
                    <div>
                      <div className="eyebrow">
                        DAILY QUICK JOURNAL (+4 PTS)
                      </div>
                      <h2>2-Line evening reflection</h2>
                    </div>
                    {dayObj.c?.journal && (
                      <span className="status-pill complete">+4 pts earned</span>
                    )}
                  </div>

                  <Field label="How did today go? What did you notice?">
                    <textarea
                      rows={4}
                      placeholder="Write a short reflection on your day..."
                      value={dayObj.journal || ""}
                      onChange={(e) =>
                        updateDay(selectedISO, {
                          journal: e.target.value,
                          c: {
                            ...(dayObj.c || {}),
                            journal: e.target.value.trim().length > 3,
                          },
                        })
                      }
                    />
                  </Field>
                </Card>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= CUSTOM HABITS & STACKS TAB ================= */}

      {viewMode === "custom" && (
        <div className="stack-col">
          <div className="toolbar">
            <div className="tabs">
              <button
                type="button"
                className={filter === "all" ? "selected" : ""}
                onClick={() => setFilter("all")}
              >
                All habits
              </button>

              <button
                type="button"
                className={filter === "build" ? "selected" : ""}
                onClick={() => setFilter("build")}
              >
                Build
              </button>

              <button
                type="button"
                className={filter === "quit" ? "selected" : ""}
                onClick={() => setFilter("quit")}
              >
                Quit
              </button>
            </div>

            <div className="toolbar-right">
              <input
                type="search"
                className="clean-input"
                placeholder="Search habits..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />

              <label className="archive-toggle">
                <input
                  type="checkbox"
                  checked={showArchived}
                  onChange={(e) => setShowArchived(e.target.checked)}
                />
                Show archived
              </label>
            </div>
          </div>

          <div className="record-grid">
            {list.map((h) => {
              const stats = getHabitStats(h.id);
              return (
                <Card className="record-card" key={h.id}>
                  <div className="record-top">
                    <span
                      className={`record-symbol ${
                        h.kind === "quit" ? "peach" : "sage"
                      }`}
                    >
                      {h.kind === "quit" ? "↘" : "↗"}
                    </span>

                    <div className="heading-btn-group">
                      {stats.streak > 0 && (
                        <span className="status-pill complete">
                          🔥 {stats.streak}d streak
                        </span>
                      )}
                      {stats.missedYesterday && !h.archived && (
                        <span
                          className="status-pill peach-pill"
                          title="Skipped yesterday — Never Miss Twice!"
                        >
                          Never Miss Twice!
                        </span>
                      )}
                      <button
                        type="button"
                        className="dots-button"
                        aria-label={`Edit ${h.name}`}
                        onClick={() => onEdit(h)}
                      >
                        •••
                      </button>
                    </div>
                  </div>

                  <span className="eyebrow">
                    {h.kind === "quit" ? "LET GO" : "BUILD"}
                    {h.category ? ` · ${h.category}` : ""}
                  </span>

                  <h3>{h.name}</h3>
                  <p>{h.target || "A small daily intention"}</p>

                  {/* Mini 7-day strip on each habit card */}
                  <div
                    className="quest-week-row"
                    style={{ marginTop: 10, marginBottom: 10 }}
                  >
                    {stats.last7.map((d) => (
                      <div
                        key={d.iso}
                        className={`quest-day-pill ${d.done ? "done" : ""}`}
                        title={d.iso}
                      >
                        <small>{d.shortDay.slice(0, 1)}</small>
                        <strong>{d.done ? "✓" : "·"}</strong>
                      </div>
                    ))}
                  </div>

                  <div className="record-meta">
                    <span className="status-pill">
                      {h.schedule === "weekdays"
                        ? "Weekdays"
                        : h.schedule === "flexible"
                        ? "Flexible"
                        : "Daily"}{" "}
                      · {stats.rate7d}% (7d)
                    </span>

                    <span className="muted-text">
                      {h.archived
                        ? "Archived"
                        : h.doneDate === today
                        ? "Checked in today"
                        : "Not checked in today"}
                    </span>
                  </div>

                  <div className="record-actions">
                    {!showArchived && (
                      <Button
                        kind={h.doneDate === today ? "primary" : "secondary"}
                        onClick={() => onToggle(h)}
                      >
                        {h.doneDate === today
                          ? "✓ Checked in"
                          : "Check in today"}
                      </Button>
                    )}

                    <Button onClick={() => onEdit(h)}>Edit</Button>

                    <Button onClick={() => onDelete(h.id)}>
                      {h.archived ? "Delete" : "Archive"}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>

          {!list.length && (
            <Empty
              icon="◉"
              title="No matching habits"
              description="Create a build or quit habit to track alongside your Comeback 90 core."
              action={
                <Button kind="primary" onClick={onAdd}>
                  ＋ Create habit
                </Button>
              }
            />
          )}

          {/* HABIT STACKING BUILDER (ATOMIC HABITS IMPLEMENTATION INTENTIONS) */}
          <Card>
            <div className="section-head">
              <div>
                <div className="eyebrow">
                  ATOMIC HABIT STACKING (IMPLEMENTATION INTENTIONS)
                </div>
                <h2>Link new habits to existing daily anchors</h2>
                <p>
                  Formula: &ldquo;Jab main [Purani Paki Habit] karunga, tab main
                  turant [Nayi Habit] karunga.&rdquo;
                </p>
              </div>
            </div>

            <div className="form-grid three-col-grid">
              <Field label="1. Existing Anchor (Jab main ye karunga...)">
                <input
                  type="text"
                  placeholder="e.g. Subah brush karke bahar aane ke baad"
                  value={stackInput.anchor}
                  onChange={(e) =>
                    setStackInput({ ...stackInput, anchor: e.target.value })
                  }
                />
              </Field>
              <Field label="2. New Tiny Action (Tab main turant ye karunga...)">
                <input
                  type="text"
                  placeholder="e.g. 1 glass paani + 15 min sunlight walk"
                  value={stackInput.action}
                  onChange={(e) =>
                    setStackInput({ ...stackInput, action: e.target.value })
                  }
                />
              </Field>
              <Field label="Category">
                <select
                  value={stackInput.category}
                  onChange={(e) =>
                    setStackInput({ ...stackInput, category: e.target.value })
                  }
                >
                  <option value="Morning Anchor">Morning Anchor</option>
                  <option value="Deep Work / Study">Deep Work / Study</option>
                  <option value="Fitness & Fuel">Fitness &amp; Fuel</option>
                  <option value="Sleep Shield">Sleep Shield</option>
                </select>
              </Field>
            </div>

            <div
              className="heading-btn-group"
              style={{ marginTop: 12, marginBottom: 16 }}
            >
              <Button
                kind="primary"
                onClick={() =>
                  addHabitStack(
                    stackInput.anchor,
                    stackInput.action,
                    stackInput.category
                  )
                }
              >
                ＋ Save Habit Stack
              </Button>
              {HABIT_STACK_PRESETS.map((preset, idx) => (
                <Button
                  key={idx}
                  onClick={() =>
                    addHabitStack(preset.anchor, preset.action, preset.category)
                  }
                >
                  ＋ Preset: {preset.category}
                </Button>
              ))}
            </div>

            {habitStacks.length > 0 && (
              <div className="habit-list">
                {habitStacks.map((st) => {
                  const doneToday = Boolean(
                    dayObj.stacksDone && dayObj.stacksDone[st.id]
                  );
                  return (
                    <div
                      key={st.id}
                      className={`habit-row ${doneToday ? "checked" : ""}`}
                    >
                      <button
                        type="button"
                        className="check-circle"
                        onClick={() =>
                          toggleGroup("stacksDone", st.id, !doneToday)
                        }
                      >
                        {doneToday ? "✓" : ""}
                      </button>
                      <div className="habit-info">
                        <strong>
                          After: {st.anchor} → <em>{st.action}</em>
                        </strong>
                        <small>{st.category}</small>
                      </div>
                      <button
                        type="button"
                        className="danger-text"
                        onClick={() => removeHabitStack(st.id)}
                      >
                        Remove
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ================= 7-DAY CONSISTENCY MATRIX TAB ================= */}

      {viewMode === "matrix" && (
        <div className="stack-col">
          <Card>
            <div className="section-head">
              <div>
                <div className="eyebrow">
                  7-DAY CONSISTENCY MATRIX &amp; NEVER-MISS-TWICE ENGINE
                </div>
                <h2>Weekly scorecard across core pillars &amp; custom habits</h2>
                <p>
                  Tap any cell in the 7-day grid to toggle completion for that
                  specific day.
                </p>
              </div>
              <span className="status-pill complete">
                7-Day Avg: {avg7DayScore}/100 pts
              </span>
            </div>

            <div className="table-wrap">
              <table className="clean-table">
                <thead>
                  <tr>
                    <th>Core Habit / Pillar</th>
                    {last7Dates.map((d) => (
                      <th key={d.iso} style={{ textAlign: "center" }}>
                        <div>{d.shortDay}</div>
                        <small>{d.dayNum}</small>
                      </th>
                    ))}
                    <th style={{ textAlign: "center" }}>7d Rate</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <strong>Daily Total Comeback Score</strong>
                    </td>
                    {last7Dates.map((d) => (
                      <td key={d.iso} style={{ textAlign: "center" }}>
                        <span
                          className={`status-pill ${
                            d.score >= 60 ? "complete" : ""
                          }`}
                        >
                          {d.score}
                        </span>
                      </td>
                    ))}
                    <td style={{ textAlign: "center" }}>
                      <strong>{avg7DayScore} pts</strong>
                    </td>
                  </tr>

                  {SCORED_CHECKS.map((chk) => {
                    const doneCount = last7Dates.filter(
                      (d) => d.dayObj.c && d.dayObj.c[chk.id]
                    ).length;
                    return (
                      <tr key={chk.id}>
                        <td>
                          <strong>{dm(chk.title)}</strong>{" "}
                          <small className="muted-text">
                            (+{chk.weight}p)
                          </small>
                        </td>
                        {last7Dates.map((d) => {
                          const isChecked = Boolean(
                            d.dayObj.c && d.dayObj.c[chk.id]
                          );
                          return (
                            <td key={d.iso} style={{ textAlign: "center" }}>
                              <button
                                type="button"
                                className={`check-circle ${
                                  isChecked ? "checked" : ""
                                }`}
                                style={{ margin: "0 auto" }}
                                onClick={() => {
                                  updateDay(d.iso, (prev) => ({
                                    ...prev,
                                    c: {
                                      ...(prev.c || {}),
                                      [chk.id]: !isChecked,
                                    },
                                  }));
                                }}
                                title={`${chk.title} on ${d.iso}`}
                              >
                                {isChecked ? "✓" : ""}
                              </button>
                            </td>
                          );
                        })}
                        <td style={{ textAlign: "center" }}>
                          <strong>{percent(doneCount, 7)}%</strong>
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

      {/* ================= SCHEDULE TAB ================= */}

      {viewMode === "schedule" && (
        <Card>
          <div className="section-head">
            <div>
              <div className="eyebrow">STRUCTURED DAY TEMPLATE</div>
              <h2>
                Editable daily schedule (includes Apna Kaam deep-focus blocks)
              </h2>
              <p>
                Idle, unstructured hours are the biggest trigger. Check off each
                time block as you move through {fmtDate(selectedISO)}.
              </p>
            </div>
            <div className="heading-btn-group">
              <Button onClick={addScheduleBlock}>＋ Add time block</Button>
              <Button onClick={resetDefaultSchedule}>Reset default</Button>
            </div>
          </div>

          <div className="schedule-list">
            {scheduleRows.map((row, idx) => {
              const blockId = row.id || `idx-${idx}`;
              const isDone = Boolean(
                dayObj.scheduleDone && dayObj.scheduleDone[blockId]
              );
              const isCurrentNow = idx === activeScheduleIdx;

              return (
                <div
                  key={blockId}
                  className={`schedule-edit-row ${isDone ? "checked" : ""}`}
                  style={
                    isCurrentNow
                      ? {
                          border: "1.5px solid var(--sage)",
                          borderRadius: 12,
                          padding: "8px 10px",
                        }
                      : undefined
                  }
                >
                  <button
                    type="button"
                    className="check-circle"
                    aria-label={`Mark ${row.label} complete`}
                    onClick={() => toggleScheduleDoneForDay(blockId)}
                  >
                    {isDone ? "✓" : ""}
                  </button>

                  <input
                    type="time"
                    className="clean-input time-w"
                    aria-label={`Schedule time for ${row.label}`}
                    value={row.time}
                    onChange={(e) =>
                      handleScheduleChange(idx, "time", e.target.value)
                    }
                  />

                  <input
                    type="text"
                    className="clean-input flex-1"
                    aria-label="Schedule activity"
                    value={row.label}
                    onChange={(e) =>
                      handleScheduleChange(idx, "label", e.target.value)
                    }
                  />

                  {isCurrentNow && (
                    <span className="status-pill complete">LIVE NOW</span>
                  )}

                  <button
                    type="button"
                    className="danger-text"
                    onClick={() => removeScheduleBlock(idx)}
                    title="Remove block"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </>
  );
}

export { HabitsAndTrackPage };