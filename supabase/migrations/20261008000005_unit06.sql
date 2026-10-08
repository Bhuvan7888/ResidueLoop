-- Unit 06: Pickups and Payments

CREATE TABLE pickups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pool_id UUID NOT NULL REFERENCES pools(id),
    listing_id UUID NOT NULL REFERENCES listings(id),
    actual_tonnes NUMERIC,
    amount_due NUMERIC,
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'received', 'not_received')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE pickups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Farmers can see and update their own pickups payment" ON pickups FOR ALL USING (
    listing_id IN (
        SELECT id FROM listings WHERE farmer_id = auth.uid()
    )
);

CREATE POLICY "Buyers can see and update their pool pickups" ON pickups FOR ALL USING (
    pool_id IN (
        SELECT id FROM pools WHERE buyer_id = auth.uid()
    )
);

