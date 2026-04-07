export async function pingBridge(bridgeUrl: string) {
  const url = `${bridgeUrl.replace(/\/$/, "")}/health`;
  const r = await fetch(url, { method: "GET" }).catch(() => null);
  if (!r || !r.ok) return null;
  return r.json().catch(() => null) as Promise<{ status: string; scanner: string; vendor: string } | null>;
}

export async function captureFromBridge(bridgeUrl: string) {
  const url = `${bridgeUrl.replace(/\/$/, "")}/capture`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Capture bridge ${r.status}: ${t}`);
  }
  const j = await r.json();
  if (!j.imageBase64 || typeof j.width !== "number" || typeof j.height !== "number") {
    throw new Error("Capture bridge returned invalid payload (need imageBase64, width, height)");
  }
  return {
    base64: j.imageBase64,
    width: j.width,
    height: j.height,
    dpi: j.dpi ?? 500,
    format: j.format || "png", // Get format from bridge, default to png
  };
}
