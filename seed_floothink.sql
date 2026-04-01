-- ============================================================
-- Seed Data: Floothink Real Brand & Product Structure
-- Run this in your Supabase SQL Editor
-- ============================================================

DO $$ 
DECLARE 
  v_workspace_id uuid;
  v_user_id uuid;
  v_brand_id uuid;
  v_product1_id uuid;
  v_product2_id uuid;
BEGIN
  -- 1. Find the target Workspace
  SELECT id INTO v_workspace_id FROM workspaces WHERE slug = 'floothink-agency' LIMIT 1;
  
  IF v_workspace_id IS NULL THEN
    RAISE EXCEPTION 'Workspace floothink-agency not found. Please ensure billing_migration.sql was run.';
  END IF;

  -- 2. Find the primary User to attribute the creation to
  SELECT user_id INTO v_user_id FROM user_workspace_roles WHERE workspace_id = v_workspace_id LIMIT 1;

  -- 3. Insert Brand 'Floothink'
  INSERT INTO brands (workspace_id, name, slug, category, summary, status, created_by)
  VALUES (
    v_workspace_id, 
    'Floothink', 
    'floothink', 
    'Digital Agency', 
    'A 360° Digital Agency in Jakarta specializing in converting creative concepts into measurable success.', 
    'active', 
    v_user_id
  )
  ON CONFLICT (workspace_id, slug) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_brand_id;

  -- 4. Insert Brand Brain Version (The "Brand Brain")
  INSERT INTO brand_brain_versions (
    brand_id, workspace_id, version_no, brand_personality, tone_of_voice, 
    brand_values, brand_promise, target_audience, source_summary, status
  )
  VALUES (
    v_brand_id, 
    v_workspace_id, 
    1, 
    'Strategic, Creative, Reliable, Adaptive', 
    'Professional, Results-Driven, Clear, Insightful', 
    '["Creativity", "Measurable Success", "End-to-end Solutions", "Digital Transformation"]'::jsonb, 
    'We convert creative concepts into measurable success for your digital brand.', 
    '["Business Owners in Indonesia", "Marketing Directors", "SMEs needing digital scaling"]'::jsonb, 
    'Extracted from floothink.com. Core services include Web & App Dev, Social Media, SEO, Digital Ads, SEM, Production House, and PR.', 
    'approved'
  );

  -- 5. Insert Product 1 (Digital Marketing)
  INSERT INTO products (workspace_id, brand_id, name, slug, product_type, summary, status, created_by)
  VALUES (
    v_workspace_id, 
    v_brand_id, 
    'Digital Marketing Retainer', 
    'digital-marketing-retainer', 
    'Service', 
    'End-to-end digital marketing and social media management to boost brand online presence.', 
    'active', 
    v_user_id
  ) RETURNING id INTO v_product1_id;

  -- 6. Insert Product 1 Brain (The "Product Brain")
  INSERT INTO product_brain_versions (
    product_id, brand_id, workspace_id, usp, functional_benefits, emotional_benefits, status
  )
  VALUES (
    v_product1_id, v_brand_id, v_workspace_id,
    'End-to-end management spanning SEO, Ads, and viral content creation under one roof.',
    '["High quality content creation", "Increased online visibility", "Measurable campaign reporting"]'::jsonb,
    '["Peace of mind knowing your brand is handled by experts", "Confidence in brand growth"]'::jsonb,
    'approved'
  );

  -- 7. Insert Product 2 (Web App & Dev)
  INSERT INTO products (workspace_id, brand_id, name, slug, product_type, summary, status, created_by)
  VALUES (
    v_workspace_id, 
    v_brand_id, 
    'Web App & Development', 
    'web-app-dev', 
    'Service', 
    'Impactful websites and applications designed to convert visitors into customers.', 
    'active', 
    v_user_id
  ) RETURNING id INTO v_product2_id;

  -- 8. Insert Product 2 Brain
  INSERT INTO product_brain_versions (
    product_id, brand_id, workspace_id, usp, functional_benefits, emotional_benefits, status
  )
  VALUES (
    v_product2_id, v_brand_id, v_workspace_id,
    'Seamless transition from design to development and maintenance by an expert team.',
    '["High-conversion layouts", "Modern technology stack", "Full maintenance support"]'::jsonb,
    '["Trust that your digital storefront is stable", "Pride in a premium brand image"]'::jsonb,
    'approved'
  );

  RAISE NOTICE 'Floothink Brand and Products Seeded Successfully!';
END $$;
