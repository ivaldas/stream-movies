export function deepFreeze(obj) {
  if (!obj || typeof obj !== "object") return obj;

  Object.freeze(obj);

  for (const key of Object.keys(obj)) {
    const value = obj[key];
    if (value && typeof value === "object" && !Object.isFrozen(value)) {
      deepFreeze(value);
    }
  }

  return obj;
}
