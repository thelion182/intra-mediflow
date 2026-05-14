# INTRA MediFlow — Contexto de Proyecto para Claude

## Qué es este proyecto

Sistema de gestión de guardias y suplencias médicas con **flujo 100% manual**.
Nace de MediFlow pero elimina todas las integraciones de API (WhatsApp, SMS, Email automatizado).
El coordinador gestiona todo desde la web: envía mensajes manualmente via link de WhatsApp,
registra las respuestas de los médicos a mano, y carga el Parte Diario manualmente.

**Objetivo:** funcionar en múltiples máquinas de la institución con un backend real.
**Fase actual:** localStorage (demo). Próxima fase: Supabase conectado.

---

## Diferencias clave con MediFlow

| Aspecto | MediFlow | INTRA MediFlow |
|---------|----------|----------------|
| Envío de invitaciones | Automático (API WA/SMS) | Manual: link `wa.me` por médico |
| Respuesta médicos | Webhook automático | Coordinador registra en el sistema |
| Parte Diario | Feed automático de convocatorias | Carga manual + import de convocatorias cubiertas |
| Backend | Supabase preparado, no conectado | localStorage → Supabase (próxima fase) |
| Modo secuencial | Auto-avance por timeout | N/A (todo manual) |
| Auto-renovación | Sí | No |
| Canal APP | Sí (vista médico) | No (los médicos no entran al sistema) |

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + TypeScript + Vite |
| Estilos | CSS variables globales `src/index.css` + inline styles |
| Estado | localStorage via `src/core/storage.ts` (keys prefix: `intra.`) |
| Backend | localStorage ahora → Supabase en fase 2 |
| Router | React Router v6 |

---

## Flujo de trabajo del coordinador

### Crear y gestionar una convocatoria

1. **Nueva Convocatoria** → sector, sede, horario, cupos, médicos sugeridos por score
2. **Panel de despacho** → por cada médico en lista:
   - Botón 📱 **Enviar WA** → abre `wa.me/598XXXXXXXX?text=...` con mensaje pre-armado
   - Marcar manualmente: **Enviado** → **Aceptó** / **Rechazó** / **Sin respuesta**
3. Cuando hay suficientes aceptaciones → marcar convocatoria como **CUBIERTA**

### Parte Diario

- Carga manual: sector + sede + horario + médico asignado
- O importar desde convocatorias cubiertas del día
- Vista Gantt igual a MediFlow pero alimentada manualmente

---

## Roles

| ID demo | Rol | Acceso |
|---------|-----|--------|
| F-9999  | SUPER_ADMIN | Todo |
| F-1001  | COORDINADOR | Dashboard, nueva convocatoria, despacho, parte diario, admin, configuración |
| F-5001  | MEDICO | Solo Parte Diario (reservado para futura app móvil) |
| F-3001  | CONSULTA_PD | Solo Parte Diario (lectura) |

> ADMIN fue fusionado en COORDINADOR. COORDINADOR tiene acceso completo incluyendo Configuración.
> MEDICO existe en el sistema para escalabilidad futura (app móvil) pero actualmente ve solo Parte Diario.

---

## Stores (localStorage, prefix `intra.`)

| Store | Key |
|-------|-----|
| `convocatoriaStore` | `intra.convocatorias.v1` |
| `medicosStore` | `intra.catalogo.medicos.v4` |
| `sedesStore` | `intra.catalogo.sedes.v1` |
| `sectoresStore` | `intra.catalogo.sectores.v1` |
| `configStore` | `intra.config.v1` |
| `authStore` | `intra.session` |
| `usersStore` | `intra.users.v1` |
| `especialidadesStore` | `intra.especialidades.v2` |
| `guardiasFijasStore` | `intra.guardias.fijas.v2` |
| `parteDiarioStore` | `intra.parte.diario.v1` |

---

## Módulos y estado

### Mantenidos de MediFlow (sin cambios relevantes)
- [x] Administración: médicos, sedes, sectores, especialidades, guardias fijas, scoring
- [x] Configuración: usuarios, organización, scoring, auditoría
- [x] Reportes de horas
- [x] Login y roles

### Adaptados
- [ ] Dashboard → simplificado (sin auto-avance, sin countdown)
- [ ] Nueva Convocatoria → sin canales de API, sin modo masivo/secuencial automático
- [ ] Detalle Convocatoria → **Panel de despacho manual** con links WhatsApp
- [ ] Parte Diario → carga manual + import desde convocatorias

### Eliminados de MediFlow
- Modo secuencial auto-avance
- Auto-renovación
- Vista médico (rol MÉDICO)
- Configuración de canales API (WhatsApp API, SMS, Email API)
- Countdowns y timers

### Nuevos
- [ ] **Panel de despacho**: lista médicos + botón WA + registro manual de respuesta
- [ ] **Generador de mensaje WA** configurable por institución
- [ ] **Carga manual Parte Diario**: form rápido sector/sede/horario/médico
- [ ] **Import desde convocatorias**: traer cubiertas del día al Parte Diario

---

## Convenciones de código

- Mismo estilo que MediFlow (inline styles, React.CSSProperties)
- Keys localStorage: siempre prefijo `intra.`
- Sin integraciones externas de API en el frontend
- Commit + push siempre al terminar cambios significativos
- Co-Authored-By: `Claude Sonnet 4.6 <noreply@anthropic.com>`

---

## Git & Deploy

- Repo: https://github.com/thelion182/intra-mediflow (privado)
- Branch: `main`
- Mensaje de commit en español, imperativo
