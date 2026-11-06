import { useRef } from "react";
import {
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
import { getClassForLevel, getLevelProgress } from "../progression.js";

function QuestPage({ data, game, setGame, today, notify }) {
  const claimLockRef = useRef(new Set());

  const startDate = (data.profile && data.profile.startDate) || today;
  const dayNumber = getDayIndex(startDate, today);
  const quest = QUESTS[(dayNumber - 1) % QUESTS.length];
  const completedToday = Boolean(game.completed && game.completed[today]);
  const completedSideQuests = Array.isArray(game.sideCompleted?.[today])
    ? game.sideCompleted[today]
    : [];
  const xp = Number(game.xp) || 0;
  const levelProgress = getLevelProgress(xp);
  const currentClass = getClassForLevel(levelProgress.level);
  const completedDays = Object.keys(game.days || {}).filter(
    (d) => game.days[d]
  ).length;

  const recentDays = Array.from({ length: 7 }, (_, index) => {
    const iso = addDaysISO(today, -(6 - index));
    return {
      key: iso,
      label: getWeekdayShort(iso).slice(0, 1),
      done: Boolean(game.days && game.days[iso]),
    };
  });

  const completeQuest = (qItem = quest) => {
    const isMain = qItem.id === quest.id;
    const claimKey = `${today}:${qItem.id}`;
    if (completedToday && isMain) {
      notify("Main mission already claimed for today!");
      return;
    }
    if (
      claimLockRef.current.has(claimKey) ||
      (!isMain && completedSideQuests.includes(qItem.id))
    ) {
      notify("This side quest has already been claimed today.");
      return;
    }
    claimLockRef.current.add(claimKey);

    setGame((prev) => {
      const previousSideQuests =
        prev.sideCompleted &&
        typeof prev.sideCompleted === "object" &&
        !Array.isArray(prev.sideCompleted)
          ? prev.sideCompleted
          : {};
      const previousSideList = Array.isArray(previousSideQuests[today])
        ? previousSideQuests[today]
        : [];
      return {
        ...prev,
        xp: (Number(prev.xp) || 0) + qItem.xp,
        completed: isMain
          ? { ...(prev.completed || {}), [today]: qItem.id }
          : prev.completed,
        days: { ...(prev.days || {}), [today]: true },
        sideCompleted: isMain
          ? previousSideQuests
          : {
              ...previousSideQuests,
              [today]: [...previousSideList, qItem.id],
            },
      };
    });
    notify(`+${qItem.xp} XP earned! Mission cleared: ${qItem.title}`);
  };

  return (
    <>
      <Heading
        title="Comeback Quest"
        description="Small real-world missions. Earn XP, level up, and build a life you love waking up to."
        action={
          <Button
            onClick={() => {
              if (
                window.confirm(
                  "Reset Quest XP, class progress, and reward history?"
                )
              ) {
                setGame({
                  xp: 0,
                  completed: {},
                  days: {},
                  sideCompleted: {},
                  dailyWinRewards: {},
                  levelRewards: {},
                });
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
            CLASS {currentClass.rank} · {currentClass.title.toUpperCase()} ·
            LEVEL {levelProgress.level}
          </span>
          <h2>
            Stack small wins until they
            <br />
            <em>become your default.</em>
          </h2>
          <p>
            {(
              levelProgress.levelRequirementXP - levelProgress.levelProgressXP
            ).toLocaleString()}{" "}
            XP needed to unlock Level {levelProgress.level + 1}.
          </p>
          <div className="jsx-07db415b">
            <Progress value={levelProgress.progressPercent} />
          </div>
        </div>
        <div className="lifestyle-orbit">
          <span>CLASS {currentClass.rank}</span>
          <i>✦</i>
          <b>{xp} TOTAL XP</b>
        </div>
      </div>

      <div className="stats-grid">
        <Stat
          icon="✦"
          label="Total experience"
          value={`${xp} XP`}
          detail={`${levelProgress.levelProgressXP}/${levelProgress.levelRequirementXP} XP in Level ${levelProgress.level}`}
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
          value={`${currentClass.rank}-Class`}
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
            <div className="callout-icon">
              {completedToday ? "✓" : quest.icon}
            </div>
            <div>
              <strong>
                {completedToday
                  ? "Mission accomplished for today!"
                  : "Ready when you are"}
              </strong>
              <p>
                {completedToday
                  ? "Your XP is saved locally. Come back tomorrow for the next quest or try side quests below."
                  : "Complete this small real-world action, then tap below to claim your XP."}
              </p>
            </div>
          </div>
          <Button
            kind="primary"
            disabled={completedToday}
            onClick={() => completeQuest(quest)}
          >
            {completedToday
              ? "✓ Mission cleared"
              : `${quest.action} (+${quest.xp} XP)`}
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
              <div
                key={d.key}
                className={`quest-day-pill ${d.done ? "done" : ""}`}
              >
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
            <p>Each side quest can earn XP once per day.</p>
          </div>
        </div>
        <div className="record-grid">
          {QUESTS.filter((q) => q.id !== quest.id).map((item) => (
            <div className="side-quest-card" key={item.id}>
              <span className="record-symbol sage">{item.icon}</span>
              <div className="habit-info">
                <strong>{item.title}</strong>
                <small>
                  {item.detail}
                  {completedSideQuests.includes(item.id)
                    ? " · Claimed today"
                    : ""}
                </small>
              </div>
              <Button
                disabled={completedSideQuests.includes(item.id)}
                onClick={() => completeQuest(item)}
              >
                {completedSideQuests.includes(item.id)
                  ? "✓ Claimed"
                  : `+${item.xp} XP`}
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

export { QuestPage };