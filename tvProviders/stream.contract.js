export const STREAM_TYPES = Object.freeze({
  HLS: "hls",
});

export class StreamDTO {
  constructor({
    streamUrl,
    type = STREAM_TYPES.HLS,
    isLive = true,
    audioUrl = null,
    backupStreamUrl = null,
    expiresAt = null,
    metadata = {},
  }) {
    if (!streamUrl || typeof streamUrl !== "string") {
      throw new Error("streamUrl is required");
    }

    this.streamUrl = streamUrl.trim();
    this.type = type;
    this.isLive = Boolean(isLive);
    this.audioUrl = audioUrl;
    this.backupStreamUrl = backupStreamUrl;

    this.expiresAt =
      expiresAt instanceof Date
        ? expiresAt
        : expiresAt
          ? new Date(expiresAt)
          : null;

    if (this.expiresAt && Number.isNaN(this.expiresAt.getTime())) {
      this.expiresAt = null;
    }

    this.metadata = Object.freeze({ ...metadata });

    Object.freeze(this);
  }
}
