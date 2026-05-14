import { storage } from "../core/storage";
import type { Role, User } from "./auth.types";
import { medicosStore } from "../modules/admin/medicos.store";
import { usersStore } from "../modules/config/users.store";

const KEY = "intra.session";

// Cuentas demo fijas por rol
const DEMO_ACCOUNTS: Array<{ ids: string[]; user: User }> = [
  {
    ids: ["9999", "F-9999"],
    user: { userId: "F-9999", displayName: "Super Admin (Demo)", role: "SUPER_ADMIN", funcionario: "9999" }
  },
  {
    ids: ["1001", "F-1001"],
    user: { userId: "F-1001", displayName: "Coordinador (Demo)", role: "COORDINADOR", funcionario: "1001" }
  },
  {
    ids: ["5001", "F-5001"],
    user: { userId: "F-5001", displayName: "Médico (Demo)", role: "MEDICO", funcionario: "5001" }
  },
  {
    ids: ["3001", "F-3001"],
    user: { userId: "F-3001", displayName: "Consulta PD (Demo)", role: "CONSULTA_PD", funcionario: "3001" }
  },
];

function onlyDigits(s: string) {
  return (s || "").replace(/\D/g, "");
}

function normalizeInput(input: string) {
  const v = (input || "").trim();
  if (!v) return "";
  const up = v.toUpperCase();
  if (up.startsWith("F-")) return `F-${onlyDigits(up.slice(2))}`;
  if (up.startsWith("CI-")) return `CI-${onlyDigits(up.slice(3))}`;
  if (/^\d+$/.test(v)) return v;
  return v;
}

export const authStore = {
  getSession(): User | null {
    const raw = storage.get<any>(KEY, null);
    if (!raw) return null;
    // Migra roles legacy en caliente
    if (raw.role === "SUPLENCIAS" || raw.role === "ADMIN") {
      const migrated = { ...raw, role: "COORDINADOR" as Role };
      storage.set(KEY, migrated);
      return migrated;
    }
    return raw as User;
  },

  setSession(user: User) {
    storage.set(KEY, user);
  },

  clear() {
    storage.remove(KEY);
  },

  loginWithPassword(input: string, password: string): { ok: true; user: User } | { ok: false; error: string } {
    const res = this.loginByIdOrUserId(input);
    if (!res.ok) return res;
    if (!usersStore.checkPassword(res.user.userId, password))
      return { ok: false, error: "Contraseña incorrecta." };
    return res;
  },

  loginByIdOrUserId(input: string): { ok: true; user: User } | { ok: false; error: string } {
    const v = normalizeInput(input);
    if (!v) return { ok: false, error: "Ingresá un número de funcionario o cédula." };

    // 1) Cuentas demo fijas
    for (const acc of DEMO_ACCOUNTS) {
      if (acc.ids.includes(v)) return { ok: true, user: acc.user };
    }

    return { ok: false, error: "Credenciales incorrectas." };
  }
};
