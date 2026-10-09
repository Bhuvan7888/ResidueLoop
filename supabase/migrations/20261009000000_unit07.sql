-- Unit 07: verifications
CREATE TYPE public.verification_verdict AS ENUM ('verified', 'fire_detected', 'inconclusive');

CREATE TABLE public.verifications (
  id uuid primary key default gen_random_uuid(),
  plot_id uuid not null references public.plots(id) on delete cascade,
  window_start date not null,
  window_end date not null,
  firms_hits integer not null default 0,
  nbr_delta numeric not null default 0,
  verdict public.verification_verdict not null,
  confidence text,
  checked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE INDEX verifications_plot_id_idx ON public.verifications(plot_id);

CREATE TRIGGER update_verifications_updated_at
  BEFORE UPDATE ON public.verifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;

-- Farmer can read own plots' verifications
CREATE POLICY "Farmers can read own verifications" ON public.verifications
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.plots
    JOIN public.farmers f ON f.id = plots.farmer_id
    WHERE plots.id = verifications.plot_id
    AND f.profile_id = auth.uid()
  )
);

-- Buyer can read verifications for plots in villages they have a pool in
CREATE POLICY "Buyers can read village verifications for their pools" ON public.verifications
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.plots
    JOIN public.pools ON pools.village_id = plots.village_id
    JOIN public.buyers b ON b.id = pools.buyer_id
    WHERE plots.id = verifications.plot_id
    AND b.profile_id = auth.uid()
  )
);
