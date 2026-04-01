import { useEffect, useState } from "react";
import { api } from "../api";

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
  const [matricNo, setMatric] = useState("");
  const [examId, setExamId] = useState("");
  const [imageBase64, setImg] = useState("");
  const [width, setW] = useState(0);
  const [height, setH] = useState(0);
  const [dpi, setDpi] = useState(500);
  const [previewUrl, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [recent, setRecent] = useState<RecentEvent[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api<Exam[]>("/exams").then(setExams).catch(() => {});
    api<RecentEvent[]>("/reports/verification-events")
      .then((r) => setRecent(r.slice(0, 20)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(null);
    setResult(null);
    try {
      const { base64, width: w, height: h } = await readPng(file);
      setImg(base64);
      setW(w);
      setH(h);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreview(URL.createObjectURL(file));
    } catch (er: unknown) {
      setErr(er instanceof Error ? er.message : "Invalid file");
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setResult(null);
    if (!imageBase64 || !width || !height) {
      setErr("Upload a fingerprint image first.");
      return;
    }
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        matricNo,
        imageBase64,
        width,
        height,
        dpi,
        format: "png",
      };
      if (examId) body.examId = examId;
      const res = await api<VerifyResult>("/verify/one-to-one", {
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
        Match a student's live fingerprint against their enrolled biometric templates. Optionally tie the verification to an <strong>exam</strong> for roster and course registration checks.
      </p>

      <div className="card">
        <form onSubmit={verify}>
          <label>Matric number</label>
          <input
            value={matricNo}
            onChange={(e) => setMatric(e.target.value)}
            required
            placeholder="e.g. UED/2020/001"
            autoFocus
          />

          <label>Exam (optional — enables roster + course check)</label>
          <select value={examId} onChange={(e) => setExamId(e.target.value)}>
            <option value="">— No exam context —</option>
            {exams.map((x) => (
              <option key={x.id} value={x.id}>
                {x.title} {x.academicYear ? `(${x.academicYear} sem ${x.semester ?? "?"})` : ""}
              </option>
            ))}
          </select>

          <label>Fingerprint image (PNG)</label>
          <input type="file" accept="image/png" onChange={onFile} />
          {previewUrl && (
            <div style={{ marginTop: "0.5rem" }}>
              <img src={previewUrl} alt="Fingerprint" style={{ maxWidth: 180, maxHeight: 180, border: "1px solid #334155", borderRadius: 8 }} />
              <p style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "0.25rem" }}>{width} × {height}px</p>
            </div>
          )}

          <label>DPI (must match scanner; default 500)</label>
          <input type="number" min={100} max={2000} value={dpi} onChange={(e) => setDpi(+e.target.value)} />

          {err && <p className="error">{err}</p>}

          <div style={{ marginTop: "1rem" }}>
            <button type="submit" disabled={loading || !imageBase64}>
              {loading ? "Verifying…" : "Verify identity"}
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
