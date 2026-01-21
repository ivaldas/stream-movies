import path from "node:path";
import { realpath, constants, open } from "node:fs/promises";
import { fileTypeFromBuffer } from "file-type/node";

/**
 * Safely resolve a video file path and return a file handle
 * Race-free and symlink-safe
 *
 * @param {string} fileName User-provided filename
 * @param {string} baseDir Absolute directory containing videos
 * @param {string[]} allowedExts Allowed video extensions
 * @param {boolean} paranoid Strict MIME checking
 * @returns {Promise<{ path: string, file: fs.FileHandle }>}
 */

const EXT_MIME_MAP = {
  ".mp4": ["video/mp4", "application/mp4"],
  ".mkv": ["video/x-matroska", "video/matroska"],
  ".webm": ["video/webm"],
  ".avi": ["video/x-msvideo"],
  ".mpg": ["video/mpeg"],
  ".mpeg": ["video/mpeg"],
};

const STRONG_FORMATS = new Set([".mp4", ".mkv", ".webm"]);
const LEGACY_FORMATS = new Set([".avi", ".mpg", ".mpeg"]);
const ALLOWED_MIME_TYPES = new Set(Object.values(EXT_MIME_MAP).flat());

/** Validate MIME against extension */
const validateVideoMime = (ext, detected) => {
  // Strong formats → must detect and must match
  if (STRONG_FORMATS.has(ext)) {
    if (!detected)
      throw new Error("Unable to verify file type for strong format");
    if (!EXT_MIME_MAP[ext].includes(detected.mime)) {
      throw new Error(
        `MIME mismatch: expected ${EXT_MIME_MAP[ext].join(", ")}, got ${
          detected.mime
        }`,
      );
    }

    return;
  }

  // Legacy formats (AVI / MPEG-PS)
  // NOTE: file-type often fails to detect these reliably.
  if (LEGACY_FORMATS.has(ext)) {
    if (detected && !EXT_MIME_MAP[ext].includes(detected.mime)) {
      throw new Error("MIME mismatch for legacy format");
    } else if (!detected) {
      console.warn(
        `Warning: Unable to verify legacy format ${ext}. Proceeding with caution.`,
      );
    }
    return;
  }

  throw new Error("Unsupported file type");
};

/** Safe filename regex: letters, numbers, dots, underscores, hyphens */
const SAFE_FILENAME_REGEX = /^[a-zA-Z0-9._\-\s()]{1,255}$/;

const resolveVideoPath = async (
  fileName,
  baseDir,
  allowedExts = Object.keys(EXT_MIME_MAP),
  paranoid = true,
) => {
  // --- Basic input validation ---
  if (!fileName || typeof fileName !== "string")
    throw new Error("Invalid filename");

  const rawName = path.basename(fileName);

  if (!SAFE_FILENAME_REGEX.test(rawName)) {
    throw new Error("Filename contains unsafe characters or is too long");
  }

  const cleanName = rawName.normalize("NFC");

  const ext = path.extname(cleanName).toLowerCase();
  if (!allowedExts.includes(ext)) throw new Error("Unsupported file type");

  // Strip any path components (extra hardening)
  const safeBaseDir = path.resolve(baseDir);

  // Resolve final absolute path
  const resolvedPath = path.resolve(safeBaseDir, cleanName);

  // Ensure path stays within baseDir (pre-realpath)
  const relative = path.relative(safeBaseDir, resolvedPath);
  if (relative.startsWith("..") || path.isAbsolute(relative))
    throw new Error("Access denied");

  // --- Open file early for race-free validation ---
  const file = await open(resolvedPath, constants.O_RDONLY);
  // await access(resolvedPath, constants.R_OK);

  let realFile;
  let detected;

  try {
    // Resolve symlinks and re-check containment
    realFile = await realpath(resolvedPath);
    const realBase = await realpath(safeBaseDir);

    const realRelative = path.relative(realBase, realFile);
    if (realRelative.startsWith("..") || path.isAbsolute(realRelative)) {
      throw new Error("Access denied (symlink escape detected)");
    }

    // Ensure regular file
    const stat = await file.stat();
    if (!stat.isFile()) throw new Error("Not a regular file");

    // Magic-byte detection (header only)
    const header = Buffer.alloc(4100);
    await file.read(header, 0, header.length, 0);
    detected = await fileTypeFromBuffer(header);

    // --- MIME validation ---
    if (detected && !ALLOWED_MIME_TYPES.has(detected.mime))
      throw new Error("Unsupported video type");

    if (paranoid) {
      validateVideoMime(ext, detected);
    } else if (!detected && STRONG_FORMATS.has(ext)) {
      throw new Error("Unknown file type for strong format");
    }

    // Return both path and file handle
    return { path: realFile, file };
  } catch (err) {
    await file.close();
    throw err;
  }
};

export default resolveVideoPath;
