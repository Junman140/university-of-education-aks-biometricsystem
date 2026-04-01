import { Navigate, Route, Routes } from "react-router-dom";
import { useEffect, useState } from "react";
import { getToken } from "./api";
import Login from "./pages/Login";
import Layout from "./pages/Layout";
import Students from "./pages/Students";
import Devices from "./pages/Devices";
import Exams from "./pages/Exams";
import Reports from "./pages/Reports";
import Enroll from "./pages/Enroll";

export default function App() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    setAuthed(!!getToken());
    setReady(true);
  }, []);

  if (!ready) return null;

  return (
    <Routes>
      <Route path="/login" element={<Login onLogin={() => setAuthed(true)} />} />
      <Route
        path="/"
        element={
          authed ? <Layout onLogout={() => setAuthed(false)} /> : <Navigate to="/login" replace />
        }
      >
        <Route index element={<Navigate to="/students" replace />} />
        <Route path="students" element={<Students />} />
        <Route path="enroll/:studentId" element={<Enroll />} />
        <Route path="devices" element={<Devices />} />
        <Route path="exams" element={<Exams />} />
        <Route path="reports" element={<Reports />} />
      </Route>
    </Routes>
  );
}
