import { useEffect, useRef, useState } from "react";
import {
  addDaysISO,
  Button,
  Card,
  CountdownTimer,
  Heading,
  Progress,
} from "../shared";

const DAILY_GOALS = [
  {
    id: "recall",
    title: "Recall yesterday's English",
    detail: "Say 3 useful words or phrases from memory before checking notes.",
    time: "2 min",
  },
  {
    id: "shadow",
    title: "Listen, pause, and shadow",
    detail:
      "Use a short English clip. Pause after one sentence and repeat it aloud, copying the rhythm—not the accent.",
    time: "5 min",
  },
  {
    id: "speak",
    title: "Speak on today's prompt",
    detail:
      "Talk for 60–90 seconds without writing a full script. Use the PREP structure below if you get stuck.",
    time: "3 min",
  },
  {
    id: "review",
    title: "Notice one thing you did well",
    detail:
      "Rate your confidence before and after, then write one small win. Keep feedback kind and specific.",
    time: "2 min",
  },
];

const PROMPTS = [
  "Describe a small win from this week. What happened, and why did it matter?",
  "What is one skill you want to learn? Give one reason and a first step.",
  "Tell a short story about a time you helped someone or someone helped you.",
  "Describe a place where you feel comfortable. What makes it feel that way?",
  "What is one app or tool you find useful? Explain how you use it.",
  "Talk about a meal you enjoy: what is in it, and when do you like eating it?",
  "If you had a free afternoon, how would you spend it? Explain your choices.",
  "Describe a challenge you handled. What did you try, and what did you learn?",
  "What makes a good friend or teammate? Share one example.",
  "Explain something you know how to do, as if teaching a beginner.",
  "Which is better for learning: studying alone or with others? Give an example.",
  "Talk about a person you admire and one quality you would like to develop.",
  "What would you improve in your daily routine? Why would that help?",
  "Describe a memorable conversation. What made it easy to keep talking?",
];

const EXPOSURE_STEPS = [
  {
    title: "Speak alone",
    detail: "Read a few lines aloud, then explain one idea to yourself.",
  },
  {
    title: "Make a private voice note",
    detail: "Record 30–60 seconds. Listen once and notice one thing you did well.",
  },
  {
    title: "Send a voice note",
    detail: "Share a short English voice message with someone you trust.",
  },
  {
    title: "Have a one-to-one conversation",
    detail: "Ask one question and give one follow-up answer in English.",
  },
  {
    title: "Speak in a small group",
    detail: "Share one idea or ask one question in a class, meeting, or group.",
  },
  {
    title: "Try a short presentation",
    detail: "Explain one familiar topic to a few people for about two minutes.",
  },
];

const WEEKLY_FOCUS = [
  "Easy start",
  "Everyday stories",
  "Opinions",
  "Ask & follow up",
  "Explain an idea",
  "Real conversation",
  "Review & repeat",
];

function dayIndex(date) {
  return Math.floor(Date.parse(`${date}T00:00:00Z`) / 86400000);
}

