"use client";

import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  getMovimientos,
  getUsuarios,
  getProyectos,
  createMovimiento,
  deleteMovimiento,
} from "@/lib/queries/movimientos";
import { MovimientoForm } from "@/components/MovimientoForm";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SelectNative } from "@/components/ui/select-native";
import { Input } from "@/components/ui/input";
import { Plus, AlertTriangle } from "lucide-react";
import type { Movimiento, Usuario, Proyecto, MovimientoFormData, EstadoMovimiento } from "@/types";

const COP = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

function formatFecha(iso: string) {
  return new Date(iso).toLocaleString("es-CO", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function estadoBadge(estado: EstadoMovimiento) {
  if (estado === "Pagado")              return <Badge variant="success">{estado}</Badge>;
  if (estado === "Reembolsado")         return <Badge variant="info">{estado}</Badge>;
  if (estado === "Pendiente por pagar") return <Badge variant="warning">{estado}</Badge>;
  return <Badge variant="warning">{estado}</Badge>;
}

// ── Detalle de movimiento (solo lectura + historial) ──────────────────────────
function MovimientoDetalle({
  movimiento,
  onEliminar,
  onCerrar,
}: {
  movimiento: Movimiento;
  onEliminar: () => Promise<void>;
  onCerrar: () => void;
}) {
  const [eliminando, setEliminando] = useState(false);
  const esIngreso = movimiento.valor >= 0;

  async function handleEliminar() {
    if (!confirm("¿Seguro que deseas eliminar este movimiento? Esta acción no se puede deshacer.")) return;
    setEliminando(true);
    await onEliminar();
    setEliminando(false);
  }

  const filas = [
    { label: "Tipo",        valor: esIngreso ? "Ingreso" : "Gasto" },
    { label: "Fecha",       valor: movimiento.fecha },
    { label: "Valor",       valor: COP.format(movimiento.valor) },
    { label: "Persona",     valor: movimiento.persona?.nombre ?? "—" },
    { label: "Proyecto",    valor: movimiento.proyecto?.nombre ?? "—" },
    { label: "Categoría",   valor: movimiento.categoria },
    { label: "Tipo pago",   valor: movimiento.tipo },
    { label: "Estado",      valor: movimiento.estado },
    { label: "Motivo",      valor: movimiento.motivo },
  ];

  return (
    <div className="space-y-5">
      {/* Datos del movimiento */}
      <div className="divide-y border rounded-lg overflow-hidden text-sm">
        {filas.map(({ label, valor }) => (
          <div key={label} className="flex px-3 py-2">
            <span className="w-28 shrink-0 text-muted-foreground">{label}</span>
            <span className="font-medium">{valor}</span>
          </div>
        ))}
      </div>

      {/* Historial de eventos */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Historial</p>
        <div className="space-y-3">
          {/* Creación */}
          <div className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-0.5" />
              <div className="flex-1 w-px bg-gray-200 mt-1" />
            </div>
            <div className="pb-3">
              <p className="text-sm font-medium">Movimiento creado</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Por <span className="font-medium">{movimiento.creado_por_usuario?.nombre ?? "—"}</span>
                {" · "}{formatFecha(movimiento.creado_en)}
              </p>
            </div>
          </div>

          {/* Reembolso */}
          {movimiento.estado === "Reembolsado" && movimiento.reembolsado_en && (
            <div className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500 mt-0.5" />
              </div>
              <div>
                <p className="text-sm font-medium">Reembolsado</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Por <span className="font-medium">{movimiento.reembolso_por?.nombre ?? "—"}</span>
                  {" via "}<span className="font-medium">{movimiento.reembolso_tipo}</span>
                  {" · "}{formatFecha(movimiento.reembolsado_en)}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Acciones */}
      <div className="flex gap-2 pt-1 border-t">
        <Button variant="outline" className="flex-1" onClick={onCerrar}>
          Cerrar
        </Button>
        <Button variant="destructive" onClick={handleEliminar} disabled={eliminando}>
          {eliminando ? "Eliminando..." : "Eliminar"}
        </Button>
      </div>
    </div>
  );
}

// ── Confirmación antes de crear ───────────────────────────────────────────────
function ConfirmacionCrear({
  data,
  usuarios,
  proyectos,
  onConfirmar,
  onVolver,
}: {
  data: MovimientoFormData;
  usuarios: Usuario[];
  proyectos: Proyecto[];
  onConfirmar: () => Promise<void>;
  onVolver: () => void;
}) {
  const [guardando, setGuardando] = useState(false);
  const persona = usuarios.find((u) => u.id === data.persona_id);
  const proyecto = proyectos.find((p) => p.id === data.proyecto_id);
  const esIngreso = data.esIngreso;

  const filas = [
    { label: "Tipo",      valor: esIngreso ? "Ingreso" : "Gasto" },
    { label: "Fecha",     valor: data.fecha },
    { label: "Valor",     valor: COP.format(data.valor) },
    { label: "Persona",   valor: persona?.nombre ?? "—" },
    { label: "Proyecto",  valor: proyecto?.nombre ?? "—" },
    { label: "Categoría", valor: data.categoria },
    { label: "Tipo pago", valor: data.tipo },
    { label: "Estado",    valor: data.estado },
    { label: "Motivo",    valor: data.motivo },
  ];

  async function handleConfirmar() {
    setGuardando(true);
    await onConfirmar();
    setGuardando(false);
  }

  return (
    <div className="space-y-4">
      {/* Advertencia */}
      <div className="flex gap-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
        <AlertTriangle size={18} className="text-yellow-600 shrink-0 mt-0.5" />
        <p className="text-sm text-yellow-800">
          <span className="font-semibold">Revisa bien antes de confirmar.</span> Una vez guardado,
          este movimiento no podrá ser modificado.
        </p>
      </div>

      {/* Resumen */}
      <div className="divide-y border rounded-lg overflow-hidden text-sm">
        {filas.map(({ label, valor }) => (
          <div key={label} className="flex px-3 py-2">
            <span className="w-28 shrink-0 text-muted-foreground">{label}</span>
            <span className="font-medium">{valor}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onVolver} disabled={guardando}>
          Volver
        </Button>
        <Button className="flex-1" onClick={handleConfirmar} disabled={guardando}>
          {guardando ? "Guardando..." : "Confirmar y guardar"}
        </Button>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function MovimientosPage() {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [loading, setLoading] = useState(true);

  const [filtroPersona, setFiltroPersona] = useState("");
  const [filtroProyecto, setFiltroProyecto] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroDesde, setFiltroDesde] = useState("");
  const [filtroHasta, setFiltroHasta] = useState("");

  // Modales
  const [formOpen, setFormOpen] = useState(false);
  const [pendingData, setPendingData] = useState<MovimientoFormData | null>(null);
  const [detalleMovimiento, setDetalleMovimiento] = useState<Movimiento | null>(null);

  async function cargar() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
    const [movs, users, projs] = await Promise.all([
      getMovimientos(), getUsuarios(), getProyectos(),
    ]);
    setMovimientos((movs as Movimiento[]) ?? []);
    setUsuarios((users as Usuario[]) ?? []);
    setProyectos((projs as Proyecto[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { cargar(); }, []);

  const filtrados = useMemo(() => movimientos.filter((m) => {
    if (filtroPersona  && m.persona_id  !== filtroPersona)  return false;
    if (filtroProyecto && m.proyecto_id !== filtroProyecto) return false;
    if (filtroEstado   && m.estado      !== filtroEstado)   return false;
    if (filtroDesde    && m.fecha < filtroDesde)            return false;
    if (filtroHasta    && m.fecha > filtroHasta)            return false;
    return true;
  }), [movimientos, filtroPersona, filtroProyecto, filtroEstado, filtroDesde, filtroHasta]);

  // El form envía → guardamos en pendingData y abrimos la confirmación
  function handleFormSubmit(data: MovimientoFormData) {
    setPendingData(data);
    setFormOpen(false);
  }

  async function handleConfirmar() {
    if (!pendingData) return;
    try {
      await createMovimiento(pendingData, currentUserId);
      toast.success("Movimiento guardado");
      setPendingData(null);
      cargar();
    } catch (e) {
      toast.error("Error al guardar: " + (e as Error).message);
    }
  }

  async function handleEliminar(id: string) {
    try {
      await deleteMovimiento(id);
      toast.success("Movimiento eliminado");
      setDetalleMovimiento(null);
      cargar();
    } catch (e) {
      toast.error("Error al eliminar: " + (e as Error).message);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-14 bg-gray-200 animate-pulse rounded-md" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Movimientos</h1>
        <Button onClick={() => setFormOpen(true)} size="sm">
          <Plus size={16} className="mr-1" /> Nuevo movimiento
        </Button>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 p-3 bg-white rounded-lg border">
        <SelectNative value={filtroPersona} onChange={(e) => setFiltroPersona(e.target.value)}>
          <option value="">Todas las personas</option>
          {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
        </SelectNative>
        <SelectNative value={filtroProyecto} onChange={(e) => setFiltroProyecto(e.target.value)}>
          <option value="">Todos los proyectos</option>
          {proyectos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </SelectNative>
        <SelectNative value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          <option>Pagado</option>
          <option>Pendiente reembolso</option>
          <option>Pendiente por pagar</option>
          <option>Reembolsado</option>
        </SelectNative>
        <Input type="date" value={filtroDesde} onChange={(e) => setFiltroDesde(e.target.value)} />
        <Input type="date" value={filtroHasta} onChange={(e) => setFiltroHasta(e.target.value)} />
      </div>

      {/* Tabla desktop */}
      <div className="hidden md:block bg-white rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {["Fecha", "Persona", "Proyecto", "Motivo", "Categoría", "Tipo", "Estado", "Valor"].map((h) => (
                <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtrados.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No hay movimientos</td></tr>
            ) : filtrados.map((m) => (
              <tr
                key={m.id}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => setDetalleMovimiento(m)}
              >
                <td className="px-4 py-3 whitespace-nowrap">{m.fecha}</td>
                <td className="px-4 py-3">{m.persona?.nombre ?? "—"}</td>
                <td className="px-4 py-3">{m.proyecto?.nombre ?? "—"}</td>
                <td className="px-4 py-3 max-w-[200px] truncate">{m.motivo}</td>
                <td className="px-4 py-3">{m.categoria}</td>
                <td className="px-4 py-3">{m.tipo}</td>
                <td className="px-4 py-3">{estadoBadge(m.estado)}</td>
                <td className={`px-4 py-3 font-semibold whitespace-nowrap ${m.valor >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {COP.format(m.valor)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards móvil */}
      <div className="md:hidden space-y-2">
        {filtrados.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No hay movimientos</p>
        ) : filtrados.map((m) => (
          <div
            key={m.id}
            className="bg-white rounded-lg border p-4 cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => setDetalleMovimiento(m)}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium text-sm">{m.motivo}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {m.fecha} · {m.persona?.nombre} · {m.proyecto?.nombre}
                </p>
              </div>
              <div className="text-right">
                <p className={`font-bold ${m.valor >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {COP.format(m.valor)}
                </p>
                <div className="mt-1">{estadoBadge(m.estado)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: formulario de creación */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} title="Nuevo movimiento">
        <MovimientoForm
          usuarios={usuarios}
          proyectos={proyectos}
          currentUserId={currentUserId}
          onSave={async (data) => handleFormSubmit(data)}
          onCancel={() => setFormOpen(false)}
        />
      </Dialog>

      {/* Modal: confirmación antes de guardar */}
      <Dialog
        open={!!pendingData}
        onClose={() => { setPendingData(null); setFormOpen(true); }}
        title="Confirmar movimiento"
      >
        {pendingData && (
          <ConfirmacionCrear
            data={pendingData}
            usuarios={usuarios}
            proyectos={proyectos}
            onConfirmar={handleConfirmar}
            onVolver={() => { setPendingData(null); setFormOpen(true); }}
          />
        )}
      </Dialog>

      {/* Modal: detalle del movimiento */}
      <Dialog
        open={!!detalleMovimiento}
        onClose={() => setDetalleMovimiento(null)}
        title="Detalle del movimiento"
      >
        {detalleMovimiento && (
          <MovimientoDetalle
            movimiento={detalleMovimiento}
            onEliminar={() => handleEliminar(detalleMovimiento.id)}
            onCerrar={() => setDetalleMovimiento(null)}
          />
        )}
      </Dialog>
    </div>
  );
}
