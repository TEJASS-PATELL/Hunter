import {
  QUEST_KEY,
  STORAGE_KEY,
  readUnifiedStore,
  todayISO,
} from "./shared.jsx";

const API_BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
const THEME_STORAGE_KEY = "day-by-day-comeback90-theme-dark";
const YOGA_STORAGE_KEY = "cb90_yoga_sets";
const LEGACY_CLIENT_ID_KEY = "hunter-cloud-client-id-v1";

export async function loadCloudState(legacyClientId) {
  const headers = { Accept: "application/json" };
  let savedClientId = legacyClientId;
  try {
    savedClientId ||= window.localStorage.getItem(LEGACY_CLIENT_ID_KEY);
  } catch {
    // Browser storage is only needed to migrate saves from the previous version.
  }
  if (savedClientId) headers["X-Legacy-Client-Id"] = savedClientId;

  const response = await fetch(`${API_BASE_URL}/api/state`, {
    headers,
    credentials: "include",
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) {
    throw new Error(`Cloud load failed with status ${response.status}`);
  }

  const result = await response.json();
  if (result.state === null) return null;
  if (
    !isRecord(result.state) ||
    !isRecord(result.state.data) ||
    !isRecord(result.state.questData)
  ) {
    throw new Error("Cloud returned an invalid saved state");
  }
  return result.state;
}

export async function saveCloudState(state) {
  const response = await fetch(`${API_BASE_URL}/api/state`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(state),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) {
    throw new Error(`Cloud save failed with status ${response.status}`);
  }
}

export function readLegacyState(defaultQuestData) {
  try {
    const storage = window.localStorage;
    const legacyDataExists = [
      STORAGE_KEY,
      QUEST_KEY,
      THEME_STORAGE_KEY,
      YOGA_STORAGE_KEY,
    ].some((key) => storage.getItem(key) !== null);
    if (!legacyDataExists) return null;

    const data = readUnifiedStore();
    data.settings = {
      ...data.settings,
      darkTheme: storage.getItem(THEME_STORAGE_KEY) === "1",
    };

    const savedYoga = parseObject(storage.getItem(YOGA_STORAGE_KEY));
    data.yogaSets =
      savedYoga._date && savedYoga._date !== todayISO()
        ? { _date: todayISO() }
        : { ...savedYoga, _date: todayISO() };

    const savedQuest = parseObject(storage.getItem(QUEST_KEY));
    return {
      data,
      questData: { ...defaultQuestData, ...savedQuest },
    };
  } catch (error) {
    console.error("Could not read the previous browser save:", error);
    return null;
  }
}

export function clearLegacyState() {
  try {
    for (const key of [
      STORAGE_KEY,
      QUEST_KEY,
      THEME_STORAGE_KEY,
      YOGA_STORAGE_KEY,
      LEGACY_CLIENT_ID_KEY,
    ]) {
      window.localStorage.removeItem(key);
    }
  } catch (error) {
    console.error("Could not remove the migrated browser save:", error);
  }
}

function parseObject(raw) {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
