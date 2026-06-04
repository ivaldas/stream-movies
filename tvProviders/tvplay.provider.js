import { BaseProvider } from "./base.provider.js";

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
  }

  async _fetch(upstream) {
    return {
      streamUrl: upstream.streamUrl,
      isLive: true,
      expiresAt: null,
      metadata: {
        channel: upstream.name,
      },
    };
  }
}
