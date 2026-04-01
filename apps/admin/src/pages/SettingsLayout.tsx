import { NavLink, Outlet } from "react-router-dom";

const s = ({ isActive }: { isActive: boolean }) =>
  ({
    fontWeight: isActive ? 700 : 500,
    color: isActive ? "#e0f2fe" : "#7dd3fc",
    textDecoration: "none",
    padding: "0.25rem 0",
    borderBottom: isActive ? "2px solid #38bdf8" : "2px solid transparent",
  }) as const;

export default function SettingsLayout() {
  return (
    <>
      <nav style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem", borderBottom: "1px solid #1f2937", paddingBottom: "0.5rem" }}>
        <NavLink to="/settings/catalog" style={s}>Catalog</NavLink>
        <NavLink to="/settings/sessions" style={s}>Sessions</NavLink>
        <NavLink to="/settings/registrations" style={s}>Course regs</NavLink>
        <NavLink to="/settings/devices" style={s}>Devices</NavLink>
        <NavLink to="/settings/reports" style={s}>Reports</NavLink>
      </nav>
      <Outlet />
    </>
  );
}