function CommunicationPage({ data, setData, today, notify }) {
  const [recording, setRecording] = useState(false);
  const [requestingMic, setRequestingMic] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [speechAudioUrl, setSpeechAudioUrl] = useState("");
  const [speechDuration, setSpeechDuration] = useState(0);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const startedAtRef = useRef(0);
  const audioUrlRef = useRef("");
  const mountedRef = useRef(true);
  const micRequestRef = useRef(false);

  const practice = data.communicationPractice || {};
  const days = practice.days || {};
  const entry = days[today] || { completed: [] };
  const completed = Array.isArray(entry.completed) ? entry.completed : [];
  const level = Math.min(
    Math.max(Number(practice.exposureLevel) || 0, 0),
    EXPOSURE_STEPS.length - 1
  );
  const focusIndex = ((dayIndex(today) % WEEKLY_FOCUS.length) + WEEKLY_FOCUS.length) % WEEKLY_FOCUS.length;
  const prompt = PROMPTS[((dayIndex(today) % PROMPTS.length) + PROMPTS.length) % PROMPTS.length];
  const recentDates = Array.from({ length: 7 }, (_, index) =>
    addDaysISO(today, index - 6)
  );
  const successfulDays = recentDates.filter((date) => {
    const saved = days[date];
    return (
      saved &&
      Array.isArray(saved.completed) &&
      DAILY_GOALS.every((goal) => saved.completed.includes(goal.id))
    );
  }).length;
  const progress = Math.round((completed.length / DAILY_GOALS.length) * 100);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    };
  }, []);

  useEffect(() => {
    if (!recording) return undefined;
    const timerId = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000);
      setRecordingSeconds(Math.min(60, elapsed));
      if (elapsed >= 60 && mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    }, 250);
    return () => window.clearInterval(timerId);
  }, [recording]);

  const startSpeechRecording = async () => {
    if (micRequestRef.current) return;
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      notify("Audio recording is not supported in this browser.");
      return;
    }

    micRequestRef.current = true;
    setRequestingMic(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      chunksRef.current = [];
      const supportedType = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
      ].find((type) => window.MediaRecorder.isTypeSupported(type));
      const recorder = new window.MediaRecorder(
        stream,
        supportedType ? { mimeType: supportedType } : undefined
      );
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        notify("Recording stopped because the microphone reported an error.");
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        if (!mountedRef.current) return;
        setRecording(false);
        const recordingBlob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        if (!recordingBlob.size) {
          notify("No audio was captured. Check the microphone and try again.");
          return;
        }
        const nextUrl = URL.createObjectURL(recordingBlob);
        if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = nextUrl;
        setSpeechAudioUrl(nextUrl);
        setSpeechDuration(
          Math.min(60, Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000)))
        );
        notify("Recording ready. It stays in this tab only.");
      };
      mediaRecorderRef.current = recorder;
      startedAtRef.current = Date.now();
      setRecordingSeconds(0);
      recorder.start();
      setRecording(true);
    } catch (error) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      notify(
        error?.name === "NotAllowedError"
          ? "Microphone permission was denied. Allow access in browser settings to record."
          : "Could not start recording. Check that a microphone is available."
      );
    } finally {
      micRequestRef.current = false;
      if (mountedRef.current) setRequestingMic(false);
    }
  };

  const stopSpeechRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  const deleteSpeechRecording = () => {
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    audioUrlRef.current = "";
    setSpeechAudioUrl("");
    setSpeechDuration(0);
  };

  const updateToday = (update) => {
    setData((previous) => {
      const currentPractice = previous.communicationPractice || {};
      const currentDays = currentPractice.days || {};
      const currentEntry = currentDays[today] || { completed: [] };
      return {
        ...previous,
        communicationPractice: {
          ...currentPractice,
          days: {
            ...currentDays,
            [today]: update(currentEntry),
          },
        },
      };
    });
  };

  const toggleGoal = (goalId) => {
    updateToday((current) => {
      const done = Array.isArray(current.completed) ? current.completed : [];
      return {
        ...current,
        completed: done.includes(goalId)
          ? done.filter((id) => id !== goalId)
          : [...done, goalId],
      };
    });
  };

  const saveRating = (key, value) => {
    updateToday((current) => ({ ...current, [key]: value }));
  };

  const completeExposure = () => {
    if (entry.exposureDone) return;
    setData((previous) => {
      const currentPractice = previous.communicationPractice || {};
      const currentDays = currentPractice.days || {};
      const currentEntry = currentDays[today] || { completed: [] };
      if (currentEntry.exposureDone) return previous;
      return {
        ...previous,
        communicationPractice: {
          ...currentPractice,
          days: {
            ...currentDays,
            [today]: { ...currentEntry, exposureDone: true },
          },
        },
      };
    });
    notify("Speaking challenge done — repeat this step until it feels workable.");
  };

  const adjustExposureLevel = (direction) => {
    setData((previous) => {
      const currentPractice = previous.communicationPractice || {};
      const currentLevel = Math.min(
        Math.max(Number(currentPractice.exposureLevel) || 0, 0),
        EXPOSURE_STEPS.length - 1
      );
      return {
        ...previous,
        communicationPractice: {
          ...currentPractice,
          exposureLevel: Math.min(
            Math.max(currentLevel + direction, 0),
            EXPOSURE_STEPS.length - 1
          ),
        },
      };
    });
    notify(
      direction > 0
        ? "Moved up one step — only continue if it feels manageable."
        : "Moved back one step. Repeating an easier rep is progress too."
    );
  };

  return (
    <div className="speaking-page stack-col">
      <Heading
        title="Speak with more confidence"
        description="A practical English + communication routine. Progress comes from saying things out loud, not waiting until you feel perfect."
      />

      <section className="speaking-hero">
        <div>
          <h2>
            {WEEKLY_FOCUS[focusIndex] === "Ask & follow up" ? (
              <>
                Ask & <em>follow up</em>
              </>
            ) : (
              WEEKLY_FOCUS[focusIndex]
            )}
          </h2>
          <p>
            Short recall, clear speaking, and one manageable speaking rep.
            Keep your own accent; aim to be understood.
          </p>
          <p className="speaking-hinglish">
            Atak jao? Simple sentence bolo, pause lo, phir continue — perfect
            accent zaroori nahi.
          </p>
          <div className="speaking-progress">
            <div className="row-between">
              <strong>Today's goals</strong>
              <span>{completed.length}/{DAILY_GOALS.length} done</span>
            </div>
            <Progress value={progress} />
          </div>
        </div>
        <div className="speaking-hero-stat">
          <strong>{successfulDays}<small>/7</small></strong>
          <span>complete days this week</span>
        </div>
      </section>

      <div className="speaking-layout">
        <Card className="speaking-goals-card">
          <div className="section-head">
            <div>
              <h2>Today's practice</h2>
              <p>Tick each goal when you actually say it out loud.</p>
            </div>
          </div>
          <div className="speaking-goals">
            {DAILY_GOALS.map((goal, index) => {
              const isDone = completed.includes(goal.id);
              return (
                <button
                  type="button"
                  className={`speaking-goal ${isDone ? "done" : ""}`}
                  key={goal.id}
                  onClick={() => toggleGoal(goal.id)}
                  aria-pressed={isDone}
                >
                  <span className="speaking-goal-check" aria-hidden="true">
                    {isDone ? "✓" : index + 1}
                  </span>
                  <span className="speaking-goal-copy">
                    <strong>{goal.title}</strong>
                    <small>{goal.detail}</small>
                  </span>
                  <span className="speaking-time">{goal.time}</span>
                </button>
              );
            })}
          </div>
          <div className="speaking-prompt">
            <span className="speaking-tag">SPEAKING PROMPT</span>
            <p>{prompt}</p>
            <div className="speaking-prep">
              <strong>Stuck? Use PREP:</strong>
              <span>Point → Reason → Example → Point again</span>
            </div>
          </div>
          <details className="speaking-example">
            <summary>Example opening (make it your own)</summary>
            <p>
              “One small win for me was ___. It mattered because ___. For
              example, ___. So I learned ___.”
            </p>
          </details>
        </Card>

        <div className="speaking-side stack-col">
          <Card>
            <div>
              <h2 className="speaking-card-title">Start a 12-minute session</h2>
              <p className="muted-text">
                Use the timer for today's four practice goals. Pause or stop
                whenever you need.
              </p>
            </div>
            <CountdownTimer defaultSeconds={720} label="Speak, don't just study" />
          </Card>

          <Card className="speaking-reflection">
            <div>
              <h2 className="speaking-card-title">Confidence check-in</h2>
              <p className="muted-text">
                A quick self-rating helps you notice change over time. It is
                not a test of your English.
              </p>
            </div>
            <label>
              <span>Before practice</span>
              <select
                value={entry.confidenceBefore || ""}
                onChange={(event) =>
                  saveRating("confidenceBefore", event.target.value)
                }
              >
                <option value="">Choose 1–5</option>
                {[1, 2, 3, 4, 5].map((value) => (
                  <option value={value} key={value}>
                    {value} — {["very nervous", "nervous", "okay", "calm", "confident"][value - 1]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>After practice</span>
              <select
                value={entry.confidenceAfter || ""}
                onChange={(event) =>
                  saveRating("confidenceAfter", event.target.value)
                }
              >
                <option value="">Choose 1–5</option>
                {[1, 2, 3, 4, 5].map((value) => (
                  <option value={value} key={value}>
                    {value} — {["very nervous", "nervous", "okay", "calm", "confident"][value - 1]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>One thing I did well</span>
              <textarea
                rows="2"
                maxLength="240"
                placeholder="Example: I kept going even when I forgot a word."
                value={entry.reflection || ""}
                onChange={(event) => saveRating("reflection", event.target.value)}
              />
            </label>
          </Card>
        </div>
      </div>

      <Card className="speech-recorder-card">
        <div className="section-head">
          <div>
            <h2 className="speaking-card-title">Record a 60-second answer</h2>
            <p className="muted-text">
              Answer today&apos;s prompt, listen once, and notice one strength.
              Audio stays in this tab and is never uploaded or saved.
            </p>
          </div>
          <span className={`speech-recording-indicator ${recording ? "on" : ""}`}>
            {recording ? "● Recording" : speechAudioUrl ? "Ready to review" : "Not recording"}
          </span>
        </div>
        <div className="speech-recorder-controls">
          <strong>{recording ? `${recordingSeconds}s / 60s` : "Keep it natural; pauses are okay."}</strong>
          {recording ? (
            <Button kind="primary" onClick={stopSpeechRecording}>
              Finish &amp; review
            </Button>
          ) : (
            <Button
              kind="primary"
              onClick={startSpeechRecording}
              disabled={requestingMic}
            >
              {requestingMic
                ? "Waiting for microphone…"
                : speechAudioUrl
                ? "Record again"
                : "Start recording"}
            </Button>
          )}
        </div>
        {speechAudioUrl && !recording && (
          <div className="speech-playback">
            <audio controls src={speechAudioUrl} aria-label="Your speaking practice recording" />
            <span>{speechDuration}s recording</span>
            <Button onClick={deleteSpeechRecording}>Delete recording</Button>
          </div>
        )}
      </Card>

      <Card className="speaking-ladder-card">
        <div className="section-head">
          <div>
            <h2>Speaking comfort ladder</h2>
            <p>
              Start at a manageable step, repeat it, and move up only when it
              feels workable. No need to force a big audience.
            </p>
          </div>
        </div>
        <ol className="speaking-ladder">
          {EXPOSURE_STEPS.map((step, index) => (
            <li
              key={step.title}
              className={`${index === level ? "current" : ""} ${index < level ? "passed" : ""}`}
            >
              <span className="speaking-ladder-number">
                {index < level ? "✓" : index + 1}
              </span>
              <span>
                <strong>{step.title}</strong>
                <small>{step.detail}</small>
              </span>
              {index === level && (
                <span className="speaking-current-label">YOUR STEP</span>
              )}
            </li>
          ))}
        </ol>
        <div className="speaking-ladder-action">
          <p>
            <strong>Today's small courage rep:</strong>{" "}
            {EXPOSURE_STEPS[level].detail}
          </p>
          <div className="heading-btn-group">
            <Button
              kind="primary"
              onClick={completeExposure}
              disabled={Boolean(entry.exposureDone)}
            >
              {entry.exposureDone ? "Today's rep complete" : "I practised this step"}
            </Button>
            {level > 0 && (
              <Button onClick={() => adjustExposureLevel(-1)}>
                Make this step easier
              </Button>
            )}
            {level < EXPOSURE_STEPS.length - 1 && (
              <Button
                onClick={() => adjustExposureLevel(1)}
                disabled={!entry.exposureDone}
              >
                Move up when ready
              </Button>
            )}
          </div>
        </div>
        <p className="speaking-safety-note">
          Feeling nervous is normal. Take a pause, exhale slowly, and make the
          step smaller if needed. If anxiety is intense or affecting everyday
          life, a qualified mental-health professional can help.
        </p>
      </Card>

      <Card className="speaking-science-card">
        <div className="section-head">
          <div>
            <h2>Evidence-informed, not a magic fix</h2>
            <p>
              These studies support the practice ingredients; they do not
              guarantee a specific result for every person.
            </p>
          </div>
        </div>
        <ul className="speaking-evidence">
          <li>
            <strong>Recall beats only re-reading.</strong> Try to remember
            phrases and speak before looking at notes; a meta-analysis found
            benefits of testing/retrieval for later retention.
            <a
              href="https://pubmed.ncbi.nlm.nih.gov/25150680/"
              target="_blank"
              rel="noreferrer"
            >
              Rowland, 2014 · Psychological Bulletin
            </a>
          </li>
          <li>
            <strong>Space practice across days.</strong> Brief repeated
            sessions are more useful for long-term recall than cramming; the
            cited review focused on verbal recall tasks, not specifically
            English fluency.
            <a
              href="https://pubmed.ncbi.nlm.nih.gov/16719566/"
              target="_blank"
              rel="noreferrer"
            >
              Cepeda et al., 2006 · Psychological Bulletin
            </a>
          </li>
          <li>
            <strong>Build up exposure in steps.</strong> A 2025 systematic
            review/meta-analysis found psychological interventions can reduce
            public-speaking anxiety, but studies and outcomes varied.
            <a
              href="https://pubmed.ncbi.nlm.nih.gov/39970240/"
              target="_blank"
              rel="noreferrer"
            >
              McWilliam et al., 2025 · Journal of Psychology
            </a>
          </li>
        </ul>
      </Card>
    </div>
  );
}

export { CommunicationPage };
