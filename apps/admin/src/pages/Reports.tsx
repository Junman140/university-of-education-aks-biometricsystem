import { useEffect, useState } from "react";
import { api, apiUrl, getToken } from "../api";

type Row = {
  id: string;
  capturedAt: string;
  result: string;
  matchScore: number | null;
  examId: string | null;
  courseId: string | null;
  academicYear: string | null;
  semester: number | null;
  student: { matricNo: string; fullName: string };
  device: { name: string; hallLabel: string | null } | null;
};

export default function Reports() {
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api<Row[]>("/reports/verification-events")
      .then(setRows)
      .catch((e) => setErr(String(e)));
  }, []);

  return (
    <>
      <h1>Verification log</h1>
      <div className="card">
        <button
          type="button"
          className="secondary"
          onClick={async () => {
            const token = getToken();
            const res = await fetch(apiUrl("/reports/verification-events/export.csv"), {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "verification-events.csv";
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          Download CSV
        </button>
        {err && <p className="error">{err}</p>}
        <table style={{ width: "100%", marginTop: "1rem", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #334155" }}>
              <th>When</th>
              <th>Result</th>
              <th>Score</th>
              <th>Year</th>
              <th>Sem</th>
              <th>Course</th>
              <th>Student</th>
              <th>Device</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{new Date(r.capturedAt).toLocaleString()}</td>
                <td>{r.result}</td>
                <td>{r.matchScore ?? ""}</td>
                <td>{r.academicYear ?? "—"}</td>
                <td>{r.semester ?? "—"}</td>
                <td>
                  <code style={{ fontSize: "0.75rem" }}>{r.courseId ?? "—"}</code>
                </td>
                <td>
                  {r.student.matricNo} — {r.student.fullName}
                </td>
                <td>
                  {r.device?.name ?? ""} {r.device?.hallLabel ?? ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
