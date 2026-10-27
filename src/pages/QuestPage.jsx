import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  QUEST_KEY,
  addDaysISO,
  getDayIndex,
  getWeekdayShort,
  QUESTS,
  Button,
  Card,
  Heading,
  Progress,
  Stat,
} from "../shared";

function QuestPage({ data, today, onNavigate, notify }) {
  const [game, setGame] = useState(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(QUEST_KEY) || "{}");
      return { xp: 0, completed: {}, days: {}, ...saved };
    } catch {
      return { xp: 0, completed: {}, days: {} };
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(QUEST_KEY, JSON.stringify(game));
    } catch {
      /* ignore */
    }
  }, [game]);

  const dayNumber = getDayIndex(data.profile?.startDate || today, today);
  const quest = QUESTS[(dayNumber - 1) % QUESTS.length];
  const completedToday = Boolean(game.completed && game.completed[today]);
  const xp = Number(game.xp) || 0;
  const level = Math.floor(xp / 100) + 1;
  const levelProgress = xp % 100;
  const completedDays = Object.keys(game.days || {}).filter((d) => game.days[d]).length;

  const recentDays = Array.from({ length: 7 }, (_, index) => {
    const iso = addDaysISO(today, -(6 - index));
    return {
      key: iso,
      label: getWeekdayShort(iso).slice(0, 1),
      done: Boolean(game.days && game.days[iso]),
    };
  });

  const completeQuest = (qItem = quest) => {
    if (completedToday && qItem.id === quest.id) return;
    setGame((prev) => ({
      ...prev,
      xp: (Number(prev.xp) || 0) + qItem.xp,
      completed: { ...(prev.completed || {}), [today]: qItem.id },
      days: { ...(prev.days || {}), [today]: true },
    }));
    notify(`+${qItem.xp} XP earned! Mission cleared.`);
  };

  return (
    <>
      <Heading
        eyebrow="YOUR REAL-LIFE ADVENTURE"
        title="Comeback Quest"
        description="Small real-world missions. Earn XP, level up, and build a life you love waking up to."
        action={
          <Button
            onClick={() => {
              if (window.confirm("Reset Quest XP and mission history?")) {
                setGame({ xp: 0, completed: {}, days: {} });
                notify("Quest progress reset");
              }
            }}
          >
            Reset XP
          </Button>
        }
      />

      <div className="lifestyle-banner">
        <div>
          <span className="eyebrow">
            LEVEL {level} · {level < 3 ? "ROOKIE" : level < 6 ? "RISING" : "ELITE"} BUILDER
          </span>
          <h2>
            Stack small wins until they
            <br />
            <em>become your default.</em>
          </h2>
          <p>{100 - levelProgress} XP needed to unlock Level {level + 1}.</p>
          <div style={{ maxWidth: 320, marginTop: 12 }}>
            <Progress value={levelProgress} />
          </div>
        </div>
        <div className="lifestyle-orbit">
          <span>LVL {level}</span>
          <i>✦</i>
          <b>{xp} TOTAL XP</b>
        </div>
      </div>

      <div className="stats-grid">
        <Stat
          icon="✦"
          label="Total experience"
          value={`${xp} XP`}
          detail={`${levelProgress}/100 XP in Level ${level}`}
          color="sage"
        />
        <Stat
          icon="✓"
          label="Missions cleared"
          value={completedDays}
          detail="Days you showed up"
          color="peach"
        />
        <Stat
          icon="⚑"
          label="Current rank"
          value={level < 3 ? "Rookie" : level < 6 ? "Rising" : level < 10 ? "Elite" : "Legend"}
          detail="Earned in the real world"
          color="blue"
        />
        <Stat
          icon="◉"
          label="Today's bonus"
          value={`+${quest.xp} XP`}
          detail={completedToday ? "Claimed today" : "Available now"}
          color="lavender"
        />
      </div>

      <div className="dashboard-grid">
        <Card>
          <div className="section-head">
            <div>
              <div className="eyebrow">TODAY&apos;S MAIN MISSION</div>
              <h2>{quest.title}</h2>
              <p>{quest.detail}</p>
            </div>
            <span className="status-pill complete">+{quest.xp} XP</span>
          </div>
          <div className="intro-callout">
            <div className="callout-icon">{completedToday ? "✓" : quest.icon}</div>
            <div>
              <strong>
                {completedToday ? "Mission accomplished for today!" : "Ready when you are"}
              </strong>
              <p>
                {completedToday
                  ? "Your XP is saved locally. Come back tomorrow for the next quest."
                  : "Complete this small real-world action, then tap below to claim your XP."}
              </p>
            </div>
          </div>
          <Button
            kind="primary"
            disabled={completedToday}
            onClick={() => completeQuest(quest)}
          >
            {completedToday ? "✓ Mission cleared" : `${quest.action} (+${quest.xp} XP)`}
          </Button>
        </Card>

        <Card>
          <div className="section-head">
            <div>
              <div className="eyebrow">LAST 7 DAYS</div>
              <h2>Quest consistency</h2>
              <p>Every check mark is proof of effort.</p>
            </div>
            <span className="status-pill">
              {recentDays.filter((d) => d.done).length}/7 days
            </span>
          </div>
          <div className="quest-week-row">
            {recentDays.map((d) => (
              <div key={d.key} className={`quest-day-pill ${d.done ? "done" : ""}`}>
                <small>{d.label}</small>
                <strong>{d.done ? "✓" : "·"}</strong>
                <span>{d.key.slice(8)}</span>
              </div>
            ))}
          </div>
          <div className="quote-strip">
            <span>“</span>
            <p>Missing one day never erases your XP. Just return today.</p>
          </div>
        </Card>
      </div>

      <Card>
        <div className="section-head">
          <div>
            <div className="eyebrow">SIDE QUESTS</div>
            <h2>Bonus actions you can do anytime</h2>
          </div>
        </div>
        <div className="record-grid">
          {QUESTS.filter((q) => q.id !== quest.id).map((item) => (
            <div className="side-quest-card" key={item.id}>
              <span className="record-symbol sage">{item.icon}</span>
              <div className="habit-info">
                <strong>{item.title}</strong>
                <small>{item.detail}</small>
              </div>
              <Button onClick={() => completeQuest(item)}>+{item.xp} XP</Button>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

export { QuestPage };
