"use client";

import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  getMovimientos,
  getUsuarios,
  getProyectos,
  createMovimiento,
  updateMovimiento,
  deleteMovimiento,
} from "@/lib/queries/movimientos";
import { MovimientoForm } from "@/components/MovimientoForm";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SelectNative } from "@/components/ui/select-native";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import type { Movimiento, Usuario, Proyecto, MovimientoFormData, EstadoMovimiento } from "@/types";

const COP = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

function estadoBadge(estado: EstadoMovimiento) {
  if (estado === "Pagado") return <Badge variant="success">{estado}</Badge>;
  if (estado === "Reembolsado") return <Badge variant="info">{estado}</Badge>;
  return <Badge variant="warning">{estado}</Badge>;
}

export default function MovimientosPage() {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [loading, setLoading] = useState(true);

  // Filtros
  const [filtroPersona, setFiltroPersona] = useState("");
  const [filtroProyecto, setFiltroProyecto] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroDesde, setFiltroDesde] = useState("");
  const [filtroHasta, setFiltroHasta] = useState("");

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [movimientoEditar, setMovimientoEditar] = useState<Movimiento | undefined>();

  useEffect(() => {
    async function cargar() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
      const [movs, users, projs] = await Promise.all([
        getMovimientos(),
        getUsuarios(),
        getProyectos(),
      ]);
      setMovimientos((movs as Movimiento[]) ?? []);
      setUsuarios((users as Usuario[]) ?? []);
      setProyectos((projs as Proyecto[]) ?? []);
      setLoading(false);
    }
    cargar();
  }, []);

  const filtrados = useMemo(() => {
    return movimientos.filter((m) => {
      if (filtroPersona && m.persona_id !== filtroPersona) return false;
      if (filtroProyecto && m.proyecto_id !== filtroProyecto) return false;
      if (filtroEstado && m.estado !== filtroEstado) return false;
      if (filtroDesde && m.fecha < filtroDesde) return false;
      if (filtroHasta && m.fecha > filtroHasta) return false;
      return true;
    });
  }, [movimientos, filtroPersona, filtroProyecto, filtroEstado, filtroDesde, filtroHasta]);

  function abrirNuevo() {
    setMovimientoEditar(undefined);
    setModalOpen(true);
  }

  function abrirEditar(m: Movimiento) {
    setMovimientoEditar(m);
    setModalOpen(true);
  }

  async function handleSave(data: MovimientoFormData) {
    try {
      if (movimientoEditar) {
        await updateMovimiento(movimientoEditar.id, data);
        toast.success("Movimiento actualizado");
      } else {
        await createMovimiento(data, currentUserId);
        toast.success("Movimiento creado");
      }
      setModalOpen(false);
      const movs = await getMovimientos();
      setMovimientos((movs as Movimiento[]) ?? []);
    } catch (e) {
      toast.error("Error al guardar: " + (e as Error).message);
    }
  }

  async function handleDelete() {
    if (!movimientoEditar) return;
    try {
      await deleteMovimiento(movimientoEditar.id);
      toast.success("Movimiento eliminado");
      setModalOpen(false);
      const movs = await getMovimientos();
      setMovimientos((movs as Movimiento[]) ?? []);
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
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Movimientos</h1>
        <Button onClick={abrirNuevo} size="sm">
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
          <option>Reembolsado</option>
        </SelectNative>
        <Input type="date" value={filtroDesde} onChange={(e) => setFiltroDesde(e.target.value)} placeholder="Desde" />
        <Input type="date" value={filtroHasta} onChange={(e) => setFiltroHasta(e.target.value)} placeholder="Hasta" />
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
            ) : (
              filtrados.map((m) => (
                <tr
                  key={m.id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => abrirEditar(m)}
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
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Cards móvil */}
      <div className="md:hidden space-y-2">
        {filtrados.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No hay movimientos</p>
        ) : (
          filtrados.map((m) => (
            <div
              key={m.id}
              className="bg-white rounded-lg border p-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => abrirEditar(m)}
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
          ))
        )}
      </div>

      {/* Modal */}
      <Dialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={movimientoEditar ? "Editar movimiento" : "Nuevo movimiento"}
      >
        <MovimientoForm
          key={movimientoEditar?.id ?? "nuevo"}
          movimiento={movimientoEditar}
          usuarios={usuarios}
          proyectos={proyectos}
          currentUserId={currentUserId}
          onSave={handleSave}
          onDelete={movimientoEditar ? handleDelete : undefined}
          onCancel={() => setModalOpen(false)}
        />
      </Dialog>
    </div>
  );
}
