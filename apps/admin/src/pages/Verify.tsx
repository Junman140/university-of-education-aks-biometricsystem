import { useEffect, useState } from "react";
import { api } from "../api";
import { captureFromBridge, pingBridge } from "../lib/capture";

type Exam = { id: string; title: string; courseId: string | null; academicYear: string | null; semester: number | null };

type VerifyResult = {
  result: string;
  matchScore: number | null;
  student?: { id: string; matricNo: string; fullName?: string; photoUrl?: string | null } | null;
  examId?: string;
  courseId?: string | null;
  academicYear?: string | null;
  semester?: number | null;
  detail?: string;
  hint?: string;
  error?: string;
};

type RecentEvent = {
  id: string;
  capturedAt: string;
  result: string;
  matchScore: number | null;
  student: { matricNo: string; fullName: string };
};

function readPng(file: File): Promise<{ base64: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    if (file.type && file.type !== "image/png") {
      reject(new Error("Only PNG files are supported."));
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
        resolve({ base64: i >= 0 ? dataUrl.slice(i + 7) : dataUrl, width: w, height: h });
      };
      reader.onerror = () => reject(new Error("Could not read file"));
      reader.readAsDataURL(file);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Invalid image"));
    };
    img.src = url;
  });
}

const RESULT_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  match:                    { label: "MATCH",                  color: "#052e16", bg: "#22c55e" },
  already_verified:         { label: "ALREADY VERIFIED",       color: "#052e16", bg: "#38bdf8" },
  no_match:                 { label: "NO MATCH",               color: "#fef2f2", bg: "#ef4444" },
  not_enrolled:             { label: "NOT ENROLLED",           color: "#422006", bg: "#f59e0b" },
  no_student:               { label: "STUDENT NOT FOUND",      color: "#422006", bg: "#f59e0b" },
  not_on_roster:            { label: "NOT ON EXAM ROSTER",     color: "#422006", bg: "#f59e0b" },
  not_registered_for_course:{ label: "NOT REGISTERED FOR COURSE", color: "#422006", bg: "#f59e0b" },
  exam_not_found:           { label: "EXAM NOT FOUND",         color: "#422006", bg: "#f59e0b" },
  exam_not_configured:      { label: "EXAM NOT CONFIGURED",    color: "#422006", bg: "#f59e0b" },
  session_mismatch:         { label: "SESSION MISMATCH",       color: "#422006", bg: "#f59e0b" },
  course_mismatch:          { label: "COURSE MISMATCH",        color: "#422006", bg: "#f59e0b" },
};

