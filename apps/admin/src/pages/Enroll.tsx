import { Link, useParams } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { api } from "../api";

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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dpi, setDpi] = useState(500);
  const [qualityMin, setQm] = useState(40);
  const [out, setOut] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOut(null);
    if (!imageBase64 || !width || !height) {
      setErr("Select a PNG fingerprint image first.");
      return;
    }
    try {
      const res = await api<unknown>(`/students/${studentId}/enrollments`, {
        method: "POST",
        body: JSON.stringify({
          fingerCode,
          imageBase64,
          width,
          height,
          dpi,
          format: "png",
          qualityMin,
        }),
      });
      setOut(JSON.stringify(res, null, 2));
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
          Upload a <strong>PNG</strong> fingerprint image (from your scanner export or capture software).
          For <strong>SecuGen Hamster Pro</strong>, browsers cannot open USB directly — use vendor export
          here, or the hall node’s <strong>capture bridge</strong> for live capture (
          <code>docs/hardware-and-capture.md</code>). The API runs <strong>SourceAFIS</strong> for
          templates; only encrypted templates are stored.
        </p>
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

          <label style={{ marginTop: "0.75rem", display: "block" }}>Fingerprint image (PNG)</label>
          <input type="file" accept="image/png" onChange={onFile} />
          {previewUrl && (
            <div style={{ marginTop: "0.75rem" }}>
              <img
                src={previewUrl}
                alt="Preview"
                style={{ maxWidth: "100%", maxHeight: 220, border: "1px solid #334155" }}
              />
              <p style={{ fontSize: "0.9rem", marginTop: "0.35rem" }}>
                Size: {width}×{height}px (read from file)
              </p>
            </div>
          )}

          <label>DPI (must match acquisition; default 500)</label>
          <input type="number" min={100} max={2000} value={dpi} onChange={(e) => setDpi(+e.target.value)} />

          <label>Minimum quality score (0–100)</label>
          <input
            type="number"
            value={qualityMin}
            onChange={(e) => setQm(+e.target.value)}
            min={0}
            max={100}
          />

          {err && <p className="error">{err}</p>}
          <div style={{ marginTop: "0.75rem" }}>
            <button type="submit" disabled={!imageBase64}>
              Save template
            </button>
          </div>
        </form>
        {out && (
          <pre style={{ marginTop: "1rem", fontSize: "0.85rem" }}>{out}</pre>
        )}
      </div>
    </>
  );
}
