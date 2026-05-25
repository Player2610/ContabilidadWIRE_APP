"use client";

import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Movimiento, Usuario } from "@/types";

const COP = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

async function getPendientes() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("movimientos")
    .select(`
      *,
      persona:usuarios!movimientos_persona_id_fkey(id, nombre, email),
      proyecto:proyectos!movimientos_proyecto_id_fkey(id, nombre)
    `)
    .eq("estado", "Pendiente reembolso")
    .order("fecha", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Movimiento[];
}

async function marcarReembolsado(id: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("movimientos")
    .update({ estado: "Reembolsado" })
    .eq("id", id);
  if (error) throw error;
}

export default function PendientesPage() {
  const [pendientes, setPendientes] = useState<Movimiento[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [filtroPersona, setFiltroPersona] = useState<string>("todos");
  const [loading, setLoading] = useState(true);
  const [marcando, setMarcando] = useState<string | null>(null);

  useEffect(() => {
    async function cargar() {
      const movs = await getPendientes();
      setPendientes(movs);
      // Extraer usuarios únicos de los movimientos
      const unique = Object.values(
        movs.reduce<Record<string, Usuario>>((acc, m) => {
          if (m.persona) acc[m.persona_id] = m.persona as Usuario;
          return acc;
        }, {})
      );
      setUsuarios(unique);
      setLoading(false);
    }
    cargar();
  }, []);

  const filtrados = useMemo(() =>
    filtroPersona === "todos"
      ? pendientes
      : pendientes.filter((m) => m.persona_id === filtroPersona),
    [pendientes, filtroPersona]
  );

  const totalGeneral = pendientes.reduce((s, m) => s + Math.abs(Number(m.valor)), 0);
  const totalFiltrado = filtrados.reduce((s, m) => s + Math.abs(Number(m.valor)), 0);

  // Agrupar por persona
  const porPersona = useMemo(() => {
    const grupos: Record<string, { nombre: string; movimientos: Movimiento[] }> = {};
    filtrados.forEach((m) => {
      const pid = m.persona_id;
      if (!grupos[pid]) grupos[pid] = { nombre: m.persona?.nombre ?? "—", movimientos: [] };
      grupos[pid].movimientos.push(m);
    });
    return Object.entries(grupos);
  }, [filtrados]);

  async function handleMarcar(id: string) {
    setMarcando(id);
    try {
      await marcarReembolsado(id);
      setPendientes((prev) => prev.filter((m) => m.id !== id));
      toast.success("Marcado como reembolsado");
    } catch (e) {
      toast.error("Error: " + (e as Error).message);
    } finally {
      setMarcando(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-200 animate-pulse rounded-md" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pendientes de reembolso</h1>
          {pendientes.length > 0 && (
            <p className="text-red-600 font-semibold text-lg mt-1">
              Total: {COP.format(totalGeneral)}
            </p>
          )}
        </div>
      </div>

      {pendientes.length === 0 ? (
        /* Todo al día */
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="text-6xl mb-4">🎉</span>
          <h2 className="text-xl font-semibold">¡Todo al día!</h2>
          <p className="text-muted-foreground mt-2">No hay reembolsos pendientes.</p>
        </div>
      ) : (
        <>
          {/* Filtro por persona (chips) */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFiltroPersona("todos")}
              className={cn(
                "px-3 py-1 rounded-full text-sm font-medium transition-colors border",
                filtroPersona === "todos"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              )}
            >
              Todos · {COP.format(totalGeneral)}
            </button>
            {usuarios.map((u) => {
              const total = pendientes
                .filter((m) => m.persona_id === u.id)
                .reduce((s, m) => s + Math.abs(Number(m.valor)), 0);
              return (
                <button
                  key={u.id}
                  onClick={() => setFiltroPersona(u.id)}
                  className={cn(
                    "px-3 py-1 rounded-full text-sm font-medium transition-colors border",
                    filtroPersona === u.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                  )}
                >
                  {u.nombre} · {COP.format(total)}
                </button>
              );
            })}
          </div>

          {filtroPersona !== "todos" && (
            <p className="text-sm text-muted-foreground">
              Subtotal: <span className="font-semibold text-red-600">{COP.format(totalFiltrado)}</span>
            </p>
          )}

          {/* Grupos por persona */}
          <div className="space-y-5">
            {porPersona.map(([personaId, { nombre, movimientos: movs }]) => {
              const subtotal = movs.reduce((s, m) => s + Math.abs(Number(m.valor)), 0);
              return (
                <div key={personaId} className="bg-white rounded-lg border overflow-hidden">
                  {/* Header del grupo */}
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
                    <span className="font-semibold">{nombre}</span>
                    <span className="text-red-600 font-semibold">{COP.format(subtotal)}</span>
                  </div>

                  {/* Items */}
                  <div className="divide-y">
                    {movs.map((m) => (
                      <div key={m.id} className="flex items-center justify-between px-4 py-3 gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{m.motivo}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {m.fecha} · {m.proyecto?.nombre}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-sm font-bold text-red-600">
                            {COP.format(Math.abs(Number(m.valor)))}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={marcando === m.id}
                            onClick={() => handleMarcar(m.id)}
                          >
                            {marcando === m.id ? "..." : "Reembolsado"}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
