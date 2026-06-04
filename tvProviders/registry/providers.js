import { LRTProvider } from "../lrt.provider.js";
import { LNKProvider } from "../lnk.provider.js";
import { TVPlayProvider } from "../tvplay.provider.js";

const providers = new Map();

function register(provider) {
  const key = provider.key.toLowerCase();

  if (providers.has(key)) throw new Error(`Duplicate provider: ${key}`);

  providers.set(key, provider);
}

register(new LRTProvider());
register(new LNKProvider());
register(new TVPlayProvider());

export const getProviders = () => [...providers.values()];

export const getProvider = (key) => providers.get(key?.toLowerCase()) ?? null;

export const getAllChannels = () =>
  [...providers.values()].flatMap((p) =>
    p.getAvailableChannels().map((c) => ({
      provider: p.key,
      channel: c,
    })),
  );
