import { readdir } from "node:fs/promises";
import { extname } from "node:path";
import { spawn } from "node:child_process";
import { stat, access, constants } from "node:fs/promises";

// async function getMediaDuration(filePath) {
//   return new Promise((resolve, reject) => {
//     exec(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`, (error, stdout, stderr) => {
//       if (error) {
//         return reject(error);
//       }
//       if (stderr) {
//         console.error(`ffprobe stderr: ${stderr}`);
//       }
//       const duration = parseFloat(stdout.trim());
//       if (isNaN(duration)) {
//         return reject(new Error('Could not parse duration from ffprobe output.'));
//       }
//       resolve(duration);
//     });
//   });
// }

export const findMp4FilesInFolder = async (folderPath) => {
  try {
    const files = await readdir(folderPath); // List files in the directory
    // Filter out files with .mp4 extension
    return files.filter((file) => extname(file).toLowerCase() === ".mp4");
  } catch (err) {
    if (err.code === "ENOENT") {
      return [];
    }
    console.error(`Error reading directory ${folderPath}: ${err.message}`);
    return [];
  }
};

const durationCache = new Map();
setInterval(() => {
  durationCache.clear();
}, 60 * 60 * 1000); // clear hourly
export const getVideoDuration = (video_path) => {
  if (durationCache.has(video_path)) {
    return durationCache.get(video_path);
  }
  const promise = new Promise((resolve, reject) => {
    const probe = spawn("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      video_path,
    ]);

    let output = "";
    probe.stdout.on("data", (d) => (output += d.toString()));
    // probe.on('close', () => resolve(parseFloat(output)));
    probe.on("close", (code) => {
      if (code !== 0 || !output) {
        reject(new Error("ffprobe failed"));
      } else {
        resolve(parseFloat(output));
      }
    });
    probe.on("error", reject);
  });

  promise.catch((err) => {
    console.error(`Error with ffprobe for video ${video_path}:`, err.message);
    durationCache.delete(video_path);
  });
  durationCache.set(video_path, promise);

  return promise;
};

// Helper function to get the file stats safely
export const getFileStats = async (video_path) => {
  try {
    await access(video_path, constants.R_OK);
    return await stat(video_path);
  } catch (err) {
    console.error(
      `File access or stat failed for ${video_path}: ${err.message}`
    );
    throw err;
  }
};
