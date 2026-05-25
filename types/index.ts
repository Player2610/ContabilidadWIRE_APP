export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  creado_en: string;
}

export interface Proyecto {
  id: string;
  nombre: string;
  activo: boolean;
  creado_en: string;
}

export type EstadoMovimiento = "Pagado" | "Pendiente reembolso" | "Reembolsado" | "Pendiente por pagar";
export type TipoMovimiento = "Efectivo" | "Transferencia" | "Tarjeta";
export type CategoriaMovimiento =
  | "Ingresos"
  | "Materiales"
  | "Servicios"
  | "Transporte"
  | "Herramientas"
  | "Alimentación"
  | "Marketing"
  | "Otros";

export interface Movimiento {
  id: string;
  fecha: string;
  persona_id: string;
  proyecto_id: string;
  valor: number;
  motivo: string;
  categoria: CategoriaMovimiento;
  tipo: TipoMovimiento;
  estado: EstadoMovimiento;
  creado_por: string;
  creado_en: string;
  reembolso_por_id?: string;
  reembolso_tipo?: string;
  reembolsado_en?: string;
  persona?: Pick<Usuario, "id" | "nombre" | "email">;
  proyecto?: Pick<Proyecto, "id" | "nombre">;
  creado_por_usuario?: Pick<Usuario, "id" | "nombre">;
  reembolso_por?: Pick<Usuario, "id" | "nombre">;
}

export interface MovimientoFormData {
  fecha: string;
  esIngreso: boolean;
  valor: number;
  persona_id: string;
  proyecto_id: string;
  tipo: TipoMovimiento;
  categoria: CategoriaMovimiento;
  motivo: string;
  estado: EstadoMovimiento;
}
