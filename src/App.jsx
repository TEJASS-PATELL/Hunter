import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import "./App.css";

/* ============================================================================
   1. UNIFIED STORAGE, DATE, DISCREET MODE & CALCULATION HELPERS
   ============================================================================ */

const STORAGE_KEY = "day-by-day-comeback90-unified-v1";
const QUEST_KEY = "day-by-day-comeback90-quest-v1";
const SCHEMA_VERSION = 1;
const WEEKDAY_KEYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const todayISO = (dateObj = new Date()) => {
  const d = dateObj instanceof Date && !Number.isNaN(dateObj.getTime()) ? dateObj : new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const parseLocalISO = (isoStr) => {
  if (typeof isoStr !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(isoStr)) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  const [y, m, d] = isoStr.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const addDaysISO = (isoStr, deltaDays) => {
  const dt = parseLocalISO(isoStr);
  dt.setDate(dt.getDate() + Number(deltaDays || 0));
  return todayISO(dt);
};

const dayDiff = (startISO, endISO) => {
  const a = parseLocalISO(startISO);
  const b = parseLocalISO(endISO);
  return Math.round((b.getTime() - a.getTime()) / 86400000);
};

const getDayIndex = (startDateISO, currentISO = todayISO()) =>
  Math.max(1, dayDiff(startDateISO, currentISO) + 1);

const getWeekdayShort = (isoStr = todayISO()) =>
  WEEKDAY_KEYS[parseLocalISO(isoStr).getDay()] || "Mon";

const fmtDate = (value) =>
  value
    ? new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
    : "No date";

const percent = (n, d) => (d ? Math.round((n / d) * 100) : 0);

const safeNum = (val, fallback = 0) => {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
};

function discreetText(str, isDiscreet) {
  if (!isDiscreet || typeof str !== "string") return str;
  return str
    .replace(/\bpornography\b/gi, "Streak A")
    .replace(/\bporn\b/gi, "Streak A")
    .replace(/\bmasturbation\b/gi, "Habit B")
    .replace(/\bmasturbate\b/gi, "Habit B")
    .replace(/\brelapses\b/gi, "Resets")
    .replace(/\brelapse\b/gi, "Reset")
    .replace(/\bslips\b/gi, "Resets")
    .replace(/\bslip\b/gi, "Reset")
    .replace(/\burges\b/gi, "Cravings")
    .replace(/\burge\b/gi, "Craving");
}

/* ============================================================================
   2. ALL STATIC CONTENT & EVIDENCE-BASED DATA (MERGED FROM BOTH APPS)
   ============================================================================ */

const DISCLAIMER_TEXT =
  "General information, not medical advice. For any symptom, pain or health doubt, please see a qualified doctor.";

const QUOTES = [
  "Progress is built in ordinary moments. Take one tiny action first and the mood will follow.",
  "One slip does not erase everything. A slip is just data: see what triggered it and move on.",
  "Never miss twice. Skipped yesterday? Koi baat nahi, finish today's Minimum Day.",
  "Your competition is not an influencer's edited photo. It is yesterday's version of you.",
  "Boredom and loneliness are the biggest triggers. Go walk in the sun for 15 minutes today.",
  "Body, skin and confidence are built by boring consistency over months, not overnight hacks.",
  "Just do 3 basics today: morning sunlight, phone out of the bedroom, and sleep on time.",
];

const MINIMUM_DAY_IDS = ["sunlight", "phoneOutside", "bedOnTime"];

const SCORED_CHECKS = [
  { id: "noPorn", weight: 20, title: "No porn today", sub: "Stayed away from porn feeds and trigger sites (20 pts)" },
  {
    id: "workout",
    weight: 12,
    title: "Workout / active rest done",
    restTitle: "Active rest: 20-min brisk walk",
    sub: "Workout on training days, a 20-min walk on rest days (12 pts)",
  },
  { id: "wakeOnTime", weight: 8, title: "Woke up at the planned time", sub: "Got up without the snooze loop (8 pts)" },
  { id: "sunlight", weight: 8, title: "Morning sunlight (10–20 min)", sub: "Outdoor light within 1 hour of waking (8 pts)", minDay: true },
  { id: "steps", weight: 8, title: "Hit the daily steps target", sub: "Enter steps below: partial progress still earns points (8 pts)" },
  { id: "protein", weight: 8, title: "Hit protein & full meals target", sub: "No skipped breakfast, protein in every meal (8 pts)" },
  { id: "screenUnderLimit", weight: 8, title: "Recreational screen time under limit", sub: "Reels, shorts and browsing stayed inside the limit (8 pts)" },
  { id: "bedOnTime", weight: 6, title: "In bed at the planned time", sub: "No late-night revenge scrolling (6 pts)", minDay: true },
  { id: "phoneOutside", weight: 5, title: "Phone outside the bedroom at night", sub: "Charged away from the bed (5 pts)", minDay: true },
  { id: "skincare", weight: 5, title: "Basic skincare & hygiene (AM + PM)", sub: "Bath, face wash, moisturizer and daytime sunscreen (5 pts)" },
  { id: "water", weight: 4, title: "Hydration target met", sub: "Drank enough water through the day (4 pts)" },
  { id: "braveSocial", weight: 4, title: "One small brave social act", sub: "Eye contact, talked to a shopkeeper, or called a friend (4 pts)" },
  { id: "journal", weight: 4, title: "Daily reflection / journal", sub: "Wrote 2 lines about how the day went (4 pts)" },
];

const LIFE_BASICS = [
  { id: "cleanBed", title: "Room & bed clean", sub: "Made the bed and put clothes in their place after waking up" },
  { id: "family15", title: "15 min with family (no phone)", sub: "Sat and talked with family without looking at the phone" },
  { id: "friendMsg", title: "Message or call 1 friend", sub: "Asked one friend how they are, to break isolation" },
  { id: "hobby30", title: "30 min offline hobby / skill", sub: "Reading, sketching, cooking, music — not an algorithm feed" },
  { id: "eyePosture", title: "20-20-20 eye & 45-min posture breaks", sub: "Stood up every 45 min and straightened neck and back" },
  { id: "steppedOut", title: "Stepped outside the house", sub: "At least 20 minutes of fresh air outside your room" },
];

const CONTROL_LOOPS = [
  { id: "nicotine", title: "No cigarette / vape / tobacco today", sub: "Nicotine builds a withdrawal loop rather than reducing stress" },
  { id: "alcohol", title: "No alcohol today", sub: "Protected sleep quality, recovery and impulse control" },
  { id: "betting", title: "No betting / fantasy / online money games", sub: "Kept both money and mind safe from the quick-money trap" },
  { id: "gaming", title: "No gaming binge today", sub: "No all-night or multi-hour escapist gaming" },
  { id: "junk", title: "No junk / sugar / cold-drink binge", sub: "Skipped packaged snacks and sugary cold drinks" },
  { id: "lateCaff", title: "No energy drink or late tea/coffee", sub: "Caffeine stopped 8 hours before sleep" },
  { id: "doomscroll", title: "No doomscrolling & comparison loops", sub: "Did not shrink yourself with reels and fake flexing" },
  { id: "roomSpace", title: "Room, clothes & chores sorted", sub: "Bed made, one or two home chores done, tomorrow's clothes ready" },
  { id: "isolation", title: "Had a real conversation with a person", sub: "Family time or a friend call, not just texting" },
  { id: "eyesNeck", title: "Eye, neck & posture breaks done", sub: "20-20-20 rule followed and phone kept at eye level" },
  { id: "moneyHygiene", title: "Logged every spend today", sub: "Every UPI payment noted against the pocket budget" },
  { id: "selfTalk", title: "Used 'I'm starting now' + the 2-minute rule", sub: "No loser talk, started the task for just 2 minutes" },
  { id: "healthChecks", title: "Looks research stayed under 15 minutes", sub: "No forums, no zooming into the face on camera" },
];

const FACE_HABITS = [
  { id: "chewBoth", title: "Chewed evenly on both sides", sub: "Did not chew only on one side" },
  { id: "sleepBack", title: "Slept on back or alternated sides", sub: "Did not press the same cheek into the pillow" },
  { id: "noChinHand", title: "No resting chin on hand", sub: "Did not prop the jaw on a hand while sitting" },
  { id: "noPhoneShoulder", title: "No phone between ear & shoulder", sub: "Did not tilt the neck to hold the phone" },
  { id: "lipsTogether", title: "Lips together, teeth slightly apart", sub: "Kept the jaw relaxed instead of clenching" },
  { id: "faceRoutineDone", title: "5–8 min Face & Posture routine done", sub: "Did the gentle neck + posture + face routine from the Looks tab" },
];

const DEFAULT_SCHEDULE = [
  { id: "sch-1", time: "07:00", label: "Wake up + 1 glass of water + make the bed (no phone)" },
  { id: "sch-2", time: "07:20", label: "15–20 min morning sunlight walk + light mobility" },
  { id: "sch-3", time: "08:15", label: "Bath + AM skincare (cleanser, moisturizer, sunscreen) + high-protein breakfast" },
  { id: "sch-4", time: "09:30", label: "Apna kaam (deep focus block): phone in another room" },
  { id: "sch-5", time: "13:00", label: "Lunch + 15 min family time + 10 min walk" },
  { id: "sch-6", time: "15:00", label: "Apna kaam (own work block) + 45-min posture breaks" },
  { id: "sch-7", time: "17:30", label: "Workout / active rest walk + 1 small brave social act" },
  { id: "sch-8", time: "19:30", label: "Dinner + small home chores + lay out tomorrow's clothes" },
  { id: "sch-9", time: "21:00", label: "Grayscale ON + 30 min offline hobby/book + Face & posture routine" },
  { id: "sch-10", time: "22:30", label: "Phone charging outside the bedroom + PM skincare + 2-line journal + sleep" },
];

const MOOD_ACTIVITIES = [
  { id: "walk15", label: "15-min outdoor walk (no earphones)" },
  { id: "callFriend", label: "5-min call or voice note to an old friend" },
  { id: "cookSnack", label: "Make a high-protein snack or shake yourself" },
  { id: "cleanRoom", label: "Clean your desk and bed in 10 minutes" },
  { id: "sunlightSit", label: "10 min of sun on the terrace or balcony" },
  { id: "musicStretch", label: "Full-body stretch with 2 good songs" },
  { id: "showerFresh", label: "Shower and put on clean, fresh clothes" },
];

const URGE_STEPS = [
  { step: 1, title: "Change device and place (right now)", detail: "Take the phone or laptop out of bed and into the living room or any shared space." },
  { step: 2, title: "Urge surfing: 'It's just a wave'", detail: "Tell yourself: 'I am having an urge, but I am not the urge.' Notice where the restlessness sits in your body. The wave drops every couple of minutes." },
  { step: 3, title: "Move your body: 20 push-ups or a fast walk", detail: "Do 15–20 push-ups or squats right now, or walk fast outside for 5 minutes." },
  { step: 4, title: "Breathing reset (follow the circle below)", detail: "Do 4-7-8 or gentle 4-4-6 breathing. A long exhale tells the nervous system there is no emergency." },
  { step: 5, title: "Cold water + wash your face", detail: "Go to the kitchen, drink a full glass of water and splash cold water on your face and neck." },
  { step: 6, title: "Break the isolation: text someone", detail: "Send one of the templates below to a friend or cousin to start a normal conversation." },
  { step: 7, title: "5-4-3-2-1 grounding check", detail: "Name 5 things you see, touch 4 things, listen for 3 sounds, notice 2 smells, and take 1 long breath." },
];

const URGE_TRIGGERS = [
  "Bored / nothing to do",
  "Stressed / tension",
  "Lonely / akelapan",
  "Late night in bed",
  "Reels / social media scrolling",
  "Tired / low sleep",
  "Other",
];

const URGE_LOCATIONS = ["Bedroom (on bed)", "Bedroom (at desk)", "Bathroom", "Living room alone", "Other"];

const SOS_TEXT_TEMPLATES = [
  "Aur bhai, kya haal hai? It has been a while, what are you up to these days?",
  "Bhai, 15 min walk in the evening? Let's get out for a bit.",
  "Tell me one good movie or book you watched/read recently.",
];

const ENV_CHECKLIST = [
  { id: "dnsFilter", title: "Turn ON an adult-site DNS filter", sub: "Android: Private DNS -> family.cloudflare-dns.com. iPhone: Screen Time -> Limit Adult Websites." },
  { id: "safeSearch", title: "Google SafeSearch + YouTube Restricted Mode ON", sub: "Lock both filters so random thumbnails do not trigger you." },
  { id: "trustedPasscode", title: "Ask a trusted person to set the filter passcode", sub: "Let a brother or friend set it so you cannot unlock it at midnight." },
  { id: "uninstallApps", title: "Uninstall trigger apps (use browser + timer)", sub: "Remove apps that show trigger reels." },
  { id: "logoutAfter", title: "Log out of social accounts after every use", sub: "Password friction stops 70% of mindless opening." },
  { id: "noAutoplay", title: "Turn off Autoplay everywhere", sub: "Disable autoplay on YouTube and streaming apps." },
  { id: "shortsLimit", title: "YouTube 'Remind me to take a break' ON (15m)", sub: "Set a 15-minute break reminder in YouTube settings." },
  { id: "instaLimit", title: "Instagram daily limit (15m) + Quiet Mode at night", sub: "Set Quiet Mode from 9 pm to 8 am." },
  { id: "grayscale9pm", title: "Phone in Grayscale after 9 pm", sub: "Without colour, reels become boring immediately." },
  { id: "phoneOutBedroom", title: "Charge phone outside the bedroom + alarm clock", sub: "Phone in bed = guaranteed late-night slip." },
  { id: "noPhoneBath", title: "Strictly no phone in the bathroom", sub: "This one simple rule removes half of all slips." },
  { id: "commonAreaNight", title: "After 9:30 pm, screens only in a common area", sub: "No screen use behind closed doors." },
];

const HOME_WORKOUT_PLAN = {
  rules: [
    "Warm up for 5 min before every session (arm circles, bodyweight squats, marching).",
    "Stop 2 reps before failure: end the set when you feel you could still do 2 clean reps.",
    "Double progression: when all three sets hit the top of the rep range easily, make it harder next session.",
    "Form first: no jerking reps. If a joint gives sharp pain, stop immediately.",
  ],
  weeks1to2: [
    { name: "Incline push-ups (hands on bed/table) or knee push-ups", sets: "3 sets", reps: "8–12 reps", note: "Core tight, bring chest to table" },
    { name: "Bodyweight squats", sets: "3 sets", reps: "12–15 reps", note: "Heels down, knees track over toes" },
    { name: "Glute bridges", sets: "3 sets", reps: "12–15 reps", note: "Squeeze 1 second at top" },
    { name: "Backpack row (bag with books) or towel row", sets: "3 sets", reps: "10–12 reps", note: "Pull shoulders back for posture" },
    { name: "Forearm plank", sets: "3 sets", reps: "20–40 sec", note: "Keep hips level, breathe normally" },
    { name: "Dead bug", sets: "3 sets", reps: "8 reps / side", note: "Press lower back to floor" },
  ],
  weeks3to4: [
    { name: "Full floor push-ups", sets: "3 sets", reps: "8–12 reps", note: "Elbows ~45 degrees from body" },
    { name: "Bulgarian / split squats", sets: "3 sets", reps: "8 reps / leg", note: "Use wall touch for balance" },
    { name: "Pike push-ups (for shoulders)", sets: "3 sets", reps: "6–10 reps", note: "Lift hips into a V shape" },
    { name: "Tempo squats (3 sec down)", sets: "3 sets", reps: "10 reps", note: "Lower with control" },
    { name: "Heavier backpack rows (1-arm or 2-arm)", sets: "3 sets", reps: "10–12 reps", note: "Hold 1 sec at top" },
    { name: "Hollow body hold", sets: "3 sets", reps: "20–30 sec", note: "Shoulders slightly off floor" },
  ],
};

const YOGA_POSES = [
  // ═══════════════════ APT CORRECTION PROTOCOL (5 POSES) ═══════════════════
  {
    id: "apt-1",
    category: "apt",
    title: "Low Lunge with Posterior Pelvic Tilt",
    sanskrit: "Anjaneyasana (APT Variation)",
    roleType: "stretch",
    roleLabel: "Stretch: Tight Hip Flexors (Iliopsoas)",
    sets: 3,
    holdSec: 45,
    prescription: "3 Sets × 45 sec (Har Pair Par)",
    rest: "20 sec rest",
    bestTime: "Subah ya sitting ke baad",
    steps: [
      "Right knee zameen par rakho (neeche cushion lagao) aur Left foot aage 90-degree angle par rakho.",
      "Kamar ko aage mat jhukao—pehle apni tailbone ko neeche tuck karo (jaise belt buckle ko naabhi ki taraf kheench rahe ho).",
      "Piche wale (Right) hip/glute ko 70% tight squeeze karo aur pet (abs) ko halka andar kheencho.",
      "Ab bina lower back arch kiye, hips ko sirf 1-2 inch aage push karo. Right thigh ke upar deep stretch aayega.",
      "Dono haath upar uthao ya front knee par rakho aur 45 seconds tak deep breathing karo."
    ],
    aptCue: "Galti: Hips ko zameen ki taraf latkana aur kamar modna. Sahi Rule: Back glute squeeze rakho aur ribs ko neeche lock rakho.",
    benefits: [
      "APT ka #1 root cause (tight Iliopsoas aur Rectus Femoris muscle) ko lamba aur loose karta hai.",
      "Pelvis ko wapas neutral position mein aane ki jagah deta hai.",
      "Lambi sitting (coding/studying) se jam hue hips ko turant kholta hai."
    ]
  },
  {
    id: "apt-2",
    category: "apt",
    title: "Glute-Focused Bridge Pose",
    sanskrit: "Setu Bandhasana (Posterior Tilt)",
    roleType: "strengthen",
    roleLabel: "Activate: Weak Glutes & Hamstrings",
    sets: 3,
    holdSec: 45,
    prescription: "3 Sets × 10 Slow Reps (Top par 4 sec Hold)",
    rest: "30 sec rest",
    bestTime: "Subah ya Workout se pehle",
    steps: [
      "Peeth ke bal let jao, ghutne mod lo aur pair hips ke barabar faasle par zameen par rakho.",
      "Hips uthane se PEHLE apni lower back ko zameen se chipkao (pelvic tuck) taaki kamar ke neeche gap khatam ho jaye.",
      "Heels (ediyon) ko zameen mein dabate hue hips ko upar uthao jab tak knees, hips aur shoulders ek seedhi line mein na aa jayein.",
      "Chest ko chin ki taraf mat uchaalo—sirf glutes (hips) aur hamstrings ko tight squeeze karke 4 second hold karo.",
      "Slowly lower back ko control ke saath wapas neeche lao."
    ],
    aptCue: "Galti: Hips ko zaroorat se zyada upar utha kar lower back se zor lagana. Sahi Rule: Kamar nahi, sirf Glutes jalne chahiye.",
    benefits: [
      "Soye hue Glute Maximus aur Hamstrings ko activate karta hai jo pelvis ko piche kheench kar seedha rakhte hain.",
      "Lower back par se extra load hata kar hips par shift karta hai.",
      "Hip flexors ko active state mein stretch deta hai."
    ]
  },
  {
    id: "apt-3",
    category: "apt",
    title: "Pelvic Control Cat-Cow",
    sanskrit: "Marjaryasana-Bitilasana (Cat Focus)",
    roleType: "mobility",
    roleLabel: "Control: Pelvic Neuromuscular Awareness",
    sets: 3,
    holdSec: 60,
    prescription: "3 Sets × 10 Slow Cycles (60 sec per set)",
    rest: "15 sec rest",
    bestTime: "Subah uthte hi",
    steps: [
      "Hands aur knees (tabletop position) par aa jao—wrists shoulders ke neeche aur knees hips ke neeche.",
      "Exhale karte hue tailbone ko andar modho (Cat Pose), lower back ko upar gol karo aur naabhi ko spine ki taraf kheencho.",
      "Is rounded (Cat) position mein 4 second ruko aur lower abs ka contraction feel karo.",
      "Inhale karte hue wapas neutral flat back par aao (APT walon ko Cow pose mein kamar zyada neeche nahi lachkani hai).",
      "Har repetition mein dhyan sirf pelvis ko aage-piche roll karne par lagao."
    ],
    aptCue: "Galti: Cow pose mein lower back ko زور se neeche drop karna. Sahi Rule: 80% focus Cat Pose (rounding & tucking) par rakho.",
    benefits: [
      "Dimag aur muscles ko sikhata hai ki pelvis ko neutral kaise hold karna hai (mind-muscle connection).",
      "Tight lower back (Erector Spinae) ke fasica ko gently release karta hai.",
      "Deep Transverse Abdominis (inner core belt) ko jagata hai."
    ]
  },
  {
    id: "apt-4",
    category: "apt",
    title: "Wind-Relieving Lower Back Release",
    sanskrit: "Apanasana / Pawanmuktasana Hold",
    roleType: "stretch",
    roleLabel: "Release: Tight Lumbar Spine (Lower Back)",
    sets: 3,
    holdSec: 45,
    prescription: "3 Sets × 45 sec Hold",
    rest: "15 sec rest",
    bestTime: "Subah aur Raat ko sone se pehle",
    steps: [
      "Peeth ke bal let jao aur dono ghutno ko mod kar chest ki taraf lao.",
      "Dono haathon se shins (ghutno ke neeche) ko pakdo aur gently knees ko chest ki taraf press karo.",
      "Garden aur shoulders ko zameen par bilkul relax rakho—sir mat uthao.",
      "Tailbone ko halka sa mat se upar curl hone do taaki lower back ki muscles poori tarah lamba stretch payein.",
      "Pet se gehri saans lo (belly thighs se takrayegi) aur 45 seconds tak hold karo."
    ],
    aptCue: "Galti: Gardan utha kar strain lena. Sahi Rule: Chin halka tuck rakho aur lower back ko zameen mein pighalne do.",
    benefits: [
      "APT mein lower back hamesha over-active aur tight rehti hai—ye pose us chronic tension ko turant khatam karta hai.",
      "Lumbar vertebrae ke beech ka compression kholta hai.",
      "Digestion aur bloating ke liye bhi best kaam karta hai."
    ]
  },
  {
    id: "apt-5",
    category: "apt",
    title: "Hollow-Tuck Forearm Plank",
    sanskrit: "Makara Phalakasana (PPT Lock)",
    roleType: "strengthen",
    roleLabel: "Strengthen: Anterior Core & Lower Abs",
    sets: 3,
    holdSec: 35,
    prescription: "3 Sets × 30–40 sec Quality Hold",
    rest: "40 sec rest",
    bestTime: "Core session mein",
    steps: [
      "Forearms (elbows) aur toes ke bal plank position mein aao. Elbows bilkul shoulders ke neeche hon.",
      "Ab sabse zaroori step: Tailbone ko neeche tuck karo, glutes ko 100% squeeze karo aur lower back ko flat/slightly round karo.",
      "Elbows ko paon ki taraf (bina hilaye) zameen par drag karne ki koshish karo—isse abs mein2x tension aayegi.",
      "Saans roko mat; chhoti-chhoti saans lete hue core ko pathar jaisa tight rakho.",
      "Jaise hi lower back neeche girne lage (arch banne lage), set rok do."
    ],
    aptCue: "Galti: 2 minute tak galat form (latki hui kamar) mein plank karna. Sahi Rule: PPT tuck ke saath 35 sec ka plank 2 min ke normal plank se 5 guna zyada asar karta hai.",
    benefits: [
      "Lower abs (Rectus Abdominis) aur Obliques ko strong karta hai jo pelvis ko aage se upar kheench kar rakhte hain.",
      "Khade hone aur chalne ke dauran pelvis ko automatically neutral rakhta hai."
    ]
  },

  // ═══════════════════ DAILY FULL-BODY YOGA FLOW (5 POSES) ═══════════════════
  {
    id: "daily-1",
    category: "daily",
    title: "Bent-Knee Downward Facing Dog",
    sanskrit: "Adho Mukha Svanasana",
    roleType: "mobility",
    roleLabel: "Daily Flow: Full Spine & Hamstring Lengthening",
    sets: 3,
    holdSec: 45,
    prescription: "3 Sets × 45 sec Hold",
    rest: "20 sec rest",
    bestTime: "Subah खाली pet",
    steps: [
      "Hands aur knees se hips ko upar aur piche push karo taaki body ulte 'V' shape mein aa jaye.",
      "Ghutno ko 20% mod kar rakho (bend knees) aur heels ko hawa mein rehne do.",
      "Haathon se zameen ko aage push karo aur chest ko thighs ki taraf le jao taaki peeth ekdum seedhi (flat) ho jaye.",
      "Ab dheere-dheere ek-ek karke heels ko zameen ki taraf pedal karo bina spine ko gol kiye.",
      "Kaanon ko arms ke beech mein rakho aur 5-8 deep breaths lo."
    ],
    aptCue: "APT Tip: Ribs ko zameen ki taraf mat girao (banana back mat banao); front ribs ko andar समेट kar rakho.",
    benefits: [
      "Calf, Hamstrings, Lats aur Shoulders ko ek saath kholta hai.",
      "Brain ki taraf blood circulation badha kar morning lethargy (susti) hatata hai.",
      "Spine ko bina kisi load ke traction (decompression) deta hai."
    ]
  },
  {
    id: "daily-2",
    category: "daily",
    title: "Deep Yogic Squat",
    sanskrit: "Malasana",
    roleType: "mobility",
    roleLabel: "Daily Flow: Hip Opener & Pelvic Floor Release",
    sets: 3,
    holdSec: 60,
    prescription: "3 Sets × 60 sec Hold",
    rest: "20 sec rest",
    bestTime: "Subah & Study Breaks mein",
    steps: [
      "Paon ko shoulder-width se thoda bahar rakho aur toes ko 30-degree bahar ki taraf point karo.",
      "Hips ko neeche deep squat mein baithao (agar heels uthti hain toh unke neeche folded towel ya book rakh lo).",
      "Haathon ko Namaste (Anjali Mudra) mein jodo aur elbows se knees ko gently bahar ki taraf push karo.",
      "Chest ko upar uthao, shoulders ko kaanon se door rakho aur spine lambi rakho.",
      "Pelvic floor aur hips ko poori tarah relax chhod kar 60 sec saans lo."
    ],
    aptCue: "APT Tip: Malasana naturally pelvis ko Posterior Tilt mein le jata hai, isliye ye APT walon ke liye best resting posture hai.",
    benefits: [
      "Hips, groin aur ankles ki stiffness khatam karta hai.",
      "Lower back ko natural lengthening deta hai.",
      "Digestion aur gut motility ko supercharge karta hai."
    ]
  },
  {
    id: "daily-3",
    category: "daily",
    title: "Thread the Needle Thoracic Opener",
    sanskrit: "Parsva Balasana",
    roleType: "mobility",
    roleLabel: "Daily Flow: Upper Back & Desk Posture Fix",
    sets: 2,
    holdSec: 45,
    prescription: "2 Sets × 45 sec (Har Side Par)",
    rest: "15 sec rest",
    bestTime: "Study / Laptop session ke beech",
    steps: [
      "Tabletop (hands aur knees) position mein aao.",
      "Right haath ko Left arm aur knee ke beech ke gap se neeche slide karo jab tak Right shoulder aur kanpatti (temple) zameen par na tik jaye.",
      "Left haath se zameen ko halka press karke chest ko left side rotate karo.",
      "Hips ko dono knees ke upar barabar center mein rakho.",
      "45 sec hold karne ke baad side change karo."
    ],
    aptCue: "APT Tip: Jab upper back (thoracic spine) stiff hoti hai, toh lower back ko zabardasti arch hona padta hai. Ye pose upper back khol kar lower back bachaata hai.",
    benefits: [
      "Shoulder blades ke beech ki jalan aur neck stiffness ko 2 minute mein door karta hai.",
      "Slouched shoulders (gol kandho) ko seedha karta hai."
    ]
  },
  {
    id: "daily-4",
    category: "daily",
    title: "Supine Two-Knee Spinal Twist",
    sanskrit: "Supta Matsyendrasana",
    roleType: "recovery",
    roleLabel: "Daily Flow: QL Muscle & Spine Reset",
    sets: 2,
    holdSec: 60,
    prescription: "2 Sets × 60 sec (Har Side Par)",
    rest: "15 sec rest",
    bestTime: "Shaam ya Workout ke baad",
    steps: [
      "Peeth ke bal let jao, dono knees ko 90-degree par mod kar chest ke paas lao.",
      "Dono haathon ko 'T' shape mein side par zameen par faila lo.",
      "Exhale karte hue dono knees ko ek saath Left side zameen par gira do.",
      "Dono kandhe (खासकर Right shoulder) zameen se chipke rehne chahiye; gardan ko Right side ghuma lo.",
      "60 seconds tak har exhale ke saath kamar ko ढीला chhodo, fir dusri side repeat karo."
    ],
    aptCue: "APT Tip: Knees ko hips se thoda upar (chest ke kareeb) rakh kar twist karo—isse lower back arch nahi hogi.",
    benefits: [
      "Side waist ki Quadratus Lumborum (QL) muscle ko release karta hai jo APT mein bahut tight ho jati hai.",
      "Spine ke hydration aur disc recovery mein madad karta hai."
    ]
  },
  {
    id: "daily-5",
    category: "daily",
    title: "Legs Up the Wall + 4-7-8 Breath",
    sanskrit: "Viparita Karani",
    roleType: "recovery",
    roleLabel: "Daily Flow: Nervous System & Cortisol Reset",
    sets: 1,
    holdSec: 180,
    prescription: "1 Set × 3 se 5 Minutes Hold",
    rest: "Done for the day",
    bestTime: "Raat ko sone se 15 min pehle",
    steps: [
      "Deewar ke paas baitho aur lette hue dono paon ko deewar ke sahare सीधा upar tika do.",
      "Hips deewar se 2-4 inch door rakho taaki आपकी lower back zameen par bilkul flat aur comfortable rahe.",
      "Ek haath pet (belly) par aur ek chest par rakho.",
      "Naak se 4 second saans andar lo, 7 second hold karo, aur muh se 8 second tak lamba exhale karo.",
      "3 minute tak aankhein band karke body ka saara bhaar zameen par chhod do."
    ],
    aptCue: "APT Tip: Deewar ke sahare legs upar rakhne se pelvis apne aap flat neutral alignment mein set ho jata hai.",
    benefits: [
      "Paon se thaka hua blood wapas heart aur brain tak pahunchata hai.",
      "Parasympathetic nervous system on karke deep sleep aur recovery deta hai.",
      "Lower back pain ko bina kisi effort ke शांत karta hai."
    ]
  }
];

const AVOID_IN_APT = [
  {
    name: "Full Cobra / Upward Dog (Bhujangasana)",
    reason: "Ismein hip flexors stretch hone ke bajay lower back vertebrae आपस mein pinch hote hain aur APT arch badhta hai.",
    alternative: "Iski jagah Glute Bridge ya Sphinx Pose (with glute squeeze) karo."
  },
  {
    name: "Wheel Pose / Full Backbends (Chakrasana)",
    reason: "Already hyper-extended lumbar spine ko aur zyada lordosis (curve) mein dhakelta hai.",
    alternative: "Pelvic Tilt Cat-Cow aur Thoracic Thread the Needle karo."
  },
  {
    name: "Straight-Leg Sit-ups & Leg Raises",
    reason: "Ye abs se zyada Psoas (hip flexor) muscle ko over-work karte hain, jisse pelvis aur aage khinchta hai.",
    alternative: "Hollow-Tuck Forearm Plank ya Deadbug exercise karo."
  }
];

const GYM_WORKOUT_PLAN = {
  restNote: "3 days/week (Mon = A, Wed = B, Fri = C). Rest 90–120 seconds between sets.",
  sessions: {
    A: [
      { name: "Goblet squat / barbell squat / leg press", sets: "3 sets", reps: "8–12 reps" },
      { name: "Dumbbell bench press", sets: "3 sets", reps: "8–12 reps" },
      { name: "Seated cable row", sets: "3 sets", reps: "10–12 reps" },
      { name: "Dumbbell lateral raise (side shoulders)", sets: "3 sets", reps: "12–15 reps" },
      { name: "Plank", sets: "3 sets", reps: "30–45 sec" },
    ],
    B: [
      { name: "Romanian deadlift (dumbbell or barbell)", sets: "3 sets", reps: "8–10 reps" },
      { name: "Overhead dumbbell / barbell press", sets: "3 sets", reps: "8–12 reps" },
      { name: "Lat pulldown or assisted pull-up", sets: "3 sets", reps: "8–12 reps" },
      { name: "Dumbbell bicep curls", sets: "2 sets", reps: "10–12 reps" },
      { name: "Cable triceps pushdown", sets: "2 sets", reps: "10–12 reps" },
      { name: "Dead bug", sets: "3 sets", reps: "8 reps / side" },
    ],
    C: [
      { name: "Goblet squat or leg press", sets: "3 sets", reps: "10–12 reps" },
      { name: "Incline dumbbell press", sets: "3 sets", reps: "8–12 reps" },
      { name: "One-arm dumbbell row", sets: "3 sets", reps: "10–12 reps" },
      { name: "Face pulls or band pull-aparts (posture)", sets: "3 sets", reps: "15 reps" },
      { name: "Standing / seated calf raise", sets: "2 sets", reps: "12–15 reps" },
      { name: "Light neck isometrics (gentle hand resistance)", sets: "2 sets", reps: "15 sec / direction" },
    ],
  },
};

const GYM_DARR_TIPS = [
  "Everyone in the gym is busy watching themselves in the mirror. Nobody is judging how thin you are.",
  "Pick off-peak hours (9–11 am or 2–4 pm) for the first 2 weeks when the gym is quiet.",
  "Wear any normal fitted T-shirt, track pants, flat-soled shoes, a small towel and water bottle.",
  "Day-one plan: stay only 35 minutes. Ask the trainer to show form for 3 basic machines.",
];

const FRAME_BONE_CONTENT = {
  honestTruth:
    "After adulthood, bone length and collarbone width are fixed by genetics. But about 80% of the broad masculine frame you see from the front comes from upper-back (lats), side shoulders (delts), chest, neck and arm muscle, straight posture, and well-fitting clothes.",
  priorities: [
    "Rows & pulldowns: wider lats and upper back create the V-taper and pull shoulders back.",
    "Overhead press & lateral raises: bigger side delts instantly make shoulders look wider.",
    "Push-ups & incline press: fill out the upper chest and front frame.",
    "Squats & RDLs: fill out thin legs and add overall body mass.",
    "Light neck isometrics & posture routine: fixing forward head posture makes both face and frame look stronger.",
  ],
  boneHealth: [
    "Peak bone mass is built in your teens and 20s.",
    "What helps: resistance training, ~1000 mg daily calcium from home food, enough Vitamin D, and sufficient calories + protein.",
    "What hurts: staying underweight, smoking/vaping, and heavy alcohol.",
  ],
};

const CALCIUM_TABLE = [
  { food: "Milk (1 glass / 250 ml)", calcium: "~300 mg" },
  { food: "Ragi / Nachni (100 g dry flour)", calcium: "~340 mg" },
  { food: "Paneer (100 g)", calcium: "~200 mg" },
  { food: "Curd / Dahi (1 katori / 100 g)", calcium: "~120 mg" },
  { food: "White sesame seeds / Safed til (1 tbsp)", calcium: "~90 mg" },
  { food: "Boiled rajma / chana (100 g cooked)", calcium: "~50–70 mg" },
];

const PROTEIN_TABLE = [
  { item: "Chicken breast (100 g cooked)", protein: "~30 g", type: "Non-Veg" },
  { item: "Whole egg (1 large anda)", protein: "~6 g", type: "Egg" },
  { item: "Soya chunks (50 g dry weight)", protein: "~25 g", type: "Veg" },
  { item: "Paneer (100 g)", protein: "~18 g", type: "Veg" },
  { item: "Milk (250 ml glass)", protein: "~8 g", type: "Veg" },
  { item: "Dal (1 thick katori cooked)", protein: "~7–9 g", type: "Veg" },
  { item: "Boiled kala chana / rajma (100 g)", protein: "~9 g", type: "Veg" },
  { item: "Peanuts / moongfali (30 g handful)", protein: "~7 g", type: "Veg" },
  { item: "Curd / Dahi (100 g)", protein: "~3.5 g", type: "Veg" },
];

const DIET_PLANS = {
  veg: [
    { meal: "Breakfast (8:30 AM)", items: "Poha/paratha + 50 g soya chunks or 100 g paneer + 1 glass milk (~26 g protein)" },
    { meal: "Mid-morning (11:30 AM)", items: "1 handful roasted peanuts (30 g) + 1 banana (~8 g protein)" },
    { meal: "Lunch (1:30 PM)", items: "2–3 roti (with ghee) + 1 cup rice + 1.5 katori thick dal/rajma + curd (~24 g protein)" },
    { meal: "Evening shake (5:30 PM)", items: "250 ml milk + 2 bananas + 2 tbsp peanut butter + 3 tbsp oats (~18 g protein)" },
    { meal: "Dinner (8:30 PM)", items: "2–3 roti + 100 g paneer/tofu bhurji or chana sabzi + dal (~25 g protein)" },
  ],
  nonVeg: [
    { meal: "Breakfast (8:30 AM)", items: "3 whole boiled eggs/omelette + 2 toast/roti + 1 banana (~24 g protein)" },
    { meal: "Mid-morning (11:30 AM)", items: "30 g roasted peanuts or chana + 1 seasonal fruit (~7 g protein)" },
    { meal: "Lunch (1:30 PM)", items: "2 roti + 1 cup rice + 120 g chicken curry/breast + 1 katori dal + curd (~42 g protein)" },
    { meal: "Evening snack (5:30 PM)", items: "250 ml milk + 1 banana + 1 tbsp peanut butter (~13 g protein)" },
    { meal: "Dinner (8:30 PM)", items: "2–3 roti + 2 eggs / 100 g chicken or paneer + green sabzi (~22 g protein)" },
  ],
};

const WEIGHT_GAIN_TIPS = [
  "3 full meals + 2 snacks: eat something solid every 3–4 hours.",
  "Never skip breakfast: get your first meal in by 9 am.",
  "Use liquid calories: milk + banana + peanut butter + oats shake (~500 kcal).",
  "Add 1–2 spoons of home ghee, peanuts, and curd to daily meals.",
];

const FACE_SACH_CARD = {
  intro:
    "Almost every human face is slightly asymmetrical. Selfie wide-angle lenses and flipped mirror images make tiny differences look 5x larger in your head. After adulthood, bone structure does not change with exercise.",
  impactOrder: [
    { rank: 1, title: "Body fat & lean mass", detail: "Adding 4–6 kg of healthy muscle fills out sunken cheeks; getting lean reveals the jawline." },
    { rank: 2, title: "Skin quality (SPF, hydration, acne care)", detail: "Clear, even-toned skin makes any face look healthy immediately." },
    { rank: 3, title: "Haircut & beard framing", detail: "The right haircut and structured beard neckline balance jaw asymmetry." },
    { rank: 4, title: "Posture & neck alignment", detail: "Fixing forward head posture eliminates a false double chin and sharpens the jaw angle." },
    { rank: 5, title: "Teeth, bite & natural smile", detail: "Clean teeth and a relaxed smile beat any rigid pose." },
  ],
};

const FACE_AUDIT_QUESTIONS = [
  { id: "chewSide", question: "1. Do you always chew on one side only?", options: [{ value: "both", label: "Evenly on both sides" }, { value: "oneSide", label: "Mostly one side" }], tip: "Split chewing across both sides gently.", dentistOn: "" },
  { id: "sleepSide", question: "2. Do you sleep with the same cheek pressed into the pillow?", options: [{ value: "backOrAlt", label: "Back or switch sides" }, { value: "oneCheek", label: "Same cheek pressed down" }], tip: "Sleep on your back or alternate sides with a clean pillowcase.", dentistOn: "" },
  { id: "chinHand", question: "3. Do you sit with your chin propped on one hand?", options: [{ value: "no", label: "No" }, { value: "yes", label: "Yes, while studying" }], tip: "Keep both feet on the floor and avoid propping your jaw.", dentistOn: "" },
  { id: "clenching", question: "4. Do you clench or grind your teeth (bruxism)?", options: [{ value: "no", label: "No" }, { value: "yes", label: "Yes, jaw feels tight" }], tip: "Keep lips together, teeth slightly apart. Ask a dentist about a night guard.", dentistOn: "yes" },
  { id: "jawPainClick", question: "5. Any clicking or pain in the jaw (TMJ)?", options: [{ value: "no", label: "No, smooth" }, { value: "yes", label: "Yes, clicking or pain" }], tip: "Skip all jaw exercises and see a dentist.", dentistOn: "yes" },
  { id: "mouthBreath", question: "6. Do you breathe through your mouth or snore?", options: [{ value: "no", label: "Nose breather" }, { value: "yes", label: "Mouth breathing" }], tip: "If your nose stays blocked, consult an ENT specialist.", dentistOn: "" },
  { id: "missingTeeth", question: "7. Any missing teeth or uneven bite?", options: [{ value: "no", label: "All fine" }, { value: "yes", label: "Yes, bite issue" }], tip: "A dentist/orthodontist check-up is the right step.", dentistOn: "yes" },
];

const FACE_ROUTINE_STEPS = [
  { id: "fr-1", name: "1. Chin tucks (posture reset)", durationSec: 50, reps: "10 reps × 5 sec hold", instruction: "Pull chin straight back gently as if making a double chin. Hold 5 sec, relax." },
  { id: "fr-2", name: "2. Wall angels (upper back & frame)", durationSec: 60, reps: "10 slow reps", instruction: "Back and arms against wall, slide arms smoothly from W to Y." },
  { id: "fr-3", name: "3. Resting tongue, jaw & nose-breathing check", durationSec: 60, reps: "60 sec calm hold", instruction: "Lips closed lightly, teeth 1–2 mm apart, tongue resting gently on palate." },
  { id: "fr-4", name: "4. Cheek-lift smile holds (gentle)", durationSec: 50, reps: "5 reps × 10 sec hold", instruction: "Smile lightly with lips closed, lift cheek muscles gently. Stop if any discomfort." },
  { id: "fr-5", name: "5. Upward moisturizer massage", durationSec: 60, reps: "60 sec", instruction: "Rinse with cool water, then gently massage moisturizer upward along the jaw." },
];

const FACE_SHAPES_GUIDE = {
  oval: { label: "Oval face", haircut: "Textured crop, classic side part or short quiff.", beard: "Short boxed beard (4–6 mm) or heavy stubble." },
  round: { label: "Round face", haircut: "Volume on top (quiff/textured top) + mid taper fade on sides.", beard: "Shorter sides and slightly fuller chin for structure." },
  square: { label: "Square face", haircut: "Crew cut, buzz with fade, or neat side part with taper.", beard: "Light stubble or clean-edged short beard." },
  oblong: { label: "Oblong / long face", haircut: "Scissor cut on sides (#3/#4 guard) and medium textured top.", beard: "Fuller sides and close trim under the chin." },
  heart: { label: "Heart / triangle", haircut: "Medium textured top with a low taper.", beard: "Fuller on the chin and jawline to balance the lower frame." },
};

const SKIN_ROUTINES = {
  oily: {
    label: "Oily / acne-prone skin",
    am: ["1. Gentle foaming or salicylic acid (0.5–2%) cleanser", "2. Oil-free non-comedogenic gel moisturizer", "3. Matte / gel SPF 50 PA+++ sunscreen (no white cast)"],
    pm: ["1. Gentle cleanser", "2. Optional: Niacinamide 5% serum", "3. Lightweight oil-free gel moisturizer"],
    weekly: "Gentle BHA exfoliation 1–2x/week. Never use harsh walnut scrubs.",
  },
  dry: {
    label: "Dry / flaky skin",
    am: ["1. Plain water or hydrating non-foaming cleanser", "2. Ceramide + hyaluronic acid cream on damp skin", "3. Cream/fluid SPF 50 PA+++ sunscreen"],
    pm: ["1. Gentle lotion cleanser", "2. Rich barrier-repair cream + petroleum jelly on lips"],
    weekly: "Avoid hot water on the face.",
  },
  combination: {
    label: "Combination skin (oily T-zone, normal cheeks)",
    am: ["1. Mild gel cleanser", "2. Lightweight lotion", "3. Hybrid/fluid SPF 50 PA+++"],
    pm: ["1. Mild gel cleanser", "2. Balanced daily lotion"],
    weekly: "Gentle BHA on nose/forehead once a week.",
  },
  sensitive: {
    label: "Sensitive skin",
    am: ["1. Fragrance-free soap-free cleanser", "2. Minimal ceramide/panthenol soothing cream", "3. Mineral or hybrid SPF 50 PA+++"],
    pm: ["1. Gentle fragrance-free wash", "2. Barrier-repair moisturizer"],
    weekly: "Skip harsh scrubs, alcohol toners, and DIY lemon/toothpaste hacks.",
  },
};

const WARDROBE_CAPSULE = [
  { item: "1. Heavyweight solid crew-neck T-shirts (white, navy, olive)", low: "₹350–600", mid: "₹700–1,200" },
  { item: "2. Structured polo T-shirt (navy or maroon)", low: "₹500–800", mid: "₹900–1,500" },
  { item: "3. Full-sleeve Oxford / cotton casual shirts (white, olive)", low: "₹700–1,000", mid: "₹1,200–2,000" },
  { item: "4. Dark indigo straight/slim-tapered jeans", low: "₹900–1,300", mid: "₹1,500–2,500" },
  { item: "5. Well-fitted chinos (beige/khaki or charcoal)", low: "₹800–1,200", mid: "₹1,400–2,200" },
  { item: "6. Layering overshirt / jacket (adds shoulder structure)", low: "₹1,000–1,500", mid: "₹1,800–3,000" },
  { item: "7. Clean minimal white/neutral sneakers", low: "₹800–1,400", mid: "₹1,600–3,000" },
];

const WEEK1_QUICK_WINS = [
  { id: "qw-haircut", title: "1. Neat haircut suited to your face shape + clean beard neckline" },
  { id: "qw-fit", title: "2. Wear 2 T-shirts/shirts where the seam sits right on the shoulder bone" },
  { id: "qw-spf", title: "3. Daily morning cleanser + moisturizer + SPF 50 sunscreen" },
  { id: "qw-nailsTeeth", title: "4. Short clean nails, tongue cleaner, and roll-on deodorant" },
  { id: "qw-posture", title: "5. Shoulders back and phone held at eye level" },
];

const WEEKLY_GROOM_CHECKS = [
  { id: "wg-trim", title: "Cleaned beard neckline & upper-cheek stray hairs" },
  { id: "wg-nails", title: "Clipped and cleaned finger and toe nails" },
  { id: "wg-unibrow", title: "Checked unibrow area and ears/nose" },
  { id: "wg-bedsheet", title: "Washed pillow cover and bath towel" },
  { id: "wg-shoes", title: "Wiped sneakers/shoes clean" },
  { id: "wg-clothes", title: "Readied 3 well-fitting outfits for the week" },
];

const EXPOSURE_LADDER = [
  { id: "step-1", step: 1, title: "Smile + 2-sec eye contact with a shopkeeper or guard", desc: "Give a light smile and nod to acknowledge them." },
  { id: "step-2", step: 2, title: "Say 'Good morning' or 'Thank you' aloud to 3 people", desc: "Clear audible voice to a delivery person, guard, or neighbour." },
  { id: "step-3", step: 3, title: "Ask a shopkeeper a simple question", desc: "Ask the price or availability of an item." },
  { id: "step-4", step: 4, title: "Ask a passer-by for directions or time", desc: "Ask a simple route question while out on a walk." },
  { id: "step-5", step: 5, title: "Give 1 genuine compliment to a friend or neighbour", desc: "Keep it brief and sincere." },
  { id: "step-6", step: 6, title: "Call an old friend for 10 minutes", desc: "Voice call instead of texting." },
  { id: "step-7", step: 7, title: "Sit 30 min in a park/gym without using the phone as a shield", desc: "Keep the phone in your pocket and observe calmly." },
  { id: "step-8", step: 8, title: "Start a brief conversation at the gym or park", desc: "Ask someone about an exercise variation or form check." },
  { id: "step-9", step: 9, title: "Attend a group sport, library, or class for 30+ min", desc: "Show up and stay present for 30 minutes." },
  { id: "step-10", step: 10, title: "Introduce yourself to 2 new people", desc: "Say your name, chat for 5 minutes, and suggest meeting again." },
];

const PHQ9_QUESTIONS = [
  "1. Little interest or pleasure in doing things",
  "2. Feeling down, depressed, or hopeless",
  "3. Trouble falling or staying asleep, or sleeping too much",
  "4. Feeling tired or having little energy",
  "5. Poor appetite or overeating",
  "6. Feeling bad about yourself or that you are a failure",
  "7. Trouble concentrating on reading or work",
  "8. Moving/speaking very slowly or feeling unusually restless",
  "9. Thoughts that you would be better off dead or of hurting yourself",
];

const GAD7_QUESTIONS = [
  "1. Feeling nervous, anxious, or on edge",
  "2. Not being able to stop or control worrying",
  "3. Worrying too much about different things",
  "4. Trouble relaxing",
  "5. Being so restless that it is hard to sit still",
  "6. Becoming easily annoyed or irritable",
  "7. Feeling afraid as if something awful might happen",
];

const ROADMAP_PHASES = [
  {
    id: "phase-1",
    days: "Days 1–14",
    title: "Phase 1: Reset (Break the loop & anchor biology)",
    focus: "Sleep anchor, environment blockers, and stepping outside daily.",
    tasks: [
      "Fixed wake time + 15-min morning sunlight walk.",
      "Phone charging outside bedroom + DNS filter & grayscale ON.",
      "Week-1 quick wins: neat haircut, clean nails, SPF 50, 2 fitted T-shirts.",
      "Start 3x/week home or gym training.",
    ],
  },
  {
    id: "phase-2",
    days: "Days 15–45",
    title: "Phase 2: Build (Muscle, fuel, routine & social steps)",
    focus: "Calorie + protein surplus, progressive overload, and social steps 1–5.",
    tasks: [
      "3x/week progressive training (add reps or weight weekly).",
      "3 full meals + 2 snacks and 1.6–2.0 g/kg protein.",
      "Daily 5–8 min face & posture routine + AM/PM skincare.",
      "Social exposure ladder steps 1 to 5 + 2–3 daily Pomodoro blocks.",
    ],
  },
  {
    id: "phase-3",
    days: "Days 46–90",
    title: "Phase 3: Level Up (Strength, style & real-world confidence)",
    focus: "Identity shift: consistent training, capsule style, and social ease.",
    tasks: [
      "Week-6 body measurement & progress check.",
      "Heavier workout progression (Weeks 3–4 home or Gym A/B/C).",
      "10-piece capsule wardrobe upgrades.",
      "Social exposure ladder steps 6 to 10.",
    ],
  },
];

const QUESTS = [
  { id: "focus", title: "Focus Sprint", detail: "Complete one distraction-free 25-minute work or study block.", xp: 35, icon: "◈", action: "Complete focus sprint" },
  { id: "walk", title: "Outside Explorer", detail: "Take a 10-minute walk outside in natural light.", xp: 30, icon: "↗", action: "Complete outdoor walk" },
  { id: "reset", title: "Reset Your Base", detail: "Spend 5 minutes making your desk and bed clean.", xp: 25, icon: "⌂", action: "Base reset complete" },
  { id: "water", title: "Hydration Checkpoint", detail: "Drink a full glass of water and stretch your neck/back.", xp: 20, icon: "◌", action: "Checkpoint cleared" },
  { id: "social", title: "Real-World Connection", detail: "Call or message a friend or talk with family without a phone.", xp: 30, icon: "♡", action: "Connection made" },
  { id: "journal", title: "Mind Clear", detail: "Write two honest lines about how today is going.", xp: 25, icon: "▤", action: "Reflection saved" },
  { id: "sleep", title: "Tomorrow Setup", detail: "Put your phone outside the bedroom and lay out tomorrow's clothes.", xp: 30, icon: "☾", action: "Tomorrow is ready" },
];

const HEALTH_TESTS = [
  { name: "Morning fasting total testosterone (8–10 AM)", detail: "Must be tested in the morning fasting window." },
  { name: "Thyroid profile (TSH, Free T3/T4)", detail: "Linked to weight changes, energy, hair shedding, and mood." },
  { name: "Vitamin D (25-OH) & Vitamin B12", detail: "Crucial for bone density, mood, nerves, and daily energy." },
  { name: "CBC + Serum Ferritin (Iron stores)", detail: "Low ferritin is a common trigger for hair shedding and fatigue." },
];

const SUPPLEMENT_TIERS = [
  { tier: "Tier 1: Deficiency fixes (Blood test + doctor advice)", items: ["Vitamin D3", "Vitamin B12", "Iron (only if ferritin is low on lab test)"] },
  { tier: "Tier 2: Optional fitness support (Food first)", items: ["Creatine Monohydrate (3–5 g/day with 3L+ water)", "Whey / Plant Protein (only if food protein falls short)", "Omega-3 & Magnesium Glycinate"] },
  { tier: "Tier 3: Strictly Avoid", items: ["Testosterone booster capsules", "Unprescribed steroids / SARMs", "Fairness steroid creams (Betnovate/Panderm)", "Roadside unregulated vitality powders"] },
];

/* ============================================================================
   3. INITIAL UNIFIED STATE & CALCULATIONS
   ============================================================================ */

function createEmptyDay() {
  return {
    c: {},
    life: {},
    loops: {},
    face: {},
    steps: 0,
    waterL: 0,
    screenH: 0,
    sleepH: 0,
    mood: 3,
    energy: 3,
    activity: { id: "", moodAfter: 3 },
    journal: "",
    wins: [],
    slip: false,
    doneForToday: false,
  };
}

function createInitialData() {
  const today = todayISO();
  return {
    version: SCHEMA_VERSION,
    onboarded: true,
    badDayMode: false,
    profile: {
      name: "Bhai",
      started: today,
      startDate: today,
      age: 22,
      heightCm: 172,
      weightKg: 56,
      goal: "quit_porn_reduce_m",
      activity: "1.375",
      calcGoal: "gain",
      bedtime: "23:00",
      wakeTime: "07:00",
      phoneEstH: 5,
      workoutDays: ["Mon", "Wed", "Fri"],
      targets: { steps: 8000, waterL: 3, screenH: 3 },
      discreet: false,
    },
    /* App 1 (day by day) collections */
    habits: [
      { id: "h-1", name: "Morning sunlight walk (15m)", kind: "build", category: "Body & Mind", target: "15 mins", schedule: "daily", doneDate: "", archived: false },
      { id: "h-2", name: "Read 5 pages of a book", kind: "build", category: "Mind", target: "5 pages", schedule: "daily", doneDate: "", archived: false },
      { id: "h-3", name: "No late-night reels in bed", kind: "quit", category: "Sleep", target: "Phone outside bedroom", schedule: "daily", doneDate: "", archived: false },
    ],
    tasks: [
      { id: "t-1", title: "Complete 25-min deep work block (Apna Kaam)", notes: "Keep phone in another room", due: today, priority: "high", done: false, archived: false },
      { id: "t-2", title: "Hit daily protein target (milk, soya/paneer/eggs, dal)", notes: "", due: today, priority: "normal", done: false, archived: false },
    ],
    moods: [],
    goals: [
      { id: "g-1", title: "Gain 4 kg lean mass & improve shoulder posture", why: "Fill out my frame and feel confident in fitted clothes", target: "60", unit: "kg", due: addDaysISO(today, 90), progress: 25, archived: false },
    ],
    journals: [],
    routines: [
      {
        id: "r-1",
        name: "AM & PM Skincare + Hygiene",
        category: "face",
        schedule: "daily",
        description: "Keep skin clear, hydrated and protected from UV tan.",
        steps: [
          { id: "s-1", title: "Gentle face cleanser", duration: "1 min" },
          { id: "s-2", title: "Lightweight moisturizer", duration: "1 min" },
          { id: "s-3", title: "SPF 50 PA+++ sunscreen (AM)", duration: "1 min" },
        ],
        logs: [],
      },
    ],
    metrics: [
      { id: "m-1", name: "Daily Protein Intake", category: "nutrition", unit: "grams", target: 100, description: "Aim for 1.6-2.0g per kg body weight", logs: [] },
    ],
    resetLogs: [],
    checkins: [],
    milestones: [
      { id: "ms-1", goalId: "g-1", title: "Complete first 14 days without missing workouts", due: addDaysISO(today, 14), done: false },
    ],
    measurements: [],

    /* App 2 (Comeback 90) collections */
    days: { [today]: createEmptyDay() },
    schedule: DEFAULT_SCHEDULE.map((x) => ({ ...x })),
    urges: [],
    ifThen: [
      {
        id: "ift-1",
        trigger: "I feel like scrolling on my phone alone in bed at night",
        action: "I will charge the phone outside the room and drink 1 glass of water",
      },
    ],
    measures: [
      { date: addDaysISO(today, -14), weight: 55, waist: 74, chest: 86, arm: 27, neck: 35, shoulder: 103 },
      { date: today, weight: 56, waist: 74, chest: 87, arm: 27.5, neck: 35.5, shoulder: 105 },
    ],
    ladder: {},
    thoughts: [],
    mentalCheckins: [],
    env: {},
    groom: { skinType: "oily", faceShape: "oval", quickWins: {}, weeklyChecks: {} },
    faceAudit: { answers: {}, updatedAt: "" },
    focusSessions: [],
    weeklyReviews: [],
    settings: { activeLoops: ["junk", "lateCaff", "doomscroll"], activePlan: "home" },
  };
}

function readUnifiedStore() {
  const def = createInitialData();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return def;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return def;
    return {
      ...def,
      ...parsed,
      profile: {
        ...def.profile,
        ...(parsed.profile || {}),
        targets: { ...def.profile.targets, ...((parsed.profile && parsed.profile.targets) || {}) },
      },
      days: { ...def.days, ...(parsed.days || {}) },
      groom: { ...def.groom, ...(parsed.groom || {}) },
      settings: { ...def.settings, ...(parsed.settings || {}) },
    };
  } catch {
    return def;
  }
}

function calcDailyScoreBreakdown(dayObj, profile) {
  if (!dayObj || typeof dayObj !== "object") {
    return { total: 0, coreClean: 0, fitnessBody: 0, sleepScreen: 0, mindCare: 0 };
  }
  const c = dayObj.c || {};
  const targets = (profile && profile.targets) || { steps: 8000, waterL: 3, screenH: 3 };

  let coreClean = 0;
  if (c.noPorn && !dayObj.slip) coreClean += 20;

  let fitnessBody = 0;
  if (c.workout) fitnessBody += 12;
  const targetSteps = Math.max(1000, safeNum(targets.steps, 8000));
  const actualSteps = Math.max(0, safeNum(dayObj.steps, 0));
  if (c.steps) fitnessBody += 8;
  else if (actualSteps > 0) fitnessBody += Math.min(1, actualSteps / targetSteps) * 8;
  if (c.protein) fitnessBody += 8;
  const targetWater = Math.max(1, safeNum(targets.waterL, 3));
  const actualWater = Math.max(0, safeNum(dayObj.waterL, 0));
  if (c.water) fitnessBody += 4;
  else if (actualWater > 0) fitnessBody += Math.min(1, actualWater / targetWater) * 4;

  let sleepScreen = 0;
  if (c.wakeOnTime) sleepScreen += 8;
  if (c.sunlight) sleepScreen += 8;
  const targetScreen = Math.max(0.5, safeNum(targets.screenH, 3));
  const actualScreen = Math.max(0, safeNum(dayObj.screenH, 0));
  if (c.screenUnderLimit) sleepScreen += 8;
  else if (actualScreen > 0 && actualScreen <= targetScreen) sleepScreen += 8;
  if (c.bedOnTime) sleepScreen += 6;
  if (c.phoneOutside) sleepScreen += 5;

  let mindCare = 0;
  if (c.skincare) mindCare += 5;
  if (c.braveSocial) mindCare += 4;
  if (c.journal || (typeof dayObj.journal === "string" && dayObj.journal.trim().length > 3)) mindCare += 4;

  const total = Math.min(100, Math.round(coreClean + fitnessBody + sleepScreen + mindCare));
  return {
    total,
    coreClean: Math.round(coreClean),
    fitnessBody: Math.round(fitnessBody),
    sleepScreen: Math.round(sleepScreen),
    mindCare: Math.round(mindCare),
  };
}

function calcDailyScore(dayObj, profile) {
  return calcDailyScoreBreakdown(dayObj, profile).total;
}

function calcStreaks(daysMap, profile, currentISO = todayISO()) {
  const map = daysMap || {};
  const startISO = (profile && profile.startDate) || currentISO;
  const allDates = Array.from(new Set([...Object.keys(map), currentISO])).sort();
  const earliestISO = allDates[0] < startISO ? allDates[0] : startISO;
  const totalSpan = Math.max(0, dayDiff(earliestISO, currentISO));

  let totalClean = 0;
  let cleanLast30 = 0;
  let bestClean = 0;
  let runningClean = 0;
  let bestRoutine = 0;
  let runningRoutine = 0;

  for (let i = 0; i <= totalSpan; i += 1) {
    const dISO = addDaysISO(earliestISO, i);
    const dObj = map[dISO];
    const isClean = Boolean(dObj && dObj.c && dObj.c.noPorn && !dObj.slip);
    const isSlip = Boolean(dObj && dObj.slip);
    const score = dObj ? calcDailyScore(dObj, profile) : 0;

    if (isClean) {
      totalClean += 1;
      runningClean += 1;
      if (runningClean > bestClean) bestClean = runningClean;
    } else if (isSlip || dISO < currentISO) {
      runningClean = 0;
    }
    if (dayDiff(dISO, currentISO) < 30 && isClean) cleanLast30 += 1;

    if (score >= 60) {
      runningRoutine += 1;
      if (runningRoutine > bestRoutine) bestRoutine = runningRoutine;
    } else if (dISO < currentISO) {
      runningRoutine = 0;
    }
  }

  const todayObj = map[currentISO];
  const todayLoggedClean = Boolean(todayObj && todayObj.c && todayObj.c.noPorn && !todayObj.slip);
  const todaySlipped = Boolean(todayObj && todayObj.slip);

  let currentClean = 0;
  if (!todaySlipped) {
    let cursor = todayLoggedClean ? currentISO : addDaysISO(currentISO, -1);
    while (cursor >= earliestISO) {
      const obj = map[cursor];
      if (obj && obj.c && obj.c.noPorn && !obj.slip) {
        currentClean += 1;
        cursor = addDaysISO(cursor, -1);
      } else break;
    }
  }

  let currentRoutine = 0;
  const todayScore = todayObj ? calcDailyScore(todayObj, profile) : 0;
  let rCursor = todayScore >= 60 ? currentISO : addDaysISO(currentISO, -1);
  while (rCursor >= earliestISO) {
    const obj = map[rCursor];
    const sc = obj ? calcDailyScore(obj, profile) : 0;
    if (sc >= 60) {
      currentRoutine += 1;
      rCursor = addDaysISO(rCursor, -1);
    } else break;
  }

  return {
    currentClean,
    bestClean: Math.max(bestClean, currentClean),
    totalClean,
    cleanLast30,
    currentRoutine,
    bestRoutine: Math.max(bestRoutine, currentRoutine),
  };
}

function calcBodyMetrics(profile, measures = []) {
  const heightCm = Math.max(120, Math.min(230, safeNum(profile?.heightCm, 172)));
  const weightKg = Math.max(30, Math.min(200, safeNum(profile?.weightKg, 56)));
  const age = Math.max(16, Math.min(80, safeNum(profile?.age, 22)));
  const mult = Math.max(1.2, Math.min(1.9, safeNum(profile?.activity, 1.375)));
  const requestedGoal = profile?.calcGoal || "gain";

  const heightM = heightCm / 100;
  const bmi = +(weightKg / (heightM * heightM)).toFixed(1);
  const isUnderweight = bmi < 18.5;

  let bmiCategory = "Normal weight";
  if (bmi < 18.5) bmiCategory = "Underweight (BMI below 18.5)";
  else if (bmi >= 25 && bmi < 30) bmiCategory = "Overweight";
  else if (bmi >= 30) bmiCategory = "Obese";

  const bmr = Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + 5);
  const tdee = Math.round(bmr * mult);

  const loseBlocked = isUnderweight && requestedGoal === "lose";
  const effectiveGoal = loseBlocked ? "gain" : requestedGoal;

  let calMin = tdee;
  let calMax = tdee;
  if (effectiveGoal === "gain") {
    calMin = tdee + 300;
    calMax = tdee + 400;
  } else if (effectiveGoal === "lose") {
    calMin = Math.max(1400, tdee - 500);
    calMax = Math.max(1500, tdee - 400);
  }

  let swRatio = null;
  if (Array.isArray(measures) && measures.length > 0) {
    const latest = measures[measures.length - 1];
    const sh = safeNum(latest.shoulder, 0);
    const wa = safeNum(latest.waist, 0);
    if (sh > 0 && wa > 0) swRatio = +(sh / wa).toFixed(2);
  }

  return {
    heightCm,
    weightKg,
    age,
    bmi,
    bmiCategory,
    isUnderweight,
    loseBlocked,
    effectiveGoal,
    bmr,
    tdee,
    calMin,
    calMax,
    proteinMin: Math.round(weightKg * 1.6),
    proteinMax: Math.round(weightKg * 2.0),
    swRatio,
  };
}

