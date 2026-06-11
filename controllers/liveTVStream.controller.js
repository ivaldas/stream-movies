import { randomUUID } from "crypto";

import { StreamEngine } from "../tvProviders/engine/StreamEngine.js";
import { PROVIDER_ERROR } from "../tvProviders/errors/ProviderError.js";

const engine = new StreamEngine({
  attempts: 2,
  maxTTL: 300,
});

const normalizeParam = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() || null : null;

const createCtx = () => ({
  requestId: randomUUID(),
  startedAt: Date.now(),
  timestamp: new Date().toISOString(),
});

const send = (res, status, ctx, success, payload = null) => {
  const now = Date.now();
  return res.status(status).json({
    success,
    requestId: ctx.requestId,
    timestamp: ctx.timestamp,
    durationMs: now - ctx.startedAt,
    ...(success ? { data: payload } : { error: payload }),
  });
};

const apiError = (code, message, meta = {}) => ({ code, message, meta });
const fail = (res, ctx, code, message, status = 500, meta = {}) =>
  send(res, status, ctx, false, apiError(code, message, meta));

export const getLiveTVStream = async (req, res) => {
  const ctx = createCtx();
  const { provider, channel } = req.params;
  const providerKey = normalizeParam(provider);
  const channelKey = normalizeParam(channel);

  // -----------------------------
  // Input validation
  // -----------------------------
  if (!providerKey || !channelKey) {
    return fail(
      res,
      ctx,
      "INVALID_PARAMS",
      "Provider and channel are required",
    );
  }

  try {
    // -----------------------------
    // Resolve stream
    // -----------------------------
    const result = await engine.resolve(providerKey, channelKey);
    if (result == null) {
      return fail(
        res,
        ctx,
        "INVALID_ENGINE_RESPONSE",
        "Stream engine returned empty result",
        502,
      );
    }

    const { stream, health, healthStage, reason, diagnostics } = result;

    return send(res, 200, ctx, true, {
      stream,
      health,
      healthStage,
      reason,
      diagnostics,
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

    const status = statusMap[err?.code] ?? 500;

    return fail(
      res,
      ctx,
      err?.code || "INTERNAL_ERROR",
      err?.message || "Unexpected error",
      status,
      err?.meta ?? {},
    );
  }
};
