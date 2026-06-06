export const STREAM_TYPES = Object.freeze({
  HLS: "hls",
  DASH: "dash",
});

function deepFreeze(obj) {
  Object.keys(obj).forEach((key) => {
    if (typeof obj[key] === "object" && obj[key] !== null) {
      deepFreeze(obj[key]);
    }
  });
  return Object.freeze(obj);
}

export class StreamDTO {
  constructor({
    streamUrl,
    type = STREAM_TYPES.HLS,
    isLive = true,
    isStreamable = true,
    audioUrl = null,
    backupStreamUrl = null,
    expiresAt = null,
    metadata = {},
  }) {
    if (!streamUrl || typeof streamUrl !== "string")
      throw new Error("streamUrl is required");

    this.streamUrl = streamUrl.trim();
    this.type = type;
    this.isLive = Boolean(isLive);
    this.isStreamable = Boolean(isStreamable);
    this.audioUrl = audioUrl ? String(audioUrl).trim() : null;
    this.backupStreamUrl = backupStreamUrl
      ? String(backupStreamUrl).trim()
      : null;

    this.expiresAt =
      expiresAt instanceof Date
        ? expiresAt
        : expiresAt
          ? new Date(expiresAt)
          : null;

    if (this.expiresAt && Number.isNaN(this.expiresAt.getTime()))
      this.expiresAt = null;

    this.metadata = deepFreeze({ ...metadata });

    Object.freeze(this);
  }
}
