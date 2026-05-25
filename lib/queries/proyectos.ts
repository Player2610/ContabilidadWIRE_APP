import { createClient } from "@/lib/supabase/client";
import type { Movimiento, Proyecto } from "@/types";

const SELECT_MOVIMIENTO = `
  *,
  persona:usuarios!movimientos_persona_id_fkey(id, nombre),
  creado_por_usuario:usuarios!movimientos_creado_por_fkey(id, nombre),
  reembolso_por:usuarios!movimientos_reembolso_por_id_fkey(id, nombre)
`;

export async function getAllProyectos() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("proyectos")
    .select("*")
    .order("nombre");
  if (error) throw error;
  return (data ?? []) as Proyecto[];
}

export async function getProyectoById(id: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("proyectos")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as Proyecto;
}

export async function getMovimientosByProyecto(proyectoId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("movimientos")
    .select(SELECT_MOVIMIENTO)
    .eq("proyecto_id", proyectoId)
    .order("fecha", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Movimiento[];
}

export async function createProyecto(nombre: string) {
  const supabase = createClient();
  const { error } = await supabase.from("proyectos").insert({ nombre });
  if (error) throw error;
}

export async function updateProyecto(id: string, data: { nombre?: string; activo?: boolean }) {
  const supabase = createClient();
  const { error } = await supabase.from("proyectos").update(data).eq("id", id);
  if (error) throw error;
}
