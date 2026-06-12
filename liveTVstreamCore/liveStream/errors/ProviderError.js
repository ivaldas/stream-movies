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
      throw new TypeError(`Invalid ProviderError code: ${code}`);
    }
    if (meta != null && (typeof meta !== "object" || Array.isArray(meta)))
      throw new TypeError("meta must be an object");

    super(message, { cause });

    this.name = "ProviderError";
    this.code = code;
    this.meta = Object.freeze({ ...(meta ?? {}) });

    Error.captureStackTrace?.(this, ProviderError);

    // Object.freeze(this);
  }
  toJSON(seen = new WeakSet()) {
    if (seen.has(this)) {
      return {
        name: this.name,
        message: this.message,
        circular: true,
      };
    }

    seen.add(this);
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      meta: this.meta,
      cause: this.cause
        ? typeof this.cause.toJSON === "function"
          ? this.cause.toJSON(seen)
          : {
              name: this.cause.name,
              message: this.cause.message,
              code: this.cause.code,
              stack: this.cause.stack,
            }
        : null,
    };
  }
}
