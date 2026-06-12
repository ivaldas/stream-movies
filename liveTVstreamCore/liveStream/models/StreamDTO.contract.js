export const STREAM_TYPES = Object.freeze({
  HLS: "hls",
  DASH: "dash",
});
const STREAM_TYPE_SET = new Set(Object.values(STREAM_TYPES));

function deepFreeze(obj, seen = new WeakSet()) {
  if (obj === null || typeof obj !== "object" || seen.has(obj)) return obj;
  seen.add(obj);

  // for (const key of Object.keys(obj)) {
  for (const key of Reflect.ownKeys(obj)) {
    deepFreeze(obj[key], seen);
  }

  return Object.freeze(obj);
}

function normalizeUrl(url, name, { absolute = false } = {}) {
  if (typeof url !== "string" || !url.trim()) {
    throw new TypeError(`${name} must be a non-empty string`);
  }

  const trimmed = url.trim();

  try {
    const parsed = absolute
      ? new URL(trimmed)
      : new URL(trimmed, "http://dummy.base");

    if (absolute && !/^https?:$/.test(parsed.protocol)) {
      throw new TypeError();
    }

    return trimmed;
  } catch {
    throw new TypeError(
      `${name} must be a valid ${absolute ? "absolute " : ""}URL`,
    );
  }
}

function normalizeExpires(value) {
  if (value == null) return null;

  const ms =
    value instanceof Date
      ? value.getTime()
      : typeof value === "number"
        ? value
        : new Date(value).getTime();

  return Number.isFinite(ms) ? ms : null;
}

function cloneMetadata(metadata) {
  const isPlainObject =
    metadata !== null &&
    typeof metadata === "object" &&
    !Array.isArray(metadata) &&
    (Object.getPrototypeOf(metadata) === Object.prototype ||
      Object.getPrototypeOf(metadata) === null);

  if (!isPlainObject) {
    throw new TypeError("metadata must be a plain object");
  }

  const cloned =
    typeof structuredClone === "function"
      ? structuredClone(metadata)
      : { ...metadata };

  return deepFreeze(cloned);
}

export class StreamDTO {
  constructor({
    streamUrl,
    type = STREAM_TYPES.HLS,
    isLive = null,
    isStreamable = false,
    audioUrl = null,
    backupStreamUrl = null,
    expiresAtMs = null,
    metadata = {},
  }) {
    if (!STREAM_TYPE_SET.has(type))
      throw new TypeError(`Invalid stream type: ${type}`);

    this.streamUrl = normalizeUrl(streamUrl, "streamUrl", { absolute: true });
    this.type = type;
    this.isLive = isLive ?? null;
    this.isStreamable = Boolean(isStreamable);
    this.audioUrl = audioUrl ? normalizeUrl(audioUrl, "audioUrl") : null;
    this.backupStreamUrl = backupStreamUrl
      ? normalizeUrl(backupStreamUrl, "backupStreamUrl")
      : null;

    this.expiresAtMs = normalizeExpires(expiresAtMs);
    Object.defineProperty(this, "_expiresAtMs", {
      value: normalizeExpires(expiresAtMs),
      enumerable: false,
    });

    Object.defineProperty(this, "expiresAt", {
      enumerable: true,
      get: () =>
        this._expiresAtMs != null ? new Date(this._expiresAtMs) : null,
    });

    this.metadata = cloneMetadata(metadata);
    Object.freeze(this);
  }
  toJSON() {
    const json = {
      streamUrl: this.streamUrl,
      type: this.type,
      isLive: this.isLive,
      isStreamable: this.isStreamable,
      metadata: this.metadata,
    };

    const { expiresAt, audioUrl, backupStreamUrl } = this;
    if (audioUrl != null) {
      json.audioUrl = audioUrl;
    }
    if (backupStreamUrl != null) {
      json.backupStreamUrl = backupStreamUrl;
    }
    if (expiresAt != null) {
      json.expiresAt = expiresAt;
    }

    return json;
  }
}
