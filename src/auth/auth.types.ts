export type Role = "SUPER_ADMIN" | "COORDINADOR" | "MEDICO" | "CONSULTA_PD";

export type User = {
  userId: string;
  displayName: string;
  role: Role;
  funcionario?: string;
  cedula?: string;
};

export function homeForRole(role: Role): string {
  if (role === "CONSULTA_PD") return "/parte-diario";
  if (role === "MEDICO")      return "/parte-diario";
  return "/dashboard";
}
