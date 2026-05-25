import { createClient } from "@/lib/supabase/client";
import type { Movimiento, Usuario, Proyecto } from "@/types";

export async function getDashboardData() {
  const supabase = createClient();

  const [{ data: movimientos }, { data: usuarios }, { data: proyectos }] =
    await Promise.all([
      supabase
        .from("movimientos")
        .select(`*, persona:usuarios!movimientos_persona_id_fkey(id, nombre), proyecto:proyectos!movimientos_proyecto_id_fkey(id, nombre)`),
      supabase.from("usuarios").select("*"),
      supabase.from("proyectos").select("*").eq("activo", true),
    ]);

  const movs = (movimientos ?? []) as Movimiento[];
  const users = (usuarios ?? []) as Usuario[];
  const projs = (proyectos ?? []) as Proyecto[];

  const ahora = new Date();
  const mesActual = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}`;

  const delMes = movs.filter((m) => m.fecha.startsWith(mesActual));

  const cajaGeneral = movs.reduce((s, m) => s + Number(m.valor), 0);
  const ingresosMes = delMes.filter((m) => m.valor > 0).reduce((s, m) => s + Number(m.valor), 0);
  const gastosMes = delMes.filter((m) => m.valor < 0).reduce((s, m) => s + Number(m.valor), 0);
  const balanceMes = ingresosMes + gastosMes;
  const totalPendiente = movs
    .filter((m) => m.estado === "Pendiente reembolso")
    .reduce((s, m) => s + Math.abs(Number(m.valor)), 0);

  const porPersona = users.map((u) => {
    const movsPersona = movs.filter((m) => m.persona_id === u.id);
    const balance = movsPersona.reduce((s, m) => s + Number(m.valor), 0);
    const pendiente = movsPersona
      .filter((m) => m.estado === "Pendiente reembolso")
      .reduce((s, m) => s + Math.abs(Number(m.valor)), 0);
    return { usuario: u, balance, pendiente, total: movsPersona.length };
  });

  const porProyecto = projs.map((p) => {
    const movsProyecto = movs.filter((m) => m.proyecto_id === p.id);
    const ingresos = movsProyecto.filter((m) => m.valor > 0).reduce((s, m) => s + Number(m.valor), 0);
    const gastos = movsProyecto.filter((m) => m.valor < 0).reduce((s, m) => s + Number(m.valor), 0);
    return { proyecto: p, ingresos, gastos, balance: ingresos + gastos };
  });

  const categoriasMes = delMes
    .filter((m) => m.valor < 0)
    .reduce<Record<string, number>>((acc, m) => {
      acc[m.categoria] = (acc[m.categoria] ?? 0) + Math.abs(Number(m.valor));
      return acc;
    }, {});

  const top5Categorias = Object.entries(categoriasMes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([nombre, total]) => ({ nombre, total }));

  return {
    cajaGeneral,
    ingresosMes,
    gastosMes,
    balanceMes,
    totalPendiente,
    porPersona,
    porProyecto,
    top5Categorias,
  };
}
