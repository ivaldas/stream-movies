// import NodeCache from "node-cache";

import { BaseProvider } from "./BaseProvider.js";
import { ProviderError, PROVIDER_ERROR } from "./errors/ProviderError.js";
import { StreamDTO } from "./dto/StreamDTO.contract.js";
// import { validateStream } from "../tvProviders/tvProvider utils/streamValidator.util.js";
// import { safeRequest } from "./tvProvider utils/safeRequest.js";

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
    // this.healthCache = new NodeCache({ stdTTL: 60, checkperiod: 30 });
    // this.retryCache = new NodeCache({ stdTTL: 15, checkperiod: 15 });
    // this.MAX_RETRIES = 2;
  }

  // Cached stream health check
  // async _getStreamHealth(url) {
  //   const cached = this.healthCache.get(url);
  //   if (cached !== undefined) return cached;

  //   let isStreamable = false;
  //   try {
  //     await safeRequest({ url, timeout: 5000, provider: this.key });
  //     isStreamable = await validateStream(url);
  //   } catch {
  //     // Increment retry counter
  //     const retries = this.retryCache.get(url) ?? 0;
  //     if (retries < this.MAX_RETRIES) {
  //       this.retryCache.set(url, retries + 1);
  //       // Retry validation once more
  //       return this._getStreamHealth(url);
  //     }
  //     isStreamable = false;
  //   }

  //   this.healthCache.set(url, isStreamable);
  //   this.retryCache.del(url);
  //   return isStreamable;
  // }

  async _fetch(upstream, channelKey) {
    if (!upstream?.streamUrl) {
      throw new ProviderError(
        PROVIDER_ERROR.CONFIG_ERROR,
        "TVPlay Missing streamUrl",
        {
          channelKey,
          upstream,
        },
      );
    }

    // const isStreamable = await this._getStreamHealth(upstream.streamUrl);

    return new StreamDTO({
      streamUrl: upstream.streamUrl,
      // isLive: Boolean(isStreamable),
      metadata: {
        channel: channelKey,
        channelName: upstream.name,
        region: "LT",
        static: true,
      },
    });
  }
}
