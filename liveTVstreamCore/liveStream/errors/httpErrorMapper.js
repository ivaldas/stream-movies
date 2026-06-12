import { ProviderError, PROVIDER_ERROR } from "./ProviderError.js";

export function mapHttpError(err, context = {}) {
  const status = err?.response?.status;
  const providerName = context.provider || "Provider";

  // Timeout (axios-specific)
  if (isTimeoutError(err)) {
    return new ProviderError(
      PROVIDER_ERROR.TIMEOUT,
      `${providerName} request timed out`,
      context,
      err,
    );
  }

  if (!status) {
    return new ProviderError(
      PROVIDER_ERROR.UPSTREAM_FAILED,
      `${providerName} network failure`,
      context,
      err,
    );
  }

  const meta = { ...context, status };

  switch (status) {
    case 400:
      return new ProviderError(
        PROVIDER_ERROR.INVALID_RESPONSE,
        "Invalid upstream request",
        meta,
        err,
      );

    case 401:
    case 403:
      return new ProviderError(
        PROVIDER_ERROR.PROVIDER_NOT_FOUND,
        "Access denied by upstream",
        meta,
        err,
      );

    case 404:
    case 410:
      return new ProviderError(
        PROVIDER_ERROR.CHANNEL_NOT_FOUND,
        "Channel not found",
        meta,
        err,
      );

    case 429:
      return new ProviderError(
        PROVIDER_ERROR.UPSTREAM_FAILED,
        "Upstream rate limited",
        meta,
        err,
      );

    default:
      return new ProviderError(
        PROVIDER_ERROR.UPSTREAM_FAILED,
        "Upstream request failed",
        meta,
        err,
      );
  }
}

export function isTimeoutError(err) {
  return err?.code === "ECONNABORTED" || err?.code === "ETIMEDOUT";
}
