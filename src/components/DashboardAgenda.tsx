import { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, CalendarPlus, ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PatientAppointments from "@/components/PatientAppointments";
import { useAgenda } from "@/hooks/useAgenda";
import { normalizeTag } from "@/lib/diagnosisTags";
import { appointmentTypes } from "@/lib/appointments";
import { agendaEvents, calendarDays, ecuadorToday, formatAgendaDay, shiftDay, shiftMonth, upcomingAgenda, type AgendaEvent, type AgendaPatient } from "@/lib/agenda";
import { cn } from "@/lib/utils";

const eventStyle = (event: AgendaEvent) => {
  if (event.state === "cancelada") return "bg-muted text-muted-foreground line-through opacity-60";
  if (event.kind === "consultation" || event.state === "realizada") return "bg-sage text-sage-foreground";
  if (event.state === "no_asistio") return "bg-peach text-peach-foreground";
  return ({ consulta_inicial: "bg-sky text-sky-foreground", seguimiento: "bg-lavender text-lavender-foreground", control: "bg-sage text-sage-foreground", otra: "bg-peach text-peach-foreground" } as Record<string, string>)[event.type] ?? "bg-primary/15 text-primary";
};
const eventType = (event: AgendaEvent) => event.kind === "consultation" ? "Consulta realizada" : appointmentTypes[event.type as keyof typeof appointmentTypes];

export default function DashboardAgenda() {
  const today = ecuadorToday();
  const [anchor, setAnchor] = useState(today);
  const [mode, setMode] = useState<"month" | "week">("month");
  const [place, setPlace] = useState("all");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [patient, setPatient] = useState<AgendaPatient | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const days = calendarDays(anchor, mode);
  const start = [days[0] ?? anchor, today, selectedDay ?? anchor].sort()[0] ?? today;
  const end = [days.at(-1) ?? anchor, shiftDay(today, 7), selectedDay ?? anchor].sort().at(-1) ?? today;
  const query = useAgenda(start, end);
  const events = agendaEvents(query.data?.appointments ?? [], query.data?.consultations ?? [], query.data?.patients ?? [], place === "all" ? "" : place);
  const upcoming = upcomingAgenda(events, today);
  const dayEvents = events.filter((event) => event.date === selectedDay);
  const patients = (query.data?.patients ?? []).filter((p) => normalizeTag(p.nombre).includes(normalizeTag(search)));
  const title = mode === "month" ? formatAgendaDay(anchor, { month: "long", year: "numeric" }) : `${formatAgendaDay(days[0] ?? anchor, { day: "numeric", month: "short" })} – ${formatAgendaDay(days.at(-1) ?? anchor, { day: "numeric", month: "short", year: "numeric" })}`;
  const navigate = (amount: number) => setAnchor(mode === "month" ? shiftMonth(anchor, amount) : shiftDay(anchor, amount * 7));
  const openPicker = () => { setSearch(""); setPickerOpen(true); };
  const eventLink = (event: AgendaEvent, compact = false) => <Button key={event.id} asChild variant="ghost"
    className={cn("h-auto min-h-6 w-full justify-start rounded-md px-1.5 py-1 text-left text-xs font-normal", eventStyle(event))}>
    <Link to={`/pacientes/${event.patientId}`} title={`${event.time?.slice(0, 5) ?? "Sin hora"} · ${event.name} · ${eventType(event)}`}>
      <span className={compact ? "block w-full truncate" : "block w-full whitespace-normal break-words"}>{event.time ? `${event.time.slice(0, 5)} ` : ""}{event.name}</span>
    </Link>
  </Button>;

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-2 text-2xl font-bold">Agenda</h1>
        <Button variant="outline" size="icon" aria-label="Anterior" title="Anterior" onClick={() => navigate(-1)}><ChevronLeft className="h-4 w-4" /></Button>
        <Button variant="outline" size="icon" aria-label="Siguiente" title="Siguiente" onClick={() => navigate(1)}><ChevronRight className="h-4 w-4" /></Button>
        <Button variant="outline" onClick={() => setAnchor(today)}>Hoy</Button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Select value={place} onValueChange={setPlace}><SelectTrigger className="w-44 rounded-xl" aria-label="Filtrar por lugar"><MapPin className="mr-2 h-4 w-4" /><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todos los lugares</SelectItem>{query.data?.places.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
        </Select>
        <Tabs value={mode} onValueChange={(value) => setMode(value as "month" | "week")}><TabsList><TabsTrigger value="month">Mes</TabsTrigger><TabsTrigger value="week">Semana</TabsTrigger></TabsList></Tabs>
      </div>
    </div>
    {query.isError ? <div className="flex flex-wrap items-center gap-3"><p className="text-sm text-destructive">No se pudo cargar la agenda.</p><Button variant="outline" onClick={() => void query.refetch()}>Reintentar</Button></div> : <>
      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_240px] xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0">
          <h2 className="mb-4 text-lg font-semibold capitalize">{title}</h2>
          {query.isLoading && <p className="mb-2 text-sm text-muted-foreground">Cargando agenda…</p>}
          <div className="overflow-x-auto rounded-2xl border bg-card">
            <div className={cn(mode === "week" && "min-w-[700px]")}>
              <div className="grid grid-cols-7 border-b bg-sky/60">{["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((day) => <div key={day} className="py-2 text-center text-xs font-semibold text-muted-foreground">{day}</div>)}</div>
              <div className="grid grid-cols-7">
                {days.map((day) => {
                  const rows = events.filter((event) => event.date === day);
                  const shown = mode === "month" ? rows.slice(0, 3) : rows;
                  const outside = mode === "month" && day.slice(0, 7) !== anchor.slice(0, 7);
                  return <div key={day} onClick={(event) => { if (!(event.target as HTMLElement).closest("a,button")) setSelectedDay(day); }} className={cn("min-w-0 cursor-pointer border-b border-r p-1 sm:p-2", mode === "month" ? "min-h-28 sm:min-h-36" : "min-h-80", outside && "bg-muted/40", day === today && "bg-primary/5")}>
                    <Button variant="ghost" size="sm" aria-label={`Ver citas del ${day}`} onClick={() => setSelectedDay(day)} className={cn("mb-1 h-7 w-full justify-start px-1 text-xs", day === today && "font-bold text-primary", outside && "text-muted-foreground")}>
                      {Number(day.slice(8))}{day === today && <span className="ml-1 hidden sm:inline">· Hoy</span>}
                    </Button>
                    <div className="space-y-1">{shown.map((event) => eventLink(event, mode === "month"))}</div>
                    {rows.length > shown.length && <Button variant="ghost" size="sm" className="mt-1 h-auto w-full px-0 py-1 text-xs text-primary" onClick={() => setSelectedDay(day)}>+{rows.length - shown.length} más</Button>}
                  </div>;
                })}
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
            {Object.entries(appointmentTypes).map(([type, label]) => <span key={type} className="flex items-center gap-1.5"><span className={cn("h-2.5 w-2.5 rounded-full", eventStyle({ state: "programada", type, kind: "appointment" } as AgendaEvent))} />{label}</span>)}
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-sage-foreground/60" />Consultas realizadas</span>
          </div>
        </div>
        <aside className="min-w-0 lg:pt-11">
          <Card tone="lavender" className="rounded-2xl"><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><CalendarDays className="h-4 w-4 text-primary" />Hoy y próximos 7 días</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              {upcoming.length ? upcoming.map((event) => <Button key={event.id} asChild variant="ghost" className="h-auto w-full justify-start whitespace-normal px-0 py-3 text-left font-normal">
                <Link to={`/pacientes/${event.patientId}`}><span className="block min-w-0 space-y-1"><span className="block text-xs text-primary">{formatAgendaDay(event.date, { weekday: "short", day: "numeric", month: "short" })} · {event.time?.slice(0, 5) ?? "Sin hora"}</span><span className="block break-words font-medium">{event.name}</span><span className="block break-words text-xs text-muted-foreground">{eventType(event)}{event.place ? ` · ${event.place}` : ""}</span></span></Link>
              </Button>) : <p className="py-3 text-sm text-muted-foreground">No hay citas programadas estos días.</p>}
            </CardContent>
          </Card>
        </aside>
      </div>
    </>}
    <Sheet open={Boolean(selectedDay) && !pickerOpen && !formOpen} onOpenChange={(open) => { if (!open) setSelectedDay(null); }}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md"><SheetHeader><SheetTitle>{selectedDay ? formatAgendaDay(selectedDay, { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "Citas"}</SheetTitle></SheetHeader>
        <Button className="my-5 w-full rounded-xl" onClick={openPicker}><CalendarPlus className="mr-2 h-4 w-4" />Agendar cita</Button>
        <div className="space-y-4">{dayEvents.length ? dayEvents.map((event) => <div key={event.id} className="space-y-1 border-b pb-3">{eventLink(event)}<p className="text-xs text-muted-foreground">{eventType(event)} · {event.state === "cancelada" ? "Cancelada" : event.state === "no_asistio" ? "No asistió" : event.state === "realizada" ? "Realizada" : "Programada"}</p>{event.place && <p className="break-words text-sm text-muted-foreground">{event.place}</p>}</div>) : <p className="text-sm text-muted-foreground">No hay citas ni consultas este día.</p>}</div>
      </SheetContent>
    </Sheet>
    <Dialog open={pickerOpen} onOpenChange={setPickerOpen}><DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl"><DialogHeader><DialogTitle>Seleccionar paciente</DialogTitle></DialogHeader>
      <Input aria-label="Buscar paciente" placeholder="Buscar paciente…" value={search} onChange={(e) => setSearch(e.target.value)} />
      <div className="max-h-72 overflow-y-auto">{patients.length ? patients.map((p) => <Button key={p.id} variant="ghost" className="h-auto w-full justify-start whitespace-normal text-left" onClick={() => { setPatient(p); setPickerOpen(false); setFormOpen(true); }}>{p.nombre}</Button>) : <p className="py-3 text-sm text-muted-foreground">No se encontraron pacientes.</p>}</div>
    </DialogContent></Dialog>
    {patient && <PatientAppointments formOnly initialDate={selectedDay ?? today} patientId={patient.id} patientName={patient.nombre} appointments={[]} loading={false} error={false} dialogOpen={formOpen} onDialogChange={setFormOpen} onChanged={() => void query.refetch()} />}
  </div>;
}