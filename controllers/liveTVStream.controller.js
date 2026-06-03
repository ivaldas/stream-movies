import { StreamEngine } from "../tvProviders/engine/stream.engine.js";
import { PROVIDER_ERROR } from "../tvProviders/error.provider.js";

const engine = new StreamEngine();

const send = (res, status, success, data = null, error = null) =>
  res.status(status).json({ success, data, error });

export const getLiveTVStream = async (req, res) => {
  // const providerKey = req.params.provider?.toLowerCase().trim();
  // const channelKey = req.params.channel?.toLowerCase().trim();
  const providerKey = String(req.params.provider || "")
    .toLowerCase()
    .trim();
  const channelKey = String(req.params.channel || "")
    .toLowerCase()
    .trim();

  if (!providerKey || !channelKey) {
    return send(res, 400, false, null, {
      code: "INVALID_PARAMS",
      message: "Provider and channel are required",
    });
  }

  try {
    const stream = await engine.resolve(providerKey, channelKey);

    return send(res, 200, true, {
      fetchedAt: new Date().toISOString(),
      stream,
    });
  } catch (err) {
    const map = {
      [PROVIDER_ERROR.CHANNEL_NOT_FOUND]: 404,
      [PROVIDER_ERROR.PROVIDER_NOT_FOUND]: 404,
      [PROVIDER_ERROR.TIMEOUT]: 504,
      [PROVIDER_ERROR.UPSTREAM_FAILED]: 502,
      [PROVIDER_ERROR.INVALID_RESPONSE]: 502,
    };

    return send(res, map[err.code] || 500, false, null, {
      code: err.code || "INTERNAL_ERROR",
      message: err.message,
      meta: err.meta ?? {},
    });
  }
};
