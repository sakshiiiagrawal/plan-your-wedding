-- Sakshi & Ayush Wedding Planner Database Schema
-- Run this SQL in your Supabase SQL Editor

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE guest_side AS ENUM ('bride', 'groom', 'mutual');
CREATE TYPE rsvp_status AS ENUM ('pending', 'confirmed', 'declined', 'tentative');
CREATE TYPE meal_preference AS ENUM ('vegetarian', 'jain', 'vegan', 'non_vegetarian');
CREATE TYPE age_group AS ENUM ('child', 'adult', 'senior');
CREATE TYPE gender AS ENUM ('male', 'female', 'other');
CREATE TYPE payment_status AS ENUM ('pending', 'partial', 'paid', 'overdue', 'cancelled');
CREATE TYPE payment_method AS ENUM ('cash', 'bank_transfer', 'upi', 'cheque', 'credit_card');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
CREATE TYPE room_type AS ENUM ('single', 'double', 'suite', 'family', 'dormitory');
CREATE TYPE vendor_category AS ENUM (
  'caterer', 'decorator', 'photographer', 'videographer',
  'mehendi_artist', 'makeup_artist', 'dj', 'band', 'florist',
  'pandit', 'tent_house', 'lighting', 'invitation', 'jeweller',
  'choreographer', 'transportation', 'other'
);

-- =====================================================
-- VENUES
-- =====================================================

CREATE TABLE venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  venue_type VARCHAR(100),
  address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100),
  pincode VARCHAR(10),
  google_maps_link TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  contact_person VARCHAR(255),
  contact_phone VARCHAR(20),
  contact_email VARCHAR(255),
  capacity INTEGER,
  parking_capacity INTEGER,
  amenities JSONB,
  restrictions TEXT,
  photos TEXT[],
  documents TEXT[],
  booking_amount DECIMAL(12, 2),
  total_cost DECIMAL(12, 2),
  payment_status payment_status DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- EVENTS / ITINERARY
-- =====================================================

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  venue_id UUID REFERENCES venues(id),
  dress_code VARCHAR(255),
  theme VARCHAR(255),
  color_palette JSONB,
  rituals JSONB,
  special_notes TEXT,
  estimated_guests INTEGER,
  is_public BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event-specific items/requirements
CREATE TABLE event_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  item_name VARCHAR(255) NOT NULL,
  item_category VARCHAR(100),
  quantity INTEGER DEFAULT 1,
  unit VARCHAR(50),
  is_procured BOOLEAN DEFAULT false,
  assigned_to VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- GUESTS MANAGEMENT
-- =====================================================

CREATE TABLE guest_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  side guest_side NOT NULL,
  description TEXT,
  primary_contact_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES guest_groups(id),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100),
  phone VARCHAR(20),
  email VARCHAR(255),
  side guest_side NOT NULL,
  relationship VARCHAR(100),
  is_vip BOOLEAN DEFAULT false,
  age_group age_group DEFAULT 'adult',
  gender gender,
  meal_preference meal_preference DEFAULT 'vegetarian',
  dietary_restrictions TEXT,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100) DEFAULT 'India',
  needs_accommodation BOOLEAN DEFAULT false,
  needs_pickup BOOLEAN DEFAULT false,
  pickup_location VARCHAR(255),
  arrival_date DATE,
  arrival_time TIME,
  departure_date DATE,
  departure_time TIME,
  transport_mode VARCHAR(50),
  transport_details TEXT,
  special_requirements TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key for primary_contact after guests table is created
ALTER TABLE guest_groups ADD CONSTRAINT fk_primary_contact FOREIGN KEY (primary_contact_id) REFERENCES guests(id);

-- Guest RSVP per event
CREATE TABLE guest_event_rsvp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id UUID REFERENCES guests(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  rsvp_status rsvp_status DEFAULT 'pending',
  responded_at TIMESTAMPTZ,
  plus_ones INTEGER DEFAULT 0,
  plus_one_names TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(guest_id, event_id)
);

-- =====================================================
-- ACCOMMODATIONS & ROOM ALLOCATION
-- =====================================================

CREATE TABLE accommodations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  accommodation_type VARCHAR(100),
  address TEXT,
  city VARCHAR(100),
  distance_from_venue VARCHAR(100),
  google_maps_link TEXT,
  contact_person VARCHAR(255),
  contact_phone VARCHAR(20),
  contact_email VARCHAR(255),
  check_in_time TIME,
  check_out_time TIME,
  amenities JSONB,
  photos TEXT[],
  booking_reference VARCHAR(100),
  total_rooms_booked INTEGER,
  booking_amount DECIMAL(12, 2),
  total_cost DECIMAL(12, 2),
  payment_status payment_status DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  accommodation_id UUID REFERENCES accommodations(id) ON DELETE CASCADE,
  room_number VARCHAR(50) NOT NULL,
  room_type room_type NOT NULL,
  floor VARCHAR(20),
  capacity INTEGER DEFAULT 2,
  has_ac BOOLEAN DEFAULT true,
  has_attached_bath BOOLEAN DEFAULT true,
  rate_per_night DECIMAL(10, 2),
  is_accessible BOOLEAN DEFAULT false,
  amenities JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE room_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES guests(id) ON DELETE CASCADE,
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  is_primary_guest BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, guest_id, check_in_date)
);

