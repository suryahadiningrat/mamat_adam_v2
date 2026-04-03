-- ============================================================
-- Seed Data: FDR Tire — Blaze MP Tourer Product
-- Run this in your Supabase SQL Editor
-- ============================================================

DO $$
DECLARE
  v_workspace_id uuid;
  v_user_id      uuid;
  v_brand_id     uuid;
  v_product_id   uuid;
BEGIN
  -- 1. Find any workspace (use the first one available)
  SELECT id INTO v_workspace_id FROM workspaces LIMIT 1;
  IF v_workspace_id IS NULL THEN
    RAISE EXCEPTION 'No workspace found. Please set up a workspace first.';
  END IF;

  -- 2. Find user in that workspace
  SELECT user_id INTO v_user_id FROM user_workspace_roles WHERE workspace_id = v_workspace_id LIMIT 1;

  -- 3. Find or create FDR Tire brand
  SELECT id INTO v_brand_id FROM brands
    WHERE workspace_id = v_workspace_id AND lower(name) LIKE '%fdr%'
    LIMIT 1;

  IF v_brand_id IS NULL THEN
    INSERT INTO brands (workspace_id, name, slug, category, summary, status, created_by)
    VALUES (
      v_workspace_id,
      'FDR Tire',
      'fdr-tire',
      'Automotive / Tire',
      'FDR (Federal Dutch Rubber) is an Indonesian motorcycle tire brand known for high-performance tires combining advanced compound technology with superior durability and grip.',
      'active',
      v_user_id
    )
    ON CONFLICT (workspace_id, slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_brand_id;

    -- Insert Brand Brain for FDR Tire
    INSERT INTO brand_brain_versions (
      brand_id, workspace_id, version_no, brand_personality, tone_of_voice,
      brand_values, brand_promise, target_audience, source_summary, status
    )
    VALUES (
      v_brand_id,
      v_workspace_id,
      1,
      'Bold, Technical, Reliable, Performance-Driven',
      'Confident, Energetic, Technical but Accessible, Indonesian-market aware',
      '["Performance", "Safety", "Durability", "Innovation"]'::jsonb,
      'Engineered for Indonesian roads. Built for riders who demand more.',
      '["Motorcycle riders aged 18-45 in Indonesia and Southeast Asia", "Sport and touring enthusiasts", "Daily commuters who value quality"]'::jsonb,
      'FDR Tire (Federal Dutch Rubber) is a leading motorcycle tire brand in Indonesia. Known for advanced compound technology, performance-oriented designs, and tires built for local road conditions.',
      'approved'
    );

    RAISE NOTICE 'Created FDR Tire brand with brain.';
  ELSE
    RAISE NOTICE 'Found existing FDR Tire brand: %', v_brand_id;
  END IF;

  -- 4. Create Blaze MP Tourer product (skip if already exists)
  SELECT id INTO v_product_id FROM products
    WHERE brand_id = v_brand_id AND lower(name) LIKE '%blaze mp tourer%'
    LIMIT 1;

  IF v_product_id IS NOT NULL THEN
    RAISE NOTICE 'Blaze MP Tourer already exists: %. Updating brain...', v_product_id;

    UPDATE product_brain_versions SET
      usp = 'Ultimate Gen-2 compound with rounded profile for maximum grip, cornering stability, and long-distance touring comfort',
      rtb = 'Soft Compound Gen-2 with synthetic rubber + carbon black. Performance ratings: Dry Grip 4.5/5, Wet Grip 4.0/5, Mileage 4.5/5, Cornering Stability 4.5/5, Comfortability 4.5/5.',
      functional_benefits = '["Max speed up to 180 km/h (Speed Symbol S)", "Multistep tread pattern for stability and grip", "Progressive TWI for early wear warning", "ABLS bead locking for stability", "A-quo D asymmetrical V-tread for water displacement", "Available in 120/70-15 TL and 150/70-14 TL"]'::jsonb,
      emotional_benefits = '["Confidence on long-distance touring roads", "Peace of mind on wet or slippery surfaces", "Pride in riding with premium performance tires", "Freedom to push cornering limits safely"]'::jsonb,
      target_audience = 'Sport touring motorcyclists in Indonesia and SE Asia, aged 20-45, who prioritize a balance of comfort and performance on long-distance rides',
      price_tier = 'Mid-Premium'
    WHERE product_id = v_product_id;
  ELSE
    INSERT INTO products (workspace_id, brand_id, name, slug, product_type, summary, status, created_by)
    VALUES (
      v_workspace_id,
      v_brand_id,
      'Blaze MP Tourer',
      'blaze-mp-tourer',
      'Motorcycle Tire',
      'A tubeless sport touring tire engineered with Ultimate Gen-2 new construction and compound for maximum grip, superior cornering stability, and enhanced long-distance cruising experience.',
      'active',
      v_user_id
    )
    RETURNING id INTO v_product_id;

    INSERT INTO product_brain_versions (
      product_id, brand_id, workspace_id, version_no,
      usp, rtb, functional_benefits, emotional_benefits,
      target_audience, price_tier, status
    )
    VALUES (
      v_product_id,
      v_brand_id,
      v_workspace_id,
      1,
      'Ultimate Gen-2 compound with rounded profile for maximum grip, cornering stability, and long-distance touring comfort',
      'Soft Compound Gen-2 with synthetic rubber + carbon black. Performance ratings: Dry Grip 4.5/5, Wet Grip 4.0/5, Mileage 4.5/5, Cornering Stability 4.5/5, Comfortability 4.5/5.',
      '["Max speed up to 180 km/h (Speed Symbol S)", "Multistep tread pattern for stability and grip", "Progressive TWI (Tread Wear Indicator) for early wear warning", "ABLS bead locking system for stability", "A-quo D asymmetrical V-shaped tread for water displacement", "SCS carbon chain technology for grip and temperature management", "Available in 120/70-15 TL (224kg max) and 150/70-14 TL (300kg max)"]'::jsonb,
      '["Confidence on long-distance touring roads", "Peace of mind on wet or slippery surfaces", "Pride in riding with premium performance tires", "Freedom to push cornering limits safely"]'::jsonb,
      'Sport touring motorcyclists in Indonesia and SE Asia, aged 20-45, who prioritize a balance of comfort and performance on long-distance rides',
      'Mid-Premium',
      'approved'
    );

    RAISE NOTICE 'Created Blaze MP Tourer product with brain.';
  END IF;

  RAISE NOTICE 'Done. Brand: %, Product: %', v_brand_id, v_product_id;
END $$;
