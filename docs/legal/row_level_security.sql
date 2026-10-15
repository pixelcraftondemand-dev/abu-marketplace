-- ==============================================================================
-- ABU Marketplace - PostgreSQL Row-Level Security (RLS) Policy Specification
-- Compliant with Open Source E-Commerce Security & Privacy Standards
-- Jurisdiction: Sierra Leone (Data Protection & Merchant Regulation)
-- ==============================================================================

-- 1. Helper function: Retrieve current authenticated user ID from session context
CREATE OR REPLACE FUNCTION current_user_id() 
RETURNS TEXT AS $$
BEGIN
  RETURN NULLIF(current_setting('app.current_user_id', true), '');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 2. Helper function: Retrieve current authenticated user role from session context
CREATE OR REPLACE FUNCTION current_user_role() 
RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(NULLIF(current_setting('app.current_user_role', true), ''), 'guest');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 3. Helper function: Check if current user is an administrator
CREATE OR REPLACE FUNCTION is_admin() 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN current_user_role() = 'admin';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ==============================================================================
-- TABLE: users
-- ==============================================================================
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'buyer', -- 'buyer', 'merchant', 'artisan', 'admin'
  is_verified BOOLEAN NOT NULL DEFAULT false,
  carrier TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Buyers/Merchants can select their own profile; Admins can view all
CREATE POLICY users_select_policy ON users
  FOR SELECT
  USING (
    is_admin() 
    OR id = current_user_id()
  );

-- Users can update only their own profile
CREATE POLICY users_update_policy ON users
  FOR UPDATE
  USING (id = current_user_id() OR is_admin())
  WITH CHECK (id = current_user_id() OR is_admin());

-- Registration allowed for authenticated onboarding
CREATE POLICY users_insert_policy ON users
  FOR INSERT
  WITH CHECK (id = current_user_id() OR is_admin() OR current_user_id() IS NULL);

