const activeFDs = new Map(); // fd -> metadata

export const registerFD = (fileHandle, meta = {}) => {
  activeFDs.set(fileHandle.fd, {
    openedAt: Date.now(),
    meta,
  });
};

export const attachFDToResponse = (res, fileHandle) => {
  let closed = false;

  const closeOnce = async (reason) => {
    if (closed) return;
    closed = true;

    try {
      await fileHandle.close();
    } catch {}

    activeFDs.delete(fileHandle.fd);
  };

  res.on("finish", () => closeOnce("finish"));
  res.on("close", () => closeOnce("close"));
  res.on("error", () => closeOnce("error"));
};

export const getFDStats = () => ({
  openFDs: activeFDs.size,
  details: [...activeFDs.entries()].map(([fd, info]) => ({
    fd,
    ageMs: Date.now() - info.openedAt,
    ...info.meta,
  })),
});

setInterval(() => {
  const { openFDs, details } = getFDStats();

  if (openFDs > 50) {
    console.warn(`⚠️ High FD count: ${openFDs}`, details.slice(0, 5));
  }

  for (const fd of details) {
    if (fd.ageMs > 5 * 60_000) {
      console.warn("⚠️ Long-lived FD detected:", fd);
    }
  }
}, 60_000);
