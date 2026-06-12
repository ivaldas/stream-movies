import { LRTProvider } from "../providers/LRTprovider.js";
import { LNKProvider } from "../providers/LNKprovider.js";
import { TVPlayProvider } from "../providers/TVPlayProvider.js";
import {
  ProviderError,
  PROVIDER_ERROR,
} from "../liveStream/errors/ProviderError.js";

const providers = new Map();

const normalizeKey = (key) =>
  typeof key === "string" ? key.trim().toLowerCase() : null;

function register(provider) {
  if (!provider || typeof provider !== "object") {
    throw new ProviderError(
      PROVIDER_ERROR.CONFIG_ERROR,
      "Provider must be an object",
    );
  }

  if (typeof provider.key !== "string") {
    throw new ProviderError(
      PROVIDER_ERROR.CONFIG_ERROR,
      "Provider key must be a string",
    );
  }

  const key = normalizeKey(provider.key);

  if (providers.has(key)) {
    throw new ProviderError(
      PROVIDER_ERROR.CONFIG_ERROR,
      `Duplicate provider: ${key}`,
    );
  }

  providers.set(key, provider);
}

register(new LRTProvider());
register(new LNKProvider());
register(new TVPlayProvider());

export const getProviders = () => [...providers.values()];

export const getProvider = (key) => {
  if (typeof key !== "string") return null;
  return providers.get(normalizeKey(key)) ?? null;
};

export const getAllChannels = () =>
  getProviders().flatMap((p) =>
    (p.getAvailableChannels?.() ?? []).map((channel) => ({
      provider: p.key,
      channel,
      displayName: p.displayName,
    })),
  );
