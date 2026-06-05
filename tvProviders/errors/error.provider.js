export const PROVIDER_ERROR = Object.freeze({
  CONFIG_ERROR: "CONFIG_ERROR",
  CHANNEL_NOT_FOUND: "CHANNEL_NOT_FOUND",
  UPSTREAM_FAILED: "UPSTREAM_FAILED",
  INVALID_RESPONSE: "INVALID_RESPONSE",
  TIMEOUT: "TIMEOUT",
  PROVIDER_NOT_FOUND: "PROVIDER_NOT_FOUND",
  UNIMPLEMENTED: "UNIMPLEMENTED",
});

const PROVIDER_ERROR_SET = new Set(Object.values(PROVIDER_ERROR));

export class ProviderError extends Error {
  constructor(code, message, meta = {}, cause = null) {
    if (!PROVIDER_ERROR_SET.has(code)) {
      throw new Error(`Invalid ProviderError code: ${code}`);
    }
    super(message, { cause });

    this.name = "ProviderError";
    this.code = code;
    this.meta = Object.freeze({ ...meta });

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ProviderError);
    }
  }
}
