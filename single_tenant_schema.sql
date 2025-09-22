

CREATE SCHEMA IF NOT EXISTS "public";
ALTER SCHEMA "public" OWNER TO "pg_database_owner";
COMMENT ON SCHEMA "public" IS 'standard public schema';

-- ENUM TYPES (keeping all existing enums)
CREATE TYPE "public"."booking_status" AS ENUM (
    'unconfirmed',
    'confirmed',
    'briefing',
    'flying',
    'complete',
    'cancelled'
);
ALTER TYPE "public"."booking_status" OWNER TO "postgres";

CREATE TYPE "public"."booking_type" AS ENUM (
    'flight',
    'groundwork',
    'maintenance',
    'other'
);
ALTER TYPE "public"."booking_type" OWNER TO "postgres";

CREATE TYPE "public"."chargeable_type" AS ENUM (
    'aircraft_rental',
    'instructor_fee',
    'membership_fee',
    'landing_fee',
    'facility_rental',
    'product_sale',
    'service_fee',
    'other',
    'default_briefing',
    'airways_fees'
);
ALTER TYPE "public"."chargeable_type" OWNER TO "postgres";

CREATE TYPE "public"."component_status_enum" AS ENUM (
    'active',
    'inactive',
    'removed'
);
ALTER TYPE "public"."component_status_enum" OWNER TO "postgres";

CREATE TYPE "public"."component_type_enum" AS ENUM (
    'battery',
    'inspection',
    'service',
    'engine',
    'fuselage',
    'avionics',
    'elt',
    'propeller',
    'landing_gear',
    'other'
);
ALTER TYPE "public"."component_type_enum" OWNER TO "postgres";

CREATE TYPE "public"."employment_type" AS ENUM (
    'full_time',
    'part_time',
    'casual',
    'contractor'
);
ALTER TYPE "public"."employment_type" OWNER TO "postgres";

CREATE TYPE "public"."equipment_status" AS ENUM (
    'active',
    'lost',
    'maintenance',
    'retired'
);
ALTER TYPE "public"."equipment_status" OWNER TO "postgres";

CREATE TYPE "public"."equipment_type" AS ENUM (
    'AIP',
    'Stationery',
    'Headset',
    'Technology',
    'Maps',
    'Radio',
    'Transponder',
    'ELT',
    'Lifejacket',
    'FirstAidKit',
    'FireExtinguisher',
    'Other'
);
ALTER TYPE "public"."equipment_type" OWNER TO "postgres";

CREATE TYPE "public"."exam_result" AS ENUM (
    'PASS',
    'FAIL'
);
ALTER TYPE "public"."exam_result" OWNER TO "postgres";

CREATE TYPE "public"."gender_enum" AS ENUM (
    'male',
    'female'
);
ALTER TYPE "public"."gender_enum" OWNER TO "postgres";

CREATE TYPE "public"."instructor_status" AS ENUM (
    'active',
    'inactive',
    'deactivated',
    'suspended'
);
ALTER TYPE "public"."instructor_status" OWNER TO "postgres";

CREATE TYPE "public"."interval_type_enum" AS ENUM (
    'HOURS',
    'CALENDAR',
    'BOTH'
);
ALTER TYPE "public"."interval_type_enum" OWNER TO "postgres";

CREATE TYPE "public"."invoice_status" AS ENUM (
    'draft',
    'pending',
    'paid',
    'overdue',
    'cancelled',
    'refunded'
);
ALTER TYPE "public"."invoice_status" OWNER TO "postgres";

CREATE TYPE "public"."membership_type" AS ENUM (
    'flying_member',
    'non_flying_member',
    'staff_membership',
    'junior_member',
    'life_member'
);
ALTER TYPE "public"."membership_type" OWNER TO "postgres";

CREATE TYPE "public"."observation_stage" AS ENUM (
    'open',
    'investigation',
    'resolution',
    'closed'
);
ALTER TYPE "public"."observation_stage" OWNER TO "postgres";

CREATE TYPE "public"."observation_status" AS ENUM (
    'active',
    'resolved',
    'closed'
);
ALTER TYPE "public"."observation_status" OWNER TO "postgres";

CREATE TYPE "public"."payment_method" AS ENUM (
    'cash',
    'credit_card',
    'debit_card',
    'bank_transfer',
    'check',
    'online_payment',
    'other'
);
ALTER TYPE "public"."payment_method" OWNER TO "postgres";

CREATE TYPE "public"."syllabus_stage" AS ENUM (
    'not_started',
    'in_progress',
    'completed',
    'failed'
);
ALTER TYPE "public"."syllabus_stage" OWNER TO "postgres";

CREATE TYPE "public"."total_time_method" AS ENUM (
    'hobbs',
    'tach',
    'both',
    'manual'
);
ALTER TYPE "public"."total_time_method" OWNER TO "postgres";

CREATE TYPE "public"."transaction_status" AS ENUM (
    'pending',
    'completed',
    'failed',
    'cancelled',
    'refunded'
);
ALTER TYPE "public"."transaction_status" OWNER TO "postgres";

CREATE TYPE "public"."transaction_type" AS ENUM (
    'credit',
    'debit',
    'refund',
    'adjustment'
);
ALTER TYPE "public"."transaction_type" OWNER TO "postgres";

CREATE TYPE "public"."user_role" AS ENUM (
    'admin',
    'instructor',
    'member',
    'student',
    'owner'
);
ALTER TYPE "public"."user_role" OWNER TO "postgres";

-- FUNCTIONS (refactored for single-tenant)
CREATE OR REPLACE FUNCTION "public"."calculate_flight_time"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Calculate flight time based on hobbs or tach readings
    IF NEW.hobbs_start IS NOT NULL AND NEW.hobbs_end IS NOT NULL THEN
        NEW.flight_time_hobbs := NEW.hobbs_end - NEW.hobbs_start;
    END IF;
    
    IF NEW.tach_start IS NOT NULL AND NEW.tach_end IS NOT NULL THEN
        NEW.flight_time_tach := NEW.tach_end - NEW.tach_start;
    END IF;
    
    RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."calculate_flight_time"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."calculate_invoice_item_amounts"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Calculate line total
    NEW.line_total := NEW.quantity * NEW.unit_price;
    
    -- Calculate tax amount if applicable
    IF NEW.tax_rate IS NOT NULL AND NEW.tax_rate > 0 THEN
        NEW.tax_amount := NEW.line_total * (NEW.tax_rate / 100);
    ELSE
        NEW.tax_amount := 0;
    END IF;
    
    RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."calculate_invoice_item_amounts"() OWNER TO "postgres";

-- Updated check_user_role function for roles table structure
CREATE OR REPLACE FUNCTION "public"."check_user_role"("user_id" "uuid", "allowed_roles" "public"."user_role"[]) RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = check_user_role.user_id 
        AND r.name = ANY(allowed_roles)
        AND ur.is_active = true
        AND r.is_active = true
    );
END;
$$;
ALTER FUNCTION "public"."check_user_role"("user_id" "uuid", "allowed_roles" "public"."user_role"[]) OWNER TO "postgres";

