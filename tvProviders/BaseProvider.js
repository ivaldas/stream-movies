import { ProviderError, PROVIDER_ERROR } from "./errors/ProviderError.js";

export class BaseProvider {
  constructor(key, displayName, channels = {}) {
    if (!key)
      throw new ProviderError(
        PROVIDER_ERROR.CONFIG_ERROR,
        "Provider must have a key",
      );

    this.key = key.toLowerCase();
    this.displayName = displayName || key;

    this.channels = Object.fromEntries(
      Object.entries(channels).map(([k, v]) => {
        if (!v)
          throw new ProviderError(
            PROVIDER_ERROR.INVALID_RESPONSE,
            `Invalid channel config: ${k}`,
          );
        return [k.toLowerCase(), v];
      }),
    );
  }

  resolveChannel(channelKey) {
    return channelKey
      ? (this.channels[channelKey.toLowerCase()] ?? null)
      : null;
  }

  getAvailableChannels() {
    return Object.keys(this.channels);
  }

  supportsChannel(channelKey) {
    return !!this.resolveChannel(channelKey);
  }

  async fetch(channelKey) {
    const upstream = this.resolveChannel(channelKey);
    if (!upstream)
      throw new ProviderError(
        PROVIDER_ERROR.CHANNEL_NOT_FOUND,
        `Channel not found: ${channelKey}`,
        { provider: this.key, channelKey },
      );

    return this._fetch(upstream, channelKey);
  }

  async _fetch(upstream, channelKey) {
    throw new ProviderError(
      PROVIDER_ERROR.UNIMPLEMENTED,
      "_fetch not implemented",
      { provider: this.key, channelKey },
    );
  }
}
