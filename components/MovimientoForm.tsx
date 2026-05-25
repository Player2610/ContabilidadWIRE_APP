"use client";

import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SelectNative } from "@/components/ui/select-native";
import { cn } from "@/lib/utils";
import type { Movimiento, Usuario, Proyecto } from "@/types";

const TIPOS = ["Efectivo", "Transferencia", "Tarjeta"] as const;
const ESTADOS = ["Pagado", "Pendiente reembolso", "Reembolsado"] as const;
const CATEGORIAS = [
  "Ingresos",
  "Materiales",
  "Servicios",
  "Transporte",
  "Herramientas",
  "Alimentación",
  "Marketing",
  "Otros",
] as const;

const schema = z.object({
  fecha: z.string().min(1, "La fecha es requerida"),
  esIngreso: z.boolean(),
  valor: z.coerce.number().positive("El valor debe ser mayor a 0"),
  persona_id: z.string().min(1, "Selecciona una persona"),
  proyecto_id: z.string().min(1, "Selecciona un proyecto"),
  tipo: z.enum(TIPOS),
  categoria: z.enum(CATEGORIAS),
  motivo: z.string().min(1, "El motivo es requerido"),
  estado: z.enum(ESTADOS),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  movimiento?: Movimiento;
  usuarios: Usuario[];
  proyectos: Proyecto[];
  currentUserId: string;
  onSave: (data: FormValues) => Promise<void>;
  onDelete?: () => Promise<void>;
  onCancel: () => void;
}

export function MovimientoForm({
  movimiento,
  usuarios,
  proyectos,
  currentUserId,
  onSave,
  onDelete,
  onCancel,
}: Props) {
  const isEdit = !!movimiento;
  const valorAbsoluto = movimiento ? Math.abs(movimiento.valor) : 0;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      fecha: movimiento?.fecha ?? new Date().toISOString().split("T")[0],
      esIngreso: movimiento ? movimiento.valor >= 0 : false,
      valor: valorAbsoluto || undefined,
      persona_id: movimiento?.persona_id ?? currentUserId,
      proyecto_id: movimiento?.proyecto_id ?? "",
      tipo: movimiento?.tipo ?? "Efectivo",
      categoria: movimiento?.categoria ?? "Materiales",
      motivo: movimiento?.motivo ?? "",
      estado: movimiento?.estado ?? "Pagado",
    },
  });

  const esIngreso = watch("esIngreso");

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-4">
      {/* Toggle Ingreso / Gasto */}
      <div className="flex rounded-md border overflow-hidden">
        <button
          type="button"
          onClick={() => setValue("esIngreso", false)}
          className={cn(
            "flex-1 py-2 text-sm font-medium transition-colors",
            !esIngreso
              ? "bg-red-500 text-white"
              : "bg-gray-50 text-gray-600 hover:bg-gray-100"
          )}
        >
          Gasto
        </button>
        <button
          type="button"
          onClick={() => setValue("esIngreso", true)}
          className={cn(
            "flex-1 py-2 text-sm font-medium transition-colors",
            esIngreso
              ? "bg-green-500 text-white"
              : "bg-gray-50 text-gray-600 hover:bg-gray-100"
          )}
        >
          Ingreso
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Fecha */}
        <div className="space-y-1">
          <Label htmlFor="fecha">Fecha</Label>
          <Input id="fecha" type="date" {...register("fecha")} />
          {errors.fecha && <p className="text-xs text-red-500">{errors.fecha.message}</p>}
        </div>

        {/* Valor */}
        <div className="space-y-1">
          <Label htmlFor="valor">Valor</Label>
          <Input
            id="valor"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            {...register("valor")}
          />
          {errors.valor && <p className="text-xs text-red-500">{errors.valor.message}</p>}
        </div>
      </div>

      {/* Persona */}
      <div className="space-y-1">
        <Label htmlFor="persona_id">Persona</Label>
        <SelectNative id="persona_id" {...register("persona_id")}>
          <option value="">Seleccionar...</option>
          {usuarios.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nombre}
            </option>
          ))}
        </SelectNative>
        {errors.persona_id && <p className="text-xs text-red-500">{errors.persona_id.message}</p>}
      </div>

      {/* Proyecto */}
      <div className="space-y-1">
        <Label htmlFor="proyecto_id">Proyecto</Label>
        <SelectNative id="proyecto_id" {...register("proyecto_id")}>
          <option value="">Seleccionar...</option>
          {proyectos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </SelectNative>
        {errors.proyecto_id && <p className="text-xs text-red-500">{errors.proyecto_id.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Tipo de pago */}
        <div className="space-y-1">
          <Label htmlFor="tipo">Tipo de pago</Label>
          <SelectNative id="tipo" {...register("tipo")}>
            {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
          </SelectNative>
        </div>

        {/* Estado */}
        <div className="space-y-1">
          <Label htmlFor="estado">Estado</Label>
          <SelectNative id="estado" {...register("estado")}>
            {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
          </SelectNative>
        </div>
      </div>

      {/* Categoría */}
      <div className="space-y-1">
        <Label htmlFor="categoria">Categoría</Label>
        <SelectNative id="categoria" {...register("categoria")}>
          {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
        </SelectNative>
      </div>

      {/* Motivo */}
      <div className="space-y-1">
        <Label htmlFor="motivo">Motivo</Label>
        <Textarea
          id="motivo"
          placeholder="Descripción del movimiento..."
          rows={2}
          {...register("motivo")}
        />
        {errors.motivo && <p className="text-xs text-red-500">{errors.motivo.message}</p>}
      </div>

      {/* Botones */}
      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? "Guardando..." : "Guardar"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        {isEdit && onDelete && (
          <Button
            type="button"
            variant="destructive"
            onClick={onDelete}
            disabled={isSubmitting}
          >
            Eliminar
          </Button>
        )}
      </div>
    </form>
  );
}