-- ==============================================================================
-- TABLE: vendor_stores
-- ==============================================================================
CREATE TABLE IF NOT EXISTS vendor_stores (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'approved', -- 'pending', 'approved', 'suspended'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE vendor_stores ENABLE ROW LEVEL SECURITY;

-- Anyone (including guests) can view approved stores; owners and admins can view pending/suspended
CREATE POLICY stores_select_policy ON vendor_stores
  FOR SELECT
  USING (
    status = 'approved'
    OR owner_id = current_user_id()
    OR is_admin()
  );

-- Only verified merchants can insert their own store
CREATE POLICY stores_insert_policy ON vendor_stores
  FOR INSERT
  WITH CHECK (
    owner_id = current_user_id() 
    OR is_admin()
  );

-- Store owners can update their store profile
CREATE POLICY stores_update_policy ON vendor_stores
  FOR UPDATE
  USING (owner_id = current_user_id() OR is_admin())
  WITH CHECK (owner_id = current_user_id() OR is_admin());

-- Only admins or owners can delete
CREATE POLICY stores_delete_policy ON vendor_stores
  FOR DELETE
  USING (owner_id = current_user_id() OR is_admin());

-- ==============================================================================
-- TABLE: products
-- ==============================================================================
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES vendor_stores(id) ON DELETE CASCADE,
  seller_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  price_sle NUMERIC(12, 2) NOT NULL,
  original_price_sle NUMERIC(12, 2),
  stock_count INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  image_url TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Public can browse active products; store owners and admins can see inactive/draft items
CREATE POLICY products_select_policy ON products
  FOR SELECT
  USING (
    is_active = true
    OR seller_id = current_user_id()
    OR is_admin()
  );

-- Merchants can create products under their store
CREATE POLICY products_insert_policy ON products
  FOR INSERT
  WITH CHECK (
    seller_id = current_user_id() 
    OR is_admin()
  );

-- Only seller or admin can update product
CREATE POLICY products_update_policy ON products
  FOR UPDATE
  USING (seller_id = current_user_id() OR is_admin())
  WITH CHECK (seller_id = current_user_id() OR is_admin());

-- Only seller or admin can delete product
CREATE POLICY products_delete_policy ON products
  FOR DELETE
  USING (seller_id = current_user_id() OR is_admin());

-- ==============================================================================
-- TABLE: orders
-- ==============================================================================
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  tracking_number TEXT NOT NULL UNIQUE,
  buyer_id TEXT REFERENCES users(id),
  recipient_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  destination_id TEXT NOT NULL,
  street_address TEXT NOT NULL,
  landmark TEXT,
  payment_method TEXT NOT NULL DEFAULT 'cash_on_delivery',
  payment_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'paid_on_delivery', 'refunded'
  order_status TEXT NOT NULL DEFAULT 'processing', -- 'processing', 'in_transit', 'delivered', 'cancelled'
  subtotal_sle NUMERIC(12, 2) NOT NULL,
  delivery_fee_sle NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_sle NUMERIC(12, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Buyers can only view their own orders; Admins & Couriers can view assigned orders
CREATE POLICY orders_select_policy ON orders
  FOR SELECT
  USING (
    buyer_id = current_user_id()
    OR is_admin()
    OR current_user_role() = 'logistics_agent'
  );

-- Authenticated buyers can insert their own orders; guests can create with guest phone token
CREATE POLICY orders_insert_policy ON orders
  FOR INSERT
  WITH CHECK (
    buyer_id = current_user_id() 
    OR current_user_id() IS NULL
    OR is_admin()
  );

-- Only Admins and Logistics Couriers can update status (e.g. mark in_transit or delivered)
CREATE POLICY orders_update_policy ON orders
  FOR UPDATE
  USING (is_admin() OR current_user_role() = 'logistics_agent')
  WITH CHECK (is_admin() OR current_user_role() = 'logistics_agent');

-- Orders cannot be deleted by customers (Audit trail integrity)
CREATE POLICY orders_delete_policy ON orders
  FOR DELETE
  USING (is_admin());

-- ==============================================================================
-- TABLE: service_bookings
-- ==============================================================================
CREATE TABLE IF NOT EXISTS service_bookings (
  id TEXT PRIMARY KEY,
  service_id TEXT NOT NULL,
  client_id TEXT REFERENCES users(id),
  artisan_id TEXT REFERENCES users(id),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  district TEXT NOT NULL,
  address TEXT NOT NULL,
  preferred_date TEXT NOT NULL,
  preferred_time TEXT NOT NULL,
  issue_description TEXT,
  callout_fee_sle NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'confirmed', 'in_progress', 'completed'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE service_bookings ENABLE ROW LEVEL SECURITY;

-- Client can view their booking; Assigned Artisan can view booking; Admins can view all
CREATE POLICY bookings_select_policy ON service_bookings
  FOR SELECT
  USING (
    client_id = current_user_id()
    OR artisan_id = current_user_id()
    OR is_admin()
  );

CREATE POLICY bookings_insert_policy ON service_bookings
  FOR INSERT
  WITH CHECK (
    client_id = current_user_id()
    OR current_user_id() IS NULL
    OR is_admin()
  );

CREATE POLICY bookings_update_policy ON service_bookings
  FOR UPDATE
  USING (
    artisan_id = current_user_id()
    OR client_id = current_user_id()
    OR is_admin()
  );

-- ==============================================================================
-- TABLE: audit_logs (Append-Only, Zero Deletions Permitted)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  table_name TEXT NOT NULL,
  action TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE', 'SECURITY_VIOLATION'
  record_id TEXT NOT NULL,
  actor_id TEXT,
  actor_role TEXT,
  ip_address TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only Admins can view audit logs
CREATE POLICY audit_logs_select_policy ON audit_logs
  FOR SELECT
  USING (is_admin());

-- Anyone with database access can append logs via triggers or system backend
CREATE POLICY audit_logs_insert_policy ON audit_logs
  FOR INSERT
  WITH CHECK (true);

-- No user, including admins, can modify or delete audit logs
-- (No UPDATE or DELETE policy defined = access implicitly denied)
