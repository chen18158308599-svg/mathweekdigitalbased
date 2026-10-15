import {
  getApiGameId,
  getPlayerSlots,
} from "./gameApiConfig.js";

const API_PATH = "/api/mathverse";
const STORAGE_KEY = "mathverse:score-sync:v1";
const REQUEST_TIMEOUT_MS = 15000;
const inFlight = new Map();

export class MathverseApiError extends Error {
  constructor(message, { code = "REQUEST_FAILED", retryable = true } = {}) {
    super(message);
    this.name = "MathverseApiError";
    this.code = code;
    this.retryable = retryable;
  }
}

function createFallbackUuid() {
  const bytes = new Uint8Array(16);
  globalThis.crypto?.getRandomValues?.(bytes);
  if (!bytes.some(Boolean)) {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0"));
  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10).join(""),
  ].join("-");
}

export function createPlayerSessionId() {
  return globalThis.crypto?.randomUUID?.() ?? createFallbackUuid();
}

function emptyStore() {
  return { version: 1, registrations: {}, scores: {}, pendingSubmissions: {} };
}

function browserStorage() {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

function loadStore() {
  const storage = browserStorage();
  if (!storage) return emptyStore();
  try {
    const parsed = JSON.parse(storage.getItem(STORAGE_KEY));
    if (!parsed || parsed.version !== 1) return emptyStore();
    return {
      version: 1,
      registrations: parsed.registrations ?? {},
      scores: parsed.scores ?? {},
      pendingSubmissions: parsed.pendingSubmissions ?? {},
    };
  } catch {
    return emptyStore();
  }
}

function saveStore(store) {
  const storage = browserStorage();
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // A current-page retry still works when browser storage is unavailable.
  }
}

function recordKey(apiGameId, sessionId) {
  return `${apiGameId}:${sessionId}`;
}

function sameRow(left, right) {
  return String(left) === String(right);
}

export function queuePostGameResult(localGameId, result) {
  const apiGameId = getApiGameId(localGameId);
  const slots = getPlayerSlots(localGameId);
  const score = Number(result?.finalScore);
  if (
    !apiGameId ||
    !result?.attemptId ||
    !slots.includes(result?.playerSlot) ||
    !Number.isFinite(score) ||
    !Number.isInteger(score) ||
    score < 0
  ) {
    throw new MathverseApiError("Invalid finalized game result.", {
      code: "INVALID_FINAL_RESULT",
      retryable: false,
    });
  }

  const store = loadStore();
  let pending = store.pendingSubmissions[result.attemptId];
  if (pending && pending.localGameId !== localGameId) {
    throw new MathverseApiError("This attempt ID belongs to another game.", {
      code: "ATTEMPT_CONFLICT",
      retryable: false,
    });
  }
  if (!pending) {
    pending = {
      attemptId: result.attemptId,
      localGameId,
      apiGameId,
      requiredSlots: slots,
      results: {},
      players: Object.fromEntries(
        slots.map((slot) => [
          slot,
          {
            sessionId: createPlayerSessionId(),
            username: "",
            studentId: "",
            state: "pending",
            row: null,
            error: null,
          },
        ])
      ),
      createdAt: new Date().toISOString(),
    };
  }

  const priorResult = pending.results[result.playerSlot];
  if (priorResult && priorResult.finalScore !== score) {
    throw new MathverseApiError("A different result already exists for this player.", {
      code: "FINAL_RESULT_CONFLICT",
      retryable: false,
    });
  }
  pending.results[result.playerSlot] = {
    finalScore: score,
    outcome: String(result.outcome || "completed"),
  };
  pending.updatedAt = new Date().toISOString();
  store.pendingSubmissions[result.attemptId] = pending;
  saveStore(store);
  return pending;
}

export function getPendingPostGameResults() {
  return Object.values(loadStore().pendingSubmissions);
}

export function updatePostGamePlayer(attemptId, playerSlot, player) {
  const store = loadStore();
  const pending = store.pendingSubmissions[attemptId];
  const record = pending?.players?.[playerSlot];
  if (!record || !pending.results[playerSlot]) {
    throw new MathverseApiError("The player result is not ready for submission.", {
      code: "RESULT_NOT_READY",
      retryable: false,
    });
  }
  if (record.state === "submitted" || record.identityLocked) return pending;

  record.username = String(player?.username ?? "").trim();
  record.studentId = String(player?.studentId ?? "").trim();
  record.error = null;
  pending.updatedAt = new Date().toISOString();
  saveStore(store);
  return pending;
}

export function markPostGamePlayerSubmitted(attemptId, playerSlot, row) {
  const store = loadStore();
  const pending = store.pendingSubmissions[attemptId];
  const record = pending?.players?.[playerSlot];
  if (!record) return null;
  record.state = "submitted";
  record.row = row;
  record.error = null;
  pending.updatedAt = new Date().toISOString();
  saveStore(store);
  return pending;
}

