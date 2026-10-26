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

function LooksPage({ data, setData, notify }) {
  const [subTab, setSubTab] = useState("face"); // face | hair | skin | groom
  const groom = data.groom || {};
  const auditAnswers = (data.faceAudit && data.faceAudit.answers) || {};

  const setGroom = (patch) =>
    setData((old) => ({ ...old, groom: { ...(old.groom || {}), ...patch } }));

  const handleAuditChange = (qId, val) => {
    setData((old) => ({
      ...old,
      faceAudit: {
        answers: { ...((old.faceAudit && old.faceAudit.answers) || {}), [qId]: val },
        updatedAt: todayISO(),
      },
    }));
  };

  const selectedSkinType = SKIN_ROUTINES[groom.skinType] ? groom.skinType : "oily";
  const selectedFaceShape = FACE_SHAPES_GUIDE[groom.faceShape] ? groom.faceShape : "oval";

  return (
    <>
      <Heading
        eyebrow="PRACTICAL GROOMING · MAX 15 MIN/DAY"
        title="Looks, face posture & style"
        description="Focus on what actually works: posture, skin clarity, haircut framing, and well-fitted clothes."
      />

      <div className="tabs large-tabs">
        {[
          ["face", "Face & Posture Routine"],
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
              <div className="eyebrow">DAILY 5–8 MIN ROUTINE</div>
              <h2>Gentle neck, jaw & posture stepper</h2>
              <p>Stop immediately if you feel any jaw clicking or pain.</p>
              <div className="stack-col" style={{ marginTop: 14 }}>
                {FACE_ROUTINE_STEPS.map((s) => (
                  <div key={s.id} className="routine-step-box">
                    <div className="row-between">
                      <strong>{s.name}</strong>
                      <span className="status-pill complete">{s.reps}</span>
                    </div>
                    <p>{s.instruction}</p>
                    <CountdownTimer defaultSeconds={s.durationSec} label={s.name} />
                  </div>
                ))}
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

              <Accordion title="Interactive 7-Question Face & Jaw Habit Audit" badge="Audit">
                <div className="stack-col">
                  {FACE_AUDIT_QUESTIONS.map((q) => {
                    const currentAns = auditAnswers[q.id] || "";
                    return (
                      <div key={q.id} className="audit-q-box">
                        <strong>{q.question}</strong>
                        <div className="category-pills" style={{ marginTop: 8 }}>
                          {q.options.map((opt) => (
                            <button
                              type="button"
                              key={opt.value}
                              className={currentAns === opt.value ? "selected" : ""}
                              onClick={() => handleAuditChange(q.id, opt.value)}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                        {currentAns && <small className="muted-text">Tip: {q.tip}</small>}
                      </div>
                    );
                  })}
                </div>
              </Accordion>
            </div>
          </div>
        </div>
      )}

      {subTab === "hair" && (
        <div className="dashboard-grid">
          <Card>
            <div className="eyebrow">FACE SHAPE SELECTOR</div>
            <h2>Haircut & beard framing guide</h2>
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
            <div className="intro-callout" style={{ marginBottom: 0 }}>
              <div className="callout-icon">✂</div>
              <div>
                <strong>{FACE_SHAPES_GUIDE[selectedFaceShape].label}</strong>
                <p>
                  <strong>Haircut:</strong> {FACE_SHAPES_GUIDE[selectedFaceShape].haircut}
                </p>
                <p>
                  <strong>Beard:</strong> {FACE_SHAPES_GUIDE[selectedFaceShape].beard}
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="eyebrow">BARBER CHEAT-SHEET</div>
            <h2>What to tell your barber</h2>
            <div className="habit-list" style={{ marginTop: 12 }}>
              <div className="habit-row">
                <div className="habit-info">
                  <strong>Show 2 clear photos (front & side)</strong>
                  <small>Visuals work better than technical English hairstyle names.</small>
                </div>
              </div>
              <div className="habit-row">
                <div className="habit-info">
                  <strong>Low taper fade on sides (#1.5 to #3)</strong>
                  <small>Avoid high skin-zero fades if you have a long or thin face.</small>
                </div>
              </div>
              <div className="habit-row">
                <div className="habit-info">
                  <strong>Beard neckline 1 finger above Adam&apos;s apple</strong>
                  <small>Creates a clean shadow under the jaw that sharpens your profile.</small>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {subTab === "skin" && (
        <Card>
          <div className="eyebrow">AM & PM SKINCARE BUILDER</div>
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
              <strong>Night (PM) & Weekly Care</strong>
              {SKIN_ROUTINES[selectedSkinType].pm.map((line, i) => (
                <p key={i}>• {line}</p>
              ))}
              <p style={{ marginTop: 8 }}>
                <strong>Weekly:</strong> {SKIN_ROUTINES[selectedSkinType].weekly}
              </p>
            </div>
          </div>
        </Card>
      )}

      {subTab === "groom" && (
        <div className="stack-col">
          <div className="dashboard-grid">
            <Card>
              <div className="eyebrow">FAST VISIBLE RESULTS</div>
              <h2>Week-1 quick wins</h2>
              <div className="habit-list" style={{ marginTop: 12 }}>
                {WEEK1_QUICK_WINS.map((qw) => {
                  const checked = Boolean(groom.quickWins && groom.quickWins[qw.id]);
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
                            quickWins: { ...(groom.quickWins || {}), [qw.id]: !checked },
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
              <div className="eyebrow">WEEKLY HYGIENE CHECKLIST</div>
              <h2>Sunday grooming reset</h2>
              <div className="habit-list" style={{ marginTop: 12 }}>
                {WEEKLY_GROOM_CHECKS.map((wg) => {
                  const checked = Boolean(groom.weeklyChecks && groom.weeklyChecks[wg.id]);
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
            <div className="eyebrow">SLIM FRAME CAPSULE WARDROBE</div>
            <h2>Essential pieces & Indian skin tone colours</h2>
            <p>
              Best colours: <strong>Navy Blue, Olive Green, Crisp White, Maroon, Charcoal, Beige</strong>.
            </p>
            <div className="table-wrap" style={{ marginTop: 12 }}>
              <table className="clean-table">
                <thead>
                  <tr>
                    <th>Capsule Item (Shoulder seam must sit on shoulder bone)</th>
                    <th>Budget</th>
                    <th>Mid-Range</th>
                  </tr>
                </thead>
                <tbody>
                  {WARDROBE_CAPSULE.map((row, i) => (
                    <tr key={i}>
                      <td>{row.item}</td>
                      <td>{row.low}</td>
                      <td>{row.mid}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}

export { LooksPage };
