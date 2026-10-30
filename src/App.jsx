import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import "./App.css";
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
} from "./shared.jsx";
import { usePageNav } from "./hooks/usePageNav.js";
import { useSwipeNav } from "./hooks/useSwipeNav.js";
import { TodayPage } from "./pages/TodayPage.jsx";
import { HabitsAndTrackPage } from "./pages/HabitsAndTrackPage.jsx";
import { QuestPage } from "./pages/QuestPage.jsx";
import { LifestyleAndBodyPage } from "./pages/LifestyleAndBodyPage.jsx";
import { LooksPage } from "./pages/LooksPage.jsx";
import { ResetAndSOSPage } from "./pages/ResetAndSOSPage.jsx";
import { GoalsAndRoadmapPage } from "./pages/GoalsAndRoadmapPage.jsx";
import { ReflectionAndMindPage } from "./pages/ReflectionAndMindPage.jsx";
import { MoreAndSettingsPage } from "./pages/MoreAndSettingsPage.jsx";
import { YogaPage } from "./pages/YogaPage.jsx";
import {
  UrgeSOSModal,
  ProfileModal,
  LifestyleLogModal,
  RecordForm,
} from "./components/Modals";

const THEME_STORAGE_KEY = "day-by-day-comeback90-theme-dark";

/* Every page the app can show. Swipe order = NAV order first, then any extra page. */
const ALL_PAGES = [
  "Today",
  "Habits",
  "Quest",
  "Lifestyle",
  "Looks",
  "Reset",
  "Yoga",
  "Goals",
  "Reflection",
  "More",
];
const PAGES = [...NAV.map(([name]) => name), ...ALL_PAGES].filter(
  (n, i, a) => a.indexOf(n) === i
);

