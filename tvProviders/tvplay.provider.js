import { BaseProvider } from "./base.provider.js";

export class TVPlayProvider extends BaseProvider {
  constructor() {
    super("tvplay", "TVPlay", {
      tv3: {
        name: "TV3",
        streamUrl: "https://cdnlb.tvplayhome.lt/live/TV3.m3u8",
      },
      tv6: {
        name: "TV6",
        streamUrl: "https://cdnlb.tvplayhome.lt/live/TV6.m3u8",
      },
      lrytas: {
        name: "Lietuvos ryto TV",
        streamUrl: "https://live.lietuvosryto.tv/live/index.m3u8",
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
        provider: this.key,
      },
    };
  }
}
