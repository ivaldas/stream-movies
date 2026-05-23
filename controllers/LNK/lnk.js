import axios from "axios";
import NodeCache from "node-cache";

const cache = new NodeCache({
  stdTTL: 300,
});

const API_URL = "https://lnk.lt/api/video/video-config";

const channels = {
  lnk: 137535,
  btv: 137534,
  "2tv": 95343,
  infotv: 137748,
  tv1: 106791,
};

export const getLiveLNKChannel = async (req, res) => {
  const slug = req.params.channel?.toLowerCase();

  const videoId = channels[slug];

  if (!videoId) {
    return res.status(404).json({
      message: "Channel not found",
      availableChannels: Object.keys(channels),
    });
  }

  const cacheKey = `lnk:${slug}`;

  const cachedData = cache.get(cacheKey);

  if (cachedData) {
    return res.status(200).json(cachedData);
  }

  try {
    const { data } = await axios.get(`${API_URL}/${videoId}`, {
      timeout: 5000,
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    const videoInfo = data.videoInfo;

    const response = {
      provider: "LNK",
      id: videoInfo.id,
      channel: videoInfo.channel,
      title: videoInfo.title,
      description: videoInfo.description,
      streamUrl: videoInfo.videoUrl,
      poster: videoInfo.posterImage,
      isLive: videoInfo.isLive,
      viewsCount: videoInfo.viewsCount,
    };

    cache.set(cacheKey, response);

    return res.status(200).json(response);
  } catch (err) {
    console.error(err);

    if (err.response) {
      return res.status(err.response.status).json({
        message: "Failed to fetch LNK stream",
        error: err.response.data,
      });
    }

    if (err.request) {
      return res.status(502).json({
        message: "Failed to connect to LNK service",
      });
    }

    return res.status(500).json({
      message: "Unexpected server error",
      error: err.message,
    });
  }
};
