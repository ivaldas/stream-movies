export const PROVIDER_ERROR = Object.freeze({
  CHANNEL_NOT_FOUND: "CHANNEL_NOT_FOUND",
  UPSTREAM_FAILED: "UPSTREAM_FAILED",
  INVALID_RESPONSE: "INVALID_RESPONSE",
  TIMEOUT: "TIMEOUT",
  PROVIDER_NOT_FOUND: "PROVIDER_NOT_FOUND",
  UNIMPLEMENTED: "UNIMPLEMENTED",
});

export class ProviderError extends Error {
  constructor(code, message, meta = {}, cause = null) {
    super(message, { cause });

    this.name = "ProviderError";
    this.code = code;
    this.meta = Object.freeze({ ...meta });

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ProviderError);
    }
  }
}