export function markPostGamePlayerFailed(attemptId, playerSlot, error) {
  const store = loadStore();
  const pending = store.pendingSubmissions[attemptId];
  const record = pending?.players?.[playerSlot];
  if (!record) return null;
  record.state = "pending";
  record.error = {
    code: error?.code || "REQUEST_FAILED",
    message: error?.message || "The score could not be saved.",
    retryable: error?.retryable !== false,
  };
  pending.updatedAt = new Date().toISOString();
  saveStore(store);
  return pending;
}

export function clearPostGameResult(attemptId) {
  const store = loadStore();
  const pending = store.pendingSubmissions[attemptId];
  const complete =
    pending?.requiredSlots?.every(
      (slot) => pending.players[slot]?.state === "submitted"
    ) ?? false;
  if (!complete) return;

  for (const slot of pending.requiredSlots) {
    const sessionId = pending.players[slot].sessionId;
    const key = recordKey(pending.apiGameId, sessionId);
    delete store.registrations[key];
    delete store.scores[key];
  }
  delete store.pendingSubmissions[attemptId];
  saveStore(store);
}

export async function submitPostGamePlayer(attemptId, playerSlot, player) {
  const current = loadStore().pendingSubmissions[attemptId];
  const pendingPlayer = current?.players?.[playerSlot];
  const result = current?.results?.[playerSlot];
  if (!current || !pendingPlayer || !result) {
    throw new MathverseApiError("The finalized player result is unavailable.", {
      code: "RESULT_NOT_READY",
      retryable: false,
    });
  }
  if (pendingPlayer.state === "submitted") return current;

  const normalized = {
    username: String(player?.username ?? "").trim(),
    studentId: String(player?.studentId ?? "").trim(),
  };
  if (
    !normalized.username ||
    normalized.username.length > 40 ||
    !normalized.studentId ||
    normalized.studentId.length > 20
  ) {
    throw new MathverseApiError("Enter a valid username and student ID.", {
      code: "INVALID_REGISTRATION",
      retryable: false,
    });
  }

  const store = loadStore();
  const sessionKey = recordKey(current.apiGameId, pendingPlayer.sessionId);
  const registration = store.registrations[sessionKey];
  const priorScore = store.scores[sessionKey];
  const knownIdentity = priorScore ?? registration;
  const identityChanged =
    knownIdentity &&
    (knownIdentity.username !== normalized.username ||
      knownIdentity.studentId !== normalized.studentId ||
      knownIdentity.playerSlot !== playerSlot);
  const sessionConflict =
    registration?.lastError?.code === "SESSION_CONFLICT";
  const replaceSession = Boolean(identityChanged || sessionConflict);

  if (replaceSession && priorScore) {
    if (identityChanged) {
      pendingPlayer.username = priorScore.username;
      pendingPlayer.studentId = priorScore.studentId;
    }
    pendingPlayer.identityLocked = true;
    pendingPlayer.error = {
      code: "SESSION_CONFLICT",
      message:
        "This score session may already have been submitted. Its session is locked to prevent a duplicate score.",
      retryable: false,
    };
    current.updatedAt = new Date().toISOString();
    store.pendingSubmissions[attemptId] = current;
    saveStore(store);
    throw new MathverseApiError(pendingPlayer.error.message, {
      code: "SESSION_CONFLICT",
      retryable: false,
    });
  }

  if (replaceSession) {
    let nextSessionId;
    do {
      nextSessionId = createPlayerSessionId();
    } while (
      store.registrations[recordKey(current.apiGameId, nextSessionId)] ||
      store.scores[recordKey(current.apiGameId, nextSessionId)]
    );
    pendingPlayer.sessionId = nextSessionId;
    current.updatedAt = new Date().toISOString();
    store.pendingSubmissions[attemptId] = current;
    saveStore(store);
  }

  updatePostGamePlayer(attemptId, playerSlot, normalized);
  try {
    const saved = await recordCompetitionResult({
      localGameId: current.localGameId,
      player: {
        ...normalized,
        playerSlot,
      },
      sessionId: pendingPlayer.sessionId,
      result: {
        attemptId,
        playerSlot,
        finalScore: result.finalScore,
        outcome: result.outcome,
      },
    });
    if (!saved.registrationResponse || !saved.scoreResponse) {
      throw new MathverseApiError("The score has not been fully confirmed yet.", {
        code: "INCOMPLETE_CONFIRMATION",
        retryable: true,
      });
    }
    if (
      !sameRow(saved.registrationResponse.row, saved.scoreResponse.row)
    ) {
      throw new MathverseApiError(
        "Registration and score were not confirmed on the same sheet row.",
        { code: "ROW_MISMATCH", retryable: false }
      );
    }
    return markPostGamePlayerSubmitted(
      attemptId,
      playerSlot,
      saved.scoreResponse.row
    );
  } catch (error) {
    markPostGamePlayerFailed(attemptId, playerSlot, error);
    throw error;
  }
}