-- Simplified equipment_update_summary function (no organization parameter)
CREATE OR REPLACE FUNCTION "public"."equipment_update_summary"() RETURNS TABLE("id" "uuid", "name" "text", "label" "text", "type" "public"."equipment_type", "last_updated_at" timestamp with time zone, "next_due_at" timestamp with time zone, "days_until_due" integer, "status" "text", "last_updated_by" "uuid", "last_updated_by_name" "text", "notes" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.name,
        e.label,
        e.type,
        eu.updated_at as last_updated_at,
        eu.next_due_at,
        EXTRACT(DAY FROM (eu.next_due_at - CURRENT_TIMESTAMP))::integer as days_until_due,
        CASE 
            WHEN eu.next_due_at < CURRENT_TIMESTAMP THEN 'Overdue'
            WHEN eu.next_due_at <= CURRENT_TIMESTAMP + INTERVAL '7 days' THEN 'Due Soon'
            ELSE 'OK'
        END as status,
        eu.updated_by as last_updated_by,
        u.first_name || ' ' || u.last_name as last_updated_by_name,
        eu.notes
    FROM equipment e
    LEFT JOIN LATERAL (
        SELECT * FROM equipment_updates eu2
        WHERE eu2.equipment_id = e.id
        ORDER BY eu2.updated_at DESC
        LIMIT 1
    ) eu ON true
    LEFT JOIN users u ON u.id = eu.updated_by
    WHERE e.status = 'active'::equipment_status;
END;
$$;
ALTER FUNCTION "public"."equipment_update_summary"() OWNER TO "postgres";

-- Simplified generate_invoice_number function (no organization parameter)
CREATE OR REPLACE FUNCTION "public"."generate_invoice_number"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_year_month text;
    v_sequence integer;
    v_invoice_number text;
BEGIN
    v_year_month := TO_CHAR(CURRENT_DATE, 'YYYY-MM');
    
    -- Get or create sequence for this year-month
    INSERT INTO invoice_sequences (year_month, last_sequence)
    VALUES (v_year_month, 1)
    ON CONFLICT (year_month)
    DO UPDATE SET last_sequence = invoice_sequences.last_sequence + 1
    RETURNING last_sequence INTO v_sequence;
    
    v_invoice_number := 'INV-' || v_year_month || '-' || LPAD(v_sequence::text, 4, '0');
    
    RETURN v_invoice_number;
END;
$$;
ALTER FUNCTION "public"."generate_invoice_number"() OWNER TO "postgres";

-- Simplified get_account_balance function (no organization parameter)
CREATE OR REPLACE FUNCTION "public"."get_account_balance"("p_user_id" "uuid") RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_balance numeric := 0;
BEGIN
    SELECT COALESCE(SUM(
        CASE 
            WHEN t.type = 'credit' THEN t.amount
            WHEN t.type = 'debit' THEN -t.amount
            ELSE 0
        END
    ), 0) INTO v_balance
    FROM transactions t
    WHERE t.user_id = p_user_id AND t.status = 'completed';
    
    RETURN v_balance;
END;
$$;
ALTER FUNCTION "public"."get_account_balance"("p_user_id" "uuid") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_member_role_id uuid;
BEGIN
    -- Insert user without role column
    INSERT INTO public.users (id, email, first_name, last_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'last_name');
    
    -- Get the member role ID (more robust query)
    SELECT id INTO v_member_role_id FROM public.roles WHERE name = 'member' LIMIT 1;
    
    -- If member role exists, assign it to the new user
    IF v_member_role_id IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role_id, granted_by)
        VALUES (NEW.id, v_member_role_id, NEW.id);
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the user creation
        RAISE WARNING 'Error in handle_new_user trigger: %', SQLERRM;
        RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."log_booking_audit"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_old_data jsonb;
    v_new_data jsonb;
    v_column_changes jsonb;
