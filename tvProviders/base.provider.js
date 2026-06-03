import { ProviderError, PROVIDER_ERROR } from "./error.provider.js";

export class BaseProvider {
  constructor(key, displayName, channels = {}) {
    if (!key) {
      throw new ProviderError(
        PROVIDER_ERROR.INVALID_RESPONSE,
        "Provider must have a key",
      );
    }

    this.key = key.toLowerCase();
    this.displayName = displayName;

    this.channels = Object.fromEntries(
      Object.entries(channels).map(([k, v]) => {
        if (!v) {
          throw new ProviderError(
            PROVIDER_ERROR.INVALID_RESPONSE,
            `Invalid channel config: ${k}`,
          );
        }
        return [k.toLowerCase(), v];
      }),
    );
  }

  resolveChannel(channelKey) {
    if (!channelKey) return null;
    return this.channels[channelKey.toLowerCase()] ?? null;
  }

  getAvailableChannels() {
    return Object.keys(this.channels);
  }

  async fetch(channelKey) {
    const upstream = this.resolveChannel(channelKey);

    if (!upstream) {
      throw new ProviderError(
        PROVIDER_ERROR.CHANNEL_NOT_FOUND,
        `Channel not found: ${channelKey}`,
        { provider: this.key },
      );
    }

    return this._fetch(upstream, channelKey);
  }

  async _fetch() {
    throw new ProviderError(
      PROVIDER_ERROR.UNIMPLEMENTED,
      "_fetch not implemented",
      { provider: this.key },
    );
  }
}
