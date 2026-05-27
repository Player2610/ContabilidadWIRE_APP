"use client";

import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useRealtimeMovimientos } from "@/hooks/useRealtimeMovimientos";
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

async function getUsuarios() {
  const supabase = createClient();
  const { data, error } = await supabase.from("usuarios").select("*").order("nombre");
  if (error) throw error;
  return (data ?? []) as Usuario[];
}

async function getBalances(): Promise<Record<string, number>> {
  const supabase = createClient();
  const { data } = await supabase
    .from("movimientos")
    .select("persona_id, valor, estado, afecta_caja, reembolso_por_id");
  if (!data) return {};
  const balances: Record<string, number> = {};
  for (const m of data) {
    if (Number(m.valor) > 0) {
      balances[m.persona_id] = (balances[m.persona_id] ?? 0) + Number(m.valor);
    }
    if (m.reembolso_por_id && m.estado === "Reembolsado" && m.afecta_caja === false) {
      balances[m.reembolso_por_id] = (balances[m.reembolso_por_id] ?? 0) - Math.abs(Number(m.valor));
    }
  }
  return balances;
}

async function marcarReembolsado(id: string, reembolso_por_id: string, reembolso_tipo: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("movimientos")
    .update({ estado: "Reembolsado", reembolso_por_id, reembolso_tipo, reembolsado_en: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

interface ReembolsoDialogProps {
  movimiento: Movimiento;
  usuarios: Usuario[];
  balances: Record<string, number>;
  onConfirmar: (porId: string, tipo: string) => Promise<void>;
  onCancelar: () => void;
}

function ReembolsoDialog({ movimiento, usuarios, balances, onConfirmar, onCancelar }: ReembolsoDialogProps) {
  const [porId, setPorId] = useState(usuarios[0]?.id ?? "");
  const [tipo, setTipo] = useState("Efectivo");
  const [guardando, setGuardando] = useState(false);

  async function handleConfirmar() {
    if (!porId) return;
    setGuardando(true);
    await onConfirmar(porId, tipo);
    setGuardando(false);
  }

  return (
    <div className="space-y-4">
      {/* Resumen del movimiento */}
      <div className="bg-gray-50 rounded-md p-3 text-sm space-y-1">
        <p><span className="text-muted-foreground">Motivo:</span> <span className="font-medium">{movimiento.motivo}</span></p>
        <p><span className="text-muted-foreground">Pagó originalmente:</span> <span className="font-medium">{movimiento.persona?.nombre}</span></p>
        <p><span className="text-muted-foreground">Monto:</span> <span className="font-bold text-red-600">{COP.format(Math.abs(Number(movimiento.valor)))}</span></p>
      </div>

      {/* ¿Quién paga? — muestra balance actual de caja por persona */}
      <div className="space-y-1.5">
        <Label>¿Quién paga el reembolso?</Label>
        <div className="space-y-1.5">
          {usuarios.map((u) => {
            const bal = balances[u.id] ?? 0;
            const activo = porId === u.id;
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => setPorId(u.id)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-md border text-sm transition-colors",
                  activo ? "border-primary bg-primary/5" : "border-gray-200 bg-white hover:bg-gray-50"
                )}
              >
                <span className="font-medium">{u.nombre}</span>
                <span className={cn("text-xs font-semibold", bal >= 0 ? "text-green-600" : "text-red-600")}>
                  {COP.format(bal)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Efectivo o transferencia */}
      <div className="space-y-1">
        <Label>¿Cómo se pagó?</Label>
        <div className="flex rounded-md border overflow-hidden">
          {["Efectivo", "Transferencia"].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTipo(t)}
              className={cn(
                "flex-1 py-2 text-sm font-medium transition-colors",
                tipo === t
                  ? "bg-primary text-primary-foreground"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <Button className="flex-1" onClick={handleConfirmar} disabled={guardando || !porId}>
          {guardando ? "Guardando..." : "Confirmar reembolso"}
        </Button>
        <Button variant="outline" onClick={onCancelar} disabled={guardando}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

export default function PendientesPage() {
  const [pendientes, setPendientes] = useState<Movimiento[]>([]);
  const [todosUsuarios, setTodosUsuarios] = useState<Usuario[]>([]);
  const [balancesPersona, setBalancesPersona] = useState<Record<string, number>>({});
  const [filtroPersona, setFiltroPersona] = useState<string>("todos");
  const [loading, setLoading] = useState(true);
  const [movimientoSeleccionado, setMovimientoSeleccionado] = useState<Movimiento | null>(null);
  const [currentUserId, setCurrentUserId] = useState("");

  async function cargar() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
    const [movs, users, bals] = await Promise.all([getPendientes(), getUsuarios(), getBalances()]);
    setPendientes(movs);
    setTodosUsuarios(users);
    setBalancesPersona(bals);
    setLoading(false);
  }

  useEffect(() => { cargar(); }, []);
  useRealtimeMovimientos(currentUserId, cargar);

  const usuariosFiltro = useMemo(() => {
    const unique = Object.values(
      pendientes.reduce<Record<string, Usuario>>((acc, m) => {
        if (m.persona) acc[m.persona_id] = m.persona as Usuario;
        return acc;
      }, {})
    );
    return unique;
  }, [pendientes]);

  const filtrados = useMemo(() =>
    filtroPersona === "todos"
      ? pendientes
      : pendientes.filter((m) => m.persona_id === filtroPersona),
    [pendientes, filtroPersona]
  );

  const totalGeneral = pendientes.reduce((s, m) => s + Math.abs(Number(m.valor)), 0);
  const totalFiltrado = filtrados.reduce((s, m) => s + Math.abs(Number(m.valor)), 0);

  const porPersona = useMemo(() => {
    const grupos: Record<string, { nombre: string; movimientos: Movimiento[] }> = {};
    filtrados.forEach((m) => {
      const pid = m.persona_id;
      if (!grupos[pid]) grupos[pid] = { nombre: m.persona?.nombre ?? "—", movimientos: [] };
      grupos[pid].movimientos.push(m);
    });
    return Object.entries(grupos);
  }, [filtrados]);

  async function handleConfirmarReembolso(porId: string, tipo: string) {
    if (!movimientoSeleccionado) return;
    try {
      await marcarReembolsado(movimientoSeleccionado.id, porId, tipo);
      setPendientes((prev) => prev.filter((m) => m.id !== movimientoSeleccionado.id));
      setMovimientoSeleccionado(null);
      toast.success("Reembolso confirmado");
    } catch (e) {
      toast.error("Error: " + (e as Error).message);
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
            {usuariosFiltro.map((u) => {
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
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
                    <span className="font-semibold">{nombre}</span>
                    <span className="text-red-600 font-semibold">{COP.format(subtotal)}</span>
                  </div>
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
                            onClick={() => setMovimientoSeleccionado(m)}
                          >
                            Reembolsado
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

      {/* Diálogo de confirmación de reembolso */}
      <Dialog
        open={!!movimientoSeleccionado}
        onClose={() => setMovimientoSeleccionado(null)}
        title="Confirmar reembolso"
      >
        {movimientoSeleccionado && (
          <ReembolsoDialog
            movimiento={movimientoSeleccionado}
            usuarios={todosUsuarios}
            balances={balancesPersona}
            onConfirmar={handleConfirmarReembolso}
            onCancelar={() => setMovimientoSeleccionado(null)}
          />
        )}
      </Dialog>
    </div>
  );
}
