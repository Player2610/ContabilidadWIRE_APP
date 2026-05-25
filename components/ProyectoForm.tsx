"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  nombreInicial?: string;
  onSave: (nombre: string) => Promise<void>;
  onCancel: () => void;
}

export function ProyectoForm({ nombreInicial = "", onSave, onCancel }: Props) {
  const [nombre, setNombre] = useState(nombreInicial);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) { setError("El nombre es requerido"); return; }
    setGuardando(true);
    try {
      await onSave(nombre.trim());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="nombre">Nombre del proyecto</Label>
        <Input
          id="nombre"
          value={nombre}
          onChange={(e) => { setNombre(e.target.value); setError(""); }}
          placeholder="Ej: Obra Calle 80"
          autoFocus
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={guardando} className="flex-1">
          {guardando ? "Guardando..." : "Guardar"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={guardando}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
