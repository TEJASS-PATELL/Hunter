
import React, { useState, useMemo } from "react";
import {
  getWeekdayShort,
  fmtDate,
  safeNum,
  LIFE_BASICS,
  CONTROL_LOOPS,
  FACE_HABITS,
  DEFAULT_SCHEDULE,
  MOOD_ACTIVITIES,
  createEmptyDay,
  calcDailyScoreBreakdown,
  Button,
  Card,
  Heading,
  Empty,
  Field,
} from "../shared";

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
  const [viewMode, setViewMode] = useState("tracker");
  const [filter, setFilter] = useState("all");
  const [newWin, setNewWin] = useState("");

  const p = data.profile || {};
  const dayObj =
    (data.days && data.days[selectedISO]) || createEmptyDay();

  const breakdown = useMemo(
    () => calcDailyScoreBreakdown(dayObj, p),
    [dayObj, p]
  );

  const list = (data.habits || []).filter(
    (h) =>
      !!h.archived === showArchived &&
      (filter === "all" || h.kind === filter) &&
      (h.name || "").toLowerCase().includes(
        (query || "").toLowerCase()
      )
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

  const handleScheduleChange = (idx, field, val) => {
    setData((old) => {
      const next = [...(old.schedule || DEFAULT_SCHEDULE)];
      next[idx] = { ...next[idx], [field]: val };
      return { ...old, schedule: next };
    });
  };

  const activeLoopsList = CONTROL_LOOPS.filter((loop) =>
    (data.settings?.activeLoops || []).includes(loop.id)
  );

  return (
    <>
      <Heading
        eyebrow="CONSISTENCY OVER INTENSITY"
        title="Habits & daily tracker"
        description="Track your 100-point Comeback core, custom habits, daily numbers, and time blocks."
        action={
          <div className="heading-btn-group">
            <input
              type="date"
              className="date-picker-input"
              value={selectedISO}
              max={today}
              onChange={(e) =>
                setSelectedISO(e.target.value || today)
              }
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
          <span className="mini-stat-number">
            {breakdown.total}/100
          </span>
          <span>Score on {fmtDate(selectedISO)}</span>
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
          Custom Habits Cards <span>{(data.habits || []).length}</span>
        </button>

        <button
          type="button"
          className={viewMode === "schedule" ? "selected" : ""}
          onClick={() => setViewMode("schedule")}
        >
          Daily Time-Block Schedule <span>10</span>
        </button>
      </div>

      {/* ================= TRACKER TAB ================= */}

      {viewMode === "tracker" && (
        <div className="tracker-layout stack-col">

          {/* Daily metrics */}
          <Card>
            <div className="section-head">
              <div>
                <div className="eyebrow">
                  DAILY NUMBERS & BIOMETRICS
                </div>
                <h2>
                  Steps, hydration, screen & sleep (
                  {fmtDate(selectedISO)})
                </h2>
                <p>
                  Partial progress automatically calculates towards
                  your 100-point score.
                </p>
              </div>
            </div>

            <div className="form-grid four-col-grid tracker-metrics">
              <Field
                label={`Steps (Target: ${p.targets?.steps || 8000})`}
              >
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={dayObj.steps}
                  onChange={(e) => {
                    const v = Math.max(
                      0,
                      safeNum(e.target.value, 0)
                    );

                    updateDay(selectedISO, {
                      steps: v,
                      c: {
                        ...(dayObj.c || {}),
                        steps: v >= (p.targets?.steps || 8000),
                      },
                    });
                  }}
                />
              </Field>

              <Field
                label={`Water in Litres (Target: ${
                  p.targets?.waterL || 3
                }L)`}
              >
                <input
                  type="number"
                  min="0"
                  step="0.25"
                  value={dayObj.waterL}
                  onChange={(e) => {
                    const v = Math.max(
                      0,
                      safeNum(e.target.value, 0)
                    );

                    updateDay(selectedISO, {
                      waterL: v,
                      c: {
                        ...(dayObj.c || {}),
                        water: v >= (p.targets?.waterL || 3),
                      },
                    });
                  }}
                />
              </Field>

              <Field
                label={`Recreational Screen (Limit ≤ ${
                  p.targets?.screenH || 3
                }h)`}
              >
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={dayObj.screenH}
                  onChange={(e) => {
                    const v = Math.max(
                      0,
                      safeNum(e.target.value, 0)
                    );

                    updateDay(selectedISO, {
                      screenH: v,
                      c: {
                        ...(dayObj.c || {}),
                        screenUnderLimit:
                          v > 0 &&
                          v <= (p.targets?.screenH || 3),
                      },
                    });
                  }}
                />
              </Field>

              <Field label="Last Night's Sleep (Hours)">
                <input
                  type="number"
                  min="0"
                  max="16"
                  step="0.5"
                  value={dayObj.sleepH}
                  onChange={(e) =>
                    updateDay(selectedISO, {
                      sleepH: Math.max(
                        0,
                        safeNum(e.target.value, 0)
                      ),
                    })
                  }
                />
              </Field>
            </div>
          </Card>

          {/* Two main columns */}
          <div className="tracker-sections">

            {/* LEFT COLUMN */}
            <div className="tracker-life-column">
              <Card>
                <div className="section-head">
                  <div>
                    <div className="eyebrow">
                      LIFE BASICS & FACE POSTURE
                    </div>
                    <h2>Daily grounding & jaw care</h2>
                  </div>
                </div>

                <div className="habit-list">
                  {[...LIFE_BASICS, ...FACE_HABITS].map(
                    (item) => {
                      const isFace = FACE_HABITS.some(
                        (f) => f.id === item.id
                      );

                      const group = isFace ? "face" : "life";

                      const checked = Boolean(
                        dayObj[group] &&
                        dayObj[group][item.id]
                      );

                      return (
                        <div
                          className={`habit-row ${
                            checked ? "checked" : ""
                          }`}
                          key={item.id}
                        >
                          <button
                            type="button"
                            className="check-circle"
                            aria-label={`${
                              checked ? "Uncheck" : "Complete"
                            } ${item.title}`}
                            aria-pressed={checked}
                            onClick={() =>
                              toggleGroup(
                                group,
                                item.id,
                                !checked
                              )
                            }
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
                    }
                  )}
                </div>
              </Card>
            </div>

            {/* RIGHT COLUMN */}
            <div className="tracker-right-column">

              {/* Control loops */}
              <Card>
                <div className="section-head">
                  <div>
                    <div className="eyebrow">
                      ACTIVE CONTROL LOOPS
                    </div>
                    <h2>Dopamine & impulse guards</h2>
                  </div>
                </div>

                <div className="habit-list">
                  {activeLoopsList.map((item) => {
                    const checked = Boolean(
                      dayObj.loops &&
                      dayObj.loops[item.id]
                    );

                    return (
                      <div
                        className={`habit-row ${
                          checked ? "checked" : ""
                        }`}
                        key={item.id}
                      >
                        <button
                          type="button"
                          className="check-circle"
                          aria-label={`${
                            checked ? "Uncheck" : "Complete"
                          } ${item.title}`}
                          aria-pressed={checked}
                          onClick={() =>
                            toggleGroup(
                              "loops",
                              item.id,
                              !checked
                            )
                          }
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
                        Activate a control loop in your settings
                        to track it here.
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
                      <div className="eyebrow">
                        BEHAVIORAL ACTIVATION
                      </div>
                      <h2>Mood-lifting action & wins</h2>
                      <p>
                        Action precedes mood. Pick one small uplift
                        today.
                      </p>
                    </div>
                  </div>

                  <div className="category-pills">
                    {MOOD_ACTIVITIES.map((act) => (
                      <button
                        type="button"
                        key={act.id}
                        className={
                          dayObj.activity?.id === act.id
                            ? "selected"
                            : ""
                        }
                        aria-pressed={
                          dayObj.activity?.id === act.id
                        }
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
                        if (
                          e.key === "Enter" &&
                          newWin.trim()
                        ) {
                          e.preventDefault();

                          updateDay(selectedISO, {
                            wins: [
                              ...(dayObj.wins || []),
                              newWin.trim(),
                            ],
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
                          wins: [
                            ...(dayObj.wins || []),
                            newWin.trim(),
                          ],
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
                            journal:
                              e.target.value.trim().length > 3,
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

      {/* ================= CUSTOM HABITS TAB ================= */}

      {viewMode === "custom" && (
        <>
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
                  onChange={(e) =>
                    setShowArchived(e.target.checked)
                  }
                />
                Show archived
              </label>
            </div>
          </div>

          <div className="record-grid">
            {list.map((h) => (
              <Card className="record-card" key={h.id}>
                <div className="record-top">
                  <span
                    className={`record-symbol ${
                      h.kind === "quit" ? "peach" : "sage"
                    }`}
                  >
                    {h.kind === "quit" ? "↘" : "↗"}
                  </span>

                  <button
                    type="button"
                    className="dots-button"
                    aria-label={`Edit ${h.name}`}
                    onClick={() => onEdit(h)}
                  >
                    •••
                  </button>
                </div>

                <span className="eyebrow">
                  {h.kind === "quit" ? "LET GO" : "BUILD"}
                  {h.category ? ` · ${h.category}` : ""}
                </span>

                <h3>{h.name}</h3>
                <p>{h.target || "A small daily intention"}</p>

                <div className="record-meta">
                  <span className="status-pill">
                    {h.schedule === "weekdays"
                      ? "Weekdays"
                      : h.schedule === "flexible"
                      ? "Flexible"
                      : "Daily"}
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
                      kind={
                        h.doneDate === today
                          ? "primary"
                          : "secondary"
                      }
                      onClick={() => onToggle(h)}
                    >
                      {h.doneDate === today
                        ? "✓ Checked in"
                        : "Check in today"}
                    </Button>
                  )}

                  <Button onClick={() => onEdit(h)}>
                    Edit
                  </Button>

                  <Button onClick={() => onDelete(h.id)}>
                    {h.archived ? "Delete" : "Archive"}
                  </Button>
                </div>
              </Card>
            ))}
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
        </>
      )}

      {/* ================= SCHEDULE TAB ================= */}

      {viewMode === "schedule" && (
        <Card>
          <div className="section-head">
            <div>
              <div className="eyebrow">
                STRUCTURED DAY TEMPLATE
              </div>
              <h2>
                Editable daily schedule (includes Apna Kaam blocks)
              </h2>
              <p>
                Idle, unstructured hours are the biggest trigger.
                Customize your routine below.
              </p>
            </div>
          </div>

          <div className="schedule-list">
            {(data.schedule || DEFAULT_SCHEDULE).map(
              (row, idx) => (
                <div
                  key={row.id || idx}
                  className="schedule-edit-row"
                >
                  <input
                    type="time"
                    className="clean-input time-w"
                    aria-label={`Schedule time for ${row.label}`}
                    value={row.time}
                    onChange={(e) =>
                      handleScheduleChange(
                        idx,
                        "time",
                        e.target.value
                      )
                    }
                  />

                  <input
                    type="text"
                    className="clean-input flex-1"
                    aria-label="Schedule activity"
                    value={row.label}
                    onChange={(e) =>
                      handleScheduleChange(
                        idx,
                        "label",
                        e.target.value
                      )
                    }
                  />
                </div>
              )
            )}
          </div>
        </Card>
      )}
    </>
  );
}

export { HabitsAndTrackPage };
