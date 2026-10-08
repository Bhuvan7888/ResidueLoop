-- Unit 06: Pickups and Payments

CREATE TABLE pickups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pool_id UUID NOT NULL REFERENCES pools(id),
    baler_id UUID NOT NULL REFERENCES balers(id),
    actual_tonnes NUMERIC,
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE pickups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Balers can see and update own pickups" ON pickups FOR ALL USING (baler_id IN (SELECT id FROM balers WHERE profile_id = auth.uid()));

CREATE POLICY "Farmers can see their pickups" ON pickups FOR SELECT USING (
    pool_id IN (
        SELECT pool_id FROM listings WHERE plot_id IN (
            SELECT id FROM plots WHERE farmer_id = auth.uid()
        )
    )
);

CREATE POLICY "Buyers can see pool pickups" ON pickups FOR SELECT USING (
    pool_id IN (
        SELECT id FROM pools WHERE buyer_id IN (
            SELECT id FROM buyers WHERE profile_id = auth.uid()
        )
    )
);
