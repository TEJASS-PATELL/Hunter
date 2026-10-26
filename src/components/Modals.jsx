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

function UrgeSOSModal({ data, setData, today, dm, updateDay, onClose, notify }) {
  const [mode, setMode] = useState("sos"); // sos | slip
  const [beforeRating, setBeforeRating] = useState(7);
  const [afterRating, setAfterRating] = useState(3);
  const [trigger, setTrigger] = useState(URGE_TRIGGERS[0]);
  const [location, setLocation] = useState(URGE_LOCATIONS[0]);
  const [breathTick, setBreathTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setBreathTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const phase = (() => {
    const c = breathTick % 14;
    return c < 4 ? "Breathe In (4s)" : c < 8 ? "Hold Gently (4s)" : "Slow Exhale (6s)";
  })();

  const saveOutcome = (isSlip) => {
    const entry = {
      id: uid(),
      ts: Date.now(),
      trigger,
      location,
      before: beforeRating,
      after: afterRating,
      slip: isSlip,
    };
    setData((old) => ({ ...old, urges: [entry, ...(old.urges || [])] }));
    if (isSlip) {
      updateDay(today, (prev) => ({
        ...prev,
        slip: true,
        c: { ...(prev.c || {}), noPorn: false },
      }));
      notify("Reset logged honestly. Drink water and start fresh.");
    } else {
      notify("Urge surfed! Proud of you, bhai.");
    }
    onClose();
  };

  return (
    <Modal title={dm("🛡 Urge SOS — 10-Minute Rescue")} onClose={onClose}>
      <div className="record-form">
        <div className="tabs" style={{ marginBottom: 14 }}>
          <button
            type="button"
            className={mode === "sos" ? "selected" : ""}
            onClick={() => setMode("sos")}
          >
            Ride Out the Wave
          </button>
          <button
            type="button"
            className={mode === "slip" ? "selected" : ""}
            onClick={() => setMode("slip")}
          >
            {dm("I Slipped (No-Shame Reset)")}
          </button>
        </div>

        {mode === "sos" ? (
          <div className="stack-col">
            <CountdownTimer
              defaultSeconds={600}
              label="10-Minute Urge Surfing Timer"
            />
            <div className="breath-box">
              <div className="breath-orb">
                <strong>{phase}</strong>
                <small>4-4-6 Calming Rhythm</small>
              </div>
            </div>
            <div className="habit-list">
              {URGE_STEPS.slice(0, 5).map((s) => (
                <div className="habit-row" key={s.step}>
                  <span className="status-pill complete">0{s.step}</span>
                  <div className="habit-info">
                    <strong>{dm(s.title)}</strong>
                    <small>{dm(s.detail)}</small>
                  </div>
                </div>
              ))}
            </div>
            <div className="form-grid">
              <Field label="Trigger">
                <select value={trigger} onChange={(e) => setTrigger(e.target.value)}>
                  {URGE_TRIGGERS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Location">
                <select value={location} onChange={(e) => setLocation(e.target.value)}>
                  {URGE_LOCATIONS.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={`Intensity Before (${beforeRating}/10)`}>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={beforeRating}
                  onChange={(e) => setBeforeRating(Number(e.target.value))}
                />
              </Field>
              <Field label={`Intensity Now (${afterRating}/10)`}>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={afterRating}
                  onChange={(e) => setAfterRating(Number(e.target.value))}
                />
              </Field>
            </div>
            <div className="form-actions">
              <Button onClick={onClose}>Close</Button>
              <Button kind="primary" onClick={() => saveOutcome(false)}>
                ✓ I Survived the Urge (Save Win)
              </Button>
            </div>
          </div>
        ) : (
          <div className="stack-col">
            <p className="muted-text">
              One slip never deletes your total clean days. Avoid the &ldquo;chaser effect&rdquo;
              — leave the room, drink water, and log the trigger honestly.
            </p>
            <Field label="What triggered the slip?">
              <select value={trigger} onChange={(e) => setTrigger(e.target.value)}>
                {URGE_TRIGGERS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <div className="form-actions">
              <Button onClick={onClose}>Cancel</Button>
              <Button kind="primary" onClick={() => saveOutcome(true)}>
                Log Reset & Begin Again
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function ProfileModal({ profile, onClose, onSave }) {
  const [form, setForm] = useState({
    name: profile.name || "Bhai",
    startDate: profile.startDate || todayISO(),
    age: profile.age || 22,
    heightCm: profile.heightCm || 172,
    weightKg: profile.weightKg || 56,
    discreet: Boolean(profile.discreet),
    steps: profile.targets?.steps || 8000,
    waterL: profile.targets?.waterL || 3,
    screenH: profile.targets?.screenH || 3,
  });

  return (
    <Modal title="Your personal space & 90-day setup" onClose={onClose}>
      <form
        className="record-form"
        onSubmit={(e) => {
          e.preventDefault();
          onSave({
            name: form.name.trim() || "Bhai",
            startDate: form.startDate,
            age: safeNum(form.age, 22),
            heightCm: safeNum(form.heightCm, 172),
            weightKg: safeNum(form.weightKg, 56),
            discreet: form.discreet,
            targets: {
              steps: safeNum(form.steps, 8000),
              waterL: safeNum(form.waterL, 3),
              screenH: safeNum(form.screenH, 3),
            },
          });
        }}
      >
        <div className="form-grid">
          <Field label="Your name or nickname">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="90-Day Start Date">
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            />
          </Field>
          <Field label="Height (cm)">
            <input
              type="number"
              value={form.heightCm}
              onChange={(e) => setForm({ ...form, heightCm: e.target.value })}
            />
          </Field>
          <Field label="Weight (kg)">
            <input
              type="number"
              value={form.weightKg}
              onChange={(e) => setForm({ ...form, weightKg: e.target.value })}
            />
          </Field>
          <Field label="Daily Steps Target">
            <input
              type="number"
              value={form.steps}
              onChange={(e) => setForm({ ...form, steps: e.target.value })}
            />
          </Field>
          <Field label="Daily Water Target (L)">
            <input
              type="number"
              step="0.5"
              value={form.waterL}
              onChange={(e) => setForm({ ...form, waterL: e.target.value })}
            />
          </Field>
        </div>
        <label className="archive-toggle" style={{ marginTop: 14 }}>
          <input
            type="checkbox"
            checked={form.discreet}
            onChange={(e) => setForm({ ...form, discreet: e.target.checked })}
          />{" "}
          Enable Discreet Mode (Hides sensitive words across the app)
        </label>
        <p className="form-note">
          Stored 100% locally in this browser. No account or external server is used.
        </p>
        <div className="form-actions">
          <Button onClick={onClose}>Cancel</Button>
          <Button kind="primary" type="submit">
            Save profile
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function LifestyleLogModal({ item, onClose, onSave }) {
  const [value, setValue] = useState("");
  const [date, setDate] = useState(todayISO());
  const [status, setStatus] = useState("completed");
  const [notes, setNotes] = useState("");

  return (
    <Modal
      title={item.kind === "routine" ? `Log · ${item.name}` : `Measure · ${item.name}`}
      onClose={onClose}
    >
      <form
        className="record-form"
        onSubmit={(e) => {
          e.preventDefault();
          onSave({ id: uid(), date, value, status, notes });
        }}
      >
        {item.kind === "metric" && (
          <Field label={`Value (${item.unit})`}>
            <input
              type="number"
              step="any"
              required
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </Field>
        )}
        <Field label="Date">
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
        {item.kind === "routine" && (
          <Field label="Check-in status">
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="completed">Completed</option>
              <option value="partial">Partially completed</option>
              <option value="skipped">Skipped today</option>
            </select>
          </Field>
        )}
        <Field label="Notes">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional note…"
          />
        </Field>
        <div className="form-actions">
          <Button onClick={onClose}>Cancel</Button>
          <Button kind="primary" type="submit">
            Save activity
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function RecordForm({ title, fields, initial, submitLabel, onCancel, onSubmit }) {
  const [values, setValues] = useState(() =>
    Object.fromEntries(
      fields.map((f) => [f.name, initial[f.name] ?? f.defaultValue ?? ""])
    )
  );
  const [error, setError] = useState("");
  const change = (key, value) => setValues((v) => ({ ...v, [key]: value }));

  return (
    <Modal title={title} onClose={onCancel}>
      <form
        className="record-form"
        onSubmit={(e) => {
          e.preventDefault();
          for (const f of fields) {
            if (f.required && !String(values[f.name] ?? "").trim()) {
              setError(`${f.label} is required.`);
              return;
            }
            if (
              f.type === "number" &&
              values[f.name] !== "" &&
              !Number.isFinite(Number(values[f.name]))
            ) {
              setError(`${f.label} must be a number.`);
              return;
            }
          }
          setError("");
          onSubmit(values);
        }}
      >
        <div className="form-grid">
          {fields.map((f) => (
            <Field key={f.name} label={f.label} hint={f.hint}>
              {f.type === "select" ? (
                <select
                  required={f.required}
                  value={values[f.name]}
                  onChange={(e) => change(f.name, e.target.value)}
                >
                  {(f.options || []).map(([v, l]) => (
                    <option value={v} key={v}>
                      {l}
                    </option>
                  ))}
                </select>
              ) : f.type === "textarea" ? (
                <textarea
                  required={f.required}
                  rows={3}
                  value={values[f.name]}
                  placeholder={f.placeholder || ""}
                  onChange={(e) => change(f.name, e.target.value)}
                />
              ) : (
                <input
                  required={f.required}
                  type={f.type || "text"}
                  step={f.type === "number" ? "any" : undefined}
                  value={values[f.name]}
                  placeholder={f.placeholder || ""}
                  onChange={(e) => change(f.name, e.target.value)}
                />
              )}
            </Field>
          ))}
        </div>
        {error && <p className="form-error">{error}</p>}
        <p className="form-note">
          Saved locally on this device. No account or server is used.
        </p>
        <div className="form-actions">
          <Button onClick={onCancel}>Cancel</Button>
          <Button kind="primary" type="submit">
            {submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export { UrgeSOSModal, ProfileModal, LifestyleLogModal, RecordForm };
