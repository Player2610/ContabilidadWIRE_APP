-- ============================================================
-- CONTROL DE CUENTAS - Schema principal
-- Ejecutar en Supabase → SQL Editor
-- ============================================================

-- ============================================================
-- TABLAS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.usuarios (
  id        uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre    text NOT NULL,
  email     text UNIQUE NOT NULL,
  creado_en timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.proyectos (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre    text NOT NULL,
  activo    boolean DEFAULT true,
  creado_en timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.movimientos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha       date NOT NULL DEFAULT CURRENT_DATE,
  persona_id  uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,
  proyecto_id uuid NOT NULL REFERENCES public.proyectos(id) ON DELETE RESTRICT,
  valor       numeric(12, 2) NOT NULL,
  motivo      text NOT NULL,
  categoria   text NOT NULL,
  tipo        text NOT NULL,
  estado      text NOT NULL DEFAULT 'Pagado',
  creado_por  uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,
  creado_en   timestamp with time zone DEFAULT now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.usuarios    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proyectos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos ENABLE ROW LEVEL SECURITY;

-- Usuarios: solo usuarios autenticados que existan en la tabla
CREATE POLICY "usuarios_select" ON public.usuarios
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid()));

CREATE POLICY "usuarios_insert" ON public.usuarios
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "usuarios_update" ON public.usuarios
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid()));

-- Proyectos: cualquier usuario autenticado registrado puede operar
CREATE POLICY "proyectos_select" ON public.proyectos
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid()));

CREATE POLICY "proyectos_insert" ON public.proyectos
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid()));

CREATE POLICY "proyectos_update" ON public.proyectos
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid()));

CREATE POLICY "proyectos_delete" ON public.proyectos
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid()));

-- Movimientos: cualquier usuario autenticado registrado puede operar
CREATE POLICY "movimientos_select" ON public.movimientos
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid()));

CREATE POLICY "movimientos_insert" ON public.movimientos
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid()));

CREATE POLICY "movimientos_update" ON public.movimientos
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid()));

CREATE POLICY "movimientos_delete" ON public.movimientos
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid()));

-- ============================================================
-- TRIGGER: auto-registro en usuarios al crear cuenta en auth
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.usuarios (id, nombre, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- SEED: 3 proyectos de ejemplo
-- ============================================================

INSERT INTO public.proyectos (nombre, activo) VALUES
  ('Proyecto General',  true),
  ('Obra Calle 80',     true),
  ('Mantenimiento Sede', true)
ON CONFLICT DO NOTHING;
