import axios from "axios";
import NodeCache from "node-cache";

const cache = new NodeCache({ stdTTL: 300 }); // Cache expires in 5 minutes

const validChannels = ["LTV1", "LTV2", "WORLD", "LR", "Klasika", "Opus"];

const getLiveChannel = (channel) => async (req, res) => {
  if (!validChannels.includes(channel)) {
    return res.status(400).json({ message: "Invalid channel requested" });
  }

  const cachedData = cache.get(channel);
  if (cachedData) {
    return res.status(200).json(cachedData); // Return cached data
  }

  try {
    const { data } = await axios.get(
      "https://www.lrt.lt/servisai/stream_url/live/get_live_url.php",
      { params: { channel } },
    );
    cache.set(channel, data); // Cache the response for the channel
    res.status(200).json(data);
  } catch (err) {
    if (err.response) {
      res.status(err.response.status).json({
        message: "Failed to fetch live stream",
        error: err.response.data,
      });
    } else if (err.request) {
      res.status(502).json({
        message: "Failed to connect to the live stream service",
        error: err.message,
      });
    } else {
      res.status(500).json({
        message: "An unexpected error occurred",
        error: err.message,
      });
    }
  }
};

export const getLiveLTV = getLiveChannel("LTV1");
export const getLiveLTV2 = getLiveChannel("LTV2");
export const getLiveWORLD = getLiveChannel("WORLD");
export const getLiveLR = getLiveChannel("LR");
export const getLiveKlasika = getLiveChannel("Klasika");
export const getLiveOpus = getLiveChannel("Opus");
