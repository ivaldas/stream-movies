import { StreamEngine } from "../tvProviders/engine/stream.engine.js";
import { PROVIDER_ERROR } from "../tvProviders/errors/error.provider.js";
import { validateStream } from "../tvProviders/tvProvider utils/streamValidator.js";

const engine = new StreamEngine({
  attempts: 2,
  maxTTL: 300,
});

const normalizeParam = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : null;

const send = (res, status, success, data = null, error = null) =>
  res
    .status(status)
    .json({ success, data, error, timestamp: new Date().toISOString() });

export const getLiveTVStream = async (req, res) => {
  const providerKey = normalizeParam(req.params.provider);
  const channelKey = normalizeParam(req.params.channel);

  // -----------------------------
  // Input validation
  // -----------------------------
  if (!providerKey || !channelKey) {
    return send(res, 400, false, null, {
      code: "INVALID_PARAMS",
      message: "Provider and channel are required",
    });
  }

  try {
    // -----------------------------
    // Resolve stream
    // -----------------------------
    const stream = await engine.resolve(providerKey, channelKey);

    // async validation, does NOT block response
    validateStream(stream.streamUrl).then((ok) => {
      if (!ok) {
        console.warn(
          `Stream seems down: provider=${providerKey} channel=${channelKey} url=${stream.streamUrl}`,
        );
      }
    });

    return send(res, 200, true, {
      fetchedAt: new Date().toISOString(),
      stream,
    });
  } catch (err) {
    // -----------------------------
    // Error → HTTP mapping
    // -----------------------------
    const statusMap = {
      [PROVIDER_ERROR.CHANNEL_NOT_FOUND]: 404,
      [PROVIDER_ERROR.PROVIDER_NOT_FOUND]: 404,
      [PROVIDER_ERROR.TIMEOUT]: 504,
      [PROVIDER_ERROR.UPSTREAM_FAILED]: 502,
      [PROVIDER_ERROR.INVALID_RESPONSE]: 502,
      [PROVIDER_ERROR.UNIMPLEMENTED]: 501,
    };

    const status = statusMap[err?.code] || 500;

    return send(res, status, false, null, {
      code: err?.code || "INTERNAL_ERROR",
      message: err?.message || "Unexpected error",
      meta: err?.meta ?? {},
    });
  }
};
