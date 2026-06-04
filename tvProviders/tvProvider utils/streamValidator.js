import axios from "axios";

export async function validateStream(url) {
  try {
    await axios.head(url, {
      timeout: 3000,
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    return true;
  } catch {
    return false;
  }
}
