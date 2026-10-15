import assert from "node:assert/strict";
import {
  API_GAME_IDS,
  getPlayerSlots,
} from "../src/integration/gameApiConfig.js";
import {
  clearPostGameResult,
  getPendingPostGameResults,
  queuePostGameResult,
  recordCompetitionResult,
  registerPlayersForAttempt,
  retryPendingCompetitionResults,
  submitPostGamePlayer,
} from "../src/integration/mathverseApi.js";
import {
  DEFAULT_APPS_SCRIPT_URL,
  forwardMathverseRequest,
  ProxyRequestError,
} from "../server/mathverseProxy.js";

const EXPECTED_APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbydAu1bhiKK6ysqQXsSa5oszzj-YvS3q02-nCmwfTVftxei6WfAFKGd6YkTmbVX7TzH/exec";

assert.equal(DEFAULT_APPS_SCRIPT_URL, EXPECTED_APPS_SCRIPT_URL);

assert.deepEqual(API_GAME_IDS, {
  average: "two_thirds_average",
  conway: "conway",
  deal: "deal_or_not_deal",
  knn: "knn_heist",
  sequence: "number_sequence_rush",
  planarity: "planarity",
  symmetry: "symmetry",
});
assert.deepEqual(getPlayerSlots("conway"), ["p1", "p2"]);
assert.deepEqual(getPlayerSlots("planarity"), ["p1", "p2"]);