function normalizedPlayer(player, playerSlot, sessionId) {
  return {
    username: String(player?.username ?? "").trim(),
    studentId: String(player?.studentId ?? "").trim(),
    playerSlot,
    sessionId: String(sessionId),
  };
}

function validateApiSuccess(data, action) {
  if (!data || data.ok !== true) {
    throw new MathverseApiError(data?.error || `${action} request was rejected.`, {
      code: data?.code || "API_REJECTED",
      retryable: data?.retryable !== false,
    });
  }
  if (typeof data.status !== "string" || !data.status.trim()) {
    throw new MathverseApiError(`${action} response is missing status.`, {
      code: "INVALID_API_RESPONSE",
    });
  }
  if (data.row === undefined || data.row === null || data.row === "") {
    throw new MathverseApiError(`${action} response is missing row.`, {
      code: "INVALID_API_RESPONSE",
    });
  }
  return data;
}

async function requestApi(action, payload) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(API_PATH, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...payload }),
      signal: controller.signal,
    });

    let data;
    try {
      data = await response.json();
    } catch {
      throw new MathverseApiError("The score service returned invalid JSON.", {
        code: "INVALID_PROXY_RESPONSE",
      });
    }

    if (!response.ok) {
      throw new MathverseApiError(data?.error || "The score service request failed.", {
        code: data?.code || `HTTP_${response.status}`,
        retryable: data?.retryable !== false,
      });
    }
    return validateApiSuccess(data, action);
  } catch (error) {
    if (error instanceof MathverseApiError) throw error;
    if (error?.name === "AbortError") {
      throw new MathverseApiError("The score service timed out.", {
        code: "TIMEOUT",
      });
    }
    throw new MathverseApiError("The score service is unavailable.", {
      code: "NETWORK_ERROR",
    });
  } finally {
    window.clearTimeout(timeout);
  }
}

function upsertRegistrationDraft({ localGameId, apiGameId, player }) {
  const key = recordKey(apiGameId, player.sessionId);
  const store = loadStore();
  const existing = store.registrations[key];
  if (
    existing &&
    (existing.apiGameId !== apiGameId ||
      existing.username !== player.username ||
      existing.studentId !== player.studentId ||
      existing.playerSlot !== player.playerSlot)
  ) {
    throw new MathverseApiError("This session ID is already assigned to another player.", {
      code: "SESSION_CONFLICT",
      retryable: false,
    });
  }

  store.registrations[key] = {
    ...existing,
    localGameId,
    apiGameId,
    sessionId: player.sessionId,
    playerSlot: player.playerSlot,
    username: player.username,
    studentId: player.studentId,
    state: existing?.state === "registered" ? "registered" : "pending",
    updatedAt: new Date().toISOString(),
  };
  saveStore(store);
  return key;
}

async function ensurePlayerRegistered({ localGameId, apiGameId, player }) {
  const key = upsertRegistrationDraft({ localGameId, apiGameId, player });
  const current = loadStore().registrations[key];
  if (current?.state === "registered") return current;

  const inFlightKey = `register:${key}`;
  if (inFlight.has(inFlightKey)) return inFlight.get(inFlightKey);

  const operation = (async () => {
    try {
      const response = await requestApi("register", {
        game: apiGameId,
        session_id: player.sessionId,
        username: player.username,
        studentid: player.studentId,
      });
      const store = loadStore();
      store.registrations[key] = {
        ...store.registrations[key],
        state: "registered",
        response,
        lastError: null,
        updatedAt: new Date().toISOString(),
      };
      saveStore(store);
      return store.registrations[key];
    } catch (error) {
      const store = loadStore();
      store.registrations[key] = {
        ...store.registrations[key],
        state: "pending",
        lastError: {
          code: error.code || "REQUEST_FAILED",
          message: error.message,
          retryable: error.retryable !== false,
        },
        updatedAt: new Date().toISOString(),
      };
      saveStore(store);
      throw error;
    }
  })().finally(() => inFlight.delete(inFlightKey));

  inFlight.set(inFlightKey, operation);
  return operation;
}

