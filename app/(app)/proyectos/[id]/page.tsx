"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  getProyectoById,
  getMovimientosByProyecto,
  updateProyecto,
} from "@/lib/queries/proyectos";
import { ProyectoForm } from "@/components/ProyectoForm";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import type { Proyecto, Movimiento, EstadoMovimiento } from "@/types";

const COP = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

function estadoBadge(estado: EstadoMovimiento) {
  if (estado === "Pagado")              return <Badge variant="success">{estado}</Badge>;
  if (estado === "Reembolsado")         return <Badge variant="info">{estado}</Badge>;
  return <Badge variant="warning">{estado}</Badge>;
}

export default function ProyectoDetallePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [proyecto, setProyecto] = useState<Proyecto | null>(null);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [toggling, setToggling] = useState(false);

  async function cargar() {
    const [p, movs] = await Promise.all([
      getProyectoById(id),
      getMovimientosByProyecto(id),
    ]);
    setProyecto(p);
    setMovimientos(movs);
    setLoading(false);
  }

  useEffect(() => { cargar(); }, [id]);

  const ingresos = movimientos.filter((m) => m.valor > 0).reduce((s, m) => s + Number(m.valor), 0);
  const gastos   = movimientos.filter((m) => m.valor < 0).reduce((s, m) => s + Number(m.valor), 0);
  const balance  = ingresos + gastos;

  // Gastos por categoría para el gráfico
  const categorias = movimientos
    .filter((m) => m.valor < 0)
    .reduce<Record<string, number>>((acc, m) => {
      acc[m.categoria] = (acc[m.categoria] ?? 0) + Math.abs(Number(m.valor));
      return acc;
    }, {});

  const datosGrafico = Object.entries(categorias)
    .map(([nombre, total]) => ({ nombre, total }))
    .sort((a, b) => b.total - a.total);

  const COLORES = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#6366f1", "#f97316", "#14b8a6"];

  async function handleEditar(nombre: string) {
    if (!proyecto) return;
    await updateProyecto(proyecto.id, { nombre });
    toast.success("Proyecto actualizado");
    setEditOpen(false);
    cargar();
  }

  async function handleToggle() {
    if (!proyecto) return;
    setToggling(true);
    try {
      await updateProyecto(proyecto.id, { activo: !proyecto.activo });
      toast.success(proyecto.activo ? "Proyecto desactivado" : "Proyecto activado");
      cargar();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setToggling(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-200 animate-pulse rounded" />
        <div className="h-28 bg-gray-200 animate-pulse rounded-lg" />
        <div className="h-48 bg-gray-200 animate-pulse rounded-lg" />
      </div>
    );
  }

  if (!proyecto) return <p>Proyecto no encontrado.</p>;

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-center gap-3">
        <Link href="/proyectos" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{proyecto.nombre}</h1>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${proyecto.activo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
              {proyecto.activo ? "Activo" : "Inactivo"}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
            Editar
          </Button>
          <Button size="sm" variant="outline" onClick={handleToggle} disabled={toggling}>
            {toggling ? "..." : proyecto.activo ? "Desactivar" : "Activar"}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Ingresos", valor: ingresos, color: "text-green-600" },
          { label: "Gastos",   valor: gastos,   color: "text-red-600"   },
          { label: "Balance",  valor: balance,  color: balance >= 0 ? "text-green-600" : "text-red-600" },
        ].map(({ label, valor, color }) => (
          <div key={label} className="bg-white rounded-lg border p-4 text-center">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`text-lg font-bold mt-1 ${color}`}>{COP.format(valor)}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Gráfico de gastos por categoría */}
        {datosGrafico.length > 0 && (
          <div className="bg-white rounded-lg border p-4">
            <h2 className="font-semibold mb-4">Gastos por categoría</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={datosGrafico} layout="vertical" margin={{ left: 8, right: 16 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="nombre" width={90} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value) => COP.format(Number(value))}
                  cursor={{ fill: "#f3f4f6" }}
                />
                <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                  {datosGrafico.map((_, i) => (
                    <Cell key={i} fill={COLORES[i % COLORES.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Lista de movimientos */}
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="px-4 py-3 border-b">
            <h2 className="font-semibold">Movimientos ({movimientos.length})</h2>
          </div>
          <div className="divide-y max-h-[280px] overflow-y-auto">
            {movimientos.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground text-center">Sin movimientos</p>
            ) : movimientos.map((m) => (
              <div key={m.id} className="flex items-center justify-between px-4 py-3 gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.motivo}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {m.fecha} · {m.persona?.nombre} · {estadoBadge(m.estado)}
                  </p>
                </div>
                <span className={`text-sm font-bold shrink-0 ${m.valor >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {COP.format(m.valor)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal editar */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} title="Editar proyecto">
        <ProyectoForm
          nombreInicial={proyecto.nombre}
          onSave={handleEditar}
          onCancel={() => setEditOpen(false)}
        />
      </Dialog>
    </div>
  );
}