export default function App() {
  const [data, setData] = useState(readUnifiedStore);
  const [modal, setModal] = useState(null);
  const [sosOpen, setSosOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState("");
  const [toast, setToast] = useState("");
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [dark, setDark] = useState(() => {
    try {
      return window.localStorage.getItem(THEME_STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [today, setToday] = useState(todayISO);
  const [selectedISO, setSelectedISO] = useState(todayISO);

  const p = data.profile || {};
  const dm = useCallback(
    (txt) => discreetText(txt, Boolean(p.discreet)),
    [p.discreet]
  );

  /* Page navigation: real browser history (Back works) + swipe between pages */
  const { page, direction, navigate } = usePageNav(PAGES, "Today");
  const setPage = navigate; // every existing setPage("...") call now pushes history
  useSwipeNav({
    page,
    pages: PAGES,
    navigate,
    enabled: !modal && !sosOpen && !cmdOpen, // no swiping while a popup is open
  });

  /* Persist unified store */
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* ignore quota errors */
    }
  }, [data]);

  /* Persist dark theme preference */
  useEffect(() => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, dark ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [dark]);

  /* Auto-detect midnight rollover so 'today' stays accurate */
  useEffect(() => {
    const id = window.setInterval(() => {
      const nowISO = todayISO();
      setToday((prev) => {
        if (prev !== nowISO) {
          setSelectedISO((sel) => (sel === prev ? nowISO : sel));
          return nowISO;
        }
        return prev;
      });
    }, 60000);
    return () => window.clearInterval(id);
  }, []);

  /* Global keyboard shortcuts: Ctrl/Cmd+K (Command Palette) & Alt+S (Urge SOS) */
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((o) => !o);
        setCmdQuery("");
      } else if (e.altKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        setSosOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(id);
  }, [toast]);

  const notify = useCallback((msg) => setToast(msg), []);

  const update = useCallback((key, fn) => {
    setData((old) => ({
      ...old,
      [key]: typeof fn === "function" ? fn(old[key] || []) : fn,
    }));
  }, []);

  const updateProfile = useCallback((patch) => {
    setData((old) => ({
      ...old,
      profile: {
        ...old.profile,
        ...(typeof patch === "function" ? patch(old.profile) : patch),
      },
    }));
  }, []);

  const updateDay = useCallback((isoDate, updater) => {
    setData((old) => {
      const existing = (old.days && old.days[isoDate]) || createEmptyDay();
      const nextDay =
        typeof updater === "function"
          ? updater(existing)
          : { ...existing, ...updater };
      return {
        ...old,
        days: { ...(old.days || {}), [isoDate]: nextDay },
      };
    });
  }, []);

  const todayHabits = useMemo(
    () =>
      (data.habits || []).filter(
        (h) =>
          !h.archived &&
          (h.schedule !== "weekdays" ||
            [1, 2, 3, 4, 5].includes(new Date().getDay()))
      ),
    [data.habits]
  );

  const doneHabits = todayHabits.filter((h) => h.doneDate === today).length;
  const activeTasks = (data.tasks || []).filter((t) => !t.archived);
  const doneTasks = activeTasks.filter((t) => t.done).length;
  const todayMood = (data.moods || []).find((m) => m.date === today);
  const activeGoals = (data.goals || []).filter((g) => !g.archived);
  const todayDayObj = (data.days && data.days[today]) || createEmptyDay();
  const todayBreakdown = useMemo(
    () => calcDailyScoreBreakdown(todayDayObj, p),
    [todayDayObj, p]
  );
  const streaks = useMemo(
    () => calcStreaks(data.days, p, today),
    [data.days, p, today]
  );

  const saveRecord = (key, record, id) => {
    update(key, (arr) =>
      id
        ? arr.map((x) => (x.id === id ? { ...x, ...record } : x))
        : [{ id: uid(), createdAt: Date.now(), ...record }, ...arr]
    );
    setModal(null);
    notify(id ? "Changes saved" : "Saved to this device");
  };

  const removeRecord = (key, id) => {
    if (window.confirm("Delete this item? This cannot be undone.")) {
      update(key, (arr) => arr.filter((x) => x.id !== id));
      notify("Item deleted");
    }
  };

  const setDoneHabit = (habit) => {
    update("habits", (arr) =>
      arr.map((h) =>
        h.id === habit.id
          ? { ...h, doneDate: h.doneDate === today ? "" : today }
          : h
      )
    );
    update("checkins", (arr) => {
      const existing = arr.find(
        (c) => c.habitId === habit.id && c.date === today
      );
      if (existing) {
        return arr.map((c) =>
          c.id === existing.id ? { ...c, done: !existing.done } : c
        );
      }
      return [
        {
          id: uid(),
          habitId: habit.id,
          name: habit.name,
          date: today,
          done: true,
        },
        ...arr,
      ];
    });
    notify(
      habit.doneDate === today ? "Check-in undone" : "Habit checked in"
    );
  };

  const startModal = (type, item = null) => setModal({ type, item });

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `day-by-day-comeback90-backup-${today}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify("Backup exported");
  };

  const importData = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!parsed || typeof parsed !== "object") {
          throw new Error("Invalid JSON");
        }
        const def = createInitialData();
        setData((old) => ({
          ...def,
          ...old,
          ...parsed,
          profile: {
            ...def.profile,
            ...(old.profile || {}),
            ...(parsed.profile || {}),
            targets: {
              ...def.profile.targets,
              ...(old.profile?.targets || {}),
              ...(parsed.profile?.targets || {}),
            },
          },
          days: { ...(old.days || {}), ...(parsed.days || {}) },
          groom: { ...(old.groom || {}), ...(parsed.groom || {}) },
          settings: { ...(old.settings || {}), ...(parsed.settings || {}) },
        }));
        notify("Backup restored safely");
      } catch {
        notify("That backup file is not valid");
      }
    };
    reader.readAsText(file);
  };

  const resetAll = () => {
    if (
      window.confirm(
        "Delete all saved data from this browser? Export a backup first if you may need it."
      )
    ) {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(QUEST_KEY);
      setData(createInitialData());
      setPage("Today");
      notify("Local data cleared");
    }
  };

  /* Quick Command Palette Items */
  const commandItems = useMemo(() => {
    const navActions = NAV.map(([name, icon, desc]) => ({
      id: `nav-${name}`,
      title: `Go to ${name}`,
      sub: desc,
      icon,
      run: () => {
        setPage(name);
        setCmdOpen(false);
      },
    }));

    const quickModals = [
      {
        id: "act-sos",
        title: dm("Launch 10-Min Urge SOS"),
        sub: "Emergency breathing, grounding & wave timer",
        icon: "🛡",
        run: () => {
          setCmdOpen(false);
          setSosOpen(true);
        },
      },
      {
        id: "act-task",
        title: "Add a Task",
        sub: "Create a priority task for today",
        icon: "＋",
        run: () => {
          setCmdOpen(false);
          startModal("task");
        },
      },
      {
        id: "act-habit",
        title: "Create a Custom Habit",
        sub: "Add a build or quit habit",
        icon: "◉",
        run: () => {
          setCmdOpen(false);
          startModal("habit");
        },
      },
      {
        id: "act-mood",
        title: "Log Mood & Energy Check-in",
        sub: "Record today's emotional weather (1–5)",
        icon: "♡",
        run: () => {
          setCmdOpen(false);
          startModal("mood", todayMood || null);
        },
      },
      {
        id: "act-journal",
        title: "Write a Journal Reflection",
        sub: "Private reflection & gratitude entry",
        icon: "▤",
        run: () => {
          setCmdOpen(false);
          startModal("journal");
        },
      },
      {
        id: "act-goal",
        title: "Create a 90-Day Goal",
        sub: "Set a target with milestones",
        icon: "⚑",
        run: () => {
          setCmdOpen(false);
          startModal("goal");
        },
      },
      {
        id: "act-badday",
        title: data.badDayMode
          ? "Turn OFF Bad Day Mode"
          : "Turn ON Bad Day Mode (3 Basics Only)",
        sub: "Focus only on Sunlight, Phone Outside Bedroom, and Sleep on Time",
        icon: "☾",
        run: () => {
          setData((old) => ({ ...old, badDayMode: !old.badDayMode }));
          setCmdOpen(false);
          notify(
            !data.badDayMode
              ? "Bad Day Mode ON: Focus on 3 basics today"
              : "Full 100-pt mode restored"
          );
        },
      },
      {
        id: "act-discreet",
        title: p.discreet
          ? "Disable Discreet Privacy Labels"
          : "Enable Discreet Privacy Labels",
        sub: "Mask sensitive habit names in public",
        icon: "👁",
        run: () => {
          updateProfile({ discreet: !p.discreet });
          setCmdOpen(false);
          notify(!p.discreet ? "Discreet mode enabled" : "Standard labels on");
        },
      },
    ];

    const all = [...quickModals, ...navActions];
    const q = cmdQuery.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.sub.toLowerCase().includes(q)
    );
  }, [cmdQuery, data.badDayMode, p.discreet, todayMood, dm, notify, updateProfile]);

  const renderModal = () => {
    if (!modal) return null;
    const { type, item } = modal;
    const close = () => setModal(null);

    if (type === "profile") {
      return (
        <ProfileModal
          profile={p}
          onClose={close}
          onSave={(nextProfile) => {
            updateProfile(nextProfile);
            close();
            notify("Profile & 90-day preferences updated");
          }}
        />
      );
    }

    if (type === "lifestyleLog") {
      return (
        <LifestyleLogModal
          item={item}
          onClose={close}
          onSave={(entry) => {
            if (item.kind === "routine") {
              update("routines", (a) =>
                a.map((r) =>
                  r.id === item.id
                    ? { ...r, logs: [entry, ...(r.logs || [])] }
                    : r
                )
              );
            } else {
              update("metrics", (a) =>
                a.map((m) =>
                  m.id === item.id
                    ? { ...m, logs: [entry, ...(m.logs || [])] }
                    : m
                )
              );
            }
            close();
            notify("Activity saved");
          }}
        />
      );
    }

    const form = (key, fields, title, submitLabel = "Save") => (
      <RecordForm
        key={`${type}-${item?.id || "new"}`}
        title={title}
        fields={fields}
        initial={item || {}}
        submitLabel={submitLabel}
        onCancel={close}
        onSubmit={(v) => {
          if (type === "step") {
            update("routines", (a) =>
              a.map((r) =>
                r.id === item.id
                  ? {
                    ...r,
                    steps: [
                      ...(r.steps || []),
                      {
                        id: uid(),
                        title: v.stepTitle,
                        instructions: v.instructions || "",
                        duration: v.duration || "",
                      },
                    ],
                  }
                  : r
              )
            );
            setModal(null);
            notify("Routine step added");
            return;
          }
          if (type === "milestone") {
            saveRecord("milestones", { ...v, goalId: item.id, done: false });
            return;
          }
          if (type === "measurement") {
            saveRecord("measurements", { ...v, goalId: item.id });
            return;
          }
          if (type === "mood") {
            const moodDate = v.date || today;
            updateDay(moodDate, {
              mood: safeNum(v.score, 3),
              energy: safeNum(v.energy, 3),
            });
          }
          if (type === "journal") {
            const jDate = v.date || today;
            updateDay(jDate, (prev) => ({
              ...prev,
              journal: v.content,
              c: { ...(prev.c || {}), journal: true },
            }));
          }
          saveRecord(
            key,
            {
              ...v,
              ...(type === "habit"
                ? {
                  doneDate: item?.doneDate || "",
                  archived: item?.archived || false,
                }
                : {}),
              ...(type === "task"
                ? { done: item?.done || false, archived: item?.archived || false }
                : {}),
              ...(type === "goal"
                ? {
                  progress: item?.progress || 0,
                  archived: item?.archived || false,
                }
                : {}),
              ...(type === "routine"
                ? { steps: item?.steps || [], logs: item?.logs || [] }
                : {}),
              ...(type === "metric" ? { logs: item?.logs || [] } : {}),
              ...(type === "journal" ? { date: v.date || today } : {}),
              ...(type === "mood" ? { date: v.date || today } : {}),
              ...(type === "reset" ? { date: v.date || today } : {}),
            },
            item?.id
          );
        }}
      />
    );

    switch (type) {
      case "habit":
        return form(
          "habits",
          [
            {
              name: "name",
              label: "Habit name",
              required: true,
              placeholder: "e.g. Read 10 pages",
            },
            {
              name: "kind",
              label: "Type",
              type: "select",
              options: [
                ["build", "Build a habit"],
                ["quit", "Quit a habit"],
              ],
              defaultValue: "build",
            },
            {
              name: "category",
              label: "Category",
              placeholder: "Mind, body, learning…",
            },
            {
              name: "target",
              label: "Daily target",
              placeholder: "e.g. 20 minutes",
            },
            {
              name: "schedule",
              label: "Schedule",
              type: "select",
              options: [
                ["daily", "Every day"],
                ["weekdays", "Weekdays"],
                ["flexible", "Flexible"],
              ],
              defaultValue: "daily",
            },
          ],
          "Create a habit"
        );
      case "task":
        return form(
          "tasks",
          [
            {
              name: "title",
              label: "Task",
              required: true,
              placeholder: "What matters today?",
            },
            {
              name: "notes",
              label: "Notes",
              type: "textarea",
              placeholder: "Optional details",
            },
            {
              name: "due",
              label: "Due date",
              type: "date",
              defaultValue: today,
            },
            {
              name: "priority",
              label: "Priority",
              type: "select",
              options: [
                ["low", "Low"],
                ["normal", "Normal"],
                ["high", "High"],
              ],
              defaultValue: "normal",
            },
          ],
          "Add a task"
        );
      case "mood":
        return form(
          "moods",
          [
            {
              name: "date",
              label: "Date",
              type: "date",
              defaultValue: today,
              required: true,
            },
            {
              name: "score",
              label: "How are you feeling?",
              type: "select",
              options: [
                ["1", "Very low"],
                ["2", "Low"],
                ["3", "Okay"],
                ["4", "Good"],
                ["5", "Great"],
              ],
              defaultValue: "3",
            },
            {
              name: "energy",
              label: "Energy (1–5)",
              type: "select",
              options: [
                ["1", "1 · Very low"],
                ["2", "2"],
                ["3", "3 · Medium"],
                ["4", "4"],
                ["5", "5 · High"],
              ],
              defaultValue: "3",
            },
            {
              name: "stress",
              label: "Stress (1–5)",
              type: "select",
              options: [
                ["1", "1 · Very low"],
                ["2", "2"],
                ["3", "3 · Medium"],
                ["4", "4"],
                ["5", "5 · High"],
              ],
              defaultValue: "3",
            },
            {
              name: "note",
              label: "A note to yourself",
              type: "textarea",
              placeholder: "What might be influencing your mood?",
            },
          ],
          "Mood check-in"
        );
      case "goal":
        return form(
          "goals",
          [
            {
              name: "title",
              label: "Goal title",
              required: true,
              placeholder: "e.g. Build a consistent study routine",
            },
            {
              name: "why",
              label: "Why it matters",
              type: "textarea",
              placeholder: "What will this make possible?",
            },
            {
              name: "target",
              label: "Target (optional)",
              placeholder: "e.g. 90",
            },
            { name: "unit", label: "Unit", placeholder: "days, hours, kg…" },
            { name: "due", label: "Target date", type: "date" },
          ],
          "Create a goal"
        );
      case "milestone":
        return form(
          "milestones",
          [
            {
              name: "title",
              label: "Milestone",
              required: true,
              placeholder: "A meaningful next step",
            },
            { name: "due", label: "Target date", type: "date" },
          ],
          `Add milestone · ${item?.title || "goal"}`
        );
      case "measurement":
        return form(
          "measurements",
          [
            {
              name: "value",
              label: `Current measurement${item?.unit ? ` (${item.unit})` : ""
                }`,
              type: "number",
              required: true,
              placeholder: "Enter a number",
            },
            { name: "date", label: "Date", type: "date", defaultValue: today },
            { name: "note", label: "Note", type: "textarea" },
          ],
          `Log progress · ${item?.title || "goal"}`
        );
      case "journal":
        return form(
          "journals",
          [
            { name: "date", label: "Date", type: "date", defaultValue: today },
            {
              name: "title",
              label: "Entry title",
              required: true,
              placeholder: "A few words about today",
            },
            {
              name: "content",
              label: "What felt important today?",
              type: "textarea",
              required: true,
              placeholder: "There is no right way to write…",
            },
            {
              name: "gratitude",
              label: "One thing I appreciate",
              type: "textarea",
              placeholder: "Small things count.",
            },
          ],
          "Write a reflection"
        );
      case "routine":
        return form(
          "routines",
          [
            {
              name: "name",
              label: "Routine name",
              required: true,
              placeholder: "e.g. Evening wind-down",
            },
            {
              name: "category",
              label: "Category",
              type: "select",
              options: [
                ["face", "Face"],
                ["hair", "Hair"],
                ["body", "Body"],
                ["sleep", "Sleep"],
                ["movement", "Movement"],
                ["nutrition", "Nutrition"],
                ["other", "Other"],
              ],
              defaultValue: "body",
            },
            { name: "description", label: "Description", type: "textarea" },
            {
              name: "schedule",
              label: "Schedule",
              type: "select",
              options: [
                ["daily", "Daily"],
                ["weekly", "Weekly"],
                ["flexible", "Flexible"],
              ],
              defaultValue: "daily",
            },
          ],
          "Create a care routine"
        );
      case "metric":
        return form(
          "metrics",
          [
            {
              name: "name",
              label: "Indicator name",
              required: true,
              placeholder: "e.g. Sleep duration",
            },
            {
              name: "category",
              label: "Category",
              type: "select",
              options: [
                ["sleep", "Sleep"],
                ["movement", "Movement"],
                ["nutrition", "Nutrition"],
                ["body", "Body"],
                ["skin", "Skin / face"],
                ["other", "Other"],
              ],
              defaultValue: "sleep",
            },
            {
              name: "unit",
              label: "Unit",
              required: true,
              placeholder: "hours, glasses, grams…",
            },
            { name: "target", label: "Optional target", type: "number" },
            { name: "description", label: "Notes", type: "textarea" },
          ],
          "Add a measurable indicator"
        );
      case "step":
        return form(
          "routines",
          [
            {
              name: "stepTitle",
              label: "Step name",
              required: true,
              placeholder: "e.g. Cleanse gently",
            },
            { name: "instructions", label: "Instructions", type: "textarea" },
            { name: "duration", label: "Duration", placeholder: "e.g. 2 min" },
          ],
          `Add step · ${item?.name || "routine"}`
        );
      case "reset":
        return form(
          "resetLogs",
          [
            {
              name: "behavior",
              label: "Behavior / urge label",
              required: true,
              placeholder: "Use a label you feel comfortable with",
            },
            {
              name: "goal",
              label: "Your intention",
              type: "select",
              options: [
                ["reduce", "Reduce"],
                ["stop", "Stop"],
              ],
              defaultValue: "reduce",
            },
            { name: "date", label: "Date", type: "date", defaultValue: today },
            {
              name: "intensity",
              label: "Urge intensity (0–10)",
              type: "number",
              defaultValue: "5",
            },
            {
              name: "trigger",
              label: "Trigger (optional)",
              type: "textarea",
              placeholder: "What was happening before the urge?",
            },
            {
              name: "response",
              label: "What did you do?",
              type: "textarea",
              placeholder: "Pause, walk, change environment…",
            },
            {
              name: "outcome",
              label: "Outcome",
              type: "select",
              options: [
                ["urge_passed", "Urge passed"],
                ["alternative_chosen", "Alternative chosen"],
                ["behavior_occurred", "Behavior occurred"],
              ],
              defaultValue: "urge_passed",
            },
            {
              name: "reflection",
              label: "Reflection (optional)",
              type: "textarea",
            },
          ],
          "Private reset check-in"
        );
      default:
        return null;
    }
  };

  const renderPage = () => {
    switch (page) {
      case "Today":
        return (
          <TodayPage
            data={data}
            setData={setData}
            today={today}
            todayHabits={todayHabits}
            doneHabits={doneHabits}
            activeTasks={activeTasks}
            doneTasks={doneTasks}
            todayMood={todayMood}
            activeGoals={activeGoals}
            todayDayObj={todayDayObj}
            todayBreakdown={todayBreakdown}
            streaks={streaks}
            dm={dm}
            updateDay={updateDay}
            onHabit={setDoneHabit}
            onTask={(id) =>
              update("tasks", (a) =>
                a.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
              )
            }
            onAddTask={() => startModal("task")}
            onAddHabit={() => startModal("habit")}
            onMood={() => startModal("mood", todayMood || null)}
            onNavigate={(dest) => setPage(dest)}
            onOpenSOS={() => setSosOpen(true)}
            selectedISO={selectedISO}
            setSelectedISO={setSelectedISO}
          />
        );
      case "Habits":
        return (
          <HabitsAndTrackPage
            data={data}
            setData={setData}
            today={today}
            selectedISO={selectedISO}
            setSelectedISO={setSelectedISO}
            updateDay={updateDay}
            dm={dm}
            onAdd={() => startModal("habit")}
            onEdit={(x) => startModal("habit", x)}
            onToggle={setDoneHabit}
            onDelete={(id) => {
              const h = data.habits.find((x) => x.id === id);
              if (h && !h.archived) {
                update("habits", (a) =>
                  a.map((x) => (x.id === id ? { ...x, archived: true } : x))
                );
                notify("Habit archived; history kept");
              } else {
                removeRecord("habits", id);
              }
            }}
            showArchived={showArchived}
            setShowArchived={setShowArchived}
            query={query}
            setQuery={setQuery}
            onOpenSOS={() => setSosOpen(true)}
          />
        );
      case "Quest":
        return (
          <QuestPage
            data={data}
            today={today}
            onNavigate={setPage}
            notify={notify}
          />
        );
      case "Lifestyle":
        return (
          <LifestyleAndBodyPage
            data={data}
            setData={setData}
            updateProfile={updateProfile}
            onAddRoutine={() => startModal("routine")}
            onAddMetric={() => startModal("metric")}
            onAddStep={(routine) => startModal("step", routine)}
            onLog={(item) => startModal("lifestyleLog", item)}
            onEdit={(item) => startModal(item.kind, item)}
            onDelete={(key, id) => removeRecord(key, id)}
            notify={notify}
          />
        );
      case "Looks":
        return <LooksPage data={data} setData={setData} notify={notify} />;
      case "Reset":
        return (
          <ResetAndSOSPage
            data={data}
            setData={setData}
            today={today}
            dm={dm}
            updateDay={updateDay}
            onAdd={() => startModal("reset")}
            onEdit={(item) => startModal("reset", item)}
            onDelete={(id) => removeRecord("resetLogs", id)}
            onOpenSOS={() => setSosOpen(true)}
            notify={notify}
          />
        );
      case "Yoga":
        return (
          <YogaPage
            data={data}
            setData={setData}
            today={today}
            updateDay={updateDay}
            notify={notify}
          />
        );
      case "Goals":
        return (
          <GoalsAndRoadmapPage
            data={data}
            setData={setData}
            onAdd={() => startModal("goal")}
            onEdit={(item) => startModal("goal", item)}
            onMilestone={(goal) => startModal("milestone", goal)}
            onMeasure={(goal) => startModal("measurement", goal)}
            onDelete={(key, id, mode) => {
              if (mode === "toggle" && key === "milestones") {
                update("milestones", (a) =>
                  a.map((m) => (m.id === id ? { ...m, done: !m.done } : m))
                );
              } else if (mode === "restore" && key === "goals") {
                update("goals", (a) =>
                  a.map((g) => (g.id === id ? { ...g, archived: false } : g))
                );
              } else if (key === "goals") {
                update("goals", (a) =>
                  a.map((g) => (g.id === id ? { ...g, archived: true } : g))
                );
              } else {
                removeRecord(key, id);
              }
            }}
            notify={notify}
          />
        );
      case "Reflection":
        return (
          <ReflectionAndMindPage
            data={data}
            setData={setData}
            today={today}
            onJournal={() => startModal("journal")}
            onEditJournal={(item) => startModal("journal", item)}
            onDelete={(key, id) => removeRecord(key, id)}
            onMood={() => startModal("mood", todayMood || null)}
            notify={notify}
          />
        );
      case "More":
        return (
          <MoreAndSettingsPage
            data={data}
            setData={setData}
            updateProfile={updateProfile}
            exportData={exportData}
            importData={importData}
            resetAll={resetAll}
            notify={notify}
          />
        );
      default:
        return null;
    }
  };

  const resetCount = (data.resetLogs || []).length + (data.urges || []).length;
  const currentDayNum = Math.min(getDayIndex(p.startDate, today), 90);

  return (
    <div className={`app-shell ${dark ? "theme-dark" : ""}`}>
      <header className="site-header">

        <button
          type="button"
          className="logo"
          onClick={() => setPage("Today")}
        >
          <svg
            className="logo-icon"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 64 64"
            width="36"
            height="36"
            aria-hidden="true"
          >
            <rect
              width="64"
              height="64"
              rx="14"
              fill="#000000"
            />
            <path
              d="M 51 32 A 19 19 0 1 1 32 13"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="4.5"
              strokeLinecap="round"
            />
            <path
              d="M 27 37 L 42 22 M 32 22 H 42 V 32"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle
              cx="21"
              cy="43"
              r="3"
              fill="#D9381E"
            />
          </svg>
        </button>

        <nav className="site-nav" aria-label="Main">
          {NAV.map(([name, , desc]) => (
            <button
              type="button"
              key={name}
              className={`site-link ${page === name ? "active" : ""}`}
              onClick={() => {
                setPage(name);
                setQuery("");
              }}
              title={desc}
            >
              {name}
              {name === "Reset" && resetCount > 0 && (
                <b className="nav-count">{resetCount}</b>
              )}
            </button>
          ))}
        </nav>

        <div className="header-actions">
          <button
            type="button"
            className="pill-outline"
            onClick={() => setPage("Habits")}
            title="Today's 100-Point Score & Clean Streak"
          >
            {todayBreakdown.total} pts · 🔥 {streaks.currentClean}d
          </button>

          <button
            type="button"
            className="pill-outline"
            onClick={() => setSosOpen(true)}
            title="Shortcut: Alt + S"
          >
            {dm("Urge SOS")}
          </button>

          <button
            type="button"
            className="pill-solid"
            onClick={() => startModal("profile")}
            title="Edit Profile & 90-Day Targets"
          >
            Day {currentDayNum}/90
          </button>

          <button
            type="button"
            className="icon-button"
            onClick={() => setDark(!dark)}
            aria-label="Toggle theme"
            title="Toggle Dark / Light Mode"
          >
            {dark ? "☼" : "◐"}
          </button>
        </div>
      </header>

      <main className="main-area page-swipe">
        <div className="content-wrap">
          {data.badDayMode && (
            <div
              className="row-between"
              style={{ marginBottom: 12, flexWrap: "wrap", gap: 8 }}
            >
              <span className="status-pill peach-pill">
                Bad Day Mode Active · Just finish 3 basics today (Sunlight, Phone
                Outside, Bed on Time)
              </span>
              <Button
                onClick={() =>
                  setData((old) => ({ ...old, badDayMode: false }))
                }
              >
                Exit Bad Day Mode
              </Button>
            </div>
          )}

          <div key={page} className="page-view" data-dir={direction}>
            {renderPage()}
          </div>

          <footer className="app-footer">
            <span>
              General info, not medical advice · Tele-MANAS 14416 · Emergency
              112
            </span>
            <div>
              <button
                type="button"
                onClick={() => {
                  setCmdOpen(true);
                  setCmdQuery("");
                }}
              >
                Quick Jump (Ctrl+K)
              </button>
              <button type="button" onClick={exportData}>
                Export
              </button>
              <label className="import-label">
                Import
                <input
                  type="file"
                  accept="application/json,.json"
                  onChange={(e) => importData(e.target.files?.[0])}
                />
              </label>
              <button type="button" className="danger-text" onClick={resetAll}>
                Clear data
              </button>
            </div>
          </footer>
        </div>
      </main>

      {sosOpen && (
        <UrgeSOSModal
          data={data}
          setData={setData}
          today={today}
          dm={dm}
          updateDay={updateDay}
          onClose={() => setSosOpen(false)}
          notify={notify}
        />
      )}

      {cmdOpen && (
        <Modal
          title="Quick Command & Navigation (Ctrl+K)"
          onClose={() => setCmdOpen(false)}
        >
          <div className="stack-col">
            <input
              type="search"
              className="clean-input"
              autoFocus
              placeholder="Type a page or action (e.g. Workout, Pomodoro, SOS, Journal)..."
              value={cmdQuery}
              onChange={(e) => setCmdQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && commandItems.length > 0) {
                  e.preventDefault();
                  commandItems[0].run();
                }
              }}
            />
            <div
              className="habit-list"
              style={{ maxHeight: 340, overflowY: "auto", marginTop: 8 }}
            >
              {commandItems.map((item) => (
                <div
                  key={item.id}
                  className="habit-row"
                  style={{ cursor: "pointer" }}
                  onClick={item.run}
                >
                  <span className="status-pill complete">{item.icon}</span>
                  <div className="habit-info">
                    <strong>{item.title}</strong>
                    <small>{item.sub}</small>
                  </div>
                  <span className="muted-text">↵</span>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {renderModal()}

      {toast && (
        <div className="toast">
          <span>✓</span>
          {toast}
        </div>
      )}

      <nav className="mobile-nav" aria-label="Mobile">
        {NAV.map(([name, icon]) => (
          <button
            type="button"
            key={name}
            className={page === name ? "active" : ""}
            onClick={() => setPage(name)}
          >
            <Icon>{icon}</Icon>
            <small>{name}</small>
          </button>
        ))}
      </nav>
    </div>
  );
}