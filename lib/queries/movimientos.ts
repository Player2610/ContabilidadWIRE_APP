import { createClient } from "@/lib/supabase/client";
import type { MovimientoFormData } from "@/types";

const SELECT_MOVIMIENTO = `
  *,
  persona:usuarios!movimientos_persona_id_fkey(id, nombre, email),
  proyecto:proyectos!movimientos_proyecto_id_fkey(id, nombre),
  creado_por_usuario:usuarios!movimientos_creado_por_fkey(id, nombre),
  reembolso_por:usuarios!movimientos_reembolso_por_id_fkey(id, nombre)
`;

export async function getMovimientos() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("movimientos")
    .select(SELECT_MOVIMIENTO)
    .order("fecha", { ascending: false })
    .order("creado_en", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getUsuarios() {
  const supabase = createClient();
  const { data, error } = await supabase.from("usuarios").select("*").order("nombre");
  if (error) throw error;
  return data;
}

export async function getProyectos() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("proyectos")
    .select("*")
    .eq("activo", true)
    .order("nombre");
  if (error) throw error;
  return data;
}

export async function createMovimiento(data: MovimientoFormData, userId: string) {
  const supabase = createClient();
  const valor = data.esIngreso ? Math.abs(data.valor) : -Math.abs(data.valor);
  const { error } = await supabase.from("movimientos").insert({
    fecha: data.fecha,
    persona_id: data.persona_id,
    proyecto_id: data.proyecto_id,
    valor,
    motivo: data.motivo,
    categoria: data.categoria,
    tipo: data.tipo,
    estado: data.estado,
    creado_por: userId,
  });
  if (error) throw error;
}

export async function deleteMovimiento(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("movimientos").delete().eq("id", id);
  if (error) throw error;
}
