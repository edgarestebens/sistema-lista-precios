-- updated_at for offline sync (LWW)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

ALTER TABLE public.markets
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.producto
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.mercado
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.comparativo_precio
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS markets_set_updated_at ON public.markets;
CREATE TRIGGER markets_set_updated_at
  BEFORE UPDATE ON public.markets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS items_set_updated_at ON public.items;
CREATE TRIGGER items_set_updated_at
  BEFORE UPDATE ON public.items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS producto_set_updated_at ON public.producto;
CREATE TRIGGER producto_set_updated_at
  BEFORE UPDATE ON public.producto
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS mercado_set_updated_at ON public.mercado;
CREATE TRIGGER mercado_set_updated_at
  BEFORE UPDATE ON public.mercado
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS comparativo_precio_set_updated_at ON public.comparativo_precio;
CREATE TRIGGER comparativo_precio_set_updated_at
  BEFORE UPDATE ON public.comparativo_precio
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
