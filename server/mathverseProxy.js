export const DEFAULT_APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbydAu1bhiKK6ysqQXsSa5oszzj-YvS3q02-nCmwfTVftxei6WfAFKGd6YkTmbVX7TzH/exec";

const ALLOWED_ACTIONS = new Set(["register", "score", "status"]);
const ALLOWED_GAMES = new Set([
  "two_thirds_average",
  "conway",
  "deal_or_not_deal",
  "knn_heist",
  "number_sequence_rush",
  "planarity",
  "symmetry",
]);
const MAX_BODY_BYTES = 16384;
const UPSTREAM_TIMEOUT_MS = 15000;

export class ProxyRequestError extends Error {
  constructor(message, { status = 400, code = "BAD_REQUEST", retryable = false } = {}) {
    super(message);
    this.name = "ProxyRequestError";
    this.status = status;
    this.code = code;
    this.retryable = retryable;
  }
}

function requiredString(value, field, maxLength) {
  if (typeof value !== "string" || !value.trim() || value.length > maxLength) {
    throw new ProxyRequestError(`${field} is invalid.`, { code: "INVALID_REQUEST" });
  }
  return value.trim();
}

export function validateClientPayload(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ProxyRequestError("A JSON object is required.", {
      code: "INVALID_REQUEST",
    });
  }

  const action = requiredString(body.action, "action", 16);
  const game = requiredString(body.game, "game", 40);
  const sessionId = requiredString(body.session_id, "session_id", 80);
  if (!ALLOWED_ACTIONS.has(action) || !ALLOWED_GAMES.has(game)) {
    throw new ProxyRequestError("Unsupported action or game.", {
      code: "INVALID_REQUEST",
    });
  }

  const payload = { action, game, session_id: sessionId };
  if (action === "register") {
    payload.username = requiredString(body.username, "username", 40);
    payload.studentid = requiredString(body.studentid, "studentid", 20);
  }
  if (action === "score") {
    const score = Number(body.score);
    if (!Number.isInteger(score) || score < 0) {
      throw new ProxyRequestError("score must be a non-negative integer.", {
        code: "INVALID_REQUEST",
      });
    }
    payload.score = score;
  }
  return payload;
}

function validateUpstreamResponse(data, action) {
  if (!data || typeof data !== "object") {
    throw new ProxyRequestError("Google Apps Script returned invalid JSON.", {
      status: 502,
      code: "INVALID_UPSTREAM_RESPONSE",
      retryable: true,
    });
  }
  if (data.ok !== true) {
    throw new ProxyRequestError(data.error || "Google Apps Script rejected the request.", {
      status: 502,
      code: data.code || "UPSTREAM_REJECTED",
      retryable: data.retryable !== false,
    });
  }
  if (typeof data.status !== "string" || !data.status.trim()) {
    throw new ProxyRequestError(`${action} response is missing status.`, {
      status: 502,
      code: "INVALID_UPSTREAM_RESPONSE",
      retryable: true,
    });
  }
  if (data.row === undefined || data.row === null || data.row === "") {
    throw new ProxyRequestError(`${action} response is missing row.`, {
      status: 502,
      code: "INVALID_UPSTREAM_RESPONSE",
      retryable: true,
    });
  }
  return data;
}

export async function forwardMathverseRequest(
  body,
  {
    apiKey,
    appsScriptUrl = DEFAULT_APPS_SCRIPT_URL,
    fetchImpl = globalThis.fetch,
  } = {}
) {
  if (!apiKey) {
    throw new ProxyRequestError("The server-side Mathverse API key is not configured.", {
      status: 503,
      code: "PROXY_NOT_CONFIGURED",
      retryable: true,
    });
  }
  if (typeof fetchImpl !== "function") {
    throw new ProxyRequestError("Server fetch is unavailable.", {
      status: 500,
      code: "SERVER_FETCH_UNAVAILABLE",
      retryable: true,
    });
  }

  const payload = validateClientPayload(body);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const response = await fetchImpl(appsScriptUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify({ key: apiKey, ...payload }),
      redirect: "follow",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new ProxyRequestError(`Google Apps Script returned HTTP ${response.status}.`, {
        status: 502,
        code: "UPSTREAM_HTTP_ERROR",
        retryable: response.status >= 500 || response.status === 429,
      });
    }

    let data;
    try {
      data = await response.json();
    } catch {
      throw new ProxyRequestError("Google Apps Script returned invalid JSON.", {
        status: 502,
        code: "INVALID_UPSTREAM_RESPONSE",
        retryable: true,
      });
    }
    return validateUpstreamResponse(data, payload.action);
  } catch (error) {
    if (error instanceof ProxyRequestError) throw error;
    if (error?.name === "AbortError") {
      throw new ProxyRequestError("Google Apps Script timed out.", {
        status: 504,
        code: "UPSTREAM_TIMEOUT",
        retryable: true,
      });
    }
    throw new ProxyRequestError("Google Apps Script is unavailable.", {
      status: 502,
      code: "UPSTREAM_NETWORK_ERROR",
      retryable: true,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function readJsonBody(request) {
  if (request.body && typeof request.body === "object" && !Array.isArray(request.body)) {
    return request.body;
  }
  if (typeof request.body === "string") return JSON.parse(request.body);

  let size = 0;
  const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      throw new ProxyRequestError("Request body is too large.", {
        status: 413,
        code: "REQUEST_TOO_LARGE",
      });
    }
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString("utf8");
  if (!text) throw new ProxyRequestError("Request body is required.");
  try {
    return JSON.parse(text);
  } catch {
    throw new ProxyRequestError("Request body must be valid JSON.", {
      code: "INVALID_JSON",
    });
  }
}

function sendJson(response, status, data) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.end(JSON.stringify(data));
}

export async function handleMathverseHttpRequest(
  request,
  response,
  {
    apiKey = process.env.MATHVERSE_API_KEY,
    appsScriptUrl = process.env.MATHVERSE_APPS_SCRIPT_URL || DEFAULT_APPS_SCRIPT_URL,
    fetchImpl = globalThis.fetch,
  } = {}
) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    sendJson(response, 405, {
      ok: false,
      code: "METHOD_NOT_ALLOWED",
      retryable: false,
      error: "Only POST is supported.",
    });
    return;
  }

  try {
    const body = await readJsonBody(request);
    const result = await forwardMathverseRequest(body, {
      apiKey,
      appsScriptUrl,
      fetchImpl,
    });
    sendJson(response, 200, result);
  } catch (error) {
    const known = error instanceof ProxyRequestError;
    sendJson(response, known ? error.status : 500, {
      ok: false,
      code: known ? error.code : "INTERNAL_PROXY_ERROR",
      retryable: known ? error.retryable : true,
      error: known ? error.message : "The score proxy failed.",
    });
  }
}

export function createMathverseMiddleware(options) {
  return (request, response) => {
    handleMathverseHttpRequest(request, response, options);
  };
}