export async function registerPlayersForAttempt(localGameId, players, sessionIds) {
  const apiGameId = getApiGameId(localGameId);
  const slots = getPlayerSlots(localGameId);
  if (!apiGameId || players.length !== slots.length || sessionIds.length !== slots.length) {
    throw new MathverseApiError("Invalid game registration data.", {
      code: "INVALID_REGISTRATION",
      retryable: false,
    });
  }

  const registeredPlayers = players.map((player, index) =>
    normalizedPlayer(player, slots[index], sessionIds[index])
  );
  if (registeredPlayers.some((player) => !player.username || !player.studentId)) {
    throw new MathverseApiError("Username and student ID are required.", {
      code: "INVALID_REGISTRATION",
      retryable: false,
    });
  }

  const records = await Promise.all(
    registeredPlayers.map((player) =>
      ensurePlayerRegistered({ localGameId, apiGameId, player })
    )
  );

  return {
    gameId: localGameId,
    apiGameId,
    players: registeredPlayers.map((player, index) => ({
      ...player,
      registration: records[index].response,
    })),
  };
}

export async function recordCompetitionResult({
  localGameId,
  player,
  sessionId,
  result,
}) {
  const apiGameId = getApiGameId(localGameId);
  const finalScore = Number(result?.finalScore);
  if (!apiGameId || !Number.isInteger(finalScore) || finalScore < 0) {
    throw new MathverseApiError("Invalid finalized score.", {
      code: "INVALID_FINAL_SCORE",
      retryable: false,
    });
  }

  const attemptPlayer = normalizedPlayer(player, result.playerSlot, sessionId);
  const key = recordKey(apiGameId, attemptPlayer.sessionId);
  const registrationRecord = await ensurePlayerRegistered({
    localGameId,
    apiGameId,
    player: attemptPlayer,
  });

  let store = loadStore();
  const existing = store.scores[key];
  if (existing && existing.score !== finalScore) {
    throw new MathverseApiError("A different final score already exists for this session.", {
      code: "SCORE_CONFLICT",
      retryable: false,
    });
  }
  if (existing?.state === "submitted") {
    if (!sameRow(existing.registrationResponse?.row, existing.scoreResponse?.row)) {
      throw new MathverseApiError(
        "Registration and score were not confirmed on the same sheet row.",
        { code: "ROW_MISMATCH", retryable: false }
      );
    }
    return existing;
  }

  store.scores[key] = {
    ...existing,
    localGameId,
    apiGameId,
    sessionId: attemptPlayer.sessionId,
    playerSlot: attemptPlayer.playerSlot,
    attemptId: result.attemptId,
    outcome: result.outcome,
    score: finalScore,
    username: attemptPlayer.username,
    studentId: attemptPlayer.studentId,
    registrationResponse: registrationRecord.response,
    state: existing?.state === "submitted" ? "submitted" : "pending",
    updatedAt: new Date().toISOString(),
  };
  saveStore(store);

  const inFlightKey = `score:${key}`;
  if (inFlight.has(inFlightKey)) return inFlight.get(inFlightKey);

  const operation = (async () => {
    let scoreResponse = existing?.scoreResponse ?? null;
    try {
      if (loadStore().scores[key]?.state !== "submitted") {
        scoreResponse = await requestApi("score", {
          game: apiGameId,
          session_id: attemptPlayer.sessionId,
          score: finalScore,
        });
        const submittedStore = loadStore();
        submittedStore.scores[key] = {
          ...submittedStore.scores[key],
          state: "submitted",
          scoreResponse,
          lastError: null,
          submittedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        saveStore(submittedStore);
      }

      if (!sameRow(registrationRecord.response?.row, scoreResponse?.row)) {
        throw new MathverseApiError(
          "Registration and score were not confirmed on the same sheet row.",
          { code: "ROW_MISMATCH", retryable: false }
        );
      }

      const verifiedStore = loadStore();
      verifiedStore.scores[key] = {
        ...verifiedStore.scores[key],
        verifiedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      saveStore(verifiedStore);
      return loadStore().scores[key];
    } catch (error) {
      const failedStore = loadStore();
      failedStore.scores[key] = {
        ...failedStore.scores[key],
        state: scoreResponse ? "submitted" : "pending",
        scoreResponse,
        lastError: {
          code: error.code || "REQUEST_FAILED",
          message: error.message,
          retryable: error.retryable !== false,
        },
        updatedAt: new Date().toISOString(),
      };
      saveStore(failedStore);
      throw error;
    }
  })().finally(() => inFlight.delete(inFlightKey));

  inFlight.set(inFlightKey, operation);
  return operation;
}

export async function retryPendingCompetitionResults() {
  const pendingScores = Object.values(loadStore().scores).filter(
    (record) => record?.state === "pending"
  );

  const results = [];
  for (const record of pendingScores) {
    try {
      results.push(
        await recordCompetitionResult({
          localGameId: record.localGameId,
          player: {
            username: record.username,
            studentId: record.studentId,
          },
          sessionId: record.sessionId,
          result: {
            attemptId: record.attemptId,
            playerSlot: record.playerSlot,
            finalScore: record.score,
            outcome: record.outcome,
          },
        })
      );
    } catch {
      // The durable pending record is retained for a later retry.
    }
  }
  return results;
}