-- =====================================================
-- VENDORS
-- =====================================================

CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  category vendor_category NOT NULL,
  subcategory VARCHAR(100),
  company_name VARCHAR(255),
  contact_person VARCHAR(255),
  phone VARCHAR(20),
  alternate_phone VARCHAR(20),
  email VARCHAR(255),
  website VARCHAR(255),
  instagram_handle VARCHAR(100),
  address TEXT,
  city VARCHAR(100),
  description TEXT,
  services_offered TEXT[],
  portfolio_links TEXT[],
  photos TEXT[],
  rating DECIMAL(2, 1),
  is_confirmed BOOLEAN DEFAULT false,
  contract_signed BOOLEAN DEFAULT false,
  contract_document TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vendor assignments to events
CREATE TABLE vendor_event_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  service_description TEXT,
  arrival_time TIME,
  setup_requirements TEXT,
  special_instructions TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vendor_id, event_id)
);

-- =====================================================
-- FINANCE & BUDGET
-- =====================================================

CREATE TABLE budget_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  parent_category_id UUID REFERENCES budget_categories(id),
  allocated_amount DECIMAL(12, 2) DEFAULT 0,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES budget_categories(id),
  vendor_id UUID REFERENCES vendors(id),
  event_id UUID REFERENCES events(id),
  description VARCHAR(500) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  expense_date DATE NOT NULL,
  receipt_url TEXT,
  paid_by VARCHAR(255),
  side guest_side,
  is_shared BOOLEAN DEFAULT false,
  share_percentage DECIMAL(5, 2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID REFERENCES expenses(id),
  vendor_id UUID REFERENCES vendors(id),
  accommodation_id UUID REFERENCES accommodations(id),
  venue_id UUID REFERENCES venues(id),
  amount DECIMAL(12, 2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method payment_method NOT NULL,
  transaction_reference VARCHAR(255),
  paid_by VARCHAR(255),
  received_by VARCHAR(255),
  receipt_url TEXT,
  status payment_status DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Overall budget tracking
CREATE TABLE budget_summary (
  id UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001',
  total_budget DECIMAL(14, 2) NOT NULL DEFAULT 0,
  bride_side_contribution DECIMAL(14, 2) DEFAULT 0,
  groom_side_contribution DECIMAL(14, 2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'INR',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TASKS & CHECKLIST
-- =====================================================

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  event_id UUID REFERENCES events(id),
  assigned_to VARCHAR(255),
  assigned_side guest_side,
  priority task_priority DEFAULT 'medium',
  status task_status DEFAULT 'pending',
  due_date DATE,
  completed_at TIMESTAMPTZ,
  reminder_date DATE,
  parent_task_id UUID REFERENCES tasks(id),
  display_order INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- RITUALS & TRADITIONS
-- =====================================================

CREATE TABLE rituals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  tradition VARCHAR(100),
  event_id UUID REFERENCES events(id),
  description TEXT,
  significance TEXT,
  items_required JSONB,
  participants TEXT[],
  duration_minutes INTEGER,
  display_order INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- SEATING ARRANGEMENT
-- =====================================================

CREATE TABLE seating_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  table_name VARCHAR(100) NOT NULL,
  table_number INTEGER,
  capacity INTEGER,
  location_description VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE seating_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID REFERENCES seating_tables(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES guests(id) ON DELETE CASCADE,
  seat_number INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(table_id, guest_id)
);

-- =====================================================
-- GIFT REGISTRY / TRACKING
-- =====================================================

CREATE TABLE gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id UUID REFERENCES guests(id),
  event_id UUID REFERENCES events(id),
  gift_type VARCHAR(100),
  description TEXT,
  estimated_value DECIMAL(12, 2),
  received_at TIMESTAMPTZ,
  thank_you_sent BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- WEBSITE CONTENT
-- =====================================================

CREATE TABLE website_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_name VARCHAR(100) NOT NULL UNIQUE,
  content JSONB NOT NULL,
  is_visible BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_guests_side ON guests(side);
CREATE INDEX idx_guests_group ON guests(group_id);
CREATE INDEX idx_guest_rsvp_status ON guest_event_rsvp(rsvp_status);
CREATE INDEX idx_events_date ON events(event_date);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_expenses_category ON expenses(category_id);
CREATE INDEX idx_payments_date ON payments(payment_date);
CREATE INDEX idx_vendors_category ON vendors(category);
CREATE INDEX idx_room_allocations_dates ON room_allocations(check_in_date, check_out_date);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_guests_updated_at BEFORE UPDATE ON guests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_venues_updated_at BEFORE UPDATE ON venues FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_accommodations_updated_at BEFORE UPDATE ON accommodations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_guest_rsvp_updated_at BEFORE UPDATE ON guest_event_rsvp FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_budget_summary_updated_at BEFORE UPDATE ON budget_summary FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_website_content_updated_at BEFORE UPDATE ON website_content FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
