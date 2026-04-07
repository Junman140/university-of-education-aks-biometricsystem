import { Link, useParams } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { captureFromBridge, pingBridge } from "../lib/capture";

function readPngFile(file: File): Promise<{ base64: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    if (file.type && file.type !== "image/png") {
      reject(new Error("Please choose a PNG file (fingerprint scan export)."));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      URL.revokeObjectURL(url);
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const i = dataUrl.indexOf("base64,");
        const base64 = i >= 0 ? dataUrl.slice(i + 7) : dataUrl;
        resolve({ base64: base64.replace(/\s/g, ""), width: w, height: h });
      };
      reader.onerror = () => reject(new Error("Could not read file"));
      reader.readAsDataURL(file);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Invalid or unreadable image"));
    };
    img.src = url;
  });
}

export default function Enroll() {
  const { studentId } = useParams();
  const [fingerCode, setFinger] = useState("LEFT_INDEX");
  const [width, setW] = useState(0);
  const [height, setH] = useState(0);
  const [imageBase64, setImg] = useState("");
  const [imgFormat, setImgFormat] = useState<"png" | "raw_gray8">("png");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dpi, setDpi] = useState(500);
  const [qualityMin, setQm] = useState(50);
  const [out, setOut] = useState<{ id: string; qualityScore?: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [bridgeUrl, setBridgeUrl] = useState(() => localStorage.getItem("captureBridgeUrl") || "http://127.0.0.1:5055");
  const [bridgeStatus, setBridgeStatus] = useState<"checking" | "ok" | "error" | null>(null);
  const [bridgeScanner, setBridgeScanner] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const onFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(null);
    setOut(null);
    try {
      const { base64, width: w, height: h } = await readPngFile(file);
      setImg(base64);
      setW(w);
      setH(h);
      setPreviewUrl(URL.createObjectURL(file));
    } catch (er: unknown) {
      setErr(er instanceof Error ? er.message : "Invalid file");
    }
  }, []);

  async function checkBridge() {
    setBridgeStatus("checking");
    setBridgeScanner(null);
    localStorage.setItem("captureBridgeUrl", bridgeUrl);
    const info = await pingBridge(bridgeUrl);
    if (info) {
      setBridgeStatus("ok");
      setBridgeScanner(`${info.vendor} ${info.scanner}`);
    } else {
      setBridgeStatus("error");
    }
  }

  async function captureLive() {
    setErr(null);
    setOut(null);
    setCapturing(true);
    localStorage.setItem("captureBridgeUrl", bridgeUrl);
    try {
      const res = await captureFromBridge(bridgeUrl);
      setImg(res.base64);
      setImgFormat(res.format as "png" | "raw_gray8");
      setW(res.width);
      setH(res.height);
      setDpi(res.dpi);
      
      // For raw_gray8, the browser can't natively render it in an <img> tag as easily
      // as a base64 PNG. For now, we'll draw it to a canvas and convert to dataURL,
      // or we can just skip the image preview if it's raw bytes, but we'll try to preview it.
      if (res.format === "raw_gray8") {
        const canvas = document.createElement("canvas");
        canvas.width = res.width;
        canvas.height = res.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const imgData = ctx.createImageData(res.width, res.height);
          const rawBytes = Uint8Array.from(atob(res.base64), (c) => c.charCodeAt(0));
          for (let i = 0; i < rawBytes.length; i++) {
            imgData.data[i * 4] = rawBytes[i];     // R
            imgData.data[i * 4 + 1] = rawBytes[i]; // G
            imgData.data[i * 4 + 2] = rawBytes[i]; // B
            imgData.data[i * 4 + 3] = 255;         // A (opaque)
          }
          ctx.putImageData(imgData, 0, 0);
          setPreviewUrl(canvas.toDataURL("image/png"));
        }
      } else {
        setPreviewUrl(`data:image/png;base64,${res.base64}`);
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Capture failed. Is the bridge running?");
    } finally {
      setCapturing(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOut(null);
    if (!imageBase64 || !width || !height) {
      setErr("Select a PNG fingerprint image first.");
      return;
    }
    try {
      const res = await api<{ id: string; qualityScore?: number }>(`/students/${studentId}/enrollments`, {
        method: "POST",
        body: JSON.stringify({
          fingerCode,
          imageBase64,
          width,
          height,
          dpi,
          format: imgFormat,
          qualityMin,
        }),
      });
      setOut({ id: res.id, qualityScore: res.qualityScore });
      setImg("");
      setW(0);
      setH(0);
      setPreviewUrl(null);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <>
      <p>
        <Link to="/students">← Students</Link>
      </p>
      <h1>Fingerprint enrollment</h1>
      <div className="card">
        <p>
          Ensure your Futronic scanner is plugged in and the local capture bridge is running.
        </p>
        <div style={{ background: "#0f172a", padding: "1rem", borderRadius: 8, marginBottom: "1.5rem", border: "1px solid #334155" }}>
          <h3 style={{ margin: "0 0 0.5rem", fontSize: "1rem" }}>Capture from scanner</h3>
          <p style={{ fontSize: "0.85rem", color: "#94a3b8", margin: "0 0 0.75rem" }}>
            Requires the local capture bridge running on this PC.
          </p>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
            <input
              value={bridgeUrl}
              onChange={(e) => { setBridgeUrl(e.target.value); setBridgeStatus(null); }}
              placeholder="http://127.0.0.1:5055"
              style={{ maxWidth: 220 }}
            />
            <button type="button" className="secondary" onClick={checkBridge} disabled={bridgeStatus === "checking"}>
              {bridgeStatus === "checking" ? "Checking…" : "Test connection"}
            </button>
            <button type="button" onClick={captureLive} disabled={capturing}>
              {capturing ? "Capturing…" : "Capture live"}
            </button>
            {bridgeStatus === "ok" && <span style={{ color: "#4ade80", fontSize: "0.85rem", marginLeft: 8 }}>✓ Connected: {bridgeScanner}</span>}
            {bridgeStatus === "error" && <span style={{ color: "#f87171", fontSize: "0.85rem", marginLeft: 8 }}>✗ Cannot connect</span>}
          </div>
        </div>
        {out && (
          <div style={{ marginTop: "1.25rem", padding: "1rem", background: "#052e16", border: "1px solid #22c55e", borderRadius: 8 }}>
            <h3 style={{ margin: "0 0 0.5rem", color: "#4ade80", fontSize: "1.05rem" }}>✓ Enrollment Successful</h3>
            <p style={{ margin: 0, fontSize: "0.9rem", color: "#e2e8f0" }}>
              Template generated securely and saved to database.
              {out.qualityScore !== undefined && ` Quality score: ${Math.round(out.qualityScore)}/100`}
            </p>
          </div>
        )}
        <form onSubmit={submit}>
          <label>Finger</label>
          <select value={fingerCode} onChange={(e) => setFinger(e.target.value)}>
            <option value="LEFT_INDEX">Left index</option>
            <option value="LEFT_MIDDLE">Left middle</option>
            <option value="LEFT_RING">Left ring</option>
            <option value="LEFT_LITTLE">Left little</option>
            <option value="LEFT_THUMB">Left thumb</option>
            <option value="RIGHT_INDEX">Right index</option>
            <option value="RIGHT_MIDDLE">Right middle</option>
            <option value="RIGHT_RING">Right ring</option>
            <option value="RIGHT_LITTLE">Right little</option>
            <option value="RIGHT_THUMB">Right thumb</option>
          </select>

          <label style={{ marginTop: "1rem", display: "block" }}>Minimum quality score (0–100)</label>
          <input
            type="number"
            value={qualityMin}
            onChange={(e) => setQm(+e.target.value)}
            min={0}
            max={100}
          />

          {previewUrl && (
            <div style={{ marginTop: "1.5rem", textAlign: "center", background: "#052e16", padding: "1.5rem", borderRadius: 12, border: "1px solid #22c55e", boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
              <img
                src={previewUrl}
                alt="Preview"
                style={{ maxWidth: 220, maxHeight: 220, border: "2px solid #4ade80", borderRadius: 8, display: "block", margin: "0 auto", backgroundColor: "#000" }}
              />
              <p style={{ fontSize: "1rem", color: "#4ade80", margin: "1rem 0 0.5rem", fontWeight: 600 }}>
                Fingerprint captured successfully ({width}×{height}px)
              </p>
              <div style={{ marginTop: "1rem", display: "flex", gap: "0.75rem", justifyContent: "center" }}>
                <button type="button" className="secondary" onClick={() => {
                  setPreviewUrl(null);
                  setImg("");
                  setW(0);
                  setH(0);
                }}>
                  Discard & Retry
                </button>
                <button type="submit" disabled={!imageBase64} style={{ background: "#22c55e", color: "#fff", padding: "0.5rem 1.5rem" }}>
                  Save & Enroll
                </button>
              </div>
            </div>
          )}

          {err && <p className="error" style={{ marginTop: "1rem" }}>{err}</p>}
          
          {!previewUrl && (
            <div style={{ marginTop: "1rem" }}>
              <p style={{ color: "#94a3b8", fontSize: "0.9rem", textAlign: "center" }}>
                Capture a fingerprint using the hardware scanner above to save it.
              </p>
            </div>
          )}
        </form>
      </div>
    </>
  );
}
