import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { calendarApi, type CalendarEvent } from "../api";

const EVENT_TYPE_COLORS: Record<string, string> = {
  audience: "bg-red-500/20 text-red-200 border-red-500/40",
  rdv: "bg-blue-500/20 text-blue-200 border-blue-500/40",
  echeance: "bg-amber-500/20 text-amber-200 border-amber-500/40",
  delai: "bg-amber-500/20 text-amber-200 border-amber-500/40",
  signification: "bg-purple-500/20 text-purple-200 border-purple-500/40",
  consultation: "bg-emerald-500/20 text-emerald-200 border-emerald-500/40",
  expertise: "bg-teal-500/20 text-teal-200 border-teal-500/40",
  autre: "bg-white/10 text-white/80 border-white/20",
};

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
function fmtISO(d: Date) { return d.toISOString().slice(0, 10); }
function daysInGrid(monthStart: Date): Date[] {
  const firstDayOfWeek = (monthStart.getDay() + 6) % 7; // Lundi=0
  const start = new Date(monthStart);
  start.setDate(start.getDate() - firstDayOfWeek);
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}

const MONTH_NAMES = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const WEEK_DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export function CalendrierPage() {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true); setError(null);
    const from = fmtISO(daysInGrid(cursor)[0]);
    const to = fmtISO(daysInGrid(cursor)[41]);
    calendarApi.range(from, to)
      .then(r => setEvents(r.events))
      .catch(e => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [cursor]);

  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const e of events) {
      const key = e.scheduled_at.slice(0, 10);
      (map[key] ||= []).push(e);
    }
    return map;
  }, [events]);

  const today = fmtISO(new Date());
  const grid = useMemo(() => daysInGrid(cursor), [cursor]);
  const selectedEvents = selectedDay ? (eventsByDay[selectedDay] ?? []) : [];

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-display text-white">Calendrier des dossiers</h1>
          <p className="text-sm text-white/55">Tous les RDV, audiences et échéances de l'ensemble des dossiers.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-white/80 hover:bg-white/5">←</button>
          <button onClick={() => setCursor(startOfMonth(new Date()))}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-white/80 hover:bg-white/5">Aujourd'hui</button>
          <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-white/80 hover:bg-white/5">→</button>
        </div>
      </header>

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">
          {MONTH_NAMES[cursor.getMonth()]} {cursor.getFullYear()}
        </h2>
        <div className="text-xs text-white/55">
          {loading ? "Chargement…" : `${events.length} évènement${events.length > 1 ? "s" : ""}`}
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>}

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
        <div className="grid grid-cols-7 border-b border-white/10 bg-white/[0.04]">
          {WEEK_DAYS.map((d) => (
            <div key={d} className="px-3 py-2 text-xs font-semibold text-white/70 text-center">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {grid.map((d, idx) => {
            const key = fmtISO(d);
            const inMonth = d.getMonth() === cursor.getMonth();
            const isToday = key === today;
            const dayEvents = eventsByDay[key] ?? [];
            const isSelected = selectedDay === key;
            return (
              <button
                key={idx}
                onClick={() => setSelectedDay(key)}
                className={[
                  "min-h-[96px] border-r border-b border-white/5 p-1.5 text-left transition",
                  inMonth ? "bg-transparent" : "bg-black/20 text-white/30",
                  isToday ? "ring-1 ring-coral/60" : "",
                  isSelected ? "bg-coral/10" : "",
                ].join(" ")}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold ${isToday ? "text-coral" : "text-white/70"}`}>{d.getDate()}</span>
                  {dayEvents.length > 0 && (
                    <span className="text-[10px] text-white/55">{dayEvents.length}</span>
                  )}
                </div>
                <div className="mt-1 space-y-0.5">
                  {dayEvents.slice(0, 3).map((e) => (
                    <div
                      key={e.id}
                      title={`${new Date(e.scheduled_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} — ${e.title} (${e.case_name ?? "dossier"})`}
                      className={`truncate rounded px-1.5 py-0.5 text-[10px] border ${EVENT_TYPE_COLORS[e.type] ?? EVENT_TYPE_COLORS.autre}`}
                    >
                      {new Date(e.scheduled_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} {e.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-[10px] text-white/55 italic">+{dayEvents.length - 3} autre(s)</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selectedDay && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-white">Détail du {new Date(selectedDay).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</h3>
            <button onClick={() => setSelectedDay(null)} className="text-xs text-white/55 hover:text-white">✕ Fermer</button>
          </div>
          {selectedEvents.length === 0 ? (
            <p className="text-sm text-white/55 italic">Aucun évènement.</p>
          ) : (
            <ul className="space-y-2">
              {selectedEvents.map((e) => (
                <li key={e.id} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3">
                  <div className={`shrink-0 rounded-lg border px-2 py-1 text-[10px] font-semibold uppercase ${EVENT_TYPE_COLORS[e.type] ?? EVENT_TYPE_COLORS.autre}`}>
                    {e.type}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white">{e.title}</div>
                    <div className="text-xs text-white/60 mt-0.5">
                      {new Date(e.scheduled_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      {e.duration_minutes ? ` · ${e.duration_minutes} min` : ""}
                      {e.location ? ` · ${e.location}` : ""}
                    </div>
                    <Link to={`/bureau/projets`} className="mt-1 inline-flex items-center gap-1 text-xs text-coral hover:underline">
                      📁 {e.case_number ?? "Dossier"} — {e.case_name ?? `#${e.project_id}`}
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
