-- Unit 05: Matching, Offers, Pools

CREATE TABLE offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID NOT NULL REFERENCES listings(id),
    buyer_id UUID NOT NULL REFERENCES buyers(id),
    baler_id UUID NOT NULL REFERENCES balers(id),
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined')),
    price_per_tonne NUMERIC NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE pools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    village_id UUID NOT NULL, -- references villages(id) once created
    buyer_id UUID NOT NULL REFERENCES buyers(id),
    baler_id UUID NOT NULL REFERENCES balers(id),
    status TEXT NOT NULL CHECK (status IN ('forming', 'ready', 'in_progress', 'completed')),
    target_tonnes NUMERIC NOT NULL,
    current_tonnes NUMERIC NOT NULL DEFAULT 0,
    pickup_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE pools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Farmers can see own offers" ON offers FOR SELECT USING (
    listing_id IN (
        SELECT id FROM listings WHERE plot_id IN (
            SELECT id FROM plots WHERE farmer_id = auth.uid()
        )
    )
);

CREATE POLICY "Farmers can update own offers" ON offers FOR UPDATE USING (
    listing_id IN (
        SELECT id FROM listings WHERE plot_id IN (
            SELECT id FROM plots WHERE farmer_id = auth.uid()
        )
    )
);

CREATE POLICY "Buyers see own offers" ON offers FOR SELECT USING (buyer_id IN (SELECT id FROM buyers WHERE profile_id = auth.uid()));
CREATE POLICY "Balers see own offers" ON offers FOR SELECT USING (baler_id IN (SELECT id FROM balers WHERE profile_id = auth.uid()));

CREATE POLICY "Anyone in pool can see pool" ON pools FOR SELECT USING (
    buyer_id IN (SELECT id FROM buyers WHERE profile_id = auth.uid()) OR
    baler_id IN (SELECT id FROM balers WHERE profile_id = auth.uid()) OR
    id IN (
        SELECT pool_id FROM listings WHERE plot_id IN (
            SELECT id FROM plots WHERE farmer_id = auth.uid()
        )
    ) -- assuming listing will have a pool_id FK added
);

ALTER TABLE listings ADD COLUMN pool_id UUID REFERENCES pools(id);
