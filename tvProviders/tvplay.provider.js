import NodeCache from "node-cache";

import { BaseProvider } from "./base.provider.js";
import { ProviderError, PROVIDER_ERROR } from "./errors/error.provider.js";
import { StreamDTO } from "./dto/stream.contract.js";
import { validateStream } from "../tvProviders/tvProvider utils/streamValidator.util.js";

export class TVPlayProvider extends BaseProvider {
  constructor() {
    super("tvplay", "TVPlay", {
      tv3: {
        name: "TV3",
        streamUrl:
          "https://cdnlb.tvplayhome.lt/live/eds/TV3_LT_SD/GO3_LIVE_HLS/TV3_LT_SD.m3u8",
      },
      tv6: {
        name: "TV6",
        streamUrl:
          "https://cdnlb.tvplayhome.lt/live/eds/TV6_LT_SD/GO3_LIVE_HLS/TV6_LT_SD.m3u8",
      },
      lrytas: {
        name: "Lietuvos ryto TV",
        streamUrl:
          "https://live.lietuvosryto.tv/live/hls/eteris_1080p/index.m3u8",
      },
      delfi: {
        name: "Delfi TV",
        streamUrl: "https://s1.dcdn.lt/live/televizija/playlist.m3u8",
      },
    });
    this.healthCache = new NodeCache({ stdTTL: 60, checkperiod: 30 });
  }

  async _getStreamHealth(url) {
    const cached = this.healthCache.get(url);
    if (cached !== undefined) return cached;

    let isStreamable = false;
    try {
      isStreamable = await validateStream(url);
    } catch {
      isStreamable = false;
    }

    this.healthCache.set(url, isStreamable);
    return isStreamable;
  }

  async _fetch(upstream, channelKey) {
    if (!upstream?.streamUrl) {
      throw new ProviderError(
        PROVIDER_ERROR.INVALID_RESPONSE,
        "Missing streamUrl",
        {
          channelKey,
          upstream,
        },
      );
    }

    const isStreamable = await this._getStreamHealth(upstream.streamUrl);

    return new StreamDTO({
      streamUrl: upstream.streamUrl,
      // isStreamable,
      metadata: {
        channel: channelKey,
        channelName: upstream.name,
        region: "Lithuania",
      },
    });
  }
}
