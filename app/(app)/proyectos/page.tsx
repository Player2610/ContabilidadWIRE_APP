"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { getAllProyectos, getMovimientosByProyecto, createProyecto, updateProyecto } from "@/lib/queries/proyectos";
import { ProyectoForm } from "@/components/ProyectoForm";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, ChevronRight } from "lucide-react";
import type { Proyecto, Movimiento } from "@/types";

const COP = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

interface ProyectoConStats extends Proyecto {
  ingresos: number;
  gastos: number;
  balance: number;
}

export default function ProyectosPage() {
  const [proyectos, setProyectos] = useState<ProyectoConStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  async function cargar() {
    const projs = await getAllProyectos();

    // Cargar movimientos de todos los proyectos en paralelo
    const conStats = await Promise.all(
      projs.map(async (p) => {
        const movs: Movimiento[] = await getMovimientosByProyecto(p.id);
        const ingresos = movs.filter((m) => m.valor > 0).reduce((s, m) => s + Number(m.valor), 0);
        const gastos   = movs.filter((m) => m.valor < 0).reduce((s, m) => s + Number(m.valor), 0);
        return { ...p, ingresos, gastos, balance: ingresos + gastos };
      })
    );
    setProyectos(conStats);
    setLoading(false);
  }

  useEffect(() => { cargar(); }, []);

  async function handleCrear(nombre: string, cliente: string) {
    await createProyecto(nombre, cliente);
    toast.success("Proyecto creado");
    setModalOpen(false);
    cargar();
  }

  async function handleToggleActivo(p: ProyectoConStats) {
    setToggling(p.id);
    try {
      await updateProyecto(p.id, { activo: !p.activo });
      toast.success(p.activo ? "Proyecto desactivado" : "Proyecto activado");
      cargar();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setToggling(null);
    }
  }

  if (loading) {
    return (
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-36 bg-gray-200 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  const activos   = proyectos.filter((p) => p.activo);
  const inactivos = proyectos.filter((p) => !p.activo);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Proyectos</h1>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <Plus size={16} className="mr-1" /> Nuevo proyecto
        </Button>
      </div>

      {/* Proyectos activos */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {activos.map((p) => (
          <ProyectoCard key={p.id} proyecto={p} onToggle={handleToggleActivo} toggling={toggling === p.id} />
        ))}
      </div>

      {/* Proyectos inactivos */}
      {inactivos.length > 0 && (
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-3">Inactivos</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-60">
            {inactivos.map((p) => (
              <ProyectoCard key={p.id} proyecto={p} onToggle={handleToggleActivo} toggling={toggling === p.id} />
            ))}
          </div>
        </div>
      )}

      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo proyecto">
        <ProyectoForm onSave={handleCrear} onCancel={() => setModalOpen(false)} />
      </Dialog>
    </div>
  );
}

function ProyectoCard({
  proyecto,
  onToggle,
  toggling,
}: {
  proyecto: ProyectoConStats;
  onToggle: (p: ProyectoConStats) => void;
  toggling: boolean;
}) {
  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold">{proyecto.nombre}</h3>
            {proyecto.cliente && (
              <p className="text-xs text-muted-foreground mt-0.5">Cliente: {proyecto.cliente}</p>
            )}
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${proyecto.activo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
            {proyecto.activo ? "Activo" : "Inactivo"}
          </span>
        </div>

        <div className="mt-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Ingresos</span>
            <span className="text-green-600 font-medium">{COP.format(proyecto.ingresos)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Gastos</span>
            <span className="text-red-600 font-medium">{COP.format(proyecto.gastos)}</span>
          </div>
          <div className="flex justify-between border-t pt-1 mt-1">
            <span className="font-medium">Balance</span>
            <span className={`font-bold ${proyecto.balance >= 0 ? "text-green-600" : "text-red-600"}`}>
              {COP.format(proyecto.balance)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex border-t divide-x text-sm">
        <Link
          href={`/proyectos/${proyecto.id}`}
          className="flex-1 flex items-center justify-center gap-1 py-2.5 text-primary hover:bg-gray-50 transition-colors font-medium"
        >
          Ver detalle <ChevronRight size={14} />
        </Link>
        <button
          onClick={() => onToggle(proyecto)}
          disabled={toggling}
          className="flex-1 py-2.5 text-muted-foreground hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {toggling ? "..." : proyecto.activo ? "Desactivar" : "Activar"}
        </button>
      </div>
    </div>
  );
}
