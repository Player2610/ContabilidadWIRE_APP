"use client";

import { useEffect, useState } from "react";
import { getDashboardData } from "@/lib/queries/dashboard";
import { getProyectos, getUsuarios, createMovimiento } from "@/lib/queries/movimientos";
import { MovimientoForm } from "@/components/MovimientoForm";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp, TrendingDown, Clock, Wallet, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRealtimeMovimientos } from "@/hooks/useRealtimeMovimientos";
import type { Usuario, Proyecto, MovimientoFormData } from "@/types";

const COP = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

type DashData = Awaited<ReturnType<typeof getDashboardData>>;

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded-md ${className}`} />;
}

function StatCard({
  titulo, valor, icono: Icono, color,
}: {
  titulo: string;
  valor: number;
  icono: React.ElementType;
  color: string;
}) {
  return (
    <div className="bg-white rounded-lg border p-4 flex items-center gap-4">
      <div className={`p-2 rounded-lg ${color}`}>
        <Icono size={20} className="text-white" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{titulo}</p>
        <p className={`text-lg font-bold ${valor >= 0 ? "text-gray-900" : "text-red-600"}`}>
          {COP.format(valor)}
        </p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashData | null>(null);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingData, setPendingData] = useState<MovimientoFormData | null>(null);

  async function cargar() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
    const [dash, users, projs] = await Promise.all([
      getDashboardData(),
      getUsuarios(),
      getProyectos(),
    ]);
    setData(dash);
    setUsuarios(users as Usuario[]);
    setProyectos(projs as Proyecto[]);
    setLoading(false);
  }

  useEffect(() => { cargar(); }, []);
  useRealtimeMovimientos(currentUserId, cargar);

  async function handleSave(formData: MovimientoFormData) {
    setPendingData(formData);
    setModalOpen(false);
  }

  async function handleConfirmar() {
    if (!pendingData) return;
    try {
      await createMovimiento(pendingData, currentUserId);
      toast.success("Movimiento creado");
      setPendingData(null);
      cargar();
    } catch (e) {
      toast.error("Error al guardar: " + (e as Error).message);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const maxBalance = Math.max(...data.porPersona.map((p) => Math.abs(p.balance)), 1);

  return (
    <div className="space-y-6">
      {/* Hero — Caja General */}
      <div className={`rounded-xl p-6 text-white ${data.cajaGeneral >= 0 ? "bg-green-600" : "bg-red-600"}`}>
        <p className="text-sm font-medium opacity-80">Caja General</p>
        <p className="text-4xl font-bold mt-1">{COP.format(data.cajaGeneral)}</p>
        <p className="text-sm opacity-70 mt-2">Suma total de todos los movimientos</p>
      </div>

      {/* Stats del mes */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard titulo="Ingresos del mes" valor={data.ingresosMes} icono={TrendingUp} color="bg-green-500" />
        <StatCard titulo="Gastos del mes"   valor={data.gastosMes}   icono={TrendingDown} color="bg-red-500" />
        <StatCard titulo="Balance del mes"  valor={data.balanceMes}  icono={Wallet} color={data.balanceMes >= 0 ? "bg-blue-500" : "bg-orange-500"} />
        <StatCard titulo="Pendiente reembolso" valor={-data.totalPendiente} icono={Clock} color="bg-yellow-500" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Por Persona */}
        <div className="bg-white rounded-lg border p-4">
          <h2 className="font-semibold mb-4">Balance por persona</h2>
          <div className="space-y-4">
            {data.porPersona.map(({ usuario, balance, pendiente, gastosEnCaja }) => (
              <div key={usuario.id}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium">{usuario.nombre}</span>
                  <div className="text-right space-y-0.5">
                    <span className={`text-sm font-bold block ${balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {COP.format(balance)}
                    </span>
                    {pendiente > 0 && (
                      <span className="text-xs text-yellow-600 block">
                        Caja debe: {COP.format(pendiente)}
                      </span>
                    )}
                    {gastosEnCaja > 0 && (
                      <span className="text-xs text-blue-500 block">
                        Usó de caja: {COP.format(gastosEnCaja)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${balance >= 0 ? "bg-green-500" : "bg-red-500"}`}
                    style={{ width: `${Math.min((Math.abs(balance) / maxBalance) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Por Proyecto */}
        <div className="bg-white rounded-lg border p-4">
          <h2 className="font-semibold mb-4">Balance por proyecto</h2>
          <div className="space-y-3">
            {data.porProyecto.map(({ proyecto, ingresos, gastos, balance }) => (
              <div key={proyecto.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <span className="text-sm font-medium">{proyecto.nombre}</span>
                <div className="text-right text-xs space-y-0.5">
                  <p className="text-green-600">+{COP.format(ingresos)}</p>
                  <p className="text-red-600">{COP.format(gastos)}</p>
                  <p className={`font-bold ${balance >= 0 ? "text-green-700" : "text-red-700"}`}>
                    {COP.format(balance)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top categorías */}
      {data.top5Categorias.length > 0 && (
        <div className="bg-white rounded-lg border p-4">
          <h2 className="font-semibold mb-4">Top gastos del mes por categoría</h2>
          <div className="space-y-2">
            {data.top5Categorias.map(({ nombre, total }, i) => {
              const max = data.top5Categorias[0].total;
              return (
                <div key={nombre} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                  <span className="text-sm w-28 shrink-0">{nombre}</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${(total / max) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium w-24 text-right">{COP.format(total)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* FAB móvil */}
      <button
        onClick={() => setModalOpen(true)}
        className="md:hidden fixed bottom-20 right-4 z-30 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
      >
        <Plus size={24} />
      </button>

      {/* Botón desktop */}
      <div className="hidden md:flex justify-end">
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={16} className="mr-1" /> Nuevo movimiento
        </Button>
      </div>

      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo movimiento">
        <MovimientoForm
          usuarios={usuarios}
          proyectos={proyectos}
          currentUserId={currentUserId}
          onSave={handleSave}
          onCancel={() => setModalOpen(false)}
        />
      </Dialog>

      <Dialog
        open={!!pendingData}
        onClose={() => { setPendingData(null); setModalOpen(true); }}
        title="Confirmar movimiento"
      >
        {pendingData && (
          <ConfirmacionDashboard
            data={pendingData}
            usuarios={usuarios}
            proyectos={proyectos}
            onConfirmar={handleConfirmar}
            onVolver={() => { setPendingData(null); setModalOpen(true); }}
          />
        )}
      </Dialog>
    </div>
  );
}

function ConfirmacionDashboard({
  data, usuarios, proyectos, onConfirmar, onVolver,
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
    ...(!esIngreso ? [{ label: "Caja general", valor: data.afecta_caja ? "Sí" : "No" }] : []),
    { label: "Motivo",    valor: data.motivo },
  ];

  async function handleConfirmar() {
    setGuardando(true);
    await onConfirmar();
    setGuardando(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
        <AlertTriangle size={18} className="text-yellow-600 shrink-0 mt-0.5" />
        <p className="text-sm text-yellow-800">
          <span className="font-semibold">Revisa bien antes de confirmar.</span> Una vez guardado,
          este movimiento no podrá ser modificado.
        </p>
      </div>
      <div className="divide-y border rounded-lg overflow-hidden text-sm">
        {filas.map(({ label, valor }) => (
          <div key={label} className="flex px-3 py-2">
            <span className="w-28 shrink-0 text-muted-foreground">{label}</span>
            <span className="font-medium">{valor}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onVolver} disabled={guardando}>Volver</Button>
        <Button className="flex-1" onClick={handleConfirmar} disabled={guardando}>
          {guardando ? "Guardando..." : "Confirmar y guardar"}
        </Button>
      </div>
    </div>
  );
}
