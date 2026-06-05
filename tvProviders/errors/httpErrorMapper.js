import { ProviderError, PROVIDER_ERROR } from "./error.provider.js";

export function mapHttpError(err, context = {}) {
  const status = err?.response?.status;

  // Timeout (axios-specific)
  if (err?.code === "ECONNABORTED") {
    return new ProviderError(
      PROVIDER_ERROR.TIMEOUT,
      `${context.provider || "Provider"} request timed out`,
      context,
      err,
    );
  }

  if (!status) {
    return new ProviderError(
      PROVIDER_ERROR.UPSTREAM_FAILED,
      `${context.provider || "Provider"} network failure`,
      context,
      err,
    );
  }

  switch (status) {
    case 400:
      return new ProviderError(
        PROVIDER_ERROR.INVALID_RESPONSE,
        "Invalid upstream request",
        { ...context, status },
        err,
      );

    case 401:
    case 403:
      return new ProviderError(
        PROVIDER_ERROR.PROVIDER_NOT_FOUND,
        "Access denied by upstream",
        { ...context, status },
        err,
      );

    case 404:
    case 410:
      return new ProviderError(
        PROVIDER_ERROR.CHANNEL_NOT_FOUND,
        "Channel not found",
        { ...context, status },
        err,
      );

    case 429:
      return new ProviderError(
        PROVIDER_ERROR.UPSTREAM_FAILED,
        "Upstream rate limited",
        { ...context, status },
        err,
      );

    default:
      return new ProviderError(
        PROVIDER_ERROR.UPSTREAM_FAILED,
        "Upstream request failed",
        { ...context, status },
        err,
      );
  }
}

export function isTimeoutError(err) {
  return err?.code === "ECONNABORTED" || err?.code === "ETIMEDOUT";
}
