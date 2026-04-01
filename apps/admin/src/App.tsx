import { Navigate, Route, Routes } from "react-router-dom";
import { useEffect, useState } from "react";
import { getToken } from "./api";
import Login from "./pages/Login";
import Layout from "./pages/Layout";
import SettingsLayout from "./pages/SettingsLayout";
import Students from "./pages/Students";
import StudentEdit from "./pages/StudentEdit";
import Enroll from "./pages/Enroll";
import Exams from "./pages/Exams";
import Verify from "./pages/Verify";
import Catalog from "./pages/Catalog";
import AcademicSessions from "./pages/AcademicSessions";
import CourseRegistrations from "./pages/CourseRegistrations";
import Devices from "./pages/Devices";
import Reports from "./pages/Reports";

export default function App() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => { setAuthed(!!getToken()); setReady(true); }, []);
  if (!ready) return null;

  return (
    <Routes>
      <Route path="/login" element={<Login onLogin={() => setAuthed(true)} />} />
      <Route
        path="/"
        element={authed ? <Layout onLogout={() => setAuthed(false)} /> : <Navigate to="/login" replace />}
      >
        <Route index element={<Navigate to="/students" replace />} />
        <Route path="students" element={<Students />} />
        <Route path="students/:id/edit" element={<StudentEdit />} />
        <Route path="enroll/:studentId" element={<Enroll />} />
        <Route path="exams" element={<Exams />} />
        <Route path="verify" element={<Verify />} />
        <Route path="settings" element={<SettingsLayout />}>
          <Route index element={<Navigate to="catalog" replace />} />
          <Route path="catalog" element={<Catalog />} />
          <Route path="sessions" element={<AcademicSessions />} />
          <Route path="registrations" element={<CourseRegistrations />} />
          <Route path="devices" element={<Devices />} />
          <Route path="reports" element={<Reports />} />
        </Route>
      </Route>
    </Routes>
  );
}