BEGIN
    -- Capture old and new data
    IF TG_OP = 'DELETE' THEN
        v_old_data = to_jsonb(OLD);
        v_new_data = NULL;
    ELSIF TG_OP = 'INSERT' THEN
        v_old_data = NULL;
        v_new_data = to_jsonb(NEW);
    ELSE
        v_old_data = to_jsonb(OLD);
        v_new_data = to_jsonb(NEW);
    END IF;
    
    -- Insert audit log
    INSERT INTO audit_logs (
        table_name, action, record_id, user_id,
        old_data, new_data, column_changes
    ) VALUES (
        TG_TABLE_NAME, TG_OP, COALESCE(NEW.id, OLD.id), auth.uid(),
        v_old_data, v_new_data, v_column_changes
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$;
ALTER FUNCTION "public"."log_booking_audit"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."prevent_double_booking_on_bookings"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Check for overlapping bookings for the same aircraft
    IF EXISTS (
        SELECT 1 FROM bookings
        WHERE aircraft_id = NEW.aircraft_id
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND status NOT IN ('cancelled', 'complete')
        AND (
            (start_time, end_time) OVERLAPS (NEW.start_time, NEW.end_time)
        )
    ) THEN
        RAISE EXCEPTION 'Double booking detected for aircraft % at time % to %', 
            NEW.aircraft_id, NEW.start_time, NEW.end_time;
    END IF;
    
    RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."prevent_double_booking_on_bookings"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."process_invoice_approval"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_amount numeric;
BEGIN
    -- Only process when status changes to 'pending'
    IF NEW.status = 'pending' AND OLD.status != 'pending' THEN
        v_amount := NEW.total_amount;
        
        -- Create debit transaction
        INSERT INTO transactions (
            user_id, type, status, amount, description, metadata, reference_number, completed_at
        ) VALUES (
            NEW.user_id, 'debit', 'completed', -v_amount,
            'Invoice: ' || NEW.invoice_number,
            jsonb_build_object('invoice_id', NEW.id),
            NEW.invoice_number,
            CURRENT_TIMESTAMP
        );
    END IF;
    
    RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."process_invoice_approval"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."process_payment"("p_invoice_id" "uuid", "p_amount" numeric, "p_payment_method" "text", "p_payment_reference" "text", "p_notes" "text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_payment_id uuid;
    v_invoice record;
    v_transaction_id uuid;
BEGIN
    -- Get invoice details
    SELECT * INTO v_invoice FROM invoices WHERE id = p_invoice_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invoice not found: %', p_invoice_id;
    END IF;
    
    -- Create payment record
    INSERT INTO payments (
        invoice_id, user_id, amount, payment_method, payment_reference, notes, status
    ) VALUES (
        p_invoice_id, v_invoice.user_id, p_amount, p_payment_method, p_payment_reference, p_notes, 'completed'
    ) RETURNING id INTO v_payment_id;
    
    -- Create credit transaction
    INSERT INTO transactions (
        user_id, type, status, amount, description, metadata, reference_number, completed_at
    ) VALUES (
        v_invoice.user_id, 'credit', 'completed', p_amount,
        'Payment for invoice: ' || v_invoice.invoice_number,
        jsonb_build_object('invoice_id', p_invoice_id, 'payment_id', v_payment_id),
        p_payment_reference,
        CURRENT_TIMESTAMP
    ) RETURNING id INTO v_transaction_id;
    
    -- Update invoice paid date
    UPDATE invoices 
    SET paid_date = CURRENT_TIMESTAMP
    WHERE id = p_invoice_id;
    
    RETURN v_payment_id;
END;
$$;
ALTER FUNCTION "public"."process_payment"("p_invoice_id" "uuid", "p_amount" numeric, "p_payment_method" "text", "p_payment_reference" "text", "p_notes" "text") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."process_refund"("p_payment_id" "uuid", "p_amount" numeric, "p_notes" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_refund_id uuid;
    v_payment record;
    v_transaction_id uuid;
BEGIN
    -- Get payment details
    SELECT * INTO v_payment FROM payments WHERE id = p_payment_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment not found: %', p_payment_id;
    END IF;
    
    -- Create refund record
    INSERT INTO payments (
        invoice_id, user_id, amount, payment_method, payment_reference, notes, status
    ) VALUES (
        v_payment.invoice_id, v_payment.user_id, -p_amount, 'refund', 'REFUND-' || p_payment_id, p_notes, 'completed'
    ) RETURNING id INTO v_refund_id;
    
    -- Create debit transaction (negative amount for refund)
    INSERT INTO transactions (
        user_id, type, status, amount, description, metadata, reference_number, completed_at
    ) VALUES (
        v_payment.user_id, 'debit', 'completed', -p_amount,
        'Refund for payment: ' || v_payment.payment_reference,
        jsonb_build_object('payment_id', p_payment_id, 'refund_id', v_refund_id),
        'REFUND-' || p_payment_id,
        CURRENT_TIMESTAMP
    ) RETURNING id INTO v_transaction_id;
    
    -- Update invoice paid date if full refund
    IF p_amount >= v_payment.amount THEN
        UPDATE invoices 
        SET paid_date = NULL
        WHERE id = v_payment.invoice_id;
    END IF;
    
    RETURN v_refund_id;
END;
$$;
ALTER FUNCTION "public"."process_refund"("p_payment_id" "uuid", "p_amount" numeric, "p_notes" "text") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."reverse_invoice_debit_transaction"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Delete associated debit transaction when invoice is deleted or status changes
    DELETE FROM transactions 
    WHERE metadata->>'invoice_id' = COALESCE(NEW.id, OLD.id)::text
    AND type = 'debit';
    
    RETURN COALESCE(NEW, OLD);
END;
$$;
ALTER FUNCTION "public"."reverse_invoice_debit_transaction"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."set_invoice_number"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF NEW.invoice_number IS NULL THEN
        NEW.invoice_number := generate_invoice_number();
    END IF;
    RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."set_invoice_number"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."set_lesson_progress_attempt"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Set attempt number based on existing attempts for this lesson and user
    SELECT COALESCE(MAX(attempt), 0) + 1 INTO NEW.attempt
    FROM lesson_progress
    WHERE lesson_id = NEW.lesson_id AND user_id = NEW.user_id;
    
    RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."set_lesson_progress_attempt"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."sync_invoice_debit_transaction"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_amount numeric;
BEGIN
    -- Update or create debit transaction when invoice amount changes
    v_amount := NEW.total_amount;
    
    -- Delete existing debit transaction
    DELETE FROM transactions 
    WHERE metadata->>'invoice_id' = NEW.id::text
    AND type = 'debit';
    
    -- Create new debit transaction if status is pending
    IF NEW.status = 'pending' THEN
        INSERT INTO transactions (
            user_id, type, status, amount, description, metadata, reference_number, completed_at
        ) VALUES (
            NEW.user_id, 'debit', 'completed', -v_amount,
            'Invoice: ' || NEW.invoice_number,
            jsonb_build_object('invoice_id', NEW.id),
            NEW.invoice_number,
            CURRENT_TIMESTAMP
        );
    END IF;
    
    RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."sync_invoice_debit_transaction"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."trigger_set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."trigger_set_updated_at"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."update_defects_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."update_defects_updated_at"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."update_instructors_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."update_instructors_updated_at"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."update_invoice_balance_due"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Calculate balance due based on total amount and payments
    NEW.balance_due := NEW.total_amount - COALESCE((
        SELECT SUM(amount) 
        FROM payments 
        WHERE invoice_id = NEW.id AND status = 'completed'
    ), 0);
    
    RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."update_invoice_balance_due"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."update_invoice_payment_totals"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_invoice_id uuid;
    v_total_paid numeric;
BEGIN
    -- Determine which invoice to update
    IF TG_OP = 'DELETE' THEN
        v_invoice_id := OLD.invoice_id;
    ELSE
        v_invoice_id := NEW.invoice_id;
    END IF;
    
    -- Calculate total paid
    SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
    FROM payments
    WHERE invoice_id = v_invoice_id AND status = 'completed';
    
    -- Update invoice
    UPDATE invoices 
    SET total_paid = v_total_paid,
        balance_due = total_amount - v_total_paid
    WHERE id = v_invoice_id;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;
ALTER FUNCTION "public"."update_invoice_payment_totals"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."update_invoice_status"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Update status based on payment status
    IF NEW.paid_date IS NOT NULL THEN
        NEW.status := 'paid';
    ELSIF NEW.balance_due > 0 AND NEW.due_date < CURRENT_DATE THEN
        NEW.status := 'overdue';
    ELSIF NEW.balance_due > 0 THEN
        NEW.status := 'pending';
    ELSE
        NEW.status := 'paid';
    END IF;
    
    RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."update_invoice_status"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."update_invoice_totals"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_invoice_id uuid;
    v_subtotal numeric;
    v_tax_total numeric;
    v_total numeric;
BEGIN
    -- Determine which invoice to update
    IF TG_OP = 'DELETE' THEN
        v_invoice_id := OLD.invoice_id;
    ELSE
        v_invoice_id := NEW.invoice_id;
    END IF;
    
    -- Calculate totals
    SELECT 
        COALESCE(SUM(line_total), 0),
        COALESCE(SUM(tax_amount), 0)
    INTO v_subtotal, v_tax_total
    FROM invoice_items
    WHERE invoice_id = v_invoice_id;
    
    v_total := v_subtotal + v_tax_total;
    
    -- Update invoice
    UPDATE invoices 
    SET subtotal = v_subtotal,
        tax_total = v_tax_total,
        total_amount = v_total,
        balance_due = v_total - COALESCE(total_paid, 0)
    WHERE id = v_invoice_id;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;
ALTER FUNCTION "public"."update_invoice_totals"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."update_transaction_status"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Set completed_at timestamp when status changes to completed
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        NEW.completed_at := CURRENT_TIMESTAMP;
    END IF;
    
    RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."update_transaction_status"() OWNER TO "postgres";

-- TABLES (First 6 tables - removing organization_id columns)
CREATE TABLE IF NOT EXISTS "public"."aircraft" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "registration" "text" NOT NULL,
    "type" "text" NOT NULL,
    "model" "text",
    "year_manufactured" integer,
    "total_time" numeric,
    "last_inspection_date" timestamp with time zone,
    "next_inspection_date" timestamp with time zone,
    "status" "text" DEFAULT 'active'::text,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."aircraft" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."aircraft_charge_rates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "aircraft_id" "uuid" NOT NULL,
    "flight_type_id" "uuid" NOT NULL,
    "hourly_rate" numeric NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."aircraft_charge_rates" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."aircraft_components" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "aircraft_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "type" "public"."component_type_enum" NOT NULL,
    "status" "public"."component_status_enum" DEFAULT 'active'::"public"."component_status_enum" NOT NULL,
    "last_service_date" timestamp with time zone,
    "next_service_date" timestamp with time zone,
    "service_interval_hours" integer,
    "service_interval_calendar" interval,
    "interval_type" "public"."interval_type_enum" DEFAULT 'HOURS'::"public"."interval_type_enum" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."aircraft_components" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."aircraft_tech_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "aircraft_id" "uuid" NOT NULL,
    "entry_date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "entry_type" "text" NOT NULL,
    "description" "text" NOT NULL,
    "hours" numeric,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."aircraft_tech_log" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "table_name" "text" NOT NULL,
    "action" "text" NOT NULL,
    "record_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "old_data" "jsonb",
    "new_data" "jsonb",
    "column_changes" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."audit_logs" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."booking_details" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_id" "uuid" NOT NULL,
    "lesson_id" "uuid",
    "instructor_id" "uuid",
    "student_id" "uuid",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."booking_details" OWNER TO "postgres";

-- TABLES (Next 6 tables - removing organization_id columns)
CREATE TABLE IF NOT EXISTS "public"."bookings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "aircraft_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "flight_type_id" "uuid",
    "start_time" timestamp with time zone NOT NULL,
    "end_time" timestamp with time zone NOT NULL,
    "status" "public"."booking_status" DEFAULT 'unconfirmed'::"public"."booking_status" NOT NULL,
    "booking_type" "public"."booking_type" DEFAULT 'flight'::"public"."booking_type" NOT NULL,
    "hobbs_start" numeric,
    "hobbs_end" numeric,
    "tach_start" numeric,
    "tach_end" numeric,
    "flight_time_hobbs" numeric,
    "flight_time_tach" numeric,
    "total_time_method" "public"."total_time_method" DEFAULT 'hobbs'::"public"."total_time_method" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."bookings" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."cancellation_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."cancellation_categories" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."chargeables" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "type" "public"."chargeable_type" NOT NULL,
    "description" "text",
    "unit_price" numeric NOT NULL,
    "tax_rate" numeric DEFAULT 0,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."chargeables" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."endorsements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."endorsements" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."equipment" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "label" "text",
    "type" "public"."equipment_type" NOT NULL,
    "status" "public"."equipment_status" DEFAULT 'active'::"public"."equipment_status" NOT NULL,
    "serial_number" "text",
    "purchase_date" timestamp with time zone,
    "warranty_expiry" timestamp with time zone,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."equipment" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."equipment_issuance" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "equipment_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "issued_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "returned_at" timestamp with time zone,
    "issued_by" "uuid" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."equipment_issuance" OWNER TO "postgres";

-- TABLES (Next 6 tables - removing organization_id columns)
CREATE TABLE IF NOT EXISTS "public"."equipment_updates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "equipment_id" "uuid" NOT NULL,
    "update_type" "text" NOT NULL,
    "description" "text" NOT NULL,
    "next_due_at" timestamp with time zone,
    "updated_by" "uuid" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."equipment_updates" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."exam" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "passing_score" integer NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."exam" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."exam_results" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "exam_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "score" integer NOT NULL,
    "result" "public"."exam_result" NOT NULL,
    "exam_date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."exam_results" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."flight_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."flight_types" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."instructor_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "instructor_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "comment" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."instructor_comments" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."instructor_endorsements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "instructor_id" "uuid" NOT NULL,
    "endorsement_id" "uuid" NOT NULL,
    "issued_date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expiry_date" timestamp with time zone,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."instructor_endorsements" OWNER TO "postgres";

-- TABLES (Next 6 tables - removing organization_id columns)
CREATE TABLE IF NOT EXISTS "public"."instructor_flight_type_rates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "instructor_id" "uuid" NOT NULL,
    "flight_type_id" "uuid" NOT NULL,
    "hourly_rate" numeric NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."instructor_flight_type_rates" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."instructors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "public"."instructor_status" DEFAULT 'active'::"public"."instructor_status" NOT NULL,
    "employment_type" "public"."employment_type",
    "hire_date" timestamp with time zone,
    "termination_date" timestamp with time zone,
    "hourly_rate" numeric,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."instructors" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."invoice_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "invoice_id" "uuid" NOT NULL,
    "chargeable_id" "uuid",
    "description" "text" NOT NULL,
    "quantity" numeric DEFAULT 1 NOT NULL,
    "unit_price" numeric NOT NULL,
    "line_total" numeric,
    "tax_rate" numeric DEFAULT 0,
    "tax_amount" numeric,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."invoice_items" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."invoice_sequences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "year_month" "text" NOT NULL,
    "last_sequence" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."invoice_sequences" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."invoices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "invoice_number" "text",
    "user_id" "uuid" NOT NULL,
    "status" "public"."invoice_status" DEFAULT 'draft'::"public"."invoice_status" NOT NULL,
    "issue_date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "due_date" timestamp with time zone,
    "paid_date" timestamp with time zone,
    "subtotal" numeric DEFAULT 0,
    "tax_total" numeric DEFAULT 0,
    "total_amount" numeric DEFAULT 0,
    "total_paid" numeric DEFAULT 0,
    "balance_due" numeric DEFAULT 0,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."invoices" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."lesson_progress" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lesson_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "stage" "public"."syllabus_stage" DEFAULT 'not_started'::"public"."syllabus_stage" NOT NULL,
    "attempt" integer DEFAULT 1 NOT NULL,
    "completed_at" timestamp with time zone,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."lesson_progress" OWNER TO "postgres";

-- TABLES (Next 6 tables - removing organization_id columns)
CREATE TABLE IF NOT EXISTS "public"."lessons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "syllabus_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "order_index" integer NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."lessons" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."maintenance_visits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "aircraft_id" "uuid" NOT NULL,
    "visit_date" timestamp with time zone NOT NULL,
    "visit_type" "text" NOT NULL,
    "description" "text" NOT NULL,
    "hours_before" numeric,
    "hours_after" numeric,
    "next_due_hours" numeric,
    "next_due_date" timestamp with time zone,
    "performed_by" "uuid",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."maintenance_visits" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."memberships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "public"."membership_type" NOT NULL,
    "start_date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "end_date" timestamp with time zone,
    "is_active" boolean DEFAULT true NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."memberships" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."observations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "aircraft_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "stage" "public"."observation_stage" DEFAULT 'open'::"public"."observation_stage" NOT NULL,
    "status" "public"."observation_status" DEFAULT 'active'::"public"."observation_status" NOT NULL,
    "priority" "text" DEFAULT 'medium'::text,
    "reported_by" "uuid" NOT NULL,
    "assigned_to" "uuid",
    "reported_date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "resolved_date" timestamp with time zone,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."observations" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "invoice_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "amount" numeric NOT NULL,
    "payment_method" "public"."payment_method" NOT NULL,
    "payment_reference" "text",
    "notes" "text",
    "status" "text" DEFAULT 'completed'::text NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."payments" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."student_syllabus_enrollment" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "syllabus_id" "uuid" NOT NULL,
    "enrollment_date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completion_date" timestamp with time zone,
    "status" "text" DEFAULT 'active'::text NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."student_syllabus_enrollment" OWNER TO "postgres";

-- TABLES (Final batch - removing organization_id columns and adding role to users)
CREATE TABLE IF NOT EXISTS "public"."syllabus" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."syllabus" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."tax_rates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "country_code" "text" NOT NULL,
    "region_code" "text",
    "rate" numeric NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."tax_rates" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "public"."transaction_type" NOT NULL,
    "status" "public"."transaction_status" DEFAULT 'pending'::"public"."transaction_status" NOT NULL,
    "amount" numeric NOT NULL,
    "description" "text" NOT NULL,
    "metadata" "jsonb",
    "reference_number" "text",
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."transactions" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "phone" "text",
    "date_of_birth" date,
    "gender" "public"."gender_enum",
    "address" "text",
    "city" "text",
    "state" "text",
    "postal_code" "text",
    "country" "text",
    "emergency_contact_name" "text",
    "emergency_contact_phone" "text",
    "emergency_contact_relationship" "text",

    "medical_certificate_expiry" date,
    "pilot_license_number" "text",
    "pilot_license_type" "text",
    "pilot_license_expiry" date,
    "total_flight_hours" numeric DEFAULT 0,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."users" OWNER TO "postgres";

-- ROLES TABLE
CREATE TABLE IF NOT EXISTS "public"."roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "public"."user_role" NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."roles" OWNER TO "postgres";

-- USER ROLES JUNCTION TABLE
CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role_id" "uuid" NOT NULL,
    "granted_by" "uuid",
    "granted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."user_roles" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."user_permission_overrides" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "permission_id" "uuid" NOT NULL,
    "granted" boolean NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."user_permission_overrides" OWNER TO "postgres";

-- PRIMARY KEYS
ALTER TABLE ONLY "public"."aircraft"
    ADD CONSTRAINT "aircraft_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."aircraft_charge_rates"
    ADD CONSTRAINT "aircraft_charge_rates_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."aircraft_components"
    ADD CONSTRAINT "aircraft_components_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."aircraft_tech_log"
    ADD CONSTRAINT "aircraft_tech_log_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."booking_details"
    ADD CONSTRAINT "booking_details_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."cancellation_categories"
    ADD CONSTRAINT "cancellation_categories_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."chargeables"
    ADD CONSTRAINT "chargeables_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."endorsements"
    ADD CONSTRAINT "endorsements_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."equipment"
    ADD CONSTRAINT "equipment_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."equipment_issuance"
    ADD CONSTRAINT "equipment_issuance_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."equipment_updates"
    ADD CONSTRAINT "equipment_updates_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."exam"
    ADD CONSTRAINT "exam_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."exam_results"
    ADD CONSTRAINT "exam_results_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."flight_types"
    ADD CONSTRAINT "flight_types_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."instructor_comments"
    ADD CONSTRAINT "instructor_comments_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."instructor_endorsements"
    ADD CONSTRAINT "instructor_endorsements_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."instructor_flight_type_rates"
    ADD CONSTRAINT "instructor_flight_type_rates_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."instructors"
    ADD CONSTRAINT "instructors_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."invoice_items"
    ADD CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."invoice_sequences"
    ADD CONSTRAINT "invoice_sequences_pkey" PRIMARY KEY ("year_month");

ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."lesson_progress"
    ADD CONSTRAINT "lesson_progress_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."lessons"
    ADD CONSTRAINT "lessons_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."maintenance_visits"
    ADD CONSTRAINT "maintenance_visits_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."memberships"
    ADD CONSTRAINT "memberships_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."observations"
    ADD CONSTRAINT "observations_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."student_syllabus_enrollment"
    ADD CONSTRAINT "student_syllabus_enrollment_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."syllabus"
    ADD CONSTRAINT "syllabus_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."tax_rates"
    ADD CONSTRAINT "tax_rates_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."user_permission_overrides"
    ADD CONSTRAINT "user_permission_overrides_pkey" PRIMARY KEY ("id");

-- UNIQUE CONSTRAINTS (excluding organization-based ones)
ALTER TABLE ONLY "public"."aircraft"
    ADD CONSTRAINT "aircraft_registration_key" UNIQUE ("registration");

ALTER TABLE ONLY "public"."aircraft_charge_rates"
    ADD CONSTRAINT "aircraft_charge_rates_aircraft_flighttype_unique" UNIQUE ("aircraft_id", "flight_type_id");

ALTER TABLE ONLY "public"."endorsements"
    ADD CONSTRAINT "endorsements_name_key" UNIQUE ("name");

ALTER TABLE ONLY "public"."flight_types"
    ADD CONSTRAINT "flight_types_name_key" UNIQUE ("name");

ALTER TABLE ONLY "public"."instructor_flight_type_rates"
    ADD CONSTRAINT "instructor_flight_type_rates_instructor_id_flight_type_id_key" UNIQUE ("instructor_id", "flight_type_id");

ALTER TABLE ONLY "public"."instructors"
    ADD CONSTRAINT "instructors_user_id_key" UNIQUE ("user_id");

ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");

ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_name_key" UNIQUE ("name");

ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_role_id_key" UNIQUE ("user_id", "role_id");

ALTER TABLE ONLY "public"."user_permission_overrides"
    ADD CONSTRAINT "user_permission_overrides_user_id_permission_id_key" UNIQUE ("user_id", "permission_id");

-- FOREIGN KEY CONSTRAINTS (excluding organization-related ones)
ALTER TABLE ONLY "public"."aircraft_charge_rates"
    ADD CONSTRAINT "aircraft_charge_rates_aircraft_id_fkey" FOREIGN KEY ("aircraft_id") REFERENCES "public"."aircraft"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."aircraft_charge_rates"
    ADD CONSTRAINT "aircraft_charge_rates_flight_type_id_fkey" FOREIGN KEY ("flight_type_id") REFERENCES "public"."flight_types"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."aircraft_components"
    ADD CONSTRAINT "aircraft_components_aircraft_id_fkey" FOREIGN KEY ("aircraft_id") REFERENCES "public"."aircraft"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."aircraft_tech_log"
    ADD CONSTRAINT "aircraft_tech_log_aircraft_id_fkey" FOREIGN KEY ("aircraft_id") REFERENCES "public"."aircraft"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."aircraft_tech_log"
    ADD CONSTRAINT "aircraft_tech_log_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."booking_details"
    ADD CONSTRAINT "booking_details_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."booking_details"
    ADD CONSTRAINT "booking_details_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "public"."instructors"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."booking_details"
    ADD CONSTRAINT "booking_details_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."booking_details"
    ADD CONSTRAINT "booking_details_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_aircraft_id_fkey" FOREIGN KEY ("aircraft_id") REFERENCES "public"."aircraft"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_flight_type_id_fkey" FOREIGN KEY ("flight_type_id") REFERENCES "public"."flight_types"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."equipment_issuance"
    ADD CONSTRAINT "equipment_issuance_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."equipment_issuance"
    ADD CONSTRAINT "equipment_issuance_issued_by_fkey" FOREIGN KEY ("issued_by") REFERENCES "public"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."equipment_issuance"
    ADD CONSTRAINT "equipment_issuance_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."equipment_updates"
    ADD CONSTRAINT "equipment_updates_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."equipment_updates"
    ADD CONSTRAINT "equipment_updates_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."exam_results"
    ADD CONSTRAINT "exam_results_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "public"."exam"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."exam_results"
    ADD CONSTRAINT "exam_results_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."instructor_comments"
    ADD CONSTRAINT "instructor_comments_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "public"."instructors"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."instructor_comments"
    ADD CONSTRAINT "instructor_comments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."instructor_endorsements"
    ADD CONSTRAINT "instructor_endorsements_endorsement_id_fkey" FOREIGN KEY ("endorsement_id") REFERENCES "public"."endorsements"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."instructor_endorsements"
    ADD CONSTRAINT "instructor_endorsements_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "public"."instructors"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."instructor_flight_type_rates"
    ADD CONSTRAINT "instructor_flight_type_rates_flight_type_id_fkey" FOREIGN KEY ("flight_type_id") REFERENCES "public"."flight_types"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."instructor_flight_type_rates"
    ADD CONSTRAINT "instructor_flight_type_rates_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "public"."instructors"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."instructors"
    ADD CONSTRAINT "instructors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."invoice_items"
    ADD CONSTRAINT "invoice_items_chargeable_id_fkey" FOREIGN KEY ("chargeable_id") REFERENCES "public"."chargeables"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."invoice_items"
    ADD CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."lesson_progress"
    ADD CONSTRAINT "lesson_progress_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."lesson_progress"
    ADD CONSTRAINT "lesson_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."lessons"
    ADD CONSTRAINT "lessons_syllabus_id_fkey" FOREIGN KEY ("syllabus_id") REFERENCES "public"."syllabus"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."maintenance_visits"
    ADD CONSTRAINT "maintenance_visits_aircraft_id_fkey" FOREIGN KEY ("aircraft_id") REFERENCES "public"."aircraft"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."maintenance_visits"
    ADD CONSTRAINT "maintenance_visits_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."memberships"
    ADD CONSTRAINT "memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."observations"
    ADD CONSTRAINT "observations_aircraft_id_fkey" FOREIGN KEY ("aircraft_id") REFERENCES "public"."aircraft"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."observations"
    ADD CONSTRAINT "observations_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."observations"
    ADD CONSTRAINT "observations_reported_by_fkey" FOREIGN KEY ("reported_by") REFERENCES "public"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."student_syllabus_enrollment"
    ADD CONSTRAINT "student_syllabus_enrollment_syllabus_id_fkey" FOREIGN KEY ("syllabus_id") REFERENCES "public"."syllabus"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."student_syllabus_enrollment"
    ADD CONSTRAINT "student_syllabus_enrollment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."user_permission_overrides"
    ADD CONSTRAINT "user_permission_overrides_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;

-- INDEXES (excluding organization-related ones)
CREATE INDEX "idx_aircraft_charge_rates_aircraft_id" ON "public"."aircraft_charge_rates" USING "btree" ("aircraft_id");

CREATE INDEX "idx_aircraft_charge_rates_flight_type_id" ON "public"."aircraft_charge_rates" USING "btree" ("flight_type_id");

CREATE INDEX "idx_aircraft_components_aircraft_id" ON "public"."aircraft_components" USING "btree" ("aircraft_id");

CREATE INDEX "idx_aircraft_tech_log_aircraft_id" ON "public"."aircraft_tech_log" USING "btree" ("aircraft_id");

CREATE INDEX "idx_aircraft_tech_log_created_by" ON "public"."aircraft_tech_log" USING "btree" ("created_by");

CREATE INDEX "idx_audit_logs_record_id" ON "public"."audit_logs" USING "btree" ("record_id");

CREATE INDEX "idx_audit_logs_table_name" ON "public"."audit_logs" USING "btree" ("table_name");

CREATE INDEX "idx_audit_logs_user_id" ON "public"."audit_logs" USING "btree" ("user_id");

CREATE INDEX "idx_booking_details_booking_id" ON "public"."booking_details" USING "btree" ("booking_id");

CREATE INDEX "idx_booking_details_instructor_id" ON "public"."booking_details" USING "btree" ("instructor_id");

CREATE INDEX "idx_booking_details_lesson_id" ON "public"."booking_details" USING "btree" ("lesson_id");

CREATE INDEX "idx_booking_details_student_id" ON "public"."booking_details" USING "btree" ("student_id");

CREATE INDEX "idx_bookings_aircraft_id" ON "public"."bookings" USING "btree" ("aircraft_id");

CREATE INDEX "idx_bookings_flight_type_id" ON "public"."bookings" USING "btree" ("flight_type_id");

CREATE INDEX "idx_bookings_end_time" ON "public"."bookings" USING "btree" ("end_time");

CREATE INDEX "idx_bookings_start_time" ON "public"."bookings" USING "btree" ("start_time");

CREATE INDEX "idx_bookings_status" ON "public"."bookings" USING "btree" ("status");

CREATE INDEX "idx_bookings_user_id" ON "public"."bookings" USING "btree" ("user_id");

CREATE INDEX "idx_chargeables_type" ON "public"."chargeables" USING "btree" ("type");

CREATE INDEX "idx_equipment_issuance_equipment_id" ON "public"."equipment_issuance" USING "btree" ("equipment_id");

CREATE INDEX "idx_equipment_issuance_user_id" ON "public"."equipment_issuance" USING "btree" ("user_id");

CREATE INDEX "idx_equipment_status" ON "public"."equipment" USING "btree" ("status");

CREATE INDEX "idx_equipment_type" ON "public"."equipment" USING "btree" ("type");

CREATE INDEX "idx_equipment_updates_equipment_id" ON "public"."equipment_updates" USING "btree" ("equipment_id");

CREATE INDEX "idx_exam_results_exam_id" ON "public"."exam_results" USING "btree" ("exam_id");

CREATE INDEX "idx_exam_results_user_id" ON "public"."exam_results" USING "btree" ("user_id");

CREATE INDEX "idx_instructor_comments_instructor_id" ON "public"."instructor_comments" USING "btree" ("instructor_id");

CREATE INDEX "idx_instructor_comments_student_id" ON "public"."instructor_comments" USING "btree" ("student_id");

CREATE INDEX "idx_instructor_endorsements_instructor_id" ON "public"."instructor_endorsements" USING "btree" ("instructor_id");

CREATE INDEX "idx_instructor_flight_type_rates_flight_type_id" ON "public"."instructor_flight_type_rates" USING "btree" ("flight_type_id");

CREATE INDEX "idx_instructor_flight_type_rates_instructor_id" ON "public"."instructor_flight_type_rates" USING "btree" ("instructor_id");

CREATE INDEX "idx_instructors_status" ON "public"."instructors" USING "btree" ("status");

CREATE INDEX "idx_instructors_user_id" ON "public"."instructors" USING "btree" ("user_id");

CREATE INDEX "idx_invoice_items_invoice_id" ON "public"."invoice_items" USING "btree" ("invoice_id");

CREATE INDEX "idx_invoices_status" ON "public"."invoices" USING "btree" ("status");

CREATE INDEX "idx_invoices_user_id" ON "public"."invoices" USING "btree" ("user_id");

CREATE INDEX "idx_lesson_progress_lesson_id" ON "public"."lesson_progress" USING "btree" ("lesson_id");

CREATE INDEX "idx_lesson_progress_user_id" ON "public"."lesson_progress" USING "btree" ("user_id");

CREATE INDEX "idx_lessons_syllabus_id" ON "public"."lessons" USING "btree" ("syllabus_id");

CREATE INDEX "idx_maintenance_visits_aircraft_id" ON "public"."maintenance_visits" USING "btree" ("aircraft_id");

CREATE INDEX "idx_memberships_user_id" ON "public"."memberships" USING "btree" ("user_id");

CREATE INDEX "idx_observations_aircraft_id" ON "public"."observations" USING "btree" ("aircraft_id");

CREATE INDEX "idx_observations_assigned_to" ON "public"."observations" USING "btree" ("assigned_to");

CREATE INDEX "idx_observations_reported_by" ON "public"."observations" USING "btree" ("reported_by");

CREATE INDEX "idx_observations_status" ON "public"."observations" USING "btree" ("status");

CREATE INDEX "idx_payments_invoice_id" ON "public"."payments" USING "btree" ("invoice_id");

CREATE INDEX "idx_payments_user_id" ON "public"."payments" USING "btree" ("user_id");

CREATE INDEX "idx_student_syllabus_enrollment_syllabus_id" ON "public"."student_syllabus_enrollment" USING "btree" ("syllabus_id");

CREATE INDEX "idx_student_syllabus_enrollment_user_id" ON "public"."student_syllabus_enrollment" USING "btree" ("user_id");

CREATE INDEX "idx_tax_rates_country_region" ON "public"."tax_rates" USING "btree" ("country_code", "region_code");

CREATE INDEX "idx_transactions_user_id" ON "public"."transactions" USING "btree" ("user_id");

CREATE INDEX "idx_users_email" ON "public"."users" USING "btree" ("email");

CREATE INDEX "idx_roles_name" ON "public"."roles" USING "btree" ("name");

CREATE INDEX "idx_user_roles_user_id" ON "public"."user_roles" USING "btree" ("user_id");

CREATE INDEX "idx_user_roles_role_id" ON "public"."user_roles" USING "btree" ("role_id");

CREATE INDEX "idx_user_permission_overrides_user_id" ON "public"."user_permission_overrides" USING "btree" ("user_id"); 

-- TRIGGERS
CREATE OR REPLACE TRIGGER "bookings_audit" AFTER INSERT OR DELETE OR UPDATE ON "public"."bookings" FOR EACH ROW EXECUTE FUNCTION "public"."log_booking_audit"();

CREATE OR REPLACE TRIGGER "calculate_invoice_item_amounts_trigger" BEFORE INSERT OR UPDATE ON "public"."invoice_items" FOR EACH ROW EXECUTE FUNCTION "public"."calculate_invoice_item_amounts"();

CREATE OR REPLACE TRIGGER "ensure_invoice_number" BEFORE INSERT ON "public"."invoices" FOR EACH ROW EXECUTE FUNCTION "public"."set_invoice_number"();

CREATE OR REPLACE TRIGGER "prevent_double_booking_trigger" BEFORE INSERT OR UPDATE ON "public"."bookings" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_double_booking_on_bookings"();

CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."memberships" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();

CREATE OR REPLACE TRIGGER "set_updated_at_aircraft" BEFORE UPDATE ON "public"."aircraft" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();

CREATE OR REPLACE TRIGGER "set_updated_at_booking_details" BEFORE UPDATE ON "public"."booking_details" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();

CREATE OR REPLACE TRIGGER "set_updated_at_bookings" BEFORE UPDATE ON "public"."bookings" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();

CREATE OR REPLACE TRIGGER "set_updated_at_users" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();

CREATE OR REPLACE TRIGGER "transaction_status_update" BEFORE UPDATE ON "public"."transactions" FOR EACH ROW WHEN (("new"."status" IS DISTINCT FROM "old"."status")) EXECUTE FUNCTION "public"."update_transaction_status"();

CREATE OR REPLACE TRIGGER "trg_calculate_flight_time" BEFORE INSERT OR UPDATE OF "hobbs_start", "hobbs_end", "tach_start", "tach_end", "aircraft_id", "flight_type_id" ON "public"."bookings" FOR EACH ROW EXECUTE FUNCTION "public"."calculate_flight_time"();

CREATE OR REPLACE TRIGGER "trg_invoice_approval" AFTER UPDATE ON "public"."invoices" FOR EACH ROW EXECUTE FUNCTION "public"."process_invoice_approval"();

CREATE OR REPLACE TRIGGER "trg_invoice_reverse_debit" AFTER UPDATE ON "public"."invoices" FOR EACH ROW EXECUTE FUNCTION "public"."reverse_invoice_debit_transaction"();

CREATE OR REPLACE TRIGGER "trg_invoice_reverse_debit_delete" AFTER DELETE ON "public"."invoices" FOR EACH ROW EXECUTE FUNCTION "public"."reverse_invoice_debit_transaction"();

CREATE OR REPLACE TRIGGER "trg_invoice_sync_debit" AFTER UPDATE ON "public"."invoices" FOR EACH ROW EXECUTE FUNCTION "public"."sync_invoice_debit_transaction"();

CREATE OR REPLACE TRIGGER "trg_set_lesson_progress_attempt" BEFORE INSERT ON "public"."lesson_progress" FOR EACH ROW EXECUTE FUNCTION "public"."set_lesson_progress_attempt"();

CREATE OR REPLACE TRIGGER "trg_update_defects_updated_at" BEFORE UPDATE ON "public"."observations" FOR EACH ROW EXECUTE FUNCTION "public"."update_defects_updated_at"();

CREATE OR REPLACE TRIGGER "trg_update_instructors_updated_at" BEFORE UPDATE ON "public"."instructors" FOR EACH ROW EXECUTE FUNCTION "public"."update_instructors_updated_at"();

CREATE OR REPLACE TRIGGER "trg_update_invoice_balance_due" AFTER UPDATE OF "total_amount" ON "public"."invoices" FOR EACH ROW EXECUTE FUNCTION "public"."update_invoice_balance_due"();

CREATE OR REPLACE TRIGGER "trg_update_invoice_payment_totals_delete" AFTER DELETE ON "public"."payments" FOR EACH ROW EXECUTE FUNCTION "public"."update_invoice_payment_totals"();

CREATE OR REPLACE TRIGGER "trg_update_invoice_payment_totals_insert" AFTER INSERT ON "public"."payments" FOR EACH ROW EXECUTE FUNCTION "public"."update_invoice_payment_totals"();

CREATE OR REPLACE TRIGGER "trg_update_invoice_payment_totals_update" AFTER UPDATE ON "public"."payments" FOR EACH ROW EXECUTE FUNCTION "public"."update_invoice_payment_totals"();

CREATE OR REPLACE TRIGGER "update_invoice_status_on_payment" BEFORE UPDATE ON "public"."invoices" FOR EACH ROW WHEN (("new"."paid_date" IS DISTINCT FROM "old"."paid_date")) EXECUTE FUNCTION "public"."update_invoice_status"();

CREATE OR REPLACE TRIGGER "update_invoice_totals_on_item_change" AFTER INSERT OR DELETE OR UPDATE ON "public"."invoice_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_invoice_totals"();

-- ROW LEVEL SECURITY (RLS) POLICIES (Single-tenant)
ALTER TABLE "public"."aircraft" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."aircraft_charge_rates" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."aircraft_components" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."aircraft_tech_log" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."booking_details" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."bookings" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."cancellation_categories" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."chargeables" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."endorsements" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."equipment" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."equipment_issuance" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."equipment_updates" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."exam" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."exam_results" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."flight_types" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."instructor_comments" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."instructor_endorsements" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."instructor_flight_type_rates" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."instructors" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."invoice_items" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."invoice_sequences" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."invoices" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."lesson_progress" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."lessons" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."maintenance_visits" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."memberships" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."observations" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."student_syllabus_enrollment" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."syllabus" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."tax_rates" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."transactions" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."roles" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."user_permission_overrides" ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES (Role-based access control for single-tenant)
-- Users can view their own data
CREATE POLICY "users_view_own" ON "public"."users" FOR SELECT USING (("auth"."uid"() = "id"));

-- Admins, owners, and instructors can view all users
CREATE POLICY "users_view_all" ON "public"."users" FOR SELECT USING (("public"."check_user_role"("auth"."uid"(), ARRAY['admin'::"public"."user_role", 'owner'::"public"."user_role", 'instructor'::"public"."user_role"])));

-- Users can update their own data
CREATE POLICY "users_update_own" ON "public"."users" FOR UPDATE USING (("auth"."uid"() = "id"));

-- Admins and owners can update any user
CREATE POLICY "users_update_all" ON "public"."users" FOR UPDATE USING (("public"."check_user_role"("auth"."uid"(), ARRAY['admin'::"public"."user_role", 'owner'::"public"."user_role"])));

-- Admins and owners can insert users
CREATE POLICY "users_insert" ON "public"."users" FOR INSERT WITH CHECK (("public"."check_user_role"("auth"."uid"(), ARRAY['admin'::"public"."user_role", 'owner'::"public"."user_role"])));

-- Admins and owners can delete users
CREATE POLICY "users_delete" ON "public"."users" FOR DELETE USING (("public"."check_user_role"("auth"."uid"(), ARRAY['admin'::"public"."user_role", 'owner'::"public"."user_role"])));

-- Bookings: Users can view their own bookings, admins/owners/instructors can view all
CREATE POLICY "bookings_view_own" ON "public"."bookings" FOR SELECT USING (("auth"."uid"() = "user_id"));

CREATE POLICY "bookings_view_all" ON "public"."bookings" FOR SELECT USING (("public"."check_user_role"("auth"."uid"(), ARRAY['admin'::"public"."user_role", 'owner'::"public"."user_role", 'instructor'::"public"."user_role"])));

CREATE POLICY "bookings_insert" ON "public"."bookings" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id" OR "public"."check_user_role"("auth"."uid"(), ARRAY['admin'::"public"."user_role", 'owner'::"public"."user_role", 'instructor'::"public"."user_role"])));

CREATE POLICY "bookings_update" ON "public"."bookings" FOR UPDATE USING (("auth"."uid"() = "user_id" OR "public"."check_user_role"("auth"."uid"(), ARRAY['admin'::"public"."user_role", 'owner'::"public"."user_role", 'instructor'::"public"."user_role"])));

CREATE POLICY "bookings_delete" ON "public"."bookings" FOR DELETE USING (("public"."check_user_role"("auth"."uid"(), ARRAY['admin'::"public"."user_role", 'owner'::"public"."user_role"])));

-- Aircraft: Admins, owners, and instructors can manage
CREATE POLICY "aircraft_manage" ON "public"."aircraft" FOR ALL USING (("public"."check_user_role"("auth"."uid"(), ARRAY['admin'::"public"."user_role", 'owner'::"public"."user_role", 'instructor'::"public"."user_role"])));

-- Equipment: Admins, owners, and instructors can manage
CREATE POLICY "equipment_manage" ON "public"."equipment" FOR ALL USING (("public"."check_user_role"("auth"."uid"(), ARRAY['admin'::"public"."user_role", 'owner'::"public"."user_role", 'instructor'::"public"."user_role"])));

-- Invoices: Users can view their own, admins/owners can view all
CREATE POLICY "invoices_view_own" ON "public"."invoices" FOR SELECT USING (("auth"."uid"() = "user_id"));

CREATE POLICY "invoices_view_all" ON "public"."invoices" FOR SELECT USING (("public"."check_user_role"("auth"."uid"(), ARRAY['admin'::"public"."user_role", 'owner'::"public"."user_role"])));

CREATE POLICY "invoices_manage" ON "public"."invoices" FOR ALL USING (("public"."check_user_role"("auth"."uid"(), ARRAY['admin'::"public"."user_role", 'owner'::"public"."user_role"])));

-- Payments: Users can view their own, admins/owners can view all
CREATE POLICY "payments_view_own" ON "public"."payments" FOR SELECT USING (("auth"."uid"() = "user_id"));

CREATE POLICY "payments_view_all" ON "public"."payments" FOR SELECT USING (("public"."check_user_role"("auth"."uid"(), ARRAY['admin'::"public"."user_role", 'owner'::"public"."user_role"])));

CREATE POLICY "payments_manage" ON "public"."payments" FOR ALL USING (("public"."check_user_role"("auth"."uid"(), ARRAY['admin'::"public"."user_role", 'owner'::"public"."user_role"])));

-- Transactions: Users can view their own, admins/owners can view all
CREATE POLICY "transactions_view_own" ON "public"."transactions" FOR SELECT USING (("auth"."uid"() = "user_id"));

CREATE POLICY "transactions_view_all" ON "public"."transactions" FOR SELECT USING (("public"."check_user_role"("auth"."uid"(), ARRAY['admin'::"public"."user_role", 'owner'::"public"."user_role"])));

CREATE POLICY "transactions_manage" ON "public"."transactions" FOR ALL USING (("public"."check_user_role"("auth"."uid"(), ARRAY['admin'::"public"."user_role", 'owner'::"public"."user_role"])));

-- Memberships: Users can view their own, admins/owners can manage all
CREATE POLICY "memberships_view_own" ON "public"."memberships" FOR SELECT USING (("auth"."uid"() = "user_id"));

CREATE POLICY "memberships_view_all" ON "public"."memberships" FOR SELECT USING (("public"."check_user_role"("auth"."uid"(), ARRAY['admin'::"public"."user_role", 'owner'::"public"."user_role"])));

CREATE POLICY "memberships_manage" ON "public"."memberships" FOR ALL USING (("public"."check_user_role"("auth"."uid"(), ARRAY['admin'::"public"."user_role", 'owner'::"public"."user_role"])));

-- Instructors: Admins and owners can manage
CREATE POLICY "instructors_manage" ON "public"."instructors" FOR ALL USING (("public"."check_user_role"("auth"."uid"(), ARRAY['admin'::"public"."user_role", 'owner'::"public"."user_role"])));

-- Observations: Admins, owners, and instructors can manage
CREATE POLICY "observations_manage" ON "public"."observations" FOR ALL USING (("public"."check_user_role"("auth"."uid"(), ARRAY['admin'::"public"."user_role", 'owner'::"public"."user_role", 'instructor'::"public"."user_role"])));

-- Maintenance visits: Admins, owners, and instructors can manage
CREATE POLICY "maintenance_visits_manage" ON "public"."maintenance_visits" FOR ALL USING (("public"."check_user_role"("auth"."uid"(), ARRAY['admin'::"public"."user_role", 'owner'::"public"."user_role", 'instructor'::"public"."user_role"])));

-- Equipment issuance: Admins, owners, and instructors can manage
CREATE POLICY "equipment_issuance_manage" ON "public"."equipment_issuance" FOR ALL USING (("public"."check_user_role"("auth"."uid"(), ARRAY['admin'::"public"."user_role", 'owner'::"public"."user_role", 'instructor'::"public"."user_role"])));

-- Equipment updates: Admins, owners, and instructors can manage
CREATE POLICY "equipment_updates_manage" ON "public"."equipment_updates" FOR ALL USING (("public"."check_user_role"("auth"."uid"(), ARRAY['admin'::"public"."user_role", 'owner'::"public"."user_role", 'instructor'::"public"."user_role"])));

-- Instructor comments: Admins, owners, and instructors can manage
CREATE POLICY "instructor_comments_manage" ON "public"."instructor_comments" FOR ALL USING (("public"."check_user_role"("auth"."uid"(), ARRAY['admin'::"public"."user_role", 'owner'::"public"."user_role", 'instructor'::"public"."user_role"])));

-- Instructor endorsements: Admins, owners, and instructors can manage
CREATE POLICY "instructor_endorsements_manage" ON "public"."instructor_endorsements" FOR ALL USING (("public"."check_user_role"("auth"."uid"(), ARRAY['admin'::"public"."user_role", 'owner'::"public"."user_role", 'instructor'::"public"."user_role"])));

-- Instructor flight type rates: Admins and owners can manage
CREATE POLICY "instructor_flight_type_rates_manage" ON "public"."instructor_flight_type_rates" FOR ALL USING (("public"."check_user_role"("auth"."uid"(), ARRAY['admin'::"public"."user_role", 'owner'::"public"."user_role"])));

-- Aircraft charge rates: Admins and owners can manage
CREATE POLICY "aircraft_charge_rates_manage" ON "public"."aircraft_charge_rates" FOR ALL USING (("public"."check_user_role"("auth"."uid"(), ARRAY['admin'::"public"."user_role", 'owner'::"public"."user_role"])));

-- Aircraft components: Admins, owners, and instructors can manage
CREATE POLICY "aircraft_components_manage" ON "public"."aircraft_components" FOR ALL USING (("public"."check_user_role"("auth"."uid"(), ARRAY['admin'::"public"."user_role", 'owner'::"public"."user_role", 'instructor'::"public"."user_role"])));

-- Aircraft tech log: Admins, owners, and instructors can manage
CREATE POLICY "aircraft_tech_log_manage" ON "public"."aircraft_tech_log" FOR ALL USING (("public"."check_user_role"("auth"."uid"(), ARRAY['admin'::"public"."user_role", 'owner'::"public"."user_role", 'instructor'::"public"."user_role"])));

-- Booking details: Admins, owners, and instructors can manage
CREATE POLICY "booking_details_manage" ON "public"."booking_details" FOR ALL USING (("public"."check_user_role"("auth"."uid"(), ARRAY['admin'::"public"."user_role", 'owner'::"public"."user_role", 'instructor'::"public"."user_role"])));

-- Chargeables: Admins and owners can manage
CREATE POLICY "chargeables_manage" ON "public"."chargeables" FOR ALL USING (("public"."check_user_role"("auth"."uid"(), ARRAY['admin'::"public"."user_role", 'owner'::"public"."user_role"])));

-- Endorsements: Admins and owners can manage
CREATE POLICY "endorsements_manage" ON "public"."endorsements" FOR ALL USING (("public"."check_user_role"("auth"."uid"(), ARRAY['admin'::"public"."user_role", 'owner'::"public"."user_role"])));

-- Flight types: Admins and owners can manage
CREATE POLICY "flight_types_manage" ON "public"."flight_types" FOR ALL USING (("public"."check_user_role"("auth"."uid"(), ARRAY['admin'::"public"."user_role", 'owner'::"public"."user_role"])));

-- Invoice items: Admins and owners can manage
CREATE POLICY "invoice_items_manage" ON "public"."invoice_items" FOR ALL USING (("public"."check_user_role"("auth"."uid"(), ARRAY['admin'::"public"."user_role", 'owner'::"public"."user_role"])));

-- Invoice sequences: Admins and owners can manage
CREATE POLICY "invoice_sequences_manage" ON "public"."invoice_sequences" FOR ALL USING (("public"."check_user_role"("auth"."uid"(), ARRAY['admin'::"public"."user_role", 'owner'::"public"."user_role"])));

-- Lesson progress: Users can view their own, admins/owners/instructors can view all
CREATE POLICY "lesson_progress_view_own" ON "public"."lesson_progress" FOR SELECT USING (("auth"."uid"() = "user_id"));

CREATE POLICY "lesson_progress_view_all" ON "public"."lesson_progress" FOR SELECT USING (("public"."check_user_role"("auth"."uid"(), ARRAY['admin'::"public"."user_role", 'owner'::"public"."user_role", 'instructor'::"public"."user_role"])));

CREATE POLICY "lesson_progress_manage" ON "public"."lesson_progress" FOR ALL USING (("public"."check_user_role"("auth"."uid"(), ARRAY['admin'::"public"."user_role", 'owner'::"public"."user_role", 'instructor'::"public"."user_role"])));

-- Lessons: Admins and owners can manage
CREATE POLICY "lessons_manage" ON "public"."lessons" FOR ALL USING (("public"."check_user_role"("auth"."uid"(), ARRAY['admin'::"public"."user_role", 'owner'::"public"."user_role"])));

-- Student syllabus enrollment: Users can view their own, admins/owners/instructors can view all
CREATE POLICY "student_syllabus_enrollment_view_own" ON "public"."student_syllabus_enrollment" FOR SELECT USING (("auth"."uid"() = "user_id"));

CREATE POLICY "student_syllabus_enrollment_view_all" ON "public"."student_syllabus_enrollment" FOR SELECT USING (("public"."check_user_role"("auth"."uid"(), ARRAY['admin'::"public"."user_role", 'owner'::"public"."user_role", 'instructor'::"public"."user_role"])));

CREATE POLICY "student_syllabus_enrollment_manage" ON "public"."student_syllabus_enrollment" FOR ALL USING (("public"."check_user_role"("auth"."uid"(), ARRAY['admin'::"public"."user_role", 'owner'::"public"."user_role", 'instructor'::"public"."user_role"])));

-- Syllabus: Admins and owners can manage
CREATE POLICY "syllabus_manage" ON "public"."syllabus" FOR ALL USING (("public"."check_user_role"("auth"."uid"(), ARRAY['admin'::"public"."user_role", 'owner'::"public"."user_role"])));

-- Tax rates: Admins and owners can manage
CREATE POLICY "tax_rates_manage" ON "public"."tax_rates" FOR ALL USING (("public"."check_user_role"("auth"."uid"(), ARRAY['admin'::"public"."user_role", 'owner'::"public"."user_role"])));

-- Exam: Admins and owners can manage
CREATE POLICY "exam_manage" ON "public"."exam" FOR ALL USING (("public"."check_user_role"("auth"."uid"(), ARRAY['admin'::"public"."user_role", 'owner'::"public"."user_role"])));

-- Exam results: Users can view their own, admins/owners/instructors can view all
CREATE POLICY "exam_results_view_own" ON "public"."exam_results" FOR SELECT USING (("auth"."uid"() = "user_id"));

CREATE POLICY "exam_results_view_all" ON "public"."exam_results" FOR SELECT USING (("public"."check_user_role"("auth"."uid"(), ARRAY['admin'::"public"."user_role", 'owner'::"public"."user_role", 'instructor'::"public"."user_role"])));

CREATE POLICY "exam_results_manage" ON "public"."exam_results" FOR ALL USING (("public"."check_user_role"("auth"."uid"(), ARRAY['admin'::"public"."user_role", 'owner'::"public"."user_role", 'instructor'::"public"."user_role"])));

-- Cancellation categories: Admins and owners can manage
CREATE POLICY "cancellation_categories_manage" ON "public"."cancellation_categories" FOR ALL USING (("public"."check_user_role"("auth"."uid"(), ARRAY['admin'::"public"."user_role", 'owner'::"public"."user_role"])));

-- Audit logs: Admins and owners can view
CREATE POLICY "audit_logs_view" ON "public"."audit_logs" FOR SELECT USING (("public"."check_user_role"("auth"."uid"(), ARRAY['admin'::"public"."user_role", 'owner'::"public"."user_role"])));

-- Roles: Admins can manage
CREATE POLICY "roles_manage" ON "public"."roles" FOR ALL USING (("public"."check_user_role"("auth"."uid"(), ARRAY['admin'::"public"."user_role", 'owner'::"public"."user_role"])));

-- User roles: Admins can manage
CREATE POLICY "user_roles_manage" ON "public"."user_roles" FOR ALL USING (("public"."check_user_role"("auth"."uid"(), ARRAY['admin'::"public"."user_role", 'owner'::"public"."user_role"])));

-- User permission overrides: Admins can manage
CREATE POLICY "user_permission_overrides_manage" ON "public"."user_permission_overrides" FOR ALL USING (("public"."check_user_role"("auth"."uid"(), ARRAY['admin'::"public"."user_role"])));