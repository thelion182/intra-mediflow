import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { authStore } from "../../auth/auth.store";
import { convocatoriaStore, getMedicosCatalogo } from "./convocatoria.store";
import { medicosStore } from "../admin/medicos.store";
import { especialidadesStore } from "../admin/especialidades.store";
import { configStore } from "../config/config.store";
import { AppShell } from "../../ui/AppShell";

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(dtIso?: string) {
  if (!dtIso) return "—";
  try { return new Date(dtIso).toLocaleString("es-UY", { dateStyle: "short", timeStyle: "short" }); }
  catch { return "—"; }
}

function fmtDate(dtIso?: string) {
  if (!dtIso) return "—";
  try { return new Date(dtIso).toLocaleDateString("es-UY"); }
  catch { return "—"; }
}

function waLink(phoneE164: string, text: string) {
  const digits = String(phoneE164 || "").replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

function estadoBadgeStyle(estado: string): React.CSSProperties {
  switch (estado) {
    case "ENVIADA":       return { background: "rgba(59,130,246,.12)",  color: "rgb(29,78,216)",   border: "1px solid rgba(59,130,246,.30)"  };
    case "ACEPTO":        return { background: "rgba(22,163,74,.12)",   color: "rgb(15,118,55)",   border: "1px solid rgba(22,163,74,.35)"   };
    case "RECHAZO":       return { background: "rgba(220,38,38,.10)",   color: "rgb(185,28,28)",   border: "1px solid rgba(220,38,38,.30)"   };
    case "SIN_RESPUESTA": return { background: "rgba(217,119,6,.10)",   color: "rgb(161,85,4)",    border: "1px solid rgba(217,119,6,.30)"   };
    default:              return { background: "rgba(100,116,139,.10)", color: "rgb(71,85,105)",   border: "1px solid rgba(100,116,139,.25)" };
  }
}

function estadoLabel(estado: string) {
  switch (estado) {
    case "ENVIADA":       return "Notificado";
    case "ACEPTO":        return "Aceptó";
    case "RECHAZO":       return "Rechazó";
    case "SIN_RESPUESTA": return "Sin respuesta";
    case "EN_ESPERA":     return "En espera";
    case "VENCIDA":       return "Vencida";
    case "CUBIERTA_X_OTRO": return "Cubierto x otro";
    default:              return estado || "—";
  }
}

function convEstadoBadge(estado: string): React.CSSProperties {
  switch (estado) {
    case "CUBIERTA": return { background: "rgba(22,163,74,.15)",  color: "rgb(15,118,55)",  border: "1px solid rgba(22,163,74,.40)"  };
    case "ENVIADA":  return { background: "rgba(59,130,246,.12)", color: "rgb(29,78,216)",  border: "1px solid rgba(59,130,246,.30)" };
    case "PARCIAL":  return { background: "rgba(217,119,6,.12)",  color: "rgb(161,85,4)",   border: "1px solid rgba(217,119,6,.30)"  };
    case "VENCIDA":  return { background: "rgba(220,38,38,.10)",  color: "rgb(185,28,28)",  border: "1px solid rgba(220,38,38,.30)"  };
    case "CANCELADA":return { background: "rgba(100,116,139,.12)",color: "rgb(71,85,105)",  border: "1px solid rgba(100,116,139,.30)"};
    default:         return { background: "rgba(100,116,139,.10)",color: "rgb(71,85,105)",  border: "1px solid rgba(100,116,139,.25)"};
  }
}

// ── DetalleConvocatoria ────────────────────────────────────────────────────

export function DetalleConvocatoria() {
  const { id } = useParams();
  const nav = useNavigate();
  const session = authStore.getSession()!;
  const [tick, setTick] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const c = useMemo(() => (id ? convocatoriaStore.get(id) : null), [id, tick]);

  const medicosSnap = useMemo(() => getMedicosCatalogo(), [tick]);
  const medicosFull = useMemo(() => medicosStore.list(), [tick]);
  const iconosEsp   = useMemo(() => especialidadesStore.getAll(), [tick]);
  const cfg         = useMemo(() => configStore.get(), []);

  const medicoData = (medicoId: string) => {
    const m = medicosFull.find(x => x.userId === medicoId);
    return {
      nombre: m?.displayName ?? medicoId,
      telefono: (m as any)?.telefono ?? "",
      especialidad: (m as any)?.especialidad ?? "",
      tipo: (m as any)?.tipo ?? "SUPLENTE",
    };
  };

  const [form, setForm] = useState(() => ({
    sector: c?.sector || "",
    sede: c?.sede || "",
    inicio: c?.inicio || "",
    fin: c?.fin || "",
    cupos: c?.cupos || 1,
    vencimiento: c?.vencimiento || "",
    prioridad: (c?.prioridad || "NORMAL") as "NORMAL" | "ALTA",
    notas: c?.notas || "",
  }));

  if (!c) {
    return (
      <AppShell>
        <div style={{ padding: 40, textAlign: "center" }}>
          <p style={{ color: "var(--muted)" }}>Convocatoria no encontrada.</p>
          <button onClick={() => nav("/dashboard")} style={ghostBtn}>Volver al dashboard</button>
        </div>
      </AppShell>
    );
  }

  const confirmadas = (c.asignaciones || []).filter(
    a => a.estado === "CONFIRMADA" || a.estado === "CUMPLIDA"
  ).length;

  const cancelada = c.estado === "CANCELADA";

  // ── Generador de mensaje WA ──────────────────────────────────────────────
  function buildWaMsg(medicoNombre: string) {
    const inst = cfg.organizacion.nombre || "INTRA MediFlow";
    const turnoInicio = fmt(c.inicio);
    const turnoFin    = fmt(c.fin);
    const sector = c.sector + (c.sede ? ` · ${c.sede}` : "");
    return (
      `*${inst}*\n` +
      `📋 *Convocatoria de Guardia* [${c.id}]\n\n` +
      `Dr./Dra. *${medicoNombre}*\n\n` +
      `Sector: ${sector}\n` +
      `Turno: ${turnoInicio} → ${turnoFin}\n` +
      (c.notas ? `Notas: ${c.notas}\n` : "") +
      `\n¿Podés cubrir esta guardia?\n` +
      `Respondé con *Acepto* o *No puedo*.\n\n` +
      `Gracias.`
    );
  }

  function onSaveEdit() {
    const sector = form.sector.trim();
    if (!sector) return alert("Sector es obligatorio.");
    convocatoriaStore.update(
      c.id,
      {
        sector,
        sede: form.sede.trim() || undefined,
        inicio: new Date(form.inicio).toISOString(),
        fin: new Date(form.fin).toISOString(),
        cupos: Number(form.cupos) || 1,
        vencimiento: new Date(form.vencimiento).toISOString(),
        prioridad: form.prioridad,
        notas: form.notas.trim() || undefined,
      },
      session.userId
    );
    setEditMode(false);
    setTick(t => t + 1);
  }

  function onCancel() {
    const reason = cancelReason.trim();
    if (!reason) return alert("Ingresá el motivo de cancelación.");
    convocatoriaStore.cancel(c.id, reason, session.userId);
    setCancelConfirm(false);
    setCancelReason("");
    setTick(t => t + 1);
  }

  function setInv(medicoId: string, estado: "ENVIADA" | "ACEPTO" | "RECHAZO" | "SIN_RESPUESTA") {
    convocatoriaStore.setInvManual(c.id, medicoId, estado);
    setTick(t => t + 1);
  }

  const TIPO_RGB: Record<string, string> = {
    TITULAR: "21,101,192", SUPLENTE: "22,163,74", INDEPENDIENTE: "217,119,6",
  };

  return (
    <AppShell>
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em" }}>
              {c.sector}{c.sede ? ` · ${c.sede}` : ""}
            </h1>
            <span style={{
              padding: "3px 10px", borderRadius: 20, fontSize: 11.5, fontWeight: 700,
              ...convEstadoBadge(c.estado),
            }}>{c.estado}</span>
            {c.prioridad === "ALTA" && (
              <span style={{
                padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                background: "rgba(220,38,38,.10)", color: "rgb(185,28,28)", border: "1px solid rgba(220,38,38,.30)",
              }}>ALTA PRIORIDAD</span>
            )}
          </div>
          <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>
            {fmtDate(c.inicio)} · {fmt(c.inicio).split(",")[1]?.trim()} → {fmt(c.fin).split(",")[1]?.trim()}
            {" · "}{confirmadas}/{c.cupos} cupo{c.cupos !== 1 ? "s" : ""} cubierto{c.cupos !== 1 ? "s" : ""}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => nav("/dashboard")} style={ghostBtn}>← Volver</button>
          <button onClick={() => setTick(t => t + 1)} style={ghostBtn} title="Refrescar">↺</button>
          {!cancelada && (
            <>
              <button onClick={() => { setEditMode(v => !v); setCancelConfirm(false); }} style={ghostBtn}>
                {editMode ? "Cerrar edición" : "Editar"}
              </button>
              <button
                onClick={() => { setCancelConfirm(v => !v); setEditMode(false); }}
                style={{ ...ghostBtn, borderColor: "rgba(220,38,38,.30)", color: "rgb(185,28,28)" }}
              >
                Cancelar convocatoria
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Cancelar confirm ── */}
      {cancelConfirm && (
        <div style={alertBox("rgba(220,38,38,.08)", "rgba(220,38,38,.30)")}>
          <p style={{ margin: "0 0 10px", fontWeight: 700, color: "rgb(185,28,28)" }}>Cancelar convocatoria</p>
          <input
            style={inputStyle} placeholder="Motivo de cancelación (obligatorio)"
            value={cancelReason} onChange={e => setCancelReason(e.target.value)}
            onKeyDown={e => e.key === "Enter" && onCancel()}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button onClick={onCancel} style={dangerBtn}>Confirmar cancelación</button>
            <button onClick={() => { setCancelConfirm(false); setCancelReason(""); }} style={ghostBtn}>Cerrar</button>
          </div>
        </div>
      )}

      {/* ── Editar convocatoria ── */}
      {editMode && (
        <div style={panelStyle}>
          <h3 style={h3Style}>Editar convocatoria</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={lblStyle}>Sector</label>
              <input style={inputStyle} value={form.sector} onChange={e => setForm(f => ({ ...f, sector: e.target.value }))} />
            </div>
            <div>
              <label style={lblStyle}>Sede</label>
              <input style={inputStyle} value={form.sede} onChange={e => setForm(f => ({ ...f, sede: e.target.value }))} />
            </div>
            <div>
              <label style={lblStyle}>Inicio</label>
              <input style={inputStyle} type="datetime-local" value={form.inicio?.slice(0,16)} onChange={e => setForm(f => ({ ...f, inicio: e.target.value }))} />
            </div>
            <div>
              <label style={lblStyle}>Fin</label>
              <input style={inputStyle} type="datetime-local" value={form.fin?.slice(0,16)} onChange={e => setForm(f => ({ ...f, fin: e.target.value }))} />
            </div>
            <div>
              <label style={lblStyle}>Vencimiento</label>
              <input style={inputStyle} type="datetime-local" value={form.vencimiento?.slice(0,16)} onChange={e => setForm(f => ({ ...f, vencimiento: e.target.value }))} />
            </div>
            <div>
              <label style={lblStyle}>Cupos</label>
              <input style={inputStyle} type="number" min={1} value={form.cupos} onChange={e => setForm(f => ({ ...f, cupos: Number(e.target.value) }))} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={lblStyle}>Notas</label>
              <textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button onClick={onSaveEdit} style={primaryBtn}>Guardar cambios</button>
            <button onClick={() => setEditMode(false)} style={ghostBtn}>Cancelar</button>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16, alignItems: "start" }}>

        {/* ── Panel de Despacho ── */}
        <div style={panelStyle}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h3 style={{ ...h3Style, margin: 0 }}>Panel de Despacho</h3>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>
              {(c.invitaciones || []).filter(i => i.estado === "ACEPTO").length} aceptaron ·{" "}
              {(c.invitaciones || []).filter(i => i.estado === "RECHAZO" || i.estado === "SIN_RESPUESTA").length} rechazaron/sin resp. ·{" "}
              {(c.invitaciones || []).filter(i => i.estado === "ENVIADA").length} pendientes
            </span>
          </div>

          {(c.invitaciones || []).length === 0 && (
            <p style={{ color: "var(--muted)", fontSize: 13 }}>No hay médicos en esta convocatoria.</p>
          )}

          <div style={{ display: "grid", gap: 10 }}>
            {(c.invitaciones || []).map((inv: any, idx: number) => {
              const md = medicoData(inv.medicoId);
              const rgb = TIPO_RGB[md.tipo] ?? "100,116,139";
              const icono = iconosEsp[md.especialidad] ?? "";
              const tel = md.telefono;
              const waMsg = buildWaMsg(md.nombre);
              const estado = inv.estado as string;

              return (
                <div key={inv.medicoId} style={{
                  borderRadius: 12, border: `1px solid var(--border-2)`,
                  borderLeft: `3.5px solid rgb(${rgb})`,
                  background: estado === "ACEPTO"
                    ? "rgba(22,163,74,0.04)"
                    : estado === "RECHAZO" || estado === "SIN_RESPUESTA"
                    ? "rgba(100,116,139,0.04)"
                    : "var(--surface-2)",
                  padding: "12px 14px",
                  transition: "all 0.12s",
                }}>
                  {/* Fila superior: nombre + estado + WA */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700, fontSize: 13.5, color: "var(--text)" }}>
                        {idx + 1}. {md.nombre}
                      </span>
                      {md.especialidad && (
                        <span style={{ fontSize: 12, color: "var(--muted)" }}>
                          {icono ? `${icono} ` : ""}{md.especialidad}
                        </span>
                      )}
                      <span style={{
                        padding: "1px 8px", borderRadius: 20, fontSize: 10.5, fontWeight: 700,
                        background: `rgba(${rgb},0.12)`, color: `rgb(${rgb})`, border: `1px solid rgba(${rgb},0.22)`,
                      }}>{md.tipo === "INDEPENDIENTE" ? "Indep." : md.tipo === "TITULAR" ? "Titular" : "Suplente"}</span>
                      {tel
                        ? <span style={{ fontSize: 11, color: "var(--subtle)" }}>📞 {tel}</span>
                        : <span style={{ fontSize: 11, color: "rgb(185,28,28)" }}>Sin teléfono</span>
                      }
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{
                        padding: "3px 10px", borderRadius: 20, fontSize: 11.5, fontWeight: 700,
                        ...estadoBadgeStyle(estado),
                      }}>{estadoLabel(estado)}</span>

                      {tel && !cancelada && (
                        <a
                          href={waLink(tel, waMsg)}
                          target="_blank"
                          rel="noreferrer"
                          title="Enviar invitación por WhatsApp"
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 5,
                            padding: "6px 13px", borderRadius: 8, fontSize: 12.5, fontWeight: 700,
                            background: "rgba(37,211,102,0.12)", color: "rgb(18,130,60)",
                            border: "1.5px solid rgba(37,211,102,0.40)", textDecoration: "none",
                            transition: "all 0.12s",
                          }}
                        >
                          📱 WA
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Fila inferior: botones de estado manual */}
                  {!cancelada && (
                    <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                      {(["ENVIADA", "ACEPTO", "RECHAZO", "SIN_RESPUESTA"] as const).map(s => {
                        const active = estado === s;
                        const styles: Record<string, { bg: string; color: string; border: string; label: string }> = {
                          ENVIADA:       { bg: "rgba(59,130,246,.12)",  color: "rgb(29,78,216)",  border: "rgba(59,130,246,.40)",  label: "Notificado" },
                          ACEPTO:        { bg: "rgba(22,163,74,.12)",   color: "rgb(15,118,55)",  border: "rgba(22,163,74,.40)",   label: "Aceptó" },
                          RECHAZO:       { bg: "rgba(220,38,38,.10)",   color: "rgb(185,28,28)",  border: "rgba(220,38,38,.35)",   label: "Rechazó" },
                          SIN_RESPUESTA: { bg: "rgba(217,119,6,.10)",   color: "rgb(161,85,4)",   border: "rgba(217,119,6,.35)",   label: "Sin resp." },
                        };
                        const st = styles[s];
                        return (
                          <button
                            key={s}
                            onClick={() => setInv(inv.medicoId, s)}
                            style={{
                              padding: "5px 12px", borderRadius: 7, fontSize: 12, fontWeight: active ? 700 : 500,
                              border: `1.5px solid ${active ? st.border : "var(--border-2)"}`,
                              background: active ? st.bg : "var(--surface)",
                              color: active ? st.color : "var(--muted)",
                              cursor: "pointer", transition: "all 0.12s",
                            }}
                          >{st.label} {active ? "✓" : ""}</button>
                        );
                      })}
                    </div>
                  )}

                  {/* Timestamps */}
                  {(inv.sentAt || inv.respondedAt) && (
                    <div style={{ fontSize: 11, color: "var(--subtle)", marginTop: 7 }}>
                      {inv.sentAt && `Notificado: ${fmt(inv.sentAt)}`}
                      {inv.respondedAt && ` · Respondió: ${fmt(inv.respondedAt)}`}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Columna derecha ── */}
        <div style={{ display: "grid", gap: 14 }}>

          {/* Resumen */}
          <div style={panelStyle}>
            <h3 style={{ ...h3Style, marginBottom: 12 }}>Resumen</h3>
            <div style={{ display: "grid", gap: 8 }}>
              {[
                { label: "Estado",    value: c.estado },
                { label: "Prioridad", value: c.prioridad },
                { label: "Cupos",     value: `${confirmadas} / ${c.cupos} cubiertos` },
                { label: "Vence",     value: fmt(c.vencimiento) },
              ].map(r => (
                <div key={r.label} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>{r.label}</span>
                  <span style={{ fontSize: 12, color: "var(--text)", fontWeight: 700, textAlign: "right" }}>{r.value}</span>
                </div>
              ))}
              {c.notas && (
                <div style={{ marginTop: 4, padding: "8px 10px", borderRadius: 8, background: "var(--surface-2)", fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>
                  {c.notas}
                </div>
              )}
              {cancelada && c.cancelReason && (
                <div style={{ padding: "8px 10px", borderRadius: 8, background: "rgba(220,38,38,.08)", fontSize: 12, color: "rgb(185,28,28)", lineHeight: 1.5 }}>
                  <b>Motivo cancelación:</b> {c.cancelReason}
                </div>
              )}
            </div>
          </div>

          {/* Asignaciones confirmadas */}
          {(c.asignaciones || []).filter(a => a.estado === "CONFIRMADA" || a.estado === "CUMPLIDA").length > 0 && (
            <div style={panelStyle}>
              <h3 style={{ ...h3Style, marginBottom: 12 }}>Médicos asignados</h3>
              <div style={{ display: "grid", gap: 8 }}>
                {(c.asignaciones || [])
                  .filter(a => a.estado === "CONFIRMADA" || a.estado === "CUMPLIDA")
                  .map(a => {
                    const md = medicoData(a.medicoId);
                    return (
                      <div key={a.id} style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "8px 12px", borderRadius: 9,
                        background: "rgba(22,163,74,0.07)", border: "1px solid rgba(22,163,74,0.25)",
                      }}>
                        <span style={{ fontSize: 16 }}>✓</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text)" }}>{md.nombre}</div>
                          {md.especialidad && <div style={{ fontSize: 11, color: "var(--muted)" }}>{md.especialidad}</div>}
                        </div>
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: "rgb(15,118,55)" }}>{a.estado}</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Stats de despacho */}
          <div style={panelStyle}>
            <h3 style={{ ...h3Style, marginBottom: 12 }}>Estado del despacho</h3>
            <div style={{ display: "grid", gap: 6 }}>
              {[
                { label: "Notificados",   est: "ENVIADA",       rgb: "59,130,246" },
                { label: "Aceptaron",     est: "ACEPTO",        rgb: "22,163,74"  },
                { label: "Rechazaron",    est: "RECHAZO",       rgb: "220,38,38"  },
                { label: "Sin respuesta", est: "SIN_RESPUESTA", rgb: "217,119,6"  },
                { label: "En espera",     est: "EN_ESPERA",     rgb: "100,116,139"},
              ].map(row => {
                const count = (c.invitaciones || []).filter((i: any) => i.estado === row.est).length;
                return (
                  <div key={row.est} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ flex: 1, fontSize: 12, color: "var(--muted)" }}>{row.label}</div>
                    <span style={{
                      padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700,
                      background: count > 0 ? `rgba(${row.rgb},0.12)` : "var(--surface-2)",
                      color: count > 0 ? `rgb(${row.rgb})` : "var(--subtle)",
                      border: `1px solid ${count > 0 ? `rgba(${row.rgb},0.30)` : "var(--border-2)"}`,
                    }}>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const panelStyle: React.CSSProperties = {
  background: "var(--surface)", border: "1px solid var(--border)",
  borderRadius: 14, padding: "18px 20px",
};

const h3Style: React.CSSProperties = {
  margin: 0, fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 14,
};

const lblStyle: React.CSSProperties = {
  display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 5,
};

const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  padding: "8px 11px", borderRadius: 8,
  border: "1px solid var(--border)", background: "var(--surface-2)",
  fontSize: 13, color: "var(--text)", fontFamily: "inherit",
};

const primaryBtn: React.CSSProperties = {
  padding: "9px 20px", borderRadius: 9, border: "none",
  background: "var(--blue)", color: "#fff", fontWeight: 700, fontSize: 13.5, cursor: "pointer",
};

const ghostBtn: React.CSSProperties = {
  padding: "8px 16px", borderRadius: 9,
  border: "1px solid var(--border)", background: "var(--surface-2)",
  color: "var(--muted)", fontWeight: 600, fontSize: 13, cursor: "pointer",
};

const dangerBtn: React.CSSProperties = {
  padding: "9px 20px", borderRadius: 9, border: "none",
  background: "rgb(220,38,38)", color: "#fff", fontWeight: 700, fontSize: 13.5, cursor: "pointer",
};

function alertBox(bg: string, border: string): React.CSSProperties {
  return {
    padding: "16px 18px", borderRadius: 12, marginBottom: 16,
    background: bg, border: `1px solid ${border}`,
  };
}