const forwarded = [];
const mockUpstream = async (url, options) => {
  const payload = JSON.parse(options.body);
  forwarded.push({ url, payload, options });
  return new Response(
    JSON.stringify({ ok: true, status: `${payload.action}_ok`, row: 17 }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};

const registrationResponse = await forwardMathverseRequest(
  {
    action: "register",
    game: "symmetry",
    session_id: "00000000-0000-4000-8000-000000000001",
    username: "TEST Integration",
    studentid: "00123",
  },
  { apiKey: "server-secret", fetchImpl: mockUpstream }
);
assert.equal(registrationResponse.ok, true);
assert.equal(registrationResponse.status, "register_ok");
assert.equal(registrationResponse.row, 17);
assert.equal(forwarded[0].url, EXPECTED_APPS_SCRIPT_URL);
assert.equal(forwarded[0].payload.key, "server-secret");
assert.equal(forwarded[0].payload.studentid, "00123");
assert.equal(forwarded[0].options.redirect, "follow");
assert.match(forwarded[0].options.headers["Content-Type"], /^text\/plain/);

await assert.rejects(
  () =>
    forwardMathverseRequest(
      {
        action: "status",
        game: "symmetry",
        session_id: "00000000-0000-4000-8000-000000000001",
      },
      { fetchImpl: mockUpstream }
    ),
  (error) =>
    error instanceof ProxyRequestError && error.code === "PROXY_NOT_CONFIGURED"
);

class MemoryStorage {
  constructor() {
    this.values = new Map();
  }
  getItem(key) {
    return this.values.get(key) ?? null;
  }
  setItem(key, value) {
    this.values.set(key, String(value));
  }
}

const localStorage = new MemoryStorage();
globalThis.window = {
  localStorage,
  setTimeout: globalThis.setTimeout,
  clearTimeout: globalThis.clearTimeout,
};

const proxyCalls = [];
let failNextScore = false;
let failNextRegistrationConflict = false;
let scoreRowOverride = null;
globalThis.fetch = async (_url, options) => {
  const body = JSON.parse(options.body);
  proxyCalls.push(body);
  if (failNextRegistrationConflict && body.action === "register") {
    failNextRegistrationConflict = false;
    return new Response(
      JSON.stringify({
        ok: false,
        code: "SESSION_CONFLICT",
        retryable: false,
        error: "session_id is already assigned to another player",
      }),
      { status: 409, headers: { "Content-Type": "application/json" } }
    );
  }
  if (failNextScore && body.action === "score") {
    failNextScore = false;
    return new Response(
      JSON.stringify({
        ok: false,
        code: "UPSTREAM_NETWORK_ERROR",
        retryable: true,
        error: "temporary test failure",
      }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
  return new Response(
    JSON.stringify({
      ok: true,
      status: `${body.action}_ok`,
      row: body.action === "score" && scoreRowOverride ? scoreRowOverride : 23,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};

const firstSession = "00000000-0000-4000-8000-000000000002";
const registration = await registerPlayersForAttempt(
  "symmetry",
  [{ username: "TEST Symmetry", studentId: "TEST001" }],
  [firstSession]
);
assert.equal(registration.players[0].studentId, "TEST001");
assert.equal(proxyCalls.length, 1);
assert.equal(proxyCalls[0].game, "symmetry");
assert.equal(proxyCalls[0].session_id, firstSession);

const finalResult = {
  gameId: "symmetry",
  attemptId: "symmetry-test-attempt",
  playerSlot: "single",
  finalScore: 1774,
  outcome: "loss",
};
const submitted = await recordCompetitionResult({
  localGameId: "symmetry",
  player: registration.players[0],
  sessionId: firstSession,
  result: finalResult,
});
assert.equal(submitted.state, "submitted");
assert.equal(
  registration.players[0].registration.row,
  submitted.scoreResponse.row,
  "registration and score must resolve to the same row"
);
assert.equal(submitted.registrationResponse.row, submitted.scoreResponse.row);
assert.deepEqual(
  proxyCalls.slice(1).map((call) => call.action),
  ["score"]
);
assert.equal(proxyCalls[1].session_id, firstSession);
assert.equal(proxyCalls[1].score, 1774);

await recordCompetitionResult({
  localGameId: "symmetry",
  player: registration.players[0],
  sessionId: firstSession,
  result: finalResult,
});
assert.equal(proxyCalls.length, 2, "a submitted score must not be sent twice");

const retrySession = "00000000-0000-4000-8000-000000000003";
const retryRegistration = await registerPlayersForAttempt(
  "symmetry",
  [{ username: "TEST Retry", studentId: "TEST002" }],
  [retrySession]
);
failNextScore = true;
await assert.rejects(() =>
  recordCompetitionResult({
    localGameId: "symmetry",
    player: retryRegistration.players[0],
    sessionId: retrySession,
    result: { ...finalResult, attemptId: "symmetry-retry-attempt", finalScore: 500 },
  })
);
const retried = await retryPendingCompetitionResults();
assert.equal(retried.length, 1);
assert.equal(retried[0].state, "submitted");

for (const [gameId, sessions] of [
  [
    "conway",
    [
      "00000000-0000-4000-8000-000000000004",
      "00000000-0000-4000-8000-000000000005",
    ],
  ],
  [
    "planarity",
    [
      "00000000-0000-4000-8000-000000000006",
      "00000000-0000-4000-8000-000000000007",
    ],
  ],
]) {
  const callStart = proxyCalls.length;
  const twoPlayerRegistration = await registerPlayersForAttempt(
    gameId,
    [
      { username: `TEST ${gameId} P1`, studentId: "TEST-P1" },
      { username: `TEST ${gameId} P2`, studentId: "TEST-P2" },
    ],
    sessions
  );
  const registerCalls = proxyCalls.slice(callStart);
  assert.deepEqual(
    twoPlayerRegistration.players.map((player) => player.playerSlot),
    ["p1", "p2"]
  );
  assert.deepEqual(
    registerCalls.map((call) => [call.action, call.game, call.session_id]),
    [
      ["register", API_GAME_IDS[gameId], sessions[0]],
      ["register", API_GAME_IDS[gameId], sessions[1]],
    ]
  );
  assert.notEqual(registerCalls[0].session_id, registerCalls[1].session_id);
}

// Cover all seven backend game IDs and both slots for each two-player game.
// Average intentionally has NO final score until event-wide settlement.
const liveGameCases = [
  ["average", ["single"]],
  ["conway", ["p1", "p2"]],
  ["deal", ["single"]],
  ["knn", ["single"]],
  ["sequence", ["single"]],
  ["planarity", ["p1", "p2"]],
  ["symmetry", ["single"]],
];
let nextSession = 100;
for (const [gameId, slots] of liveGameCases) {
  const sessions = slots.map(() => `00000000-0000-4000-8000-${String(nextSession++).padStart(12, "0")}`);
  const people = slots.map((slot) => ({ username: `TEST_${gameId}_${slot}`, studentId: `0${nextSession}` }));
  const start = proxyCalls.length;
  const registered = await registerPlayersForAttempt(gameId, people, sessions);
  const registrationCalls = proxyCalls.slice(start);
  assert.deepEqual(registrationCalls.map((call) => [call.action, call.game]),
    slots.map(() => ["register", API_GAME_IDS[gameId]]));
  assert.deepEqual(registrationCalls.map((call) => call.session_id), sessions);
  assert.deepEqual(registered.players.map((player) => player.playerSlot), slots);
  if (gameId === "average") {
    assert.equal(proxyCalls.length, start + 1, "Average registration must not submit a fake final score");
    continue;
  }
  const scoreStart = proxyCalls.length;
  for (const [index, slot] of slots.entries()) {
    const result = await recordCompetitionResult({
      localGameId: gameId,
      player: registered.players[index],
      sessionId: sessions[index],
      result: {
        attemptId: `TEST_${gameId}_attempt`, playerSlot: slot,
        finalScore: 1000 + index, outcome: index === 0 ? "win" : "loss",
      },
    });
    assert.equal(result.scoreResponse.row, registered.players[index].registration.row);
    assert.equal(result.registrationResponse.row, result.scoreResponse.row);
  }
  const scoreCalls = proxyCalls.slice(scoreStart);
  assert.deepEqual(scoreCalls.map((call) => call.action),
  slots.map(() => "score"));
  assert.deepEqual(scoreCalls.filter((call) => call.action === "score")
    .map((call) => [call.game, call.session_id]),
    sessions.map((session) => [API_GAME_IDS[gameId], session]));
}

for (const [gameId, slots] of liveGameCases) {
  const attemptId = `TEST_post_game_${gameId}`;
  const start = proxyCalls.length;
  for (const [index, playerSlot] of slots.entries()) {
    queuePostGameResult(gameId, {
      attemptId,
      playerSlot,
      finalScore: gameId === "average" ? 37 : 700 + index,
      outcome: index === 0 ? "win" : "loss",
    });
  }
  const pending = getPendingPostGameResults().find(
    (record) => record.attemptId === attemptId
  );
  assert.deepEqual(pending.requiredSlots, slots);
  assert.equal(pending.results[slots[0]].finalScore, gameId === "average" ? 37 : 700);

  for (const [index, playerSlot] of slots.entries()) {
    const sessionId = pending.players[playerSlot].sessionId;
    const saved = await submitPostGamePlayer(attemptId, playerSlot, {
      username: `TEST_post_game_${gameId}_${playerSlot}`,
      studentId: `00${index}TEST`,
    });
    assert.equal(saved.players[playerSlot].state, "submitted");
    assert.equal(saved.players[playerSlot].sessionId, sessionId);
    assert.equal(saved.players[playerSlot].row, 23);
    assert.equal(
      saved.players[playerSlot].studentId,
      `00${index}TEST`,
      "student IDs remain strings"
    );
  }

  const postGameCalls = proxyCalls.slice(start);
  assert.deepEqual(
    postGameCalls.map((call) => [call.action, call.game]),
    slots.flatMap(() => [
      ["register", API_GAME_IDS[gameId]],
      ["score", API_GAME_IDS[gameId]],
    ])
  );
  const scoreCalls = postGameCalls.filter((call) => call.action === "score");
  assert.deepEqual(
    scoreCalls.map((call) => [call.session_id, call.score]),
    slots.map((slot, index) => [
      pending.players[slot].sessionId,
      gameId === "average" ? 37 : 700 + index,
    ])
  );
  for (const playerSlot of slots) {
    const duplicate = await submitPostGamePlayer(attemptId, playerSlot, {
      username: `TEST_post_game_${gameId}_${playerSlot}`,
      studentId: `00${slots.indexOf(playerSlot)}TEST`,
    });
    assert.equal(duplicate.players[playerSlot].state, "submitted");
  }
  assert.equal(proxyCalls.length, start + slots.length * 2, "saved records are never resubmitted");
  clearPostGameResult(attemptId);
}

const retryAttemptId = "TEST_post_game_retry";
const retryQueued = queuePostGameResult("knn", {
  attemptId: retryAttemptId,
  playerSlot: "single",
  finalScore: 5750,
  outcome: "win",
});
failNextScore = true;
await assert.rejects(() =>
  submitPostGamePlayer(retryAttemptId, "single", {
    username: "TEST retry KNN",
    studentId: "000retry",
  })
);
const retryRecord = getPendingPostGameResults().find(
  (record) => record.attemptId === retryAttemptId
);
assert.equal(retryRecord.players.single.sessionId, retryQueued.players.single.sessionId);
assert.equal(retryRecord.players.single.username, "TEST retry KNN");
assert.equal(retryRecord.players.single.studentId, "000retry");
assert.ok(retryRecord.players.single.error);
const scoreCallsBeforeIdentityChange = proxyCalls.filter(
  (call) => call.action === "score" && call.session_id === retryQueued.players.single.sessionId
).length;
await assert.rejects(
  () =>
    submitPostGamePlayer(retryAttemptId, "single", {
      username: "TEST changed identity",
      studentId: "000changed",
    }),
  (error) => error.code === "SESSION_CONFLICT"
);
const lockedRetry = getPendingPostGameResults().find(
  (record) => record.attemptId === retryAttemptId
);
assert.equal(lockedRetry.players.single.identityLocked, true);
assert.equal(lockedRetry.players.single.username, "TEST retry KNN");
assert.equal(lockedRetry.players.single.studentId, "000retry");
assert.equal(
  proxyCalls.filter(
    (call) => call.action === "score" && call.session_id === retryQueued.players.single.sessionId
  ).length,
  scoreCallsBeforeIdentityChange,
  "changed identity must not cause a score to be resubmitted under a possibly-used session"
);
const retriedPostGame = await submitPostGamePlayer(retryAttemptId, "single", {
  username: lockedRetry.players.single.username,
  studentId: lockedRetry.players.single.studentId,
});
assert.equal(retriedPostGame.players.single.state, "submitted");
assert.equal(retriedPostGame.players.single.sessionId, retryQueued.players.single.sessionId);
clearPostGameResult(retryAttemptId);

const conflictAttemptId = "TEST_post_game_session_conflict";
const conflictQueued = queuePostGameResult("knn", {
  attemptId: conflictAttemptId,
  playerSlot: "single",
  finalScore: 685,
  outcome: "win",
});
const originalConflictSession = conflictQueued.players.single.sessionId;
const storedClientData = JSON.parse(localStorage.getItem("mathverse:score-sync:v1"));
storedClientData.registrations[`knn_heist:${originalConflictSession}`] = {
  apiGameId: "knn_heist",
  sessionId: originalConflictSession,
  playerSlot: "single",
  username: "TEST previous player",
  studentId: "PREVIOUS-ID",
  state: "registered",
  response: { ok: true, status: "register_ok", row: 24 },
};
localStorage.setItem("mathverse:score-sync:v1", JSON.stringify(storedClientData));
const conflictCallStart = proxyCalls.length;
const recoveredConflict = await submitPostGamePlayer(
  conflictAttemptId,
  "single",
  { username: "TEST corrected player", studentId: "CORRECTED-ID" }
);
assert.notEqual(
  recoveredConflict.players.single.sessionId,
  originalConflictSession,
  "a conflicting session must be replaced, never reassigned"
);
assert.equal(
  storedClientData.registrations[`knn_heist:${originalConflictSession}`].username,
  "TEST previous player",
  "the previous registration record is retained"
);
assert.deepEqual(
  proxyCalls.slice(conflictCallStart).map((call) => [call.action, call.session_id]),
  [
    ["register", recoveredConflict.players.single.sessionId],
    ["score", recoveredConflict.players.single.sessionId],
  ]
);
assert.equal(recoveredConflict.players.single.state, "submitted");
clearPostGameResult(conflictAttemptId);

const upstreamConflictAttemptId = "TEST_post_game_upstream_session_conflict";
const upstreamConflictQueued = queuePostGameResult("knn", {
  attemptId: upstreamConflictAttemptId,
  playerSlot: "single",
  finalScore: 735,
  outcome: "win",
});
const upstreamConflictSession = upstreamConflictQueued.players.single.sessionId;
const upstreamConflictStart = proxyCalls.length;
failNextRegistrationConflict = true;
await assert.rejects(
  () =>
    submitPostGamePlayer(upstreamConflictAttemptId, "single", {
      username: "TEST upstream conflict",
      studentId: "UPSTREAM-ID",
    }),
  (error) => error.code === "SESSION_CONFLICT"
);
const upstreamConflictRetry = await submitPostGamePlayer(
  upstreamConflictAttemptId,
  "single",
  {
    username: "TEST upstream conflict",
    studentId: "UPSTREAM-ID",
  }
);
assert.notEqual(
  upstreamConflictRetry.players.single.sessionId,
  upstreamConflictSession,
  "an explicit API session conflict retries with a fresh session ID"
);
assert.deepEqual(
  proxyCalls.slice(upstreamConflictStart).map((call) => [call.action, call.session_id]),
  [
    ["register", upstreamConflictSession],
    ["register", upstreamConflictRetry.players.single.sessionId],
    ["score", upstreamConflictRetry.players.single.sessionId],
  ]
);
assert.equal(upstreamConflictRetry.players.single.state, "submitted");
clearPostGameResult(upstreamConflictAttemptId);

const mismatchAttemptId = "TEST_post_game_row_mismatch";
queuePostGameResult("knn", {
  attemptId: mismatchAttemptId,
  playerSlot: "single",
  finalScore: 5750,
  outcome: "win",
});
scoreRowOverride = 24;
const mismatchCallStart = proxyCalls.length;
await assert.rejects(
  () =>
    submitPostGamePlayer(mismatchAttemptId, "single", {
      username: "TEST row mismatch",
      studentId: "TEST-MISMATCH",
    }),
  (error) => error.code === "ROW_MISMATCH"
);
const mismatchCalls = proxyCalls.length;
assert.equal(mismatchCalls, mismatchCallStart + 2);
await assert.rejects(
  () =>
    submitPostGamePlayer(mismatchAttemptId, "single", {
      username: "TEST row mismatch",
      studentId: "TEST-MISMATCH",
    }),
  (error) => error.code === "ROW_MISMATCH"
);
assert.equal(proxyCalls.length, mismatchCalls, "row mismatch retries never resend score");
scoreRowOverride = null;

delete globalThis.fetch;
delete globalThis.window;

console.log("Mathverse integration verification passed.");