/* ============================================================================
   4. MODERN INTERACTIVE REACT CHARTS SUITE (SVG + HOVER TOOLTIPS + BEZIER)
   ============================================================================ */

function buildSmoothSvgPath(points) {
  if (!points || points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cpx1 = p0.x + (p1.x - p0.x) * 0.45;
    const cpy1 = p0.y;
    const cpx2 = p0.x + (p1.x - p0.x) * 0.55;
    const cpy2 = p1.y;
    d += ` C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${p1.x} ${p1.y}`;
  }
  return d;
}

function ModernAreaChart({
  data = [],
  maxVal = 100,
  unit = "",
  color = "#3f6952",
  secondaryData = null,
  secondaryUnit = "",
  secondaryColor = "#c89572",
  height = 200,
}) {
  const [hoverIdx, setHoverIdx] = useState(null);
  const w = 620;
  const h = height;
  const padL = 36;
  const padR = 18;
  const padT = 22;
  const padB = 30;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  const safeMax = useMemo(() => {
    const vals = data.map((d) => safeNum(d.value, 0));
    return Math.max(maxVal || 10, ...vals, 1);
  }, [data, maxVal]);

  const coords = useMemo(
    () =>
      data.map((d, i) => {
        const val = Math.max(0, safeNum(d.value, 0));
        const x = data.length <= 1 ? padL + plotW / 2 : padL + (i / (data.length - 1)) * plotW;
        const y = padT + plotH - Math.min(1, val / safeMax) * plotH;
        return { ...d, x, y, val };
      }),
    [data, plotW, plotH, safeMax]
  );

  const secCoords = useMemo(() => {
    if (!secondaryData || !secondaryData.length) return [];
    const vals = secondaryData.map((d) => safeNum(d.value, 0));
    const minS = Math.min(...vals, 0);
    const maxS = Math.max(...vals, 1);
    const span = maxS - minS || 1;
    return secondaryData.map((d, i) => {
      const val = safeNum(d.value, 0);
      const x = secondaryData.length <= 1 ? padL + plotW / 2 : padL + (i / (secondaryData.length - 1)) * plotW;
      const y = padT + plotH - ((val - minS) / span) * plotH;
      return { ...d, x, y, val };
    });
  }, [secondaryData, plotW, plotH]);

  const linePath = useMemo(() => buildSmoothSvgPath(coords), [coords]);
  const secPath = useMemo(() => buildSmoothSvgPath(secCoords), [secCoords]);

  const areaPath = useMemo(() => {
    if (!coords.length) return "";
    const first = coords[0];
    const last = coords[coords.length - 1];
    return `${linePath} L ${last.x} ${padT + plotH} L ${first.x} ${padT + plotH} Z`;
  }, [coords, linePath, plotH]);

  const gradId = useMemo(() => `area-grad-${Math.random().toString(36).slice(2, 7)}`, []);

  if (!data.length) {
    return <div className="empty-chart">No data points recorded yet.</div>;
  }

  const activePoint = hoverIdx !== null && coords[hoverIdx] ? coords[hoverIdx] : null;
  const activeSec = hoverIdx !== null && secCoords[hoverIdx] ? secCoords[hoverIdx] : null;

  return (
    <div className="modern-chart-wrap">
      {activePoint && (
        <div className="modern-chart-tooltip">
          <span>{activePoint.fullLabel || activePoint.label}</span>
          <strong>
            {activePoint.val}
            {unit}
          </strong>
          {activeSec && (
            <em style={{ color: secondaryColor }}>
              · {activeSec.val}
              {secondaryUnit}
            </em>
          )}
        </div>
      )}
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="modern-svg-chart"
        onMouseLeave={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
          const y = padT + plotH * (1 - ratio);
          const labelVal = Math.round(safeMax * ratio);
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
              <text x={padL - 8} y={y + 3} textAnchor="end" className="chart-axis-text">
                {labelVal}
              </text>
            </g>
          );
        })}

        <path d={areaPath} fill={`url(#${gradId})`} />
        <path d={linePath} fill="none" stroke={color} strokeWidth="2.8" strokeLinecap="round" />

        {secCoords.length > 1 && (
          <path
            d={secPath}
            fill="none"
            stroke={secondaryColor}
            strokeWidth="2.2"
            strokeDasharray="5 4"
            strokeLinecap="round"
          />
        )}

        {activePoint && (
          <line
            x1={activePoint.x}
            y1={padT}
            x2={activePoint.x}
            y2={padT + plotH}
            stroke={color}
            strokeOpacity="0.35"
            strokeDasharray="3 3"
          />
        )}

        {coords.map((pt, i) => (
          <g key={pt.key || i} onMouseEnter={() => setHoverIdx(i)} style={{ cursor: "pointer" }}>
            <rect
              x={pt.x - plotW / Math.max(2, coords.length) / 2}
              y={padT}
              width={plotW / Math.max(1, coords.length)}
              height={plotH}
              fill="transparent"
            />
            <circle
              cx={pt.x}
              cy={pt.y}
              r={hoverIdx === i ? 6 : 4}
              fill="var(--paper)"
              stroke={color}
              strokeWidth={hoverIdx === i ? 3 : 2}
            />
            {(coords.length <= 10 || i % Math.ceil(coords.length / 8) === 0 || i === coords.length - 1) && (
              <text x={pt.x} y={h - 8} textAnchor="middle" className="chart-axis-text">
                {pt.label}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

function ModernDonutChart({ breakdown }) {
  const segments = [
    { label: "Clean Streak Core", value: breakdown.coreClean, max: 20, color: "#3f6952" },
    { label: "Workout, Steps & Diet", value: breakdown.fitnessBody, max: 32, color: "#689677" },
    { label: "Sleep & Screen Anchor", value: breakdown.sleepScreen, max: 35, color: "#c89572" },
    { label: "Skincare, Social & Journal", value: breakdown.mindCare, max: 13, color: "#7d8ec4" },
  ];

  const size = 160;
  const stroke = 16;
  const center = size / 2;
  const radius = center - stroke;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  return (
    <div className="modern-donut-layout">
      <div className="donut-svg-box">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="var(--sage-soft)"
            strokeWidth={stroke}
          />
          {segments.map((seg, i) => {
            const pct = seg.value / 100;
            const dash = pct * circumference;
            const offset = circumference - accumulatedPercent * circumference;
            accumulatedPercent += pct;
            if (seg.value <= 0) return null;
            return (
              <circle
                key={i}
                cx={center}
                cy={center}
                r={radius}
                fill="transparent"
                stroke={seg.color}
                strokeWidth={stroke}
                strokeDasharray={`${dash} ${circumference}`}
                strokeDashoffset={offset}
                strokeLinecap="round"
                transform={`rotate(-90 ${center} ${center})`}
              />
            );
          })}
          <text x="50%" y="46%" textAnchor="middle" className="donut-score-big">
            {breakdown.total}
          </text>
          <text x="50%" y="63%" textAnchor="middle" className="donut-score-sub">
            / 100 PTS
          </text>
        </svg>
      </div>
      <div className="donut-legend-list">
        {segments.map((seg, i) => (
          <div key={i} className="donut-legend-item">
            <span className="donut-dot" style={{ background: seg.color }} />
            <div className="donut-legend-copy">
              <span>{seg.label}</span>
              <strong>
                {seg.value}/{seg.max} pts
              </strong>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ModernRadarChart({ axes = [] }) {
  const size = 240;
  const center = size / 2;
  const radius = 76;
  const count = axes.length || 6;

  const getPoint = (idx, ratio) => {
    const angle = (Math.PI * 2 * idx) / count - Math.PI / 2;
    return {
      x: center + radius * ratio * Math.cos(angle),
      y: center + radius * ratio * Math.sin(angle),
    };
  };

  const polygonPoints = axes
    .map((ax, i) => {
      const ratio = Math.max(0.08, Math.min(1, safeNum(ax.value, 0) / 100));
      const pt = getPoint(i, ratio);
      return `${pt.x},${pt.y}`;
    })
    .join(" ");

  return (
    <div className="modern-radar-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {[0.25, 0.5, 0.75, 1].map((lvl, idx) => (
          <polygon
            key={idx}
            points={axes
              .map((_, i) => {
                const p = getPoint(i, lvl);
                return `${p.x},${p.y}`;
              })
              .join(" ")}
            fill="none"
            stroke="var(--line)"
            strokeDasharray={lvl === 1 ? undefined : "3 3"}
          />
        ))}
        {axes.map((ax, i) => {
          const outer = getPoint(i, 1);
          const labelPt = getPoint(i, 1.24);
          return (
            <g key={i}>
              <line x1={center} y1={center} x2={outer.x} y2={outer.y} stroke="var(--line)" />
              <text
                x={labelPt.x}
                y={labelPt.y + 3}
                textAnchor="middle"
                className="radar-label-text"
              >
                {ax.label} ({Math.round(ax.value)}%)
              </text>
            </g>
          );
        })}
        <polygon
          points={polygonPoints}
          fill="rgba(63, 105, 82, 0.24)"
          stroke="var(--sage)"
          strokeWidth="2.2"
        />
        {axes.map((ax, i) => {
          const ratio = Math.max(0.08, Math.min(1, safeNum(ax.value, 0) / 100));
          const pt = getPoint(i, ratio);
          return <circle key={i} cx={pt.x} cy={pt.y} r="3.8" fill="var(--sage)" />;
        })}
      </svg>
    </div>
  );
}

/* ============================================================================
   5. SHARED UI PRIMITIVES (FROM DAY BY DAY + COMEBACK 90)
   ============================================================================ */

function Icon({ children }) {
  return (
    <span className="icon" aria-hidden="true">
      {children}
    </span>
  );
}

function Button({ children, kind = "secondary", className = "", ...props }) {
  return (
    <button type="button" className={`btn ${kind} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}

function Card({ children, className = "" }) {
  return <section className={`card ${className}`.trim()}>{children}</section>;
}

function Heading({ eyebrow, title, description, action }) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action && <div className="heading-action">{action}</div>}
    </div>
  );
}

function Empty({ icon = "✳", title, description, action }) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}

function Progress({ value = 0 }) {
  return (
    <div className="progress">
      <span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

function Field({ label, children, hint }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal">
        <div className="modal-head">
          <h2>{title}</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Stat({ icon, label, value, detail, color }) {
  return (
    <Card className={`stat-card ${color}`}>
      <div className="stat-top">
        <span className="stat-icon">{icon}</span>
        <span className="stat-label">{label}</span>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-detail">{detail}</div>
    </Card>
  );
}

function Accordion({ title, badge, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`accordion-box ${open ? "open" : ""}`}>
      <button
        type="button"
        className="accordion-head"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <strong>{title}</strong>
        <div className="accordion-right">
          {badge && <span className="status-pill complete">{badge}</span>}
          <span>{open ? "−" : "+"}</span>
        </div>
      </button>
      {open && <div className="accordion-body">{children}</div>}
    </div>
  );
}

function CountdownTimer({ defaultSeconds = 600, label = "Timer", onComplete }) {
  const [secondsLeft, setSecondsLeft] = useState(defaultSeconds);
  const [running, setRunning] = useState(false);
  const completeRef = useRef(onComplete);

  useEffect(() => {
    completeRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    setSecondsLeft(defaultSeconds);
    setRunning(false);
  }, [defaultSeconds]);

  useEffect(() => {
    if (!running) return undefined;
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (running && secondsLeft === 0) {
      setRunning(false);
      if (typeof completeRef.current === "function") completeRef.current();
    }
  }, [secondsLeft, running]);

  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const secs = String(secondsLeft % 60).padStart(2, "0");

  return (
    <div className="timer-strip">
      <div>
        <small className="eyebrow">{label}</small>
        <div className="timer-readout">
          {mins}:{secs}
        </div>
      </div>
      <div className="timer-btns">
        <Button kind="primary" onClick={() => setRunning((r) => !r)}>
          {running ? "Pause" : "Start"}
        </Button>
        <Button
          onClick={() => {
            setRunning(false);
            setSecondsLeft(defaultSeconds);
          }}
        >
          Reset
        </Button>
      </div>
    </div>
  );
}

function Heatmap90({ startDate, daysMap, profile, selectedDate, onSelectDate }) {
  const cells = useMemo(() => {
    const start = startDate || todayISO();
    return Array.from({ length: 90 }, (_, i) => {
      const iso = addDaysISO(start, i);
      const dayObj = daysMap && daysMap[iso];
      const score = dayObj ? calcDailyScore(dayObj, profile) : 0;
      let lvl = 0;
      if (score >= 75) lvl = 3;
      else if (score >= 50) lvl = 2;
      else if (score > 0) lvl = 1;
      return {
        dayNum: i + 1,
        iso,
        score,
        lvl,
        slip: Boolean(dayObj && dayObj.slip),
      };
    });
  }, [startDate, daysMap, profile]);

  return (
    <div>
      <div className="heatmap-grid" role="group" aria-label="90-day comeback heatmap">
        {cells.map((cell) => (
          <button
            key={cell.iso}
            type="button"
            className={`heat-cell lvl-${cell.lvl} ${cell.slip ? "slip-day" : ""} ${selectedDate === cell.iso ? "selected" : ""
              }`}
            onClick={() => onSelectDate(cell.iso)}
            title={`Day ${cell.dayNum} (${cell.iso}): ${cell.score}/100 pts`}
          >
            {cell.dayNum}
          </button>
        ))}
      </div>
      <div className="heat-legend">
        <span className="status-pill">0 pts</span>
        <span className="status-pill complete">1–49 pts</span>
        <span className="status-pill complete">50–74 pts</span>
        <span className="status-pill complete">75–100 pts</span>
        <span className="status-pill peach-pill">Orange border = slip logged</span>
      </div>
    </div>
  );
}

/* ============================================================================
   6. NAVIGATION ITEMS
   ============================================================================ */

const NAV = [
  ["Today", "⌂", "Daily overview, 90-day score & modern charts"],
  ["Habits", "◉", "Custom habits + full Comeback 90 daily tracker"],
  ["Quest", "✦", "Gamified real-life XP missions & level"],
  ["Lifestyle", "✳", "Workouts, TDEE calculator, Indian diet & care routines"],
  ["Yoga", "✾", "Anterior Pelvic Tilt (APT) fix, daily yoga flow & hold timer"],
  ["Looks", "◌", "Face & posture routine, audit, hair, skin & wardrobe"],
  ["Reset", "↻", "Urge SOS, breathing guide, blockers & private logs"],
  ["Goals", "⚑", "Goals, milestones, 90-day roadmap & weekly review"],
  ["Reflection", "▤", "Mood charts, journals, social ladder, CBT & PHQ-9"],
  ["More", "⚙", "Control panel, Sleep & Pomodoro, Health tests & Help"],
];

/* ============================================================================
   7. MAIN APPLICATION COMPONENT
   ============================================================================ */

export default function App() {
  const [data, setData] = useState(readUnifiedStore);
  const [page, setPage] = useState("Today");
  const [modal, setModal] = useState(null);
  const [sosOpen, setSosOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [dark, setDark] = useState(false);
  const [selectedISO, setSelectedISO] = useState(todayISO);

  const today = todayISO();
  const p = data.profile || {};
  const dm = useCallback((txt) => discreetText(txt, Boolean(p.discreet)), [p.discreet]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* ignore quota errors */
    }
  }, [data]);

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
        typeof updater === "function" ? updater(existing) : { ...existing, ...updater };
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
          (h.schedule !== "weekdays" || [1, 2, 3, 4, 5].includes(new Date().getDay()))
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
  const streaks = useMemo(() => calcStreaks(data.days, p, today), [data.days, p, today]);

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
        h.id === habit.id ? { ...h, doneDate: h.doneDate === today ? "" : today } : h
      )
    );
    update("checkins", (arr) => {
      const existing = arr.find((c) => c.habitId === habit.id && c.date === today);
      if (existing) {
        return arr.map((c) => (c.id === existing.id ? { ...c, done: !existing.done } : c));
      }
      return [
        { id: uid(), habitId: habit.id, name: habit.name, date: today, done: true },
        ...arr,
      ];
    });
    notify(habit.doneDate === today ? "Check-in undone" : "Habit checked in");
  };

  const startModal = (type, item = null) => setModal({ type, item });

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
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
        if (!parsed || typeof parsed !== "object") throw new Error("Invalid JSON");
        setData((old) => ({ ...old, ...parsed }));
        notify("Backup restored");
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
                a.map((r) => (r.id === item.id ? { ...r, logs: [entry, ...(r.logs || [])] } : r))
              );
            } else {
              update("metrics", (a) =>
                a.map((m) => (m.id === item.id ? { ...m, logs: [entry, ...(m.logs || [])] } : m))
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
                ? { doneDate: item?.doneDate || "", archived: item?.archived || false }
                : {}),
              ...(type === "task"
                ? { done: item?.done || false, archived: item?.archived || false }
                : {}),
              ...(type === "goal"
                ? { progress: item?.progress || 0, archived: item?.archived || false }
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
            { name: "name", label: "Habit name", required: true, placeholder: "e.g. Read 10 pages" },
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
            { name: "category", label: "Category", placeholder: "Mind, body, learning…" },
            { name: "target", label: "Daily target", placeholder: "e.g. 20 minutes" },
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
            { name: "title", label: "Task", required: true, placeholder: "What matters today?" },
            { name: "notes", label: "Notes", type: "textarea", placeholder: "Optional details" },
            { name: "due", label: "Due date", type: "date", defaultValue: today },
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
            { name: "date", label: "Date", type: "date", defaultValue: today, required: true },
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
            { name: "title", label: "Goal title", required: true, placeholder: "e.g. Build a consistent study routine" },
            { name: "why", label: "Why it matters", type: "textarea", placeholder: "What will this make possible?" },
            { name: "target", label: "Target (optional)", placeholder: "e.g. 90" },
            { name: "unit", label: "Unit", placeholder: "days, hours, kg…" },
            { name: "due", label: "Target date", type: "date" },
          ],
          "Create a goal"
        );
      case "milestone":
        return form(
          "milestones",
          [
            { name: "title", label: "Milestone", required: true, placeholder: "A meaningful next step" },
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
              label: `Current measurement${item?.unit ? ` (${item.unit})` : ""}`,
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
            { name: "title", label: "Entry title", required: true, placeholder: "A few words about today" },
            {
              name: "content",
              label: "What felt important today?",
              type: "textarea",
              required: true,
              placeholder: "There is no right way to write…",
            },
            { name: "gratitude", label: "One thing I appreciate", type: "textarea", placeholder: "Small things count." },
          ],
          "Write a reflection"
        );
      case "routine":
        return form(
          "routines",
          [
            { name: "name", label: "Routine name", required: true, placeholder: "e.g. Evening wind-down" },
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
            { name: "name", label: "Indicator name", required: true, placeholder: "e.g. Sleep duration" },
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
            { name: "unit", label: "Unit", required: true, placeholder: "hours, glasses, grams…" },
            { name: "target", label: "Optional target", type: "number" },
            { name: "description", label: "Notes", type: "textarea" },
          ],
          "Add a measurable indicator"
        );
      case "step":
        return form(
          "routines",
          [
            { name: "stepTitle", label: "Step name", required: true, placeholder: "e.g. Cleanse gently" },
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
            { name: "intensity", label: "Urge intensity (0–10)", type: "number", defaultValue: "5" },
            { name: "trigger", label: "Trigger (optional)", type: "textarea", placeholder: "What was happening before the urge?" },
            { name: "response", label: "What did you do?", type: "textarea", placeholder: "Pause, walk, change environment…" },
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
            { name: "reflection", label: "Reflection (optional)", type: "textarea" },
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
              update("tasks", (a) => a.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
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
                update("habits", (a) => a.map((x) => (x.id === id ? { ...x, archived: true } : x)));
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
        return <QuestPage data={data} today={today} onNavigate={setPage} notify={notify} />;
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

  /* ===== REPLACE the whole `return ( ... );` at the end of `export default function App()` with this ===== */
  const resetCount = (data.resetLogs || []).length + (data.urges || []).length;

  return (
    <div className={`app-shell ${dark ? "theme-dark" : ""}`}>
      <header className="site-header">
        <button type="button" className="logo" onClick={() => setPage("Today")}>
          <span className="logo-mark">c</span>
          <span className="logo-text">{p.discreet ? "Daily Planner" : "Comeback 90"}</span>
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
              {name === "Reset" && resetCount > 0 && <b className="nav-count">{resetCount}</b>}
            </button>
          ))}
        </nav>

        <div className="header-actions">
          <button type="button" className="pill-outline" onClick={() => setSosOpen(true)}>
            {dm("Urge SOS")}
          </button>
          <button type="button" className="pill-solid" onClick={() => startModal("profile")}>
            Day {Math.min(getDayIndex(p.startDate, today), 90)}/90
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={() => setDark(!dark)}
            aria-label="Toggle theme"
          >
            {dark ? "☼" : "◐"}
          </button>
        </div>
      </header>

      <main className="main-area">
        <div className="content-wrap">
          {data.badDayMode && <span className="status-pill peach-pill">Bad Day Mode · 3 basics</span>}
          {renderPage()}
          <footer className="app-footer">
            <span>General info, not medical advice · Tele-MANAS 14416 · Emergency 112</span>
            <div>
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

      {renderModal()}
      {toast && (
        <div className="toast">
          <span>✓</span>
          {toast}
        </div>
      )}

      <button type="button" className="sos-fab" onClick={() => setSosOpen(true)} aria-label="Urge SOS">
        SOS
      </button>

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

/* ============================================================================
   8. TODAY PAGE (MERGED HERO + MODERN CHARTS + HABITS + 13 SCORED CHECKS + TASKS)
   ============================================================================ */

function TodayPage({
  data,
  setData,
  today,
  todayHabits,
  doneHabits,
  activeTasks,
  doneTasks,
  todayMood,
  activeGoals,
  todayDayObj,
  todayBreakdown,
  streaks,
  dm,
  updateDay,
  onHabit,
  onTask,
  onAddTask,
  onAddHabit,
  onMood,
  onNavigate,
  onOpenSOS,
  selectedISO,
  setSelectedISO,
}) {
  const [chartMetric, setChartMetric] = useState("score");
  const [checkTab, setCheckTab] = useState("comeback");

  const p = data.profile || {};
  const dayNumber = getDayIndex(p.startDate, today);
  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  })();
  const quote = QUOTES[(dayNumber - 1) % QUOTES.length];
  const isRestDay = !(p.workoutDays || ["Mon", "Wed", "Fri"]).includes(getWeekdayShort(today));

  const chartSeries = useMemo(() => {
    return Array.from({ length: 14 }, (_, idx) => {
      const iso = addDaysISO(today, -(13 - idx));
      const dObj = (data.days && data.days[iso]) || {};
      const moodEntry = (data.moods || []).find((m) => m.date === iso);
      let value = 0;
      if (chartMetric === "score") value = calcDailyScore(dObj, p);
      else if (chartMetric === "mood") value = Number(moodEntry?.score || dObj.mood || 0);
      else if (chartMetric === "sleep") value = Number(dObj.sleepH || 0);
      else if (chartMetric === "steps") value = Number(dObj.steps || 0);
      return { key: iso, label: getWeekdayShort(iso), fullLabel: fmtDate(iso), value };
    });
  }, [data.days, data.moods, chartMetric, p, today]);

  const radarAxes = useMemo(() => {
    const habitPct = todayHabits.length ? percent(doneHabits, todayHabits.length) : 60;
    const sleepPct = Math.min(100, Math.round((safeNum(todayDayObj.sleepH, 7) / 8) * 100));
    const bodyPct = Math.min(100, Math.round((todayBreakdown.fitnessBody / 32) * 100));
    const cleanPct = Math.min(100, streaks.cleanLast30 * 4);
    const looksPct = todayDayObj.c?.skincare ? 90 : 45;
    const mindPct = todayMood ? Number(todayMood.score) * 20 : 65;
    return [
      { label: "Habits", value: habitPct },
      { label: "Body", value: bodyPct },
      { label: "Sleep", value: sleepPct },
      { label: "Clean", value: cleanPct },
      { label: "Looks", value: looksPct },
      { label: "Mind", value: mindPct },
    ];
  }, [todayHabits.length, doneHabits, todayDayObj, todayBreakdown, streaks.cleanLast30, todayMood]);

  const displayedScoredChecks = data.badDayMode
    ? SCORED_CHECKS.filter((item) => MINIMUM_DAY_IDS.includes(item.id))
    : SCORED_CHECKS;

  const toggleScoredCheck = (id, checked) => {
    updateDay(today, (prev) => ({
      ...prev,
      c: { ...(prev.c || {}), [id]: checked },
    }));
  };

  return (
    <>
      <Heading
        eyebrow={`${new Date().toLocaleDateString(undefined, {
          weekday: "long", month: "long", day: "numeric",
        }).toUpperCase()} · DAY ${dayNumber} OF 90`}
        title={`${greeting}, ${p.name || "Bhai"}.`}
        description="A little structure. A little care. Your 90-day comeback, one day at a time."
        action={
          <div className="heading-btn-group">
            <Button onClick={() => setData((old) => ({ ...old, badDayMode: !old.badDayMode }))}>
              {data.badDayMode ? "★ Bad Day Mode: ON" : "Low Energy / Bad Day Mode"}
            </Button>
            <Button kind="primary" onClick={onAddTask}><span>＋</span> Add a task</Button>
          </div>
        }
      />

      <div className="hero-banner">
        <div className="hero-copy">
          <div className="hero-kicker"><span className="sparkle">✳</span> DAY {dayNumber} OF 90 · NEVER MISS TWICE</div>
          <h2>Become who you want to be,<br /><em>one day at a time.</em></h2>
          <p>{dm(quote)}</p>
          <div className="hero-progress-wrap">
            <Progress value={percent(Math.min(dayNumber, 90), 90)} />
            <small>{Math.min(dayNumber, 90)}/90 days in current cycle</small>
          </div>
          <div className="hero-cta-row">
            <button type="button" className="hero-link" onClick={() => onNavigate("Reflection")}>Take a moment to reflect <span>↗</span></button>
            <button type="button" className="hero-link" onClick={() => onNavigate("Quest")}>Open Comeback Quest <span>✦</span></button>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="art-sun" /><div className="art-hill hill-back" /><div className="art-hill hill-front" />
          <div className="art-stem" /><div className="art-leaf leaf-a" /><div className="art-leaf leaf-b" /><div className="art-leaf leaf-c" /><div className="art-pot" />
        </div>
        <div className="hero-index">{String(dayNumber).padStart(2, "0")} <span>/ 90-DAY PRACTICE</span></div>
      </div>

      <div className="stats-grid">
        <Stat icon="◉" label="Comeback daily score" value={`${todayBreakdown.total}/100`} detail={`Routine streak: ${streaks.currentRoutine}d (best ${streaks.bestRoutine}d)`} color="sage" />
        <Stat icon="🛡" label={dm("Clean streak")} value={`${streaks.currentClean} days`} detail={`Best: ${streaks.bestClean}d · Total clean: ${streaks.totalClean}d`} color="blue" />
        <Stat icon="✓" label="Habits & tasks today" value={`${doneHabits + doneTasks}/${todayHabits.length + activeTasks.length}`} detail={`${doneHabits}/${todayHabits.length} habits · ${doneTasks}/${activeTasks.length} tasks`} color="peach" />
        <Stat icon="♡" label="Mood & energy" value={todayMood ? `${todayMood.score}/5` : `${todayDayObj.mood || 3}/5`} detail={todayMood ? ["", "Very low", "Low", "Okay", "Good", "Great"][Number(todayMood.score)] : "Tap to log mood check-in"} color="lavender" />
      </div>

      <div className="dashboard-grid">
        <Card className="modern-chart-card">
          <div className="section-head">
            <div><div className="eyebrow">INTERACTIVE TREND ANALYTICS</div><h2>14-Day performance curve</h2><p>Hover any point to inspect your daily trajectory.</p></div>
            <div className="tabs">
              {[["score", "Score"], ["mood", "Mood"], ["sleep", "Sleep"], ["steps", "Steps"]].map(([k, lbl]) => (
                <button type="button" key={k} className={chartMetric === k ? "selected" : ""} onClick={() => setChartMetric(k)}>{lbl}</button>
              ))}
            </div>
          </div>
          <ModernAreaChart data={chartSeries} maxVal={chartMetric === "score" ? 100 : chartMetric === "mood" ? 5 : chartMetric === "sleep" ? 10 : p.targets?.steps || 8000} unit={chartMetric === "score" ? " pts" : chartMetric === "mood" ? "/5" : chartMetric === "sleep" ? " h" : " steps"} />
        </Card>
        <Card className="modern-chart-card">
          <div className="section-head"><div><div className="eyebrow">SCORE & BALANCE</div><h2>Today&apos;s 100-pt breakdown</h2><p>How your daily actions add up across 4 pillars.</p></div></div>
          <ModernDonutChart breakdown={todayBreakdown} />
        </Card>
      </div>

      <div className="dashboard-grid">
        <Card className="habits-panel">
          <div className="section-head">
            <div><div className="eyebrow">SHOW UP FOR YOURSELF</div><h2>Today&apos;s check-ins</h2><p>{isRestDay ? "Rest day: 20-min brisk walk counts as workout." : "Workout day: log your training session."}</p></div>
            <div className="tabs">
              <button type="button" className={checkTab === "comeback" ? "selected" : ""} onClick={() => setCheckTab("comeback")}>100-Pt Core ({displayedScoredChecks.length})</button>
              <button type="button" className={checkTab === "custom" ? "selected" : ""} onClick={() => setCheckTab("custom")}>Custom Habits ({todayHabits.length})</button>
            </div>
          </div>

          {checkTab === "comeback" ? (
            <div className="habit-list">
              {displayedScoredChecks.map((item) => {
                const checked = Boolean(todayDayObj.c && todayDayObj.c[item.id]);
                return <div className={`habit-row ${checked ? "checked" : ""}`} key={item.id}>
                  <button type="button" className="check-circle" aria-label={`${checked ? "Uncheck" : "Complete"} ${item.title}`} onClick={() => toggleScoredCheck(item.id, !checked)}>{checked ? "✓" : ""}</button>
                  <div className="habit-info"><strong>{item.id === "workout" && isRestDay ? item.restTitle : dm(item.title)}</strong><small>{dm(item.sub)}</small></div>
                  <span className={`status-pill ${checked ? "complete" : ""}`}>+{item.weight} pts</span>
                </div>;
              })}
            </div>
          ) : todayHabits.length ? (
            <div className="habit-list">{todayHabits.map((h) => <div className={`habit-row ${h.doneDate === today ? "checked" : ""}`} key={h.id}>
              <button type="button" className="check-circle" onClick={() => onHabit(h)} aria-label={`${h.doneDate === today ? "Uncheck" : "Complete"} ${h.name}`}>{h.doneDate === today ? "✓" : ""}</button>
              <div className="habit-info"><strong>{h.name}</strong><small>{h.category || "Personal"}{h.target ? ` · ${h.target}` : ""}</small></div>
              <span className={`status-pill ${h.doneDate === today ? "complete" : ""}`}>{h.doneDate === today ? "Done" : "Not yet"}</span>
            </div>)}</div>
          ) : <Empty icon="✳" title="Start with one small habit" description="Choose a daily action that supports the person you're becoming." action={<Button kind="primary" onClick={onAddHabit}>＋ Create a habit</Button>} />}

          <div className="panel-foot"><div><span className="foot-dot" /><span>Today&apos;s Comeback Score: {todayBreakdown.total}/100 pts</span></div><Progress value={todayBreakdown.total} /></div>
        </Card>

        <div className="stack-col">
          <Card className="tasks-panel">
            <div className="section-head"><div><div className="eyebrow">FOCUS ON WHAT MATTERS</div><h2>Today&apos;s focus tasks</h2><p>Make the next step clear.</p></div><button type="button" className="add-round" onClick={onAddTask} aria-label="Add task">＋</button></div>
            {activeTasks.length ? <div className="task-list">{activeTasks.slice(0, 5).map((t) => <div className={`task-row ${t.done ? "task-done" : ""}`} key={t.id}>
              <button type="button" className={`task-check ${t.done ? "on" : ""}`} onClick={() => onTask(t.id)} aria-label={`${t.done ? "Mark incomplete" : "Complete"} ${t.title}`}>{t.done ? "✓" : ""}</button>
              <div className="task-main"><strong>{t.title}</strong><small>{t.due ? fmtDate(t.due) : "No due date"} <span className={`priority ${t.priority || "normal"}`}>● {t.priority || "normal"}</span></small></div>
            </div>)}</div> : <Empty icon="↗" title="Clear a little space" description="Add a task to turn an intention into an action." action={<Button onClick={onAddTask}>＋ Add your first task</Button>} />}
            <button type="button" className="panel-bottom-link" onClick={() => onNavigate("Habits")}>Open full daily metrics (Steps, Water, Screen, Schedule) <span>→</span></button>
          </Card>
          <Card><div className="section-head"><div><div className="eyebrow">6-AXIS LIFE RADAR</div><h2>Holistic balance</h2></div></div><ModernRadarChart axes={radarAxes} /></Card>
          <div className="lower-grid-single">
            <Card className="goals-card">
              <div className="section-head">
                <div><div className="eyebrow">90-DAY COMEBACK MAP</div><h2>Your 90-day consistency grid</h2><p>Click any day to inspect or edit it in the tracker.</p></div>
                <button type="button" className="text-link" onClick={() => onNavigate("Goals")}>All goals ↗</button>
              </div>
              <Heatmap90 startDate={p.startDate} daysMap={data.days} profile={p} selectedDate={selectedISO} onSelectDate={(iso) => { setSelectedISO(iso); onNavigate("Habits"); }} />
            </Card>
          </div>
        </div>

      </div>


    </>
  );
}

/* ============================================================================
   9. HABITS & FULL DAILY TRACKER PAGE (MERGED APP 1 HABITS + APP 2 TRACKER)
   ============================================================================ */

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
  onOpenSOS,
}) {
  const [viewMode, setViewMode] = useState("tracker");
  const [filter, setFilter] = useState("all");
  const [newWin, setNewWin] = useState("");

  const p = data.profile || {};
  const dayObj = (data.days && data.days[selectedISO]) || createEmptyDay();

  const breakdown = useMemo(
    () => calcDailyScoreBreakdown(dayObj, p),
    [dayObj, p]
  );

  const isRestDay = !(p.workoutDays || ["Mon", "Wed", "Fri"]).includes(
    getWeekdayShort(selectedISO)
  );

  const list = (data.habits || []).filter(
    (h) =>
      !!h.archived === showArchived &&
      (filter === "all" || h.kind === filter) &&
      h.name.toLowerCase().includes((query || "").toLowerCase())
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

      {viewMode === "tracker" && (
        <div className="stack-col">
          <Card>
            <div className="section-head">
              <div>
                <div className="eyebrow">DAILY NUMBERS & BIOMETRICS</div>
                <h2>Steps, hydration, screen & sleep ({fmtDate(selectedISO)})</h2>
                <p>
                  Partial progress automatically calculates towards your
                  100-point score.
                </p>
              </div>
            </div>

            <div className="form-grid four-col-grid">
              <Field label={`Steps (Target: ${p.targets?.steps || 8000})`}>
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
                        steps: v >= (p.targets?.steps || 8000),
                      },
                    });
                  }}
                />
              </Field>

              <Field
                label={`Water in Litres (Target: ${p.targets?.waterL || 3}L)`}
              >
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
                    const v = Math.max(0, safeNum(e.target.value, 0));

                    updateDay(selectedISO, {
                      screenH: v,
                      c: {
                        ...(dayObj.c || {}),
                        screenUnderLimit:
                          v > 0 && v <= (p.targets?.screenH || 3),
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
                      sleepH: Math.max(0, safeNum(e.target.value, 0)),
                    })
                  }
                />
              </Field>
            </div>
          </Card>

          <div className="dashboard-grid">
            <Card>
              <div className="section-head">
                <div>
                  <div className="eyebrow">13 SCORED HABITS (100 PTS)</div>
                  <h2>Daily Comeback core</h2>
                </div>

                <span className="status-pill complete">
                  {breakdown.total}/100 pts
                </span>
              </div>

              <div className="habit-list">
                {SCORED_CHECKS.map((item) => {
                  const checked = Boolean(dayObj.c && dayObj.c[item.id]);

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
                        onClick={() =>
                          toggleGroup("c", item.id, !checked)
                        }
                      >
                        {checked ? "✓" : ""}
                      </button>

                      <div className="habit-info">
                        <strong>
                          {item.id === "workout" && isRestDay
                            ? item.restTitle
                            : dm(item.title)}
                        </strong>
                        <small>{dm(item.sub)}</small>
                      </div>

                      <span
                        className={`status-pill ${
                          checked ? "complete" : ""
                        }`}
                      >
                        {item.minDay
                          ? `Min · ${item.weight}pt`
                          : `${item.weight}pt`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>

            <div className="stack-col">
              <Card>
                <div className="section-head">
                  <div>
                    <div className="eyebrow">LIFE BASICS & FACE POSTURE</div>
                    <h2>Daily grounding & jaw care</h2>
                  </div>
                </div>

                <div className="habit-list">
                  {[...LIFE_BASICS, ...FACE_HABITS].map((item) => {
                    const isFace = FACE_HABITS.some(
                      (f) => f.id === item.id
                    );
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
                          aria-label={`${checked ? "Uncheck" : "Complete"} ${
                            item.title
                          }`}
                          aria-pressed={checked}
                          onClick={() =>
                            toggleGroup(group, item.id, !checked)
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
                  })}
                </div>
              </Card>

              <Card>
                <div className="section-head">
                  <div>
                    <div className="eyebrow">ACTIVE CONTROL LOOPS</div>
                    <h2>Dopamine & impulse guards</h2>
                  </div>
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
                          aria-label={`${checked ? "Uncheck" : "Complete"} ${
                            item.title
                          }`}
                          aria-pressed={checked}
                          onClick={() =>
                            toggleGroup("loops", item.id, !checked)
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
                        Activate a control loop in your settings to track it
                        here.
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>

          <div className="lower-grid">
            <Card>
              <div className="section-head">
                <div>
                  <div className="eyebrow">BEHAVIORAL ACTIVATION</div>
                  <h2>Mood-lifting action & wins</h2>
                  <p>Action precedes mood. Pick one small uplift today.</p>
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
                <div
                  className="category-pills"
                  style={{ marginTop: 4 }}
                >
                  {dayObj.wins.map((w, idx) => (
                    <span key={idx} className="status-pill complete">
                      ✓ {w}
                    </span>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <div className="section-head">
                <div>
                  <div className="eyebrow">DAILY QUICK JOURNAL (+4 PTS)</div>
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
                        journal: e.target.value.trim().length > 3,
                      },
                    })
                  }
                />
              </Field>
            </Card>
          </div>
        </div>
      )}

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
                  onChange={(e) => setShowArchived(e.target.checked)}
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

      {viewMode === "schedule" && (
        <Card>
          <div className="section-head">
            <div>
              <div className="eyebrow">STRUCTURED DAY TEMPLATE</div>
              <h2>Editable daily schedule (includes Apna Kaam blocks)</h2>
              <p>
                Idle, unstructured hours are the biggest trigger. Customize
                your routine below.
              </p>
            </div>
          </div>

          <div className="schedule-list">
            {(data.schedule || DEFAULT_SCHEDULE).map((row, idx) => (
              <div key={row.id || idx} className="schedule-edit-row">
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
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}

/* ============================================================================
   10. COMEBACK QUEST PAGE (GAMIFIED XP & DAILY REAL-WORLD MISSIONS)
   ============================================================================ */

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

/* ============================================================================
   11. LIFESTYLE, BODY, WORKOUTS, TDEE CALCULATOR & DIET PAGE
   ============================================================================ */

const DAILY_HOME_WORKOUTS = {
  Mon: {
    day: "Monday",
    title: "Push Day — Chest, Front/Side Shoulders & Triceps",
    focus: "Upper chest fullness & shoulder width (No equipment)",
    targetReps: 140,
    muscleSplit: { Chest: 45, Shoulders: 35, Triceps: 20 },
    exercises: [
      { id: "mon-1", name: "Incline Push-ups (Hands on bed/table)", sets: 3, defaultReps: 12, repsLabel: "10–15 reps", cue: "Keep core tight, touch lower chest to edge" },
      { id: "mon-2", name: "Standard Floor Push-ups", sets: 3, defaultReps: 10, repsLabel: "8–12 reps", cue: "Elbows at 45° angle, do not flare out" },
      { id: "mon-3", name: "Pike Push-ups (Shoulder builder)", sets: 3, defaultReps: 8, repsLabel: "6–10 reps", cue: "Hips high in a V-shape, lower head between hands" },
      { id: "mon-4", name: "Backpack Lateral Raises (Water bottles/bag)", sets: 3, defaultReps: 15, repsLabel: "12–15 reps", cue: "Raise to shoulder height for V-taper width" },
      { id: "mon-5", name: "Bench / Bed Tricep Dips", sets: 3, defaultReps: 12, repsLabel: "10–15 reps", cue: "Keep back close to the bed edge" },
    ],
  },
  Tue: {
    day: "Tuesday",
    title: "Pull & Posture — Lats, Upper Back, Neck & Biceps",
    focus: "V-taper back width & fixing forward-head posture",
    targetReps: 150,
    muscleSplit: { Back: 50, PostureNeck: 30, Biceps: 20 },
    exercises: [
      { id: "tue-1", name: "Heavy Backpack Rows (Bag filled with books)", sets: 4, defaultReps: 12, repsLabel: "10–15 reps", cue: "Flat back, pull elbows toward hips and squeeze 1s" },
      { id: "tue-2", name: "Doorframe / Towel Rows", sets: 3, defaultReps: 12, repsLabel: "10–12 reps", cue: "Lean back and pull chest to hands using upper back" },
      { id: "tue-3", name: "Prone Reverse Snow Angels (On floor)", sets: 3, defaultReps: 12, repsLabel: "12–15 reps", cue: "Lie face down, sweep arms from hips to overhead" },
      { id: "tue-4", name: "Backpack Hammer / Bicep Curls", sets: 3, defaultReps: 12, repsLabel: "10–15 reps", cue: "Keep elbows pinned to your sides, slow negative" },
      { id: "tue-5", name: "Chin Tucks & Wall Angels (Neck frame)", sets: 3, defaultReps: 10, repsLabel: "10 slow reps", cue: "Slide arms on wall while keeping back of head touching" },
    ],
  },
  Wed: {
    day: "Wednesday",
    title: "Legs & Core — Quads, Hamstrings, Calves & Abs",
    focus: "Strong lower-body base & athletic hormone response",
    targetReps: 165,
    muscleSplit: { QuadsGlutes: 55, Calves: 20, Core: 25 },
    exercises: [
      { id: "wed-1", name: "Bodyweight / Backpack Squats", sets: 4, defaultReps: 15, repsLabel: "15–20 reps", cue: "Heels flat on floor, chest proud, deep control" },
      { id: "wed-2", name: "Bulgarian Split Squats (Rear foot on bed)", sets: 3, defaultReps: 10, repsLabel: "8–12 / leg", cue: "Best home exercise for leg size and balance" },
      { id: "wed-3", name: "Glute Bridges (1s squeeze at top)", sets: 3, defaultReps: 15, repsLabel: "15 reps", cue: "Drive through heels, do not over-arch lower back" },
      { id: "wed-4", name: "Single-Leg Calf Raises (On stair/book)", sets: 3, defaultReps: 18, repsLabel: "15–20 reps", cue: "Full stretch at bottom, 1s pause at top" },
      { id: "wed-5", name: "Dead Bugs + Forearm Plank", sets: 3, defaultReps: 12, repsLabel: "10 reps + 40s", cue: "Press lower back flat into floor" },
    ],
  },
  Thu: {
    day: "Thursday",
    title: "Active Recovery — Mobility, Posture & Sunlight Walk",
    focus: "Joint recovery, thoracic decompression & fat oxidation",
    targetReps: 80,
    muscleSplit: { Mobility: 60, Posture: 40 },
    exercises: [
      { id: "thu-1", name: "Outdoor Brisk Walk (No phone scrolling)", sets: 1, defaultReps: 20, repsLabel: "20 mins", cue: "Shoulders back, nasal breathing, natural sunlight" },
      { id: "thu-2", name: "World's Greatest Stretch / Hip Openers", sets: 2, defaultReps: 10, repsLabel: "8–10 / side", cue: "Opens tight hips from sitting at a desk" },
      { id: "thu-3", name: "Cat-Cow & Thoracic Spine Rotations", sets: 2, defaultReps: 12, repsLabel: "12 slow reps", cue: "Unlock upper back stiffness" },
      { id: "thu-4", name: "Lying Deep-Neck-Flexor Holds", sets: 3, defaultReps: 10, repsLabel: "10 × 5s hold", cue: "Lift head 1 inch off floor with chin tucked" },
    ],
  },
  Fri: {
    day: "Friday",
    title: "Upper Body V-Taper — Width & Density Hypertrophy",
    focus: "Side delts, upper chest & lats for broader shoulder look",
    targetReps: 155,
    muscleSplit: { Shoulders: 40, Back: 35, ChestArms: 25 },
    exercises: [
      { id: "fri-1", name: "Pike Push-ups + Lateral Raise Superset", sets: 3, defaultReps: 12, repsLabel: "8 + 15 reps", cue: "Direct side-shoulder cap builder" },
      { id: "fri-2", name: "One-Arm Heavy Backpack Rows", sets: 4, defaultReps: 12, repsLabel: "12 / side", cue: "Support one hand on bed, pull bag high to hip" },
      { id: "fri-3", name: "Decline Push-ups (Feet elevated on bed)", sets: 3, defaultReps: 10, repsLabel: "8–12 reps", cue: "Targets upper chest & collarbone area" },
      { id: "fri-4", name: "Diamond / Close-Grip Push-ups", sets: 3, defaultReps: 10, repsLabel: "8–12 reps", cue: "Builds tricep thickness and inner chest" },
      { id: "fri-5", name: "Rear Delt Prone Y-T-W Raises", sets: 3, defaultReps: 12, repsLabel: "12 reps", cue: "Fixes rounded shoulders" },
    ],
  },
  Sat: {
    day: "Saturday",
    title: "Lower Body Tempo & Core Conditioning",
    focus: "Time-under-tension leg growth & defined midsection",
    targetReps: 160,
    muscleSplit: { Legs: 60, Core: 40 },
    exercises: [
      { id: "sat-1", name: "Tempo Squats (3 sec slow down, fast up)", sets: 4, defaultReps: 12, repsLabel: "12 reps", cue: "Zero momentum, make muscles work hard" },
      { id: "sat-2", name: "Reverse Lunges (Alternating legs)", sets: 3, defaultReps: 12, repsLabel: "12 / leg", cue: "Step back smoothly, keep front knee stable" },
      { id: "sat-3", name: "Single-Leg Glute Bridges", sets: 3, defaultReps: 10, repsLabel: "10 / leg", cue: "Fixes left-right hip imbalance" },
      { id: "sat-4", name: "Hollow Body Hold / Bicycle Crunches", sets: 3, defaultReps: 15, repsLabel: "15 reps / 30s", cue: "Keep lower back glued to mat" },
      { id: "sat-5", name: "Plank to Push-up / Mountain Climbers", sets: 3, defaultReps: 16, repsLabel: "16 reps", cue: "Clean core finisher" },
    ],
  },
  Sun: {
    day: "Sunday",
    title: "Full Rest, Stretching & Weekly Meal Prep",
    focus: "Muscle repair happens during rest and deep sleep",
    targetReps: 50,
    muscleSplit: { Recovery: 100 },
    exercises: [
      { id: "sun-1", name: "15-Min Evening Walk (With family/friend)", sets: 1, defaultReps: 15, repsLabel: "15 mins", cue: "Relaxed pace, zero performance pressure" },
      { id: "sun-2", name: "Full-Body 10-Min Floor Stretch", sets: 1, defaultReps: 15, repsLabel: "10 mins", cue: "Hamstrings, chest doorway stretch, neck release" },
      { id: "sun-3", name: "Prep Soya / Peanuts / Oats for Next Week", sets: 1, defaultReps: 20, repsLabel: "1 check", cue: "Make high-protein eating automatic" },
    ],
  },
};

const QUICK_PROTEIN_FOODS = [
  { id: "pf-soya", name: "50g Soya Chunks", protein: 25, kcal: 170 },
  { id: "pf-paneer", name: "100g Paneer", protein: 18, kcal: 265 },
  { id: "pf-eggs", name: "3 Boiled Eggs", protein: 18, kcal: 210 },
  { id: "pf-chicken", name: "120g Chicken Breast", protein: 35, kcal: 200 },
  { id: "pf-shake", name: "Gain Shake (Milk+Banana+PB+Oats)", protein: 18, kcal: 520 },
  { id: "pf-milk", name: "1 Glass Milk (250ml)", protein: 8, kcal: 160 },
  { id: "pf-dal", name: "1.5 Katori Thick Dal/Chana", protein: 12, kcal: 220 },
  { id: "pf-peanuts", name: "Handful Peanuts (30g)", protein: 7, kcal: 170 },
];

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
              <text x={padL - 8} y={y + 3} textAnchor="end" className="chart-axis-text">
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
            <text x={pt.x} y={h - 8} textAnchor="middle" className="chart-axis-text">
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

  const p = data.profile || {};
  const measures = data.measures || [];
  const bodyMetrics = useMemo(() => calcBodyMetrics(p, measures), [p, measures]);

  const activeDayPlan = DAILY_HOME_WORKOUTS[selectedDayKey] || DAILY_HOME_WORKOUTS.Mon;
  const todayDayObj = (data.days && data.days[today]) || {};
  const savedWorkoutLog = todayDayObj.homeWorkoutLog || {
    setsDone: {},
    repsByEx: {},
    completed: false,
  };

  const getExReps = (ex) =>
    savedWorkoutLog.repsByEx && savedWorkoutLog.repsByEx[ex.id] !== undefined
      ? savedWorkoutLog.repsByEx[ex.id]
      : ex.defaultReps;

  const isSetChecked = (exId, setIdx) =>
    Boolean(savedWorkoutLog.setsDone && savedWorkoutLog.setsDone[`${exId}-${setIdx}`]);

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
    recalcAndSaveTodayWorkout(nextSetsDone, nextRepsByEx, savedWorkoutLog.completed);
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
      savedWorkoutLog.completed
    );
  };

  const recalcAndSaveTodayWorkout = (setsDoneMap, repsMap, markCompleted = false) => {
    let totalSets = 0;
    let totalReps = 0;
    Object.values(DAILY_HOME_WORKOUTS).forEach((dayPlan) => {
      dayPlan.exercises.forEach((ex) => {
        const r = repsMap[ex.id] !== undefined ? repsMap[ex.id] : ex.defaultReps;
        for (let s = 1; s <= ex.sets; s += 1) {
          if (setsDoneMap[`${ex.id}-${s}`]) {
            totalSets += 1;
            totalReps += Number(r) || 0;
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
              workout: markCompleted || totalSets >= 3 || Boolean(prevDay.c?.workout),
            },
            homeWorkoutLog: {
              dayKey: selectedDayKey,
              setsDone: setsDoneMap,
              repsByEx: repsMap,
              totalSets,
              totalReps,
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
    activeDayPlan.exercises.forEach((ex) => {
      if (nextRepsByEx[ex.id] === undefined) nextRepsByEx[ex.id] = ex.defaultReps;
      for (let s = 1; s <= ex.sets; s += 1) {
        nextSetsDone[`${ex.id}-${s}`] = true;
      }
    });
    recalcAndSaveTodayWorkout(nextSetsDone, nextRepsByEx, true);
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
  const loggedProteinToday = todayDietLog.reduce((s, item) => s + safeNum(item.protein, 0), 0);
  const loggedKcalToday = todayDietLog.reduce((s, item) => s + safeNum(item.kcal, 0), 0);

  const addQuickFoodToday = (food) => {
    setData((old) => {
      const prevDay = (old.days && old.days[today]) || {};
      const nextList = [...(prevDay.dietItems || []), { ...food, uid: uid() }];
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
              protein: newProt >= bodyMetrics.proteinMin || Boolean(prevDay.c?.protein),
            },
          },
        },
      };
    });
    notify(`Added ${food.name} (+${food.protein}g protein)`);
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

  const categories = ["all", "face", "hair", "body", "sleep", "movement", "nutrition", "other"];
  const routines = (data.routines || []).filter(
    (r) => category === "all" || r.category === category
  );

  return (
    <>
      <Heading
        eyebrow="CARE & TRAINING SYSTEM"
        title="Body, daily home workouts & nutrition"
        description="7-day home workout split with live volume graph, TDEE & macro tracker, Indian diet plans, and care routines."
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
            Target Calories: <strong>{bodyMetrics.calMin}–{bodyMetrics.calMax} kcal</strong> ·
            Daily Protein: <strong>{bodyMetrics.proteinMin}–{bodyMetrics.proteinMax}g</strong> ·
            BMI: <strong>{bodyMetrics.bmi}</strong> ({bodyMetrics.bmiCategory})
          </p>
        </div>
        <div className="lifestyle-orbit">
          <span>V-TAPER</span>
          <i>✳</i>
          <b>{bodyMetrics.swRatio ? `RATIO ${bodyMetrics.swRatio}` : "BODY · MIND"}</b>
        </div>
      </div>

      <div className="tabs large-tabs">
        {[
          ["workouts", "Daily Home Workouts & Graph"],
          ["calc", "Body & TDEE Analytics"],
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
              detail={`${safeNum(savedWorkoutLog.totalReps, 0)} reps logged today`}
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
                    Green bars show total daily reps; copper line tracks your progressive overload curve.
                  </p>
                </div>
                <span className="status-pill complete">
                  Today: {safeNum(savedWorkoutLog.totalReps, 0)} reps
                </span>
              </div>
              <ModernWorkoutBarLineChart data={workoutGraphSeries} height={210} />
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
                {Object.entries(activeDayPlan.muscleSplit).map(([muscle, pct]) => (
                  <div key={muscle} className="muscle-bar-row">
                    <div className="row-between">
                      <strong>{muscle}</strong>
                      <span>{pct}% focus</span>
                    </div>
                    <Progress value={pct} />
                  </div>
                ))}
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
                className={data.settings?.activePlan !== "gym" ? "selected" : ""}
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
                className={data.settings?.activePlan === "gym" ? "selected" : ""}
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
                    <div className="eyebrow">GHAR PAR ROZ KYA KAREIN (7-DAY HOME SCHEDULE)</div>
                    <h2>{activeDayPlan.title}</h2>
                    <p>
                      Tap each set button (S1, S2, S3) as you finish it at home — your workout graph
                      updates live!
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
                        className={`weekday-pill ${selectedDayKey === dKey ? "active" : ""
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
                    const completedSetsCount = Array.from(
                      { length: ex.sets },
                      (_, sIdx) => isSetChecked(ex.id, sIdx + 1)
                    ).filter(Boolean).length;
                    const allDone = completedSetsCount === ex.sets;

                    return (
                      <div
                        key={ex.id}
                        className={`home-exercise-card ${allDone ? "ex-complete" : ""}`}
                      >
                        <div className="home-ex-main">
                          <span className="status-pill complete">0{idx + 1}</span>
                          <div className="habit-info">
                            <strong>{ex.name}</strong>
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
                                  className={`set-check-btn ${done ? "done" : ""}`}
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
                              onChange={(e) => updateExerciseReps(ex, e.target.value)}
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
                  <p>Stop 2 reps before failure. Focus on clean form and posture.</p>
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
                  <p>Once basic sets feel easy, switch to these harder variations.</p>
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
                {Object.entries(GYM_WORKOUT_PLAN.sessions).map(([sessKey, list]) => (
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
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* =====================================================================
          TAB 2: BODY & TDEE ANALYTICS (MULTI-METRIC GRAPH SWITCHER)
          ===================================================================== */}
      {tab === "calc" && (
        <div className="stack-col">
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
                      updateProfile({ heightCm: safeNum(e.target.value, 172) })
                    }
                  />
                </Field>
                <Field label="Weight (kg)">
                  <input
                    type="number"
                    value={p.weightKg}
                    onChange={(e) =>
                      updateProfile({ weightKg: safeNum(e.target.value, 56) })
                    }
                  />
                </Field>
                <Field label="Age">
                  <input
                    type="number"
                    value={p.age}
                    onChange={(e) => updateProfile({ age: safeNum(e.target.value, 22) })}
                  />
                </Field>
                <Field label="Activity Level">
                  <select
                    value={p.activity}
                    onChange={(e) => updateProfile({ activity: e.target.value })}
                  >
                    <option value="1.2">Sedentary</option>
                    <option value="1.375">Lightly active (1–3 days/wk)</option>
                    <option value="1.55">Moderately active (3–5 days/wk)</option>
                    <option value="1.725">Very active (6–7 days/wk)</option>
                  </select>
                </Field>
              </div>
              <div className="mini-stat-row" style={{ marginTop: 18, marginBottom: 0 }}>
                <div>
                  <span className="mini-stat-number">{bodyMetrics.bmr} kcal</span>
                  <span>Basal BMR</span>
                </div>
                <div>
                  <span className="mini-stat-number">{bodyMetrics.tdee} kcal</span>
                  <span>Maintenance TDEE</span>
                </div>
                <div>
                  <span className="mini-stat-number">
                    {bodyMetrics.calMin}–{bodyMetrics.calMax}
                  </span>
                  <span>Target Gain kcal</span>
                </div>
              </div>
            </Card>

            <Card>
              <div className="eyebrow">MONTHLY TAPE MEASUREMENTS</div>
              <h2>Log weight, arms, chest &amp; V-taper (cm)</h2>
              <div className="form-grid three-col-grid" style={{ marginTop: 14 }}>
                <Field label="Weight (kg)">
                  <input
                    type="number"
                    value={newMeas.weight}
                    onChange={(e) =>
                      setNewMeas({ ...newMeas, weight: safeNum(e.target.value, 56) })
                    }
                  />
                </Field>
                <Field label="Shoulders (cm)">
                  <input
                    type="number"
                    value={newMeas.shoulder}
                    onChange={(e) =>
                      setNewMeas({ ...newMeas, shoulder: safeNum(e.target.value, 105) })
                    }
                  />
                </Field>
                <Field label="Waist (cm)">
                  <input
                    type="number"
                    value={newMeas.waist}
                    onChange={(e) =>
                      setNewMeas({ ...newMeas, waist: safeNum(e.target.value, 74) })
                    }
                  />
                </Field>
                <Field label="Chest (cm)">
                  <input
                    type="number"
                    value={newMeas.chest}
                    onChange={(e) =>
                      setNewMeas({ ...newMeas, chest: safeNum(e.target.value, 87) })
                    }
                  />
                </Field>
                <Field label="Arm / Bicep (cm)">
                  <input
                    type="number"
                    value={newMeas.arm}
                    onChange={(e) =>
                      setNewMeas({ ...newMeas, arm: safeNum(e.target.value, 27.5) })
                    }
                  />
                </Field>
                <Field label="Neck (cm)">
                  <input
                    type="number"
                    value={newMeas.neck}
                    onChange={(e) =>
                      setNewMeas({ ...newMeas, neck: safeNum(e.target.value, 35.5) })
                    }
                  />
                </Field>
              </div>
              <div style={{ marginTop: 14 }}>
                <Button kind="primary" onClick={handleSaveMeasurement}>
                  Save measurement entry
                </Button>
              </div>
            </Card>
          </div>

          <Card>
            <div className="section-head">
              <div>
                <div className="eyebrow">INTERACTIVE BODY TRANSFORMATION GRAPH</div>
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
                  : Math.max(...selectedMeasureSeries.map((d) => d.value), 60) * 1.1
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
                  Today&apos;s Protein: {loggedProteinToday}g / {bodyMetrics.proteinMin}–
                  {bodyMetrics.proteinMax}g
                </h2>
                <p>
                  Tap any Indian food below as you eat it today — reaching {bodyMetrics.proteinMin}g
                  automatically checks off your daily protein habit (+8 pts).
                </p>
              </div>
              {todayDietLog.length > 0 && (
                <Button onClick={clearTodayDiet}>Reset Today&apos;s Food</Button>
              )}
            </div>

            <div className="macro-progress-grid">
              <div>
                <div className="row-between" style={{ marginBottom: 6 }}>
                  <strong>Protein Progress ({loggedProteinToday}g)</strong>
                  <span>Target: {bodyMetrics.proteinMin}g+</span>
                </div>
                <Progress value={percent(loggedProteinToday, bodyMetrics.proteinMin)} />
              </div>
              <div>
                <div className="row-between" style={{ marginBottom: 6 }}>
                  <strong>Logged Calories ({loggedKcalToday} kcal)</strong>
                  <span>Target: {bodyMetrics.calMin} kcal</span>
                </div>
                <Progress value={percent(loggedKcalToday, bodyMetrics.calMin)} />
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
        </div>
      )}

      {/* =====================================================================
          TAB 4: FRAME & BONE TRUTH
          ===================================================================== */}
      {tab === "frame" && (
        <div className="stack-col">
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
            <div className="eyebrow">PEAK BONE MASS &amp; CALCIUM</div>
            <h2>Dietary calcium sources (~1000 mg/day target)</h2>
            <div className="table-wrap" style={{ marginTop: 12 }}>
              <table className="clean-table">
                <thead>
                  <tr>
                    <th>Home Food Source</th>
                    <th>Approx. Calcium</th>
                  </tr>
                </thead>
                <tbody>
                  {CALCIUM_TABLE.map((c, i) => (
                    <tr key={i}>
                      <td>{c.food}</td>
                      <td>
                        <strong>{c.calcium}</strong>
                      </td>
                    </tr>
                  ))}
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
                  <Button onClick={() => onEdit({ ...r, kind: "routine" })}>Edit</Button>
                  <Button onClick={() => onDelete("routines", r.id)}>Delete</Button>
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
                    value={percent(Number(m.logs?.[0]?.value || 0), Number(m.target))}
                  />
                  <small className="muted-text">
                    Target · {m.target} {m.unit}
                  </small>
                </>
              )}
              <div className="record-actions">
                <Button kind="primary" onClick={() => onLog({ ...m, kind: "metric" })}>
                  Add measurement
                </Button>
                <Button onClick={() => onEdit({ ...m, kind: "metric" })}>Edit</Button>
                <Button onClick={() => onDelete("metrics", m.id)}>Delete</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

/* ============================================================================
   12. LOOKS, FACE POSTURE, SKIN, HAIR & WARDROBE PAGE
   ============================================================================ */

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

/* ============================================================================
   13. RESET & URGE SOS PAGE (MERGED APP 1 RESET + APP 2 URGE INSIGHTS & ENV)
   ============================================================================ */

function ResetAndSOSPage({
  data,
  setData,
  today,
  dm,
  updateDay,
  onAdd,
  onEdit,
  onDelete,
  onOpenSOS,
  notify,
}) {
  const logs = data.resetLogs || [];
  const urges = data.urges || [];
  const passed =
    logs.filter((l) => l.outcome === "urge_passed").length +
    urges.filter((u) => !u.slip).length;
  const alternative = logs.filter((l) => l.outcome === "alternative_chosen").length;

  const triggers = useMemo(() => {
    const counts = {};
    logs.forEach((l) => {
      const k = l.trigger?.trim();
      if (k) counts[k] = (counts[k] || 0) + 1;
    });
    urges.forEach((u) => {
      const k = u.trigger?.trim();
      if (k) counts[k] = (counts[k] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [logs, urges]);

  return (
    <>
      <Heading
        eyebrow="NOTICE · PAUSE · CHOOSE"
        title={dm("Reset & Urge SOS")}
        description="A discreet, shame-free space to ride out urges, set up digital blockers, and understand your triggers."
        action={
          <div className="heading-btn-group">
            <Button onClick={onAdd}>＋ Manual check-in</Button>
            <Button kind="primary" onClick={onOpenSOS}>
              🛡 Launch 10-Min Urge SOS
            </Button>
          </div>
        }
      />

      <div className="reset-banner">
        <div className="reset-symbol">↻</div>
        <div>
          <span className="eyebrow">NO SHAME. JUST INFORMATION.</span>
          <h2>
            An urge is a moment, <em>not your identity.</em>
          </h2>
          <p>
            Notice what happened. Learn from it. Choose the next useful step. Progress is never
            erased by one difficult moment.
          </p>
        </div>
      </div>

      <div className="stats-grid reset-stats">
        <Stat
          icon="↻"
          label="Total check-ins"
          value={logs.length + urges.length}
          detail="Your private record"
          color="sage"
        />
        <Stat
          icon="✓"
          label="Urges rode out"
          value={passed}
          detail="Waves you surfed"
          color="blue"
        />
        <Stat
          icon="↗"
          label="Alternative chosen"
          value={alternative}
          detail="Redirected energy"
          color="peach"
        />
        <Stat
          icon="🛡"
          label="Blockers active"
          value={`${Object.values(data.env || {}).filter(Boolean).length}/${ENV_CHECKLIST.length}`}
          detail="Environment shields"
          color="lavender"
        />
      </div>

      <div className="dashboard-grid">
        <Card>
          <div className="section-head">
            <div>
              <div className="eyebrow">YOUR PATTERNS</div>
              <h2>Most noted triggers</h2>
              <p>Patterns from your own saved SOS and reset check-ins.</p>
            </div>
          </div>
          {triggers.length ? (
            triggers.map(([label, count]) => (
              <div className="trigger-row" key={label}>
                <span>{dm(label)}</span>
                <div className="trigger-track">
                  <span style={{ width: `${percent(count, triggers[0][1])}%` }} />
                </div>
                <b>{count}</b>
              </div>
            ))
          ) : (
            <Empty
              icon="⌁"
              title="Patterns take time"
              description="Use the Urge SOS button or add a check-in to spot your peak triggers."
            />
          )}
        </Card>

        <Card>
          <div className="eyebrow">ENVIRONMENT & FRICTION SHIELDS</div>
          <h2 className="reset-reminder-title">Digital blocker checklist</h2>
          <div className="habit-list">
            {ENV_CHECKLIST.slice(0, 6).map((item) => {
              const checked = Boolean(data.env && data.env[item.id]);
              return (
                <div
                  className={`habit-row ${checked ? "checked" : ""}`}
                  key={item.id}
                >
                  <button
                    type="button"
                    className="check-circle"
                    onClick={() =>
                      setData((old) => ({
                        ...old,
                        env: { ...(old.env || {}), [item.id]: !checked },
                      }))
                    }
                  >
                    {checked ? "✓" : ""}
                  </button>
                  <div className="habit-info">
                    <strong>{item.title}</strong>
                    <small>{item.sub}</small>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Card className="history-card">
        <div className="section-head">
          <div>
            <div className="eyebrow">YOUR PRIVATE HISTORY</div>
            <h2>Saved reset & SOS check-ins</h2>
          </div>
        </div>
        {logs.length === 0 && urges.length === 0 ? (
          <Empty
            icon="↻"
            title="Your story starts when you're ready"
            description="Record an urge, a trigger, and what you chose to do next."
            action={
              <Button kind="primary" onClick={onAdd}>
                ＋ Record a check-in
              </Button>
            }
          />
        ) : (
          <>
            {urges.map((u) => (
              <div className="reset-log" key={u.id}>
                <div className="reset-log-date">
                  <strong>{fmtDate(todayISO(new Date(u.ts || Date.now())))}</strong>
                  <small>
                    Intensity {u.before}/10 → {u.after}/10
                  </small>
                </div>
                <div className="reset-log-content">
                  <strong>{dm(u.slip ? "Slip / Reset Logged" : "Urge Surfed via SOS")}</strong>
                  <p>
                    Trigger: {dm(u.trigger)} · Location: {u.location}
                  </p>
                  <span className={`status-pill ${!u.slip ? "complete" : ""}`}>
                    {!u.slip ? "Urge passed" : "Reset logged"}
                  </span>
                </div>
              </div>
            ))}
            {logs.map((l) => (
              <div className="reset-log" key={l.id}>
                <div className="reset-log-date">
                  <strong>{fmtDate(l.date)}</strong>
                  <small>Intensity {l.intensity}/10</small>
                </div>
                <div className="reset-log-content">
                  <strong>{dm(l.behavior)}</strong>
                  <p>
                    {l.trigger ? `Trigger: ${l.trigger}` : "No trigger note"}
                    {l.response ? ` · Response: ${l.response}` : ""}
                  </p>
                  <span
                    className={`status-pill ${l.outcome === "urge_passed" ? "complete" : ""
                      }`}
                  >
                    {l.outcome === "urge_passed"
                      ? "Urge passed"
                      : l.outcome === "alternative_chosen"
                        ? "Alternative chosen"
                        : "Behavior occurred"}
                  </span>
                </div>
                <div className="row-actions">
                  <button type="button" onClick={() => onEdit(l)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="danger-text"
                    onClick={() => onDelete(l.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </Card>
    </>
  );
}

/* ============================================================================
   14. GOALS, 90-DAY ROADMAP & SUNDAY WEEKLY REVIEW PAGE
   ============================================================================ */

function GoalsAndRoadmapPage({
  data,
  setData,
  onAdd,
  onEdit,
  onMilestone,
  onMeasure,
  onDelete,
  notify,
}) {
  const [subTab, setSubTab] = useState("goals"); // goals | roadmap | review
  const [rev, setRev] = useState({ q1: "", q2: "", q3: "" });

  const goals = (data.goals || []).filter((g) => !g.archived);
  const weeklyReviews = data.weeklyReviews || [];

  const handleSaveReview = () => {
    if (!rev.q1.trim() && !rev.q3.trim()) return;
    const entry = {
      week: weeklyReviews.length + 1,
      date: todayISO(),
      ...rev,
    };
    setData((old) => ({
      ...old,
      weeklyReviews: [entry, ...(old.weeklyReviews || [])],
    }));
    setRev({ q1: "", q2: "", q3: "" });
    notify("Weekly review saved");
  };

  return (
    <>
      <Heading
        eyebrow="DIRECTION, NOT PRESSURE"
        title="Goals & 90-day roadmap"
        description="Turn what matters to you into milestones, phased 90-day checkpoints, and weekly reviews."
        action={
          <Button kind="primary" onClick={onAdd}>
            ＋ Create goal
          </Button>
        }
      />

      <div className="tabs large-tabs">
        <button
          type="button"
          className={subTab === "goals" ? "selected" : ""}
          onClick={() => setSubTab("goals")}
        >
          Personal Goals & Milestones <span>{goals.length}</span>
        </button>
        <button
          type="button"
          className={subTab === "roadmap" ? "selected" : ""}
          onClick={() => setSubTab("roadmap")}
        >
          90-Day Phased Roadmap <span>3 Phases</span>
        </button>
        <button
          type="button"
          className={subTab === "review" ? "selected" : ""}
          onClick={() => setSubTab("review")}
        >
          Sunday Weekly Review <span>{weeklyReviews.length}</span>
        </button>
      </div>

      {subTab === "goals" && (
        <>
          <div className="goals-summary">
            <div>
              <span>{goals.length}</span>
              <small>Active goals</small>
            </div>
            <div>
              <span>
                {(data.milestones || []).filter((m) => m.done).length}/
                {(data.milestones || []).length}
              </span>
              <small>Milestones complete</small>
            </div>
            <div>
              <span>{(data.measurements || []).length}</span>
              <small>Progress entries</small>
            </div>
          </div>

          <div className="record-grid goal-grid">
            {goals.map((g) => {
              const ms = (data.milestones || []).filter((m) => m.goalId === g.id);
              const latest = (data.measurements || [])
                .filter((m) => m.goalId === g.id)
                .sort((a, b) => (b.date || "").localeCompare(a.date || ""))[0];
              const pct = g.target
                ? percent(Number(latest?.value || g.progress || 0), Number(g.target))
                : g.progress || 0;
              return (
                <Card className="goal-card" key={g.id}>
                  <div className="goal-card-head">
                    <span className="record-symbol sage">⚑</span>
                    <button
                      type="button"
                      className="dots-button"
                      onClick={() => onEdit(g)}
                    >
                      •••
                    </button>
                  </div>
                  <span className="eyebrow">
                    IN PROGRESS{g.due ? ` · DUE ${fmtDate(g.due).toUpperCase()}` : ""}
                  </span>
                  <h3>{g.title}</h3>
                  <p>{g.why || "Keep taking the next useful step."}</p>
                  {g.target && (
                    <div className="goal-progress-detail">
                      <div>
                        <span>Current progress</span>
                        <strong>
                          {latest
                            ? `${latest.value} / ${g.target} ${g.unit || ""}`
                            : `0 / ${g.target} ${g.unit || ""}`}
                        </strong>
                      </div>
                      <Progress value={pct} />
                    </div>
                  )}
                  <div className="milestone-head">
                    <strong>Milestones</strong>
                    <span>
                      {ms.filter((m) => m.done).length}/{ms.length}
                    </span>
                  </div>
                  {ms.length ? (
                    ms.map((m) => (
                      <label className="milestone-row" key={m.id}>
                        <input
                          type="checkbox"
                          checked={!!m.done}
                          onChange={() => onDelete("milestones", m.id, "toggle")}
                        />
                        <span className={m.done ? "struck" : ""}>{m.title}</span>
                        {m.due && <small>{fmtDate(m.due)}</small>}
                      </label>
                    ))
                  ) : (
                    <p className="muted-text milestone-empty">
                      Add meaningful steps to break this goal down.
                    </p>
                  )}
                  <div className="record-actions">
                    <Button kind="primary" onClick={() => onMilestone(g)}>
                      ＋ Milestone
                    </Button>
                    <Button onClick={() => onMeasure(g)}>Log progress</Button>
                    <Button onClick={() => onEdit(g)}>Edit</Button>
                    <Button onClick={() => onDelete("goals", g.id)}>Archive</Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {subTab === "roadmap" && (
        <div className="stack-col">
          {ROADMAP_PHASES.map((ph) => (
            <Card key={ph.id}>
              <div className="eyebrow">{ph.days.toUpperCase()}</div>
              <h2>{ph.title}</h2>
              <p style={{ marginBottom: 12 }}>{ph.focus}</p>
              <div className="habit-list">
                {ph.tasks.map((t, i) => (
                  <div className="habit-row" key={i}>
                    <span className="status-pill complete">0{i + 1}</span>
                    <div className="habit-info">
                      <strong>{t}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {subTab === "review" && (
        <div className="dashboard-grid">
          <Card>
            <div className="eyebrow">SUNDAY ACCOUNTABILITY</div>
            <h2>Write this week&apos;s review</h2>
            <div className="stack-col" style={{ marginTop: 14 }}>
              <Field label="1. Biggest win or lesson from this week">
                <input
                  type="text"
                  value={rev.q1}
                  placeholder="e.g. Completed all 3 workouts and woke up at 7am"
                  onChange={(e) => setRev({ ...rev, q1: e.target.value })}
                />
              </Field>
              <Field label="2. Where did you struggle, and what triggered it?">
                <input
                  type="text"
                  value={rev.q2}
                  placeholder="e.g. Late night boredom on Thursday"
                  onChange={(e) => setRev({ ...rev, q2: e.target.value })}
                />
              </Field>
              <Field label="3. ONE priority action for next week">
                <input
                  type="text"
                  value={rev.q3}
                  placeholder="e.g. Charge phone in the living room every single night"
                  onChange={(e) => setRev({ ...rev, q3: e.target.value })}
                />
              </Field>
              <Button kind="primary" onClick={handleSaveReview}>
                Save weekly review
              </Button>
            </div>
          </Card>

          <Card>
            <div className="eyebrow">PAST REVIEWS</div>
            <h2>Weekly history</h2>
            {weeklyReviews.length === 0 ? (
              <Empty
                icon="▤"
                title="No weekly reviews yet"
                description="Spend 3 minutes every Sunday reviewing your week."
              />
            ) : (
              <div className="stack-col" style={{ marginTop: 12 }}>
                {weeklyReviews.map((w, i) => (
                  <div key={i} className="routine-step-box">
                    <strong>
                      Week {w.week} · {fmtDate(w.date)}
                    </strong>
                    <p>
                      <strong>Win:</strong> {w.q1}
                    </p>
                    <p>
                      <strong>Trigger:</strong> {w.q2}
                    </p>
                    <p>
                      <strong>Next Focus:</strong> {w.q3}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </>
  );
}

/* ============================================================================
   15. REFLECTION, MOOD CHARTS, CBT, SOCIAL LADDER & PHQ-9/GAD-7 PAGE
   ============================================================================ */

function ReflectionAndMindPage({
  data,
  setData,
  today,
  onJournal,
  onEditJournal,
  onDelete,
  onMood,
  notify,
}) {
  const [subTab, setSubTab] = useState("insights"); // insights | ladder | cbt | screening
  const [range, setRange] = useState(14);
  const [thoughtInput, setThoughtInput] = useState({
    situation: "",
    thought: "",
    intensity: 7,
    balanced: "",
  });
  const [activeScreen, setActiveScreen] = useState("phq9");
  const [phqAnswers, setPhqAnswers] = useState(Array(9).fill(0));
  const [gadAnswers, setGadAnswers] = useState(Array(7).fill(0));

  const moods = [...(data.moods || [])].sort((a, b) => a.date.localeCompare(b.date));
  const recent = moods.filter(
    (m) => dayDiff(m.date, today) >= 0 && dayDiff(m.date, today) < range
  );
  const average = recent.length
    ? (recent.reduce((s, m) => s + Number(m.score), 0) / recent.length).toFixed(1)
    : "—";

  const moodChartData = useMemo(() => {
    return Array.from({ length: range }, (_, i) => {
      const iso = addDaysISO(today, -(range - 1 - i));
      const m = moods.find((x) => x.date === iso);
      const dObj = data.days && data.days[iso];
      return {
        key: iso,
        label: new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, {
          weekday: "narrow",
        }),
        fullLabel: fmtDate(iso),
        value: m ? Number(m.score) : dObj?.mood || 0,
      };
    });
  }, [range, today, moods, data.days]);

  const ladder = data.ladder || {};
  const handleLadderToggle = (stepId, done) => {
    setData((old) => ({
      ...old,
      ladder: {
        ...(old.ladder || {}),
        [stepId]: { ...((old.ladder || {})[stepId] || {}), done },
      },
    }));
  };

  const handleSaveThought = () => {
    if (!thoughtInput.thought.trim()) return;
    const entry = { id: uid(), date: today, ...thoughtInput };
    setData((old) => ({ ...old, thoughts: [entry, ...(old.thoughts || [])] }));
    setThoughtInput({ situation: "", thought: "", intensity: 7, balanced: "" });
    notify("CBT thought record saved");
  };

  const handleSaveScreening = () => {
    const isPhq = activeScreen === "phq9";
    const arr = isPhq ? phqAnswers : gadAnswers;
    const total = arr.reduce((a, b) => a + b, 0);
    const band =
      total >= 15 ? "Severe" : total >= 10 ? "Moderate" : total >= 5 ? "Mild" : "Minimal";
    const entry = {
      id: uid(),
      date: today,
      type: isPhq ? "PHQ-9" : "GAD-7",
      total,
      band,
    };
    setData((old) => ({
      ...old,
      mentalCheckins: [entry, ...(old.mentalCheckins || [])],
    }));
    notify(`${entry.type} saved (${total} - ${band})`);
  };

  return (
    <>
      <Heading
        eyebrow="LOOK BACK WITH KINDNESS"
        title="Reflection, mood & social confidence"
        description="Mood analytics, private journal, 10-step social exposure ladder, and CBT thought tools."
        action={
          <div className="heading-btn-group">
            <Button onClick={onMood}>♡ Mood check-in</Button>
            <Button kind="primary" onClick={onJournal}>
              ＋ Write reflection
            </Button>
          </div>
        }
      />

      <div className="tabs large-tabs">
        {[
          ["insights", "Mood Charts & Journal"],
          ["ladder", "Social Confidence Ladder (10 Steps)"],
          ["cbt", "CBT Thought Record"],
          ["screening", "PHQ-9 & GAD-7 Check"],
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

      {subTab === "insights" && (
        <>
          <div className="insight-grid">
            <Card className="mood-chart-card">
              <div className="section-head">
                <div>
                  <div className="eyebrow">EMOTIONAL WEATHER</div>
                  <h2>Mood over time (Modern spline chart)</h2>
                </div>
                <select
                  className="compact-select"
                  value={range}
                  onChange={(e) => setRange(Number(e.target.value))}
                >
                  <option value="7">7 days</option>
                  <option value="14">14 days</option>
                  <option value="30">30 days</option>
                </select>
              </div>
              <div className="mood-average">
                <strong>
                  {average}
                  <small>/5</small>
                </strong>
                <span>Average mood across {range} days</span>
              </div>
              <ModernAreaChart
                data={moodChartData}
                maxVal={5}
                unit="/5"
                color="#766694"
                height={180}
              />
            </Card>

            <Card className="completion-card">
              <div className="eyebrow">SHOWING UP</div>
              <h2>Habit completion rate</h2>
              <p>Completed check-ins across your saved history.</p>
              <div className="big-number">
                {percent(
                  (data.checkins || []).filter((c) => c.done).length,
                  (data.checkins || []).length
                )}
                <small>%</small>
              </div>
              <Progress
                value={percent(
                  (data.checkins || []).filter((c) => c.done).length,
                  (data.checkins || []).length
                )}
              />
              <div className="completion-stats">
                <div>
                  <strong>{(data.checkins || []).filter((c) => c.done).length}</strong>
                  <span>Completed</span>
                </div>
                <div>
                  <strong>{(data.journals || []).length}</strong>
                  <span>Journal entries</span>
                </div>
              </div>
            </Card>
          </div>

          <Card className="journal-card">
            <div className="section-head">
              <div>
                <div className="eyebrow">YOUR WORDS, YOUR SPACE</div>
                <h2>Journal history</h2>
              </div>
              <Button onClick={onJournal}>＋ New entry</Button>
            </div>
            {(data.journals || []).length ? (
              [...data.journals]
                .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
                .map((j) => (
                  <article className="journal-entry" key={j.id}>
                    <div className="journal-date">{fmtDate(j.date)}</div>
                    <div className="journal-entry-body">
                      <h3>{j.title}</h3>
                      <p>{j.content}</p>
                      {j.gratitude && (
                        <div className="gratitude">
                          <span>♡</span> {j.gratitude}
                        </div>
                      )}
                    </div>
                    <div className="row-actions">
                      <button type="button" onClick={() => onEditJournal(j)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="danger-text"
                        onClick={() => onDelete("journals", j.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))
            ) : (
              <Empty
                icon="▤"
                title="Your story, in your own words"
                description="Start with a few lines about what felt important today."
                action={
                  <Button kind="primary" onClick={onJournal}>
                    ＋ Write your first reflection
                  </Button>
                }
              />
            )}
          </Card>
        </>
      )}

      {subTab === "ladder" && (
        <Card>
          <div className="eyebrow">GRADUAL SOCIAL EXPOSURE</div>
          <h2>10-Step social confidence ladder</h2>
          <p>Repetition beats social anxiety. Practice one small step at a time.</p>
          <div className="habit-list" style={{ marginTop: 14 }}>
            {EXPOSURE_LADDER.map((item) => {
              const done = Boolean(ladder[item.id]?.done);
              return (
                <div className={`habit-row ${done ? "checked" : ""}`} key={item.id}>
                  <button
                    type="button"
                    className="check-circle"
                    onClick={() => handleLadderToggle(item.id, !done)}
                  >
                    {done ? "✓" : ""}
                  </button>
                  <div className="habit-info">
                    <strong>
                      Step {item.step}: {item.title}
                    </strong>
                    <small>{item.desc}</small>
                  </div>
                  <span className={`status-pill ${done ? "complete" : ""}`}>
                    {done ? "Completed" : "Practice"}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {subTab === "cbt" && (
        <div className="dashboard-grid">
          <Card>
            <div className="eyebrow">COGNITIVE RESTRUCTURING</div>
            <h2>Reframe automatic negative thoughts</h2>
            <div className="stack-col" style={{ marginTop: 14 }}>
              <Field label="Situation (What happened?)">
                <input
                  type="text"
                  value={thoughtInput.situation}
                  placeholder="e.g. Walked into the gym"
                  onChange={(e) =>
                    setThoughtInput({ ...thoughtInput, situation: e.target.value })
                  }
                />
              </Field>
              <Field label="Automatic negative thought">
                <input
                  type="text"
                  value={thoughtInput.thought}
                  placeholder="e.g. Everyone is judging how skinny I am"
                  onChange={(e) =>
                    setThoughtInput({ ...thoughtInput, thought: e.target.value })
                  }
                />
              </Field>
              <Field label="Balanced, realistic truth">
                <input
                  type="text"
                  value={thoughtInput.balanced}
                  placeholder="e.g. Everyone is focused on their own workout; showing up builds my frame"
                  onChange={(e) =>
                    setThoughtInput({ ...thoughtInput, balanced: e.target.value })
                  }
                />
              </Field>
              <Button kind="primary" onClick={handleSaveThought}>
                Save thought record
              </Button>
            </div>
          </Card>

          <Card>
            <div className="eyebrow">SAVED THOUGHT RECORDS</div>
            <h2>Your balanced truths</h2>
            {(data.thoughts || []).length === 0 ? (
              <Empty
                icon="▤"
                title="No thought records yet"
                description="Write down anxious thoughts to separate facts from fear."
              />
            ) : (
              <div className="stack-col" style={{ marginTop: 12 }}>
                {(data.thoughts || []).map((t) => (
                  <div key={t.id} className="routine-step-box">
                    <small className="eyebrow">{fmtDate(t.date)}</small>
                    <p>
                      <strong>Thought:</strong> {t.thought}
                    </p>
                    <p>
                      <strong>Balanced Truth:</strong> {t.balanced}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {subTab === "screening" && (
        <Card>
          <div className="section-head">
            <div>
              <div className="eyebrow">BIWEEKLY SELF-CHECK (NOT A MEDICAL DIAGNOSIS)</div>
              <h2>{activeScreen === "phq9" ? "PHQ-9 Mood Check" : "GAD-7 Anxiety Check"}</h2>
            </div>
            <div className="tabs">
              <button
                type="button"
                className={activeScreen === "phq9" ? "selected" : ""}
                onClick={() => setActiveScreen("phq9")}
              >
                PHQ-9
              </button>
              <button
                type="button"
                className={activeScreen === "gad7" ? "selected" : ""}
                onClick={() => setActiveScreen("gad7")}
              >
                GAD-7
              </button>
            </div>
          </div>
          <div className="stack-col">
            {(activeScreen === "phq9" ? PHQ9_QUESTIONS : GAD7_QUESTIONS).map((q, idx) => {
              const arr = activeScreen === "phq9" ? phqAnswers : gadAnswers;
              return (
                <div key={idx} className="audit-q-box">
                  <strong>{q}</strong>
                  <div className="category-pills" style={{ marginTop: 8 }}>
                    {[
                      [0, "Not at all (0)"],
                      [1, "Several days (1)"],
                      [2, "More than half (2)"],
                      [3, "Nearly every day (3)"],
                    ].map(([val, lbl]) => (
                      <button
                        type="button"
                        key={val}
                        className={arr[idx] === val ? "selected" : ""}
                        onClick={() => {
                          const next = [...arr];
                          next[idx] = val;
                          if (activeScreen === "phq9") setPhqAnswers(next);
                          else setGadAnswers(next);
                        }}
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            <Button kind="primary" onClick={handleSaveScreening}>
              Save check-in score
            </Button>
          </div>
        </Card>
      )}
    </>
  );
}

/* ============================================================================
   16. MORE TOOLS: SLEEP & POMODORO, CONTROL PANEL, HEALTH TESTS & HELP
   ============================================================================ */

function MoreAndSettingsPage({
  data,
  setData,
  updateProfile,
  exportData,
  importData,
  resetAll,
  notify,
}) {
  const [subTab, setSubTab] = useState("sleep"); // sleep | control | health | help
  const [taskName, setTaskName] = useState("Apna Kaam (25m Deep Focus)");

  const p = data.profile || {};
  const activeLoops = data.settings?.activeLoops || [];

  const toggleLoop = (loopId) => {
    setData((old) => {
      const cur = old.settings?.activeLoops || [];
      const next = cur.includes(loopId)
        ? cur.filter((x) => x !== loopId)
        : [...cur, loopId];
      return { ...old, settings: { ...(old.settings || {}), activeLoops: next } };
    });
  };

  return (
    <>
      <Heading
        eyebrow="SYSTEM TOOLKIT & HEALTH"
        title="Sleep, Pomodoro, health & settings"
        description="Circadian sleep anchors, 25-minute focus timer, blood test guide, and crisis support."
      />

      <div className="tabs large-tabs">
        {[
          ["sleep", "Sleep & 25m Pomodoro"],
          ["control", "Dopamine Control Panel"],
          ["health", "Blood Tests & Supplements"],
          ["help", "Helplines & Support"],
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

      {subTab === "sleep" && (
        <div className="dashboard-grid">
          <Card>
            <div className="eyebrow">DEEP WORK POMODORO</div>
            <h2>25-Minute distraction-free focus</h2>
            <Field label="Current Focus Task">
              <input
                type="text"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
              />
            </Field>
            <div style={{ marginTop: 14 }}>
              <CountdownTimer
                defaultSeconds={1500}
                label={taskName}
                onComplete={() => {
                  setData((old) => ({
                    ...old,
                    focusSessions: [
                      { id: uid(), date: todayISO(), task: taskName, mins: 25 },
                      ...(old.focusSessions || []),
                    ],
                  }));
                  notify("25-min Pomodoro completed & logged!");
                }}
              />
            </div>
          </Card>

          <Card>
            <div className="eyebrow">CIRCADIAN SLEEP ANCHORS</div>
            <h2>Sleep window planner</h2>
            <div className="form-grid" style={{ marginTop: 12 }}>
              <Field label="Fixed Wake Time">
                <input
                  type="time"
                  value={p.wakeTime || "07:00"}
                  onChange={(e) => updateProfile({ wakeTime: e.target.value })}
                />
              </Field>
              <Field label="Planned Bedtime">
                <input
                  type="time"
                  value={p.bedtime || "23:00"}
                  onChange={(e) => updateProfile({ bedtime: e.target.value })}
                />
              </Field>
            </div>
            <p style={{ marginTop: 14 }}>
              • Get 10–20 mins of outdoor sunlight within 1 hour of waking.
              <br />• Cut off tea, coffee, and energy drinks 8 hours before sleep.
              <br />• Charge your phone outside the bedroom every night.
            </p>
          </Card>
        </div>
      )}

      {subTab === "control" && (
        <Card>
          <div className="eyebrow">SELECT LOOPS TO MONITOR IN DAILY LOG</div>
          <h2>13 Compulsive loops & life hygiene guards</h2>
          <div className="habit-list" style={{ marginTop: 14 }}>
            {CONTROL_LOOPS.map((item) => {
              const active = activeLoops.includes(item.id);
              return (
                <div
                  className={`habit-row ${active ? "checked" : ""}`}
                  key={item.id}
                >
                  <button
                    type="button"
                    className="check-circle"
                    onClick={() => toggleLoop(item.id)}
                  >
                    {active ? "✓" : ""}
                  </button>
                  <div className="habit-info">
                    <strong>{item.title}</strong>
                    <small>{item.sub}</small>
                  </div>
                  <span className={`status-pill ${active ? "complete" : ""}`}>
                    {active ? "Tracking" : "Inactive"}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {subTab === "health" && (
        <div className="dashboard-grid">
          <Card>
            <div className="eyebrow">TEST FIRST, DON&apos;T GUESS</div>
            <h2>Essential blood tests to discuss with a doctor</h2>
            <div className="habit-list" style={{ marginTop: 12 }}>
              {HEALTH_TESTS.map((t, i) => (
                <div className="habit-row" key={i}>
                  <div className="habit-info">
                    <strong>{t.name}</strong>
                    <small>{t.detail}</small>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="eyebrow">EVIDENCE-BASED SUPPLEMENT TIERS</div>
            <h2>What works vs. what to avoid</h2>
            <div className="stack-col" style={{ marginTop: 12 }}>
              {SUPPLEMENT_TIERS.map((st, i) => (
                <div key={i} className="routine-step-box">
                  <strong>{st.tier}</strong>
                  {st.items.map((it, idx) => (
                    <p key={idx}>• {it}</p>
                  ))}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {subTab === "help" && (
        <Card>
          <div className="eyebrow">CONFIDENTIAL 24×7 SUPPORT (INDIA)</div>
          <h2>You never have to fight alone</h2>
          <div className="intro-callout" style={{ marginTop: 14 }}>
            <div className="callout-icon">♡</div>
            <div>
              <strong>Tele-MANAS (National Mental Health Helpline)</strong>
              <p>
                Free, confidential 24×7 support in Hindi, English, and regional languages:{" "}
                <strong>14416</strong> or <strong>1800-891-4416</strong>. Emergency: <strong>112</strong>.
              </p>
            </div>
          </div>
          <div className="record-actions">
            <a href="tel:14416" className="btn primary">
              Call Tele-MANAS (14416)
            </a>
            <a href="tel:112" className="btn">
              Emergency (112)
            </a>
          </div>
        </Card>
      )}
    </>
  );
}

/* ============================================================================
   17. MODALS: URGE SOS, PROFILE, LIFESTYLE LOG & RECORD FORM
   ============================================================================ */

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

function YogaPage() {
  const [filter, setFilter] = useState("all");
  const [completedSets, setCompletedSets] = useState(() => {
    try {
      const saved = localStorage.getItem("cb90_yoga_sets");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Timer states
  const [timerSec, setTimerSec] = useState(45);
  const [initialSec, setInitialSec] = useState(45);
  const [isRunning, setIsRunning] = useState(false);
  const [activePoseTitle, setActivePoseTitle] = useState("Low Lunge (APT Tuck)");
  const [openAccordion, setOpenAccordion] = useState(true);

  useEffect(() => {
    try {
      localStorage.setItem("cb90_yoga_sets", JSON.stringify(completedSets));
    } catch {
      // ignore storage errors
    }
  }, [completedSets]);

  useEffect(() => {
    if (!isRunning) return;
    if (timerSec <= 0) {
      setIsRunning(false);
      // Web Audio gentle chime on completion
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(528, ctx.currentTime);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.8);
      } catch {
        // fallback if audio blocked
      }
      return;
    }
    const id = setInterval(() => setTimerSec((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [isRunning, timerSec]);

  const toggleSet = (poseId, setIdx) => {
    const key = `${poseId}-set-${setIdx}`;
    setCompletedSets((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const resetAllProgress = () => {
    setCompletedSets({});
  };

  const loadPoseTimer = (pose) => {
    setIsRunning(false);
    setInitialSec(pose.holdSec);
    setTimerSec(pose.holdSec);
    setActivePoseTitle(pose.title);
    window.scrollTo({ top: 280, behavior: "smooth" });
  };

  const setPresetTimer = (sec, label) => {
    setIsRunning(false);
    setInitialSec(sec);
    setTimerSec(sec);
    if (label) setActivePoseTitle(label);
  };

  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // Calculate live metrics
  const totalSetsCount = YOGA_POSES.reduce((acc, p) => acc + p.sets, 0);
  const doneSetsCount = Object.values(completedSets).filter(Boolean).length;
  const completionPct = Math.round((doneSetsCount / totalSetsCount) * 100);

  const posesFullyDone = YOGA_POSES.filter((p) =>
    Array.from({ length: p.sets }).every((_, idx) => completedSets[`${p.id}-set-${idx}`])
  ).length;

  const aptPosesDone = YOGA_POSES.filter(
    (p) =>
      p.category === "apt" &&
      Array.from({ length: p.sets }).every((_, idx) => completedSets[`${p.id}-set-${idx}`])
  ).length;

  const filteredPoses = YOGA_POSES.filter((p) =>
    filter === "all" ? true : p.category === filter
  );

  return (
    <main className="main-area">
      <div className="content-wrap">
        {/* ───────── PAGE HEADING ───────── */}
        <header className="page-heading">
          <div>
            <h1>Yoga & Pelvic Alignment</h1>
            <p>
              Anterior Pelvic Tilt (APT) corrective therapy aur daily full-body mobility protocol—step-by-step Hinglish guide ke saath.
            </p>
          </div>
          <div className="heading-btn-group">
            <button
              type="button"
              className="btn"
              onClick={() => setFilter("apt")}
            >
              APT 5-Pose Fix
            </button>
            <button
              type="button"
              className="btn danger-soft-btn"
              onClick={resetAllProgress}
            >
              Reset Today
            </button>
          </div>
        </header>

        {/* ───────── HERO / LIFESTYLE CALLOUT ───────── */}
        <section className="lifestyle-banner">
          <div>
            <span className="status-pill peach-pill">
              Golden Rule for Anterior Pelvic Tilt
            </span>
            <h2 style={{ marginTop: "10px" }}>
              Stretch the Front, <em>Strengthen the Back</em>.
            </h2>
            <p>
              Jab bhi koi yoga pose karo, ek cue hamesha yaad rakho:{" "}
              <strong>"Belt Buckle ko Naabhi (Navel) ki taraf upar kheencho aur Glutes squeeze rakho."</strong>{" "}
              Sirf is 2-inch ke pelvic tuck se aapki lower back par se 80% galat pressure hat jata hai.
            </p>
          </div>
        </section>

        {/* ───────── 4 LIVE STATS CARDS ───────── */}
        <section className="stats-grid">
          <div className="card stat-card blue">
            <div className="stat-top">
              <span className="stat-icon">🧘</span>
              <span>Poses Completed</span>
            </div>
            <div className="stat-value">
              {posesFullyDone}/{YOGA_POSES.length}
            </div>
            <div className="stat-detail">{doneSetsCount} of {totalSetsCount} total sets done</div>
          </div>

          <div className="card stat-card sage">
            <div className="stat-top">
              <span className="stat-icon">🎯</span>
              <span>APT Fix Score</span>
            </div>
            <div className="stat-value">{aptPosesDone}/5</div>
            <div className="stat-detail">Core pelvic corrective poses</div>
          </div>

          <div className="card stat-card peach">
            <div className="stat-top">
              <span className="stat-icon">⏱️</span>
              <span>Daily Session Time</span>
            </div>
            <div className="stat-value">18–22m</div>
            <div className="stat-detail">Recommended hold + breathing time</div>
          </div>

          <div className="card stat-card lavender">
            <div className="stat-top">
              <span className="stat-icon">📈</span>
              <span>Today's Progress</span>
            </div>
            <div className="stat-value">{completionPct}%</div>
            <div className="progress">
              <span style={{ width: `${completionPct}%` }} />
            </div>
          </div>
        </section>

        {/* ───────── INTERACTIVE TIMER & ANATOMY BREAKDOWN ───────── */}
        <section className="dashboard-grid">
          {/* Left: Live Yoga Hold Timer */}
          <div className="card">
            <div className="section-head">
              <div>
                <h2>Live Asana Hold Timer</h2>
                <p>Active Pose: <strong>{activePoseTitle}</strong></p>
              </div>
              <span className={`status-pill ${isRunning ? "complete" : ""}`}>
                {isRunning ? "Holding Pose..." : "Ready"}
              </span>
            </div>

            <div className="timer-strip">
              <div>
                <span className="eyebrow">Hold Countdown</span>
                <div className="timer-readout">{formatTime(timerSec)}</div>
              </div>
              <div className="timer-btns">
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => setIsRunning((r) => !r)}
                >
                  {isRunning ? "Pause" : "Start Hold"}
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setIsRunning(false);
                    setTimerSec(initialSec);
                  }}
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="progress">
              <span
                style={{
                  width: `${
                    initialSec > 0
                      ? ((initialSec - timerSec) / initialSec) * 100
                      : 0
                  }%`
                }}
              />
            </div>

            <div className="row-between">
              <small>Quick Hold Presets:</small>
              <div className="timer-preset-row">
                {[30, 45, 60, 90, 180].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    className={`preset-chip ${initialSec === sec ? "active" : ""}`}
                    onClick={() => setPresetTimer(sec)}
                  >
                    {sec < 60 ? `${sec}s` : `${sec / 60}m`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: APT Biomechanics Blueprint */}
          <div className="card">
            <div className="section-head">
              <div>
                <h2>APT Anatomy Blueprint</h2>
                <p>Kyun hota hai Anterior Pelvic Tilt aur kya target karein</p>
              </div>
            </div>

            <div className="yoga-anatomy-grid">
              <div className="anatomy-box tight-box">
                <span className="status-pill peach-pill">1. Tight (Stretch Karo)</span>
                <strong>Hip Flexors & Lower Back</strong>
                <small>
                  Lambi sitting se Iliopsoas (front thigh ke upar) chhota ho jata hai aur pelvis ko aage neeche kheencha rakhta hai.
                </small>
              </div>

              <div className="anatomy-box weak-box">
                <span className="status-pill complete">2. Weak (Strong Karo)</span>
                <strong>Glutes & Deep Lower Abs</strong>
                <small>
                  Glutes aur Transverse Abdominis so jate hain, jisse pelvis ko wapas seedha kheenchne wali taqat khatam ho jati hai.
                </small>
              </div>
            </div>
          </div>
        </section>

        {/* ───────── FILTER TABS ───────── */}
        <div className="toolbar">
          <div className="tabs" role="tablist">
            <button
              type="button"
              className={filter === "all" ? "selected" : ""}
              onClick={() => setFilter("all")}
            >
              All Yoga Poses <span>10</span>
            </button>
            <button
              type="button"
              className={filter === "apt" ? "selected" : ""}
              onClick={() => setFilter("apt")}
            >
              APT Correction Protocol <span>5</span>
            </button>
            <button
              type="button"
              className={filter === "daily" ? "selected" : ""}
              onClick={() => setFilter("daily")}
            >
              Daily Full-Body Flow <span>5</span>
            </button>
          </div>
          <small>Tip: Kisi bhi pose ke "Load Timer" button par click karke timer set karein.</small>
        </div>

        {/* ───────── DETAILED YOGA POSE CARDS ───────── */}
        <section className="yoga-pose-list">
          {filteredPoses.map((pose, index) => {
            const isPoseComplete = Array.from({ length: pose.sets }).every(
              (_, i) => completedSets[`${pose.id}-set-${i}`]
            );

            return (
              <article
                key={pose.id}
                className={`yoga-pose-card ${isPoseComplete ? "pose-complete" : ""}`}
              >
                {/* Header */}
                <div className="yoga-pose-header">
                  <div className="yoga-title-group">
                    <h3>
                      <span>{index + 1}. {pose.title}</span>
                      <span className="sanskrit-name">({pose.sanskrit})</span>
                    </h3>
                  </div>

                  <div className="yoga-badges">
                    <span className={`role-pill ${pose.roleType}`}>
                      {pose.roleLabel}
                    </span>
                    {isPoseComplete && (
                      <span className="status-pill complete">Completed ✓</span>
                    )}
                  </div>
                </div>

                {/* Prescription Bar (Sets, Reps, Rest, Timing) */}
                <div className="prescription-bar">
                  <div>
                    <span>📋 Kitna Karna Hai:</span>
                    <strong>{pose.prescription}</strong>
                  </div>
                  <div>
                    <span>⏳ Rest:</span>
                    <strong>{pose.rest}</strong>
                  </div>
                  <div>
                    <span>🕒 Best Time:</span>
                    <strong>{pose.bestTime}</strong>
                  </div>
                </div>

                {/* Two-Column Breakdown: Steps + Benefits/Cues */}
                <div className="yoga-details-grid">
                  {/* Left: Step-by-Step Instructions */}
                  <div className="yoga-steps-box">
                    <span className="yoga-box-label">
                      Kaise Karna Hai (Step-by-Step Proper Form)
                    </span>
                    <div className="step-list">
                      {pose.steps.map((step, sIdx) => (
                        <div key={sIdx}>
                          <span>0{sIdx + 1}</span>
                          <p style={{ color: "var(--tx)", fontSize: "0.875rem" }}>
                            {step}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right: Benefits + APT Form Alert */}
                  <div className="yoga-benefits-box">
                    <span className="yoga-box-label">
                      Fayde / Uses (Kyun Work Karta Hai)
                    </span>
                    <ul className="yoga-benefit-list">
                      {pose.benefits.map((b, bIdx) => (
                        <li key={bIdx}>{b}</li>
                      ))}
                    </ul>

                    <div className="apt-cue-alert">
                      <strong>⚠️ APT Alignment Cue: </strong>
                      {pose.aptCue}
                    </div>
                  </div>
                </div>

                {/* Footer: Interactive Set Buttons & Timer Trigger */}
                <div className="yoga-pose-footer">
                  <div className="set-chips-row">
                    {Array.from({ length: pose.sets }).map((_, setIdx) => {
                      const done = !!completedSets[`${pose.id}-set-${setIdx}`];
                      return (
                        <button
                          key={setIdx}
                          type="button"
                          className={`set-check-btn ${done ? "done" : ""}`}
                          onClick={() => toggleSet(pose.id, setIdx)}
                        >
                          {done ? `✓ Set ${setIdx + 1}` : `Set ${setIdx + 1}`}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    className="btn"
                    onClick={() => loadPoseTimer(pose)}
                  >
                    ⏱️ Load {pose.holdSec}s in Timer
                  </button>
                </div>
              </article>
            );
          })}
        </section>

        {/* ───────── ACCORDION: POSES TO AVOID IN APT + DAILY HABITS ───────── */}
        <section className="accordion-box">
          <button
            type="button"
            className="accordion-head"
            onClick={() => setOpenAccordion((o) => !o)}
          >
            <div>
              <h3>🚫 APT Mein Kaunse Yoga Poses AVOID Karne Chahiye + Daily Fixes</h3>
              <p>Galat yoga poses karne se Anterior Pelvic Tilt aur lower back pain badh sakta hai</p>
            </div>
            <div className="accordion-right">
              <span className="status-pill">{openAccordion ? "Hide" : "Show"}</span>
            </div>
          </button>

          {openAccordion && (
            <div className="accordion-body">
              <div className="avoid-grid">
                {AVOID_IN_APT.map((item, idx) => (
                  <div key={idx} className="avoid-card">
                    <strong>❌ Avoid: {item.name}</strong>
                    <small>{item.reason}</small>
                    <small style={{ color: "var(--tx)", fontWeight: 500 }}>
                      ✅ Do Instead: {item.alternative}
                    </small>
                  </div>
                ))}
              </div>

              <div className="routine-step-box" style={{ marginTop: "8px" }}>
                <strong>💡 3 Daily Habits Jo Yoga Ke Asar Ko 2x Fast Karenge:</strong>
                <small>
                  1. <strong>Sleeping Hack:</strong> Agar peeth ke bal sote ho toh ghutno ke neeche 1 takiya (pillow) rakho—isse raat bhar pelvis neutral rehta hai. Pet ke bal (stomach sleeping) bilkul mat soyo.
                </small>
                <small>
                  2. <strong>Study/Coding Break Rule:</strong> Har 50 minute baithne ke baad uth kar sirf 30 second ke liye Standing Glute Squeeze + Pelvic Tuck karo.
                </small>
                <small>
                  3. <strong>Standing Cue:</strong> Khade hote waqt ghutno ko hyper-lock (ekdum piche tight) mat rakho; knees ko 2% soft rakho aur weight heels + midfoot par barabar baanto.
                </small>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}