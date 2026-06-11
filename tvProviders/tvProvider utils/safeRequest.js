import axios from "axios";

import { ProviderError, PROVIDER_ERROR } from "../errors/ProviderError.js";
import { mapHttpError } from "../errors/httpErrorMapper.js";

export async function safeRequest({
  url,
  method = "GET",
  timeout = 5000,
  axiosConfig = {},
  provider,
  channel,
}) {
  try {
    const { data } = await axios({
      url,
      method,
      timeout,
      ...axiosConfig,
    });

    return { data };
  } catch (err) {
    // -------------------------
    // TIMEOUT HANDLING (UNIFIED)
    // -------------------------
    if (
      err.code === "ECONNABORTED" ||
      err.code === "ERR_CANCELED" ||
      err.name === "AbortError"
    ) {
      throw new ProviderError(
        PROVIDER_ERROR.TIMEOUT,
        "Provider request timeout",
        { provider, channel },
      );
    }

    // -------------------------
    // ALREADY WRAPPED ERROR
    // -------------------------
    if (err instanceof ProviderError) throw err;

    // -------------------------
    // GENERIC HTTP ERROR MAPPING
    // -------------------------
    throw mapHttpError(err, {
      provider,
      channel,
    });
  }
}
