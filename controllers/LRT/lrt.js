import axios from "axios";
import NodeCache from "node-cache";

const cache = new NodeCache({ stdTTL: 300 });

const STREAM_URL =
  "https://www.lrt.lt/servisai/stream_url/live/get_live_url.php";

export const channelMap = {
  lrt: "LTV1",
  plius: "LTV2",
  lituanica: "WORLD",
  lr: "LR",
  klasika: "Klasika",
  opus: "Opus",
};

export const getLiveChannel = async (req, res) => {
  try {
    const requestedChannel = req.params.channel?.toLowerCase();

    const upstreamChannel = channelMap[requestedChannel];

    if (!upstreamChannel) {
      return res.status(404).json({
        success: false,
        message: "Invalid channel requested",
        availableChannels: Object.keys(channelMap),
      });
    }

    const cachedData = cache.get(upstreamChannel);

    if (cachedData) {
      return res.status(200).json({
        success: true,
        source: "cache",
        channel: requestedChannel,
        data: cachedData,
      });
    }

    const response = await axios.get(STREAM_URL, {
      params: {
        channel: upstreamChannel,
      },
      timeout: 5000,
    });

    const data = response.data;

    if (!data || typeof data !== "object") {
      return res.status(502).json({
        success: false,
        message: "Invalid response from upstream service",
      });
    }

    cache.set(upstreamChannel, data);

    return res.status(200).json({
      success: true,
      source: "api",
      channel: requestedChannel,
      data,
    });
  } catch (err) {
    if (err.response) {
      return res.status(err.response.status).json({
        success: false,
        message: "Failed to fetch live stream",
        error: err.response.data,
      });
    }

    if (err.request) {
      return res.status(502).json({
        success: false,
        message: "Failed to connect to upstream service",
        error: err.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unexpected server error",
      error: err.message,
    });
  }
};
