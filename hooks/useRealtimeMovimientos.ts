import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export function useRealtimeMovimientos(currentUserId: string, onCambio: () => void) {
  // Usamos ref para evitar que onCambio cause re-suscripciones en cada render
  const onCambioRef = useRef(onCambio);
  useEffect(() => { onCambioRef.current = onCambio; });

  useEffect(() => {
    if (!currentUserId) return;

    const supabase = createClient();

    const channel = supabase
      .channel("movimientos-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "movimientos" },
        (payload) => {
          const record = (payload.new ?? payload.old) as Record<string, unknown>;
          const esDeOtro = record?.creado_por !== currentUserId;

          if (esDeOtro) {
            toast.info("📡 Nueva actualización", { duration: 3000 });
          }

          onCambioRef.current();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);
}
