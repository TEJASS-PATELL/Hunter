import { useState } from "react";
import {
  Award,
  Check,
  Compass,
  Crown,
  Flame,
  Gem,
  Gift,
  LockKeyhole,
  Shield,
  ShieldCheck,
  Sparkles,
  Sprout,
  Swords,
} from "lucide-react";
import {
  Button,
  Card,
  Heading,
  Progress,
  QUESTS,
} from "../shared.jsx";
import {
  CLASS_TIERS,
  REWARD_IDEAS,
  REWARD_LEVELS,
  getClassForLevel,
  getLevelProgress,
  getNextClassForLevel,
  xpForLevel,
} from "../progression.js";

const CLASS_ICONS = {
  E: Sprout,
  D: Compass,
  C: Shield,
  B: Swords,
  A: ShieldCheck,
  S: Flame,
  SS: Crown,
  SSS: Sparkles,
  X: Gem,
};

const RANK_ARCHETYPES = {
  E: {
    label: "The First Spark",
    focus: "Start where you are. One real action is enough to begin.",
    mantra: "Small actions are how every comeback begins.",
  },
  D: {
    label: "The Initiate",
    focus: "Build a steady foundation, one repeatable habit at a time.",
    mantra: "Consistency turns effort into a path.",
  },
  C: {
    label: "The Strider",
    focus: "Keep moving with intention, even when progress feels quiet.",
    mantra: "The next step matters more than the perfect plan.",
  },
  B: {
    label: "The Vanguard",
    focus: "Protect your momentum and make room for what matters.",
    mantra: "Show up with purpose; let the small wins stack.",
  },
  A: {
    label: "The Elite",
    focus: "Turn hard-earned skills into a rhythm you can sustain.",
    mantra: "Strong foundations make ambitious goals feel possible.",
  },
  S: {
    label: "The Sovereign",
    focus: "Lead your days with calm, deliberate choices.",
    mantra: "Your strength is built in the choices nobody sees.",
  },
  SS: {
    label: "The Mythic",
    focus: "Make resilience part of how you move through the world.",
    mantra: "Confidence grows from keeping promises to yourself.",
  },
  SSS: {
    label: "The Apex",
    focus: "Bring patience and purpose to every new challenge.",
    mantra: "You have learned how to begin again, as many times as it takes.",
  },
  X: {
    label: "The Transcendent",
    focus: "Keep growing without needing a finish line.",
    mantra: "The journey keeps opening new paths.",
  },
};

function RankPortrait({ rank, className = "", locked = false }) {
  const tier = CLASS_TIERS.find((item) => item.rank === rank) || CLASS_TIERS[0];
  const archetype = RANK_ARCHETYPES[rank] || RANK_ARCHETYPES.E;
  const RankIcon = CLASS_ICONS[rank] || Sprout;

  return (
    <div
      className={`hr-rank-art rank-${rank.toLowerCase()} ${
        locked ? "is-locked" : ""
      } ${className}`}
      aria-hidden="true"
    >
      <span className="hr-art-orbit hr-art-orbit-one" />
      <span className="hr-art-orbit hr-art-orbit-two" />
      <div className="hr-art-sigil">
        <RankIcon size={34} strokeWidth={1.5} />
        <strong>{rank}</strong>
      </div>
      <span className="hr-art-rank">{rank}-RANK</span>
      <span className="hr-art-title">{tier.title}</span>
      <small>{archetype.label}</small>
      {locked && (
        <span className="hr-lock-badge">
          <LockKeyhole size={15} />
        </span>
      )}
    </div>
  );
}

const dateFromOffset = (today, offset) => {
  const date = new Date(`${today}T12:00:00`);
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
};

function getDailyXP(game, date) {
  const checkInXP = Array.isArray(game.dailyWinRewards?.[date])
    ? game.dailyWinRewards[date].length * 10
    : 0;
  const mainQuest = QUESTS.find((quest) => quest.id === game.completed?.[date]);
  const sideQuestXP = Array.isArray(game.sideCompleted?.[date])
    ? game.sideCompleted[date].reduce((total, id) => {
        const quest = QUESTS.find((item) => item.id === id);
        return total + (quest?.xp || 0);
      }, 0)
    : 0;
  return checkInXP + (mainQuest?.xp || 0) + sideQuestXP;
}