export default function Verify() {
  const [exams, setExams] = useState<Exam[]>([]);
  // const [matricNo, setMatric] = useState("");
  const [examId, setExamId] = useState("");
  const [imageBase64, setImg] = useState("");
  const [imgFormat, setImgFormat] = useState<"png" | "raw_gray8">("png");
  const [width, setW] = useState(0);
  const [height, setH] = useState(0);
  const [dpi, setDpi] = useState(500);
  const [previewUrl, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [recent, setRecent] = useState<RecentEvent[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [bridgeUrl, setBridgeUrl] = useState(() => localStorage.getItem("captureBridgeUrl") || "http://127.0.0.1:5055");
  const [bridgeStatus, setBridgeStatus] = useState<"checking" | "ok" | "error" | null>(null);
  const [bridgeScanner, setBridgeScanner] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);

  // Student Search is no longer used for verification (it's 1-to-N now)
  // const [searchQ, setSearchQ] = useState("");
  // const [searchResults, setSearchResults] = useState<{ id: string; matricNo: string; fullName: string }[]>([]);
  // const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    api<Exam[]>("/exams").then(setExams).catch(() => {});
    api<RecentEvent[]>("/reports/verification-events")
      .then((r) => setRecent(r.slice(0, 20)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

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
    setResult(null);
    setCapturing(true);
    localStorage.setItem("captureBridgeUrl", bridgeUrl);
    try {
      const res = await captureFromBridge(bridgeUrl);
      setImg(res.base64);
      setImgFormat(res.format as "png" | "raw_gray8");
      setW(res.width);
      setH(res.height);
      setDpi(res.dpi);
      
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
            imgData.data[i * 4 + 3] = 255;         // A
          }
          ctx.putImageData(imgData, 0, 0);
          setPreview(canvas.toDataURL("image/png"));
        }
      } else {
        setPreview(`data:image/png;base64,${res.base64}`);
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Capture failed. Is the bridge running?");
    } finally {
      setCapturing(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setResult(null);
    if (!imageBase64 || !width || !height) {
      setErr("Please capture a fingerprint first.");
      return;
    }
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        imageBase64,
        width,
        height,
        dpi,
        format: imgFormat,
      };
      if (examId) body.examId = examId;
      // We no longer send matricNo, we use /verify/identify
      const res = await api<VerifyResult>("/verify/identify", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setResult(res);
      api<RecentEvent[]>("/reports/verification-events")
        .then((r) => setRecent(r.slice(0, 20)))
        .catch(() => {});
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Verification failed";
      if (msg.includes("Matching service")) {
        setErr("Matching service is not running. Start the SourceAFIS Java service (pnpm dev includes it).");
      } else {
        setErr(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  const badge = result ? RESULT_LABELS[result.result] ?? { label: result.result, color: "#fff", bg: "#64748b" } : null;

  return (
    <>
      <h1>Verify student identity</h1>
      <p style={{ fontSize: "0.9rem", color: "#94a3b8", maxWidth: 640 }}>
        Capture a fingerprint to identify the student. Optionally tie the verification to an <strong>exam</strong> for roster and course registration checks.
      </p>

      <div className="card">
        <form onSubmit={verify}>
          <label>Exam (optional — limits search to roster + course check)</label>
          <select value={examId} onChange={(e) => setExamId(e.target.value)}>
            <option value="">— No exam context (Search all students) —</option>
            {exams.map((x) => (
              <option key={x.id} value={x.id}>
                {x.title} {x.academicYear ? `(${x.academicYear} sem ${x.semester ?? "?"})` : ""}
              </option>
            ))}
          </select>

          <div style={{ background: "#0f172a", padding: "1rem", borderRadius: 8, marginTop: "1rem", border: "1px solid #334155" }}>
            <h3 style={{ margin: "0 0 0.5rem", fontSize: "1rem" }}>Capture Fingerprint</h3>
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

          {previewUrl && (
            <div style={{ marginTop: "1rem", textAlign: "center" }}>
              <img src={previewUrl} alt="Fingerprint" style={{ maxWidth: 220, maxHeight: 220, border: "2px solid #22c55e", borderRadius: 8, display: "block", margin: "0 auto" }} />
              <p style={{ fontSize: "0.85rem", color: "#4ade80", marginTop: "0.5rem" }}>Fingerprint captured successfully ({width} × {height}px)</p>
              <button type="button" className="secondary" style={{ marginTop: "0.5rem" }} onClick={() => {
                setPreview(null);
                setImg("");
                setW(0);
                setH(0);
                setResult(null);
              }}>
                Discard & Retry
              </button>
            </div>
          )}

          {err && <p className="error">{err}</p>}

          <div style={{ marginTop: "1rem" }}>
            <button type="submit" disabled={loading || !imageBase64} style={{ width: "100%", padding: "0.75rem", fontSize: "1.05rem", background: imageBase64 ? "#3b82f6" : "#475569" }}>
              {loading ? "Identifying…" : "Identify Student"}
            </button>
          </div>
        </form>
      </div>

      {result && badge && (
        <div
          className="card"
          style={{ borderLeft: `4px solid ${badge.bg}`, marginTop: "0.5rem" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            <span style={{
              background: badge.bg,
              color: badge.color,
              padding: "0.25rem 0.75rem",
              borderRadius: 6,
              fontWeight: 700,
              fontSize: "0.9rem",
            }}>
              {badge.label}
            </span>
            {result.detail && (
              <span style={{ fontSize: "0.85rem", color: "#f87171", marginLeft: "0.5rem" }}>
                ({result.detail})
              </span>
            )}
            {result.matchScore != null && (
              <span style={{ fontSize: "0.9rem", color: "#e2e8f0" }}>
                Score: <strong>{result.matchScore.toFixed(1)}</strong>
              </span>
            )}
          </div>
          {result.student && (
            <div style={{ marginTop: "0.75rem" }}>
              <p style={{ margin: 0 }}>
                <strong>{result.student.fullName ?? "—"}</strong>{" "}
                <span style={{ color: "#94a3b8" }}>({result.student.matricNo})</span>
              </p>
              {result.student.photoUrl && (
                <img
                  src={result.student.photoUrl}
                  alt="Student"
                  style={{ maxWidth: 80, maxHeight: 80, borderRadius: 8, marginTop: "0.5rem", border: "1px solid #334155" }}
                />
              )}
            </div>
          )}
          {result.examId && (
            <p style={{ fontSize: "0.85rem", color: "#94a3b8", marginTop: "0.5rem", margin: 0 }}>
              Exam: {result.examId}
              {result.academicYear && ` · ${result.academicYear}`}
              {result.semester != null && ` · Semester ${result.semester}`}
              {result.courseId && ` · Course ${result.courseId}`}
            </p>
          )}
          {result.detail && (
            <p style={{ fontSize: "0.85rem", color: "#fbbf24", marginTop: "0.35rem" }}>{result.detail}</p>
          )}
        </div>
      )}

      <div className="card" style={{ marginTop: "1rem" }}>
        <h2>Recent verifications</h2>
        {recent.length === 0 ? (
          <p style={{ color: "#94a3b8" }}>No verification events yet.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #334155" }}>
                <th>When</th>
                <th>Result</th>
                <th>Score</th>
                <th>Student</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r) => {
                const b = RESULT_LABELS[r.result];
                return (
                  <tr key={r.id}>
                    <td style={{ fontSize: "0.85rem" }}>{new Date(r.capturedAt).toLocaleString()}</td>
                    <td>
                      <span style={{
                        background: b?.bg ?? "#64748b",
                        color: b?.color ?? "#fff",
                        padding: "0.1rem 0.5rem",
                        borderRadius: 4,
                        fontSize: "0.75rem",
                        fontWeight: 600,
                      }}>
                        {b?.label ?? r.result}
                      </span>
                    </td>
                    <td>{r.matchScore?.toFixed(1) ?? "—"}</td>
                    <td>{r.student.matricNo} — {r.student.fullName}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
