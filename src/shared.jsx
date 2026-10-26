import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";

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

export {
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
};
