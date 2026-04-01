const base = "/api";

const USER_KEY = "user";
const TENANT_KEY = "selectedTenantId";

export type UserJson = {
  id: string;
  email: string;
  role: string;
  tenantId: string | null;
};

export type TenantRow = { id: string; name: string; slug: string };

function decodeJwtPayload(token: string): { sub: string; role: string; tenantId: string | null } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    let b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4;
    if (pad) b64 += "====".slice(0, 4 - pad);
    const json = atob(b64);
    const payload = JSON.parse(json) as { sub?: string; role?: string; tenantId?: string | null };
    if (!payload.sub || !payload.role) return null;
    return {
      sub: payload.sub,
      role: payload.role,
      tenantId: payload.tenantId ?? null,
    };
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  return localStorage.getItem("token");
}

export function setToken(t: string | null) {
  if (t) localStorage.setItem("token", t);
  else localStorage.removeItem("token");
}

export function getUser(): UserJson | null {
  const raw = localStorage.getItem(USER_KEY);
  if (raw) {
    try {
      return JSON.parse(raw) as UserJson;
    } catch {
      /* fall through */
    }
  }
  const t = getToken();
  if (!t) return null;
  const p = decodeJwtPayload(t);
  if (!p) return null;
  const u: UserJson = {
    id: p.sub,
    email: "",
    role: p.role,
    tenantId: p.tenantId,
  };
  setUser(u);
  return u;
}

export function setUser(u: UserJson | null) {
  if (u) localStorage.setItem(USER_KEY, JSON.stringify(u));
  else localStorage.removeItem(USER_KEY);
}

export function getSelectedTenantId(): string | null {
  return localStorage.getItem(TENANT_KEY);
}

export function setSelectedTenantId(id: string | null) {
  if (id) localStorage.setItem(TENANT_KEY, id);
  else localStorage.removeItem(TENANT_KEY);
}

export function clearSession() {
  setToken(null);
  setUser(null);
  setSelectedTenantId(null);
}

/** Paths that require `?tenantId=` when logged in as SUPER_ADMIN. */
function needsTenantQuery(path: string): boolean {
  if (path.startsWith("/auth/")) return false;
  if (path === "/tenants" || path.startsWith("/tenants?")) return false;
  return (
    path.startsWith("/students") ||
    path.startsWith("/devices") ||
    path.startsWith("/exams") ||
    path.startsWith("/reports") ||
    path.startsWith("/verify")
  );
}

export function withTenantQuery(path: string): string {
  const user = getUser();
  if (!user || user.role !== "SUPER_ADMIN") return path;
  if (!needsTenantQuery(path)) return path;
  if (path.includes("tenantId=")) return path;
  const tid = getSelectedTenantId();
  if (!tid) return path;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}tenantId=${encodeURIComponent(tid)}`;
}

/** Full URL under `/api` for raw `fetch` (e.g. CSV download). */
export function apiUrl(path: string): string {
  return `${base}${withTenantQuery(path)}`;
}

export async function api<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${base}${withTenantQuery(path)}`, { ...opts, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  const ct = res.headers.get("content-type");
  if (ct?.includes("application/json")) return res.json() as Promise<T>;
  return undefined as T;
}
