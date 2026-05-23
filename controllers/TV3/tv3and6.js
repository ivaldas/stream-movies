const channels = {
  tv3: "http://cdnlb.tvplayhome.lt/live/eds/TV3_LT_SD/GO3_LIVE_HLS/TV3_LT_SD.m3u8",
  tv6: "http://cdnlb.tvplayhome.lt/live/eds/TV6_LT_SD/GO3_LIVE_HLS/TV6_LT_SD.m3u8",
  lrytas: "https://live.lietuvosryto.tv/live/hls/eteris_1080p/index.m3u8",
};

export const getTVPlayStream = (req, res) => {
  const channel = req.params.channel?.toLowerCase();

  const streamUrl = channels[channel];

  if (!streamUrl) {
    return res.status(404).json({
      message: "Channel not found",
      availableChannels: Object.keys(channels),
    });
  }

  return res.status(200).json({
    provider: "TVPLAY",
    channel,
    streamUrl,
    type: "hls",
  });
};