function HunterRankPage({ game, setGame, today, notify }) {
  const xp = Math.max(0, Number(game.xp) || 0);
  const progress = getLevelProgress(xp);
  const currentClass = getClassForLevel(progress.level);
  const nextClass = getNextClassForLevel(progress.level);
  const CurrentClassIcon = CLASS_ICONS[currentClass.rank] || Sprout;

  const [selectedRankKey, setSelectedRankKey] = useState(null);

  const rewardPlans = game.levelRewards || {};
  const nextRewardLevel =
    REWARD_LEVELS.find((level) => !rewardPlans[level]?.claimedAt) ||
    progress.level + 1;
  const nextRewardXP = xpForLevel(nextRewardLevel);
  const nextReward = rewardPlans[nextRewardLevel] || {};
  const rewardPlan =
    nextReward.plan ?? REWARD_IDEAS[nextRewardLevel] ?? "";
  const rewardUnlocked = xp >= nextRewardXP;

  const dates = Array.from({ length: 14 }, (_, index) =>
    dateFromOffset(today, index - 13)
  );
  const dailyXP = dates.map((date) => getDailyXP(game, date));
  const hasActivity = dailyXP.some((value) => value > 0);
  const maxDailyXP = Math.max(1, ...dailyXP);
  const last7XP = dailyXP.slice(-7).reduce((total, value) => total + value, 0);
  const activeDays = dailyXP.slice(-7).filter((value) => value > 0).length;
  const completedDays = Object.values(game.days || {}).filter(Boolean).length;

  const currentArchetype =
    RANK_ARCHETYPES[currentClass.rank] || RANK_ARCHETYPES.E;
  const inspectedRankKey = selectedRankKey || currentClass.rank;
  const inspectedTier =
    CLASS_TIERS.find((tier) => tier.rank === inspectedRankKey) || currentClass;
  const inspectedArchetype =
    RANK_ARCHETYPES[inspectedRankKey] || RANK_ARCHETYPES.E;
  const isInspectedUnlocked = progress.level >= inspectedTier.minLevel;

  const saveRewardPlan = (level, value) => {
    setGame((previous) => ({
      ...previous,
      levelRewards: {
        ...(previous.levelRewards || {}),
        [level]: {
          ...(previous.levelRewards?.[level] || {}),
          plan: value,
        },
      },
    }));
  };

  const claimReward = () => {
    if (!rewardUnlocked || !rewardPlan.trim() || nextReward.claimedAt) {
      return;
    }
    setGame((previous) => ({
      ...previous,
      levelRewards: {
        ...(previous.levelRewards || {}),
        [nextRewardLevel]: {
          ...(previous.levelRewards?.[nextRewardLevel] || {}),
          plan: rewardPlan.trim(),
          claimedAt: today,
        },
      },
    }));
    notify(`Reward enjoyed: ${rewardPlan.trim()}`);
  };

  return (
    <div className="hunter-rank-page">
      <Heading
        title="Your Hunter journey"
        description="Build your rank one real-life win at a time. Every step counts—even on quiet days."
      />

      {/* HERO BANNER PANEL */}
      <section className="hunter-rank-banner" aria-labelledby="hunter-rank-title">
        <div className="hunter-rank-copy">
          <div className="hr-banner-head">
            <span className="hunter-class-label tint-blue">
              <CurrentClassIcon size={15} aria-hidden="true" />
              CURRENT RANK
            </span>
            <span className="hr-mono-tag">{currentArchetype.label}</span>
          </div>

          <h2 id="hunter-rank-title">{currentClass.title} Hunter</h2>

          <div className="hunter-rank-meta" aria-label="Current class and level">
            <span className="hr-pill tint-blue">
              {currentClass.rank}-RANK
            </span>
            <span className="hr-pill">LEVEL {progress.level}</span>
          </div>

          <blockquote className="hr-quote-box">
            <p>&ldquo;{currentArchetype.mantra}&rdquo;</p>
            <footer>{currentArchetype.focus}</footer>
          </blockquote>

          {nextClass ? (
            <div className="hunter-next-rank">
              <Award size={17} aria-hidden="true" />
              <span>
                Next rank ·{" "}
                <strong>
                  {nextClass.rank}-Rank {nextClass.title}
                </strong>{" "}
              </span>
              <small>LEVEL {nextClass.minLevel}</small>
            </div>
          ) : (
            <div className="hunter-next-rank">
              <Sparkles size={17} aria-hidden="true" />
              <span>
                <strong>Highest rank reached</strong> · Your journey continues
              </span>
            </div>
          )}

          <div className="hunter-level-progress">
            <div className="row-between">
              <strong>Level {progress.level} progress</strong>
              <span className="hr-mono-num">
                {progress.levelProgressXP.toLocaleString()} /{" "}
                {progress.levelRequirementXP.toLocaleString()} XP
              </span>
            </div>
            <Progress value={progress.progressPercent} />
            <div className="hr-progress-sub">
              <small>
                {(
                  progress.levelRequirementXP - progress.levelProgressXP
                ).toLocaleString()}{" "}
                XP to Level {progress.level + 1}
              </small>
              <small className="hr-mono-num">
                {Math.round(progress.progressPercent)}%
              </small>
            </div>
          </div>
        </div>

        {/* CURRENT RANK SPOTLIGHT */}
        <div className="hunter-rank-emblem">
          <div className="hr-spotlight-card">
            <div className="hr-spotlight-image-box">
              <RankPortrait rank={currentClass.rank} />
              <div className="hunter-rank-seal" aria-hidden="true">
                <CurrentClassIcon className="hunter-rank-seal-icon" size={17} />
                <span>{currentClass.rank}-RANK</span>
              </div>
            </div>
            <div className="hr-spotlight-meta">
              <span className="hr-eyebrow">CURRENT CLASS</span>
              <strong>{currentArchetype.label}</strong>
              <small>{currentArchetype.focus}</small>
            </div>
          </div>
        </div>
      </section>

      {/* STATS GRID */}
      <div className="stats-grid hunter-rank-stats">
        <Card className="hunter-rank-stat">
          <div className="hr-stat-header">
            <span>
              <Sparkles size={15} aria-hidden="true" /> Total XP
            </span>
            <em className="hr-chip tint-blue">SAVED</em>
          </div>
          <strong>{xp.toLocaleString()}</strong>
          <small>Every earned point stays with you</small>
        </Card>

        <Card className="hunter-rank-stat">
          <div className="hr-stat-header">
            <span>
              <Flame size={15} aria-hidden="true" /> Last 7 days
            </span>
            <em className="hr-chip tint-peach">{activeDays}/7 DAYS</em>
          </div>
          <strong>+{last7XP.toLocaleString()} XP</strong>
          <small>{activeDays} active days — rest is allowed</small>
        </Card>

        <Card className="hunter-rank-stat">
          <div className="hr-stat-header">
            <span>
              <Check size={15} aria-hidden="true" /> Missions completed
            </span>
            <em className="hr-chip tint-green">QUESTS</em>
          </div>
          <strong>{completedDays}</strong>
          <small>Days you showed up for a quest</small>
        </Card>
      </div>

      {/* 14-DAY ACTIVITY CHART */}
      <Card className="hunter-activity-card">
        <div className="section-head">
          <div>
            <span className="hr-eyebrow">DAILY CONSISTENCY</span>
            <h2>Your progress, not just a level</h2>
            <p>XP earned each day from check-ins and completed quests.</p>
          </div>
          <span className="status-pill">LAST 14 DAYS</span>
        </div>

        <div className="hunter-xp-scroll">
          <div
            className="hunter-xp-chart"
            role="img"
            aria-label={`XP earned over the last 14 days. ${last7XP} XP in the last 7 days.`}
          >
            {dates.map((date, index) => {
              const value = dailyXP[index];
              const height = value ? Math.max(10, (value / maxDailyXP) * 100) : 4;
              return (
                <div
                  className={`hunter-xp-day ${
                    date === today ? "is-today-col" : ""
                  }`}
                  key={date}
                >
                  <span className="hunter-xp-value">
                    {value ? value : ""}
                  </span>
                  <div className="hunter-xp-bar-track">
                    <i
                      className={[
                        value ? "has-xp" : "",
                        date === today ? "is-today" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      style={{ height: `${height}%` }}
                      title={`${date}: ${value} XP`}
                    />
                  </div>
                  <small>
                    {date === today ? "TODAY" : date.slice(5).replace("-", "/")}
                  </small>
                </div>
              );
            })}
          </div>
        </div>

        {hasActivity ? (
          <p className="hunter-activity-note">
            Your rank reflects saved progress, not a perfect streak. Come back
            whenever you&apos;re ready.
          </p>
        ) : (
          <div className="hunter-chart-empty">
            <Sparkles size={17} aria-hidden="true" />
            <span>Your next daily win or quest will show up here.</span>
          </div>
        )}
      </Card>

      {/* HUNTER RANK LADDER */}
      <Card className="hunter-class-card">
        <div className="section-head">
          <div>
            <span className="hr-eyebrow">YOUR LONG-TERM PROGRESSION</span>
            <h2>Hunter rank ladder</h2>
            <p>
              Every rank is earned over time. Click any rank card to preview its
              focus and description.
            </p>
          </div>
          <span className="hunter-ladder-count">
            {CLASS_TIERS.filter((tier) => progress.level >= tier.minLevel).length}
            <span> / {CLASS_TIERS.length} RANKS</span>
          </span>
        </div>

        {/* SELECTED RANK INSPECTOR ROW */}
        <div className="hr-inspector-row">
          <div className="hr-inspector-thumb">
            <RankPortrait
              rank={inspectedTier.rank}
              locked={!isInspectedUnlocked}
            />
          </div>
          <div className="hr-inspector-content">
            <div className="hr-inspector-tags">
              <span className="hr-chip tint-blue">
                {inspectedTier.rank}-RANK · {inspectedTier.title}
              </span>
              <span
                className={`hr-chip ${
                  isInspectedUnlocked ? "tint-green" : "tint-lavender"
                }`}
              >
                {isInspectedUnlocked
                  ? "UNLOCKED"
                  : `UNLOCKS AT LEVEL ${inspectedTier.minLevel}`}
              </span>
              <span className="hr-mono-tag">
                {inspectedArchetype.label}
              </span>
            </div>
            <h3>
              {inspectedTier.title} Hunter{" "}
              <span>— {inspectedArchetype.label}</span>
            </h3>
            <p>{inspectedArchetype.focus}</p>
          </div>
        </div>

        <div className="hunter-class-ladder">
          {CLASS_TIERS.map((tier) => {
            const unlocked = progress.level >= tier.minLevel;
            const active = tier.rank === currentClass.rank;
            const inspected = tier.rank === inspectedRankKey;
            const TierIcon = CLASS_ICONS[tier.rank] || Shield;
            const archetype =
              RANK_ARCHETYPES[tier.rank] || RANK_ARCHETYPES.E;

            return (
              <button
                type="button"
                onClick={() => setSelectedRankKey(tier.rank)}
                className={[
                  "hunter-class-step",
                  unlocked ? "unlocked" : "locked",
                  active ? "active" : "",
                  inspected ? "inspected" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                key={tier.rank}
                aria-label={`Preview ${tier.rank}-Rank ${tier.title}, ${
                  unlocked
                    ? active
                      ? "current rank"
                      : "unlocked"
                    : `unlocks at level ${tier.minLevel}`
                }`}
                aria-pressed={inspected}
                aria-current={active ? "step" : undefined}
              >
                <div className="hunter-class-step-top">
                  <div className="hunter-class-sigil">
                    <TierIcon size={18} strokeWidth={1.9} aria-hidden="true" />
                    <strong>{tier.rank}</strong>
                  </div>
                  <span
                    className={`hunter-class-state ${
                      active
                        ? "is-current"
                        : unlocked
                        ? "is-unlocked"
                        : "is-locked"
                    }`}
                  >
                    {active ? (
                      <>
                        <Sparkles size={11} aria-hidden="true" /> CURRENT
                      </>
                    ) : unlocked ? (
                      <>
                        <Check size={11} aria-hidden="true" /> UNLOCKED
                      </>
                    ) : (
                      <>
                        <LockKeyhole size={11} aria-hidden="true" /> LVL{" "}
                        {tier.minLevel}
                      </>
                    )}
                  </span>
                </div>

                <RankPortrait
                  rank={tier.rank}
                  locked={!unlocked}
                  className="hr-step-portrait"
                />

                <div className="hunter-class-info">
                  <div className="hr-step-title-line">
                    <strong>{tier.rank}-Rank</strong>
                    <small>LVL {tier.minLevel}</small>
                  </div>
                  <span className="hr-step-class-title">{tier.title}</span>
                  <small className="hr-step-archetype">
                    {archetype.label}
                  </small>
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* MILESTONE REWARD CARD */}
      <Card className="hunter-reward-card">
        <div className="section-head">
          <div>
            <span className="hunter-reward-eyebrow">
              <Gift size={15} aria-hidden="true" />
              MILESTONE REWARD
            </span>
            <h2>
              {rewardUnlocked
                ? `Level ${nextRewardLevel} reached`
                : `Plan a reward for Level ${nextRewardLevel}`}
            </h2>
            <p>
              Pick something enjoyable and comfortable for your budget. A
              reward is optional; your progress already counts.
            </p>
          </div>
          <span className={`status-pill ${rewardUnlocked ? "complete" : ""}`}>
            {rewardUnlocked
              ? nextReward.claimedAt
                ? "ENJOYED"
                : "UNLOCKED"
              : `${Math.max(0, nextRewardXP - xp).toLocaleString()} XP TO GO`}
          </span>
        </div>

        <label className="hunter-reward-field">
          <span>Your reward idea</span>
          <input
            className="clean-input"
            value={rewardPlan}
            onChange={(event) =>
              saveRewardPlan(nextRewardLevel, event.target.value)
            }
            maxLength={120}
            placeholder="Choose a treat that feels right for you"
          />
        </label>

        {rewardUnlocked ? (
          <Button
            kind="primary"
            onClick={claimReward}
            disabled={Boolean(nextReward.claimedAt) || !rewardPlan.trim()}
          >
            {nextReward.claimedAt
              ? `✓ Enjoyed on ${nextReward.claimedAt}`
              : "Mark my reward as enjoyed"}
          </Button>
        ) : (
          <small className="hunter-reward-hint">
            Suggested: {REWARD_IDEAS[nextRewardLevel] || REWARD_IDEAS[25]}
          </small>
        )}
      </Card>
    </div>
  );
}

export { HunterRankPage };
export default HunterRankPage;