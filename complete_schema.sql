


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



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
    'investigating',
    'monitoring',
    'closed'
);


ALTER TYPE "public"."observation_stage" OWNER TO "postgres";


CREATE TYPE "public"."observation_status" AS ENUM (
    'low',
    'medium',
    'high'
);


ALTER TYPE "public"."observation_status" OWNER TO "postgres";


CREATE TYPE "public"."payment_method" AS ENUM (
    'cash',
    'credit_card',
    'bank_transfer',
    'direct_debit',
    'cheque',
    'other'
);


ALTER TYPE "public"."payment_method" OWNER TO "postgres";


CREATE TYPE "public"."syllabus_stage" AS ENUM (
    'basic syllabus',
    'circuit training',
    'advanced syllabus',
    'instrument flying',
    'night flying',
    'terrain and weather awareness',
    'low flying',
    'cross country',
    'aerobatics',
    'CPL'
);


ALTER TYPE "public"."syllabus_stage" OWNER TO "postgres";


CREATE TYPE "public"."total_time_method" AS ENUM (
    'airswitch',
    'hobbs',
    'hobbs less 5%',
    'hobbs less 10%',
    'tacho',
    'tacho less 5%',
    'tacho less 10%'
);


ALTER TYPE "public"."total_time_method" OWNER TO "postgres";


CREATE TYPE "public"."transaction_status" AS ENUM (
    'pending',
    'completed',
    'failed',
    'reversed',
    'cancelled'
);


ALTER TYPE "public"."transaction_status" OWNER TO "postgres";


CREATE TYPE "public"."transaction_type" AS ENUM (
    'payment',
    'refund',
    'credit',
    'debit',
    'adjustment'
);


ALTER TYPE "public"."transaction_type" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'owner',
    'admin',
    'instructor',
    'member',
    'student'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_flight_time"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  charge_by text;
  charge_rate_id uuid;
  charge_hobbs boolean;
  charge_tacho boolean;
  ft numeric := NULL;
BEGIN
  -- Find the charge rate for this aircraft and flight_type
  SELECT acr.id, acr.charge_hobbs, acr.charge_tacho INTO charge_rate_id, charge_hobbs, charge_tacho
  FROM aircraft_charge_rates acr
  WHERE acr.aircraft_id = NEW.aircraft_id
    AND (NEW.flight_type_id IS NULL OR acr.flight_type_id = NEW.flight_type_id)
  ORDER BY (acr.flight_type_id IS NULL) DESC -- Prefer specific flight_type, fallback to NULL
  LIMIT 1;

  IF charge_hobbs THEN
    IF NEW.hobbs_start IS NOT NULL AND NEW.hobbs_end IS NOT NULL THEN
      ft := NEW.hobbs_end - NEW.hobbs_start;
    END IF;
  ELSIF charge_tacho THEN
    IF NEW.tach_start IS NOT NULL AND NEW.tach_end IS NOT NULL THEN
      ft := NEW.tach_end - NEW.tach_start;
    END IF;
  END IF;

  NEW.flight_time := ft;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."calculate_flight_time"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_invoice_item_amounts"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Always set tax rate to 15%
    NEW.tax_rate := 0.15;
    
    -- Calculate base amount (rate * quantity)
    NEW.amount := NEW.rate * NEW.quantity;
    
    -- Calculate tax amount (base amount * tax rate)
    NEW.tax_amount := ROUND((NEW.amount * NEW.tax_rate)::numeric, 2);
    
    -- Calculate total amount (base amount + tax amount)
    NEW.total_amount := NEW.amount + NEW.tax_amount;
    
    -- Calculate and store tax-inclusive rate
    NEW.rate_inclusive := ROUND(NEW.rate * (1 + NEW.tax_rate), 2);
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."calculate_invoice_item_amounts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_user_role"("user_id" "uuid", "org_id" "uuid", "allowed_roles" "public"."user_role"[]) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_organizations
        WHERE user_id = $1 
        AND organization_id = $2
        AND role = ANY($3)
    );
END;
$_$;


ALTER FUNCTION "public"."check_user_role"("user_id" "uuid", "org_id" "uuid", "allowed_roles" "public"."user_role"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."equipment_update_summary"("org_id" "uuid") RETURNS TABLE("id" "uuid", "name" "text", "label" "text", "type" "public"."equipment_type", "last_updated_at" timestamp with time zone, "next_due_at" timestamp with time zone, "days_until_due" integer, "status" "text", "last_updated_by" "uuid", "last_updated_by_name" "text", "notes" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.name,
    e.serial_number AS label,
    e.type,
    u.updated_at AS last_updated_at,
    u.next_due_at,
    CASE WHEN u.next_due_at IS NOT NULL THEN (u.next_due_at::date - CURRENT_DATE) ELSE NULL END AS days_until_due,
    CASE
      WHEN u.next_due_at IS NULL THEN 'No Schedule'
      WHEN u.next_due_at < CURRENT_DATE THEN 'Overdue'
      WHEN u.next_due_at <= CURRENT_DATE + INTERVAL '7 days' THEN 'Due Soon'
      ELSE 'Up to date'
    END AS status,
    u.updated_by,
    COALESCE(m.first_name || ' ' || m.last_name, m.email, u.updated_by::text) AS last_updated_by_name,
    u.notes
  FROM equipment e
  LEFT JOIN LATERAL (
    SELECT * FROM equipment_updates eu
    WHERE eu.equipment_id = e.id AND eu.organization_id = org_id
    ORDER BY eu.updated_at DESC
    LIMIT 1
  ) u ON TRUE
  LEFT JOIN users m ON u.updated_by = m.id
  WHERE e.organization_id = org_id;
END;
$$;


ALTER FUNCTION "public"."equipment_update_summary"("org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_invoice_number"("org_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    current_year_month TEXT;
    next_sequence INTEGER;
    new_invoice_number TEXT;
BEGIN
    -- Get current year and month in YYYYMM format
    current_year_month := to_char(CURRENT_TIMESTAMP, 'YYYYMM');
    
    -- Insert or update the sequence for this org and year_month
    INSERT INTO invoice_sequences (organization_id, year_month, last_sequence)
    VALUES (org_id, current_year_month, 1)
    ON CONFLICT (organization_id, year_month)
    DO UPDATE SET last_sequence = invoice_sequences.last_sequence + 1
    RETURNING last_sequence INTO next_sequence;
    
    -- Format: INV-YYYYMM-XXX (where XXX is padded with zeros)
    new_invoice_number := 'INV-' || current_year_month || '-' || LPAD(next_sequence::TEXT, 3, '0');
    
    RETURN new_invoice_number;
END;
$$;


ALTER FUNCTION "public"."generate_invoice_number"("org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_account_balance"("p_organization_id" "uuid", "p_user_id" "uuid") RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_balance DECIMAL;
BEGIN
    SELECT account_balance INTO v_balance
    FROM users
    WHERE id = p_user_id;

    RETURN COALESCE(v_balance, 0);
END;
$$;


ALTER FUNCTION "public"."get_account_balance"("p_organization_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.users (id, email, first_name, last_name)
  VALUES (
    NEW.id, 
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_booking_audit"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  changed_columns jsonb := '{}'::jsonb;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    changed_columns := (
      SELECT jsonb_object_agg(key, jsonb_build_object('old', old_row, 'new', new_row))
      FROM (
        SELECT key, old_row, new_row
        FROM jsonb_each(to_jsonb(OLD)) AS old(key, old_row)
        JOIN jsonb_each(to_jsonb(NEW)) AS new(key, new_row) USING (key)
        WHERE old_row IS DISTINCT FROM new_row
      ) sub
    );
  END IF;

  INSERT INTO public.audit_logs (
    table_name, row_id, action, changed_by, changed_at,
    old_data, new_data, column_changes, organization_id
  )
  VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    auth.uid(),
    now(),
    to_jsonb(OLD),
    to_jsonb(NEW),
    changed_columns,
    COALESCE(NEW.organization_id, OLD.organization_id)
  );
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."log_booking_audit"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_double_booking_on_bookings"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  conflict_exists BOOLEAN;
BEGIN
  -- Check for conflicting bookings (aircraft)
  SELECT EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id <> NEW.id
      AND b.aircraft_id = NEW.aircraft_id
      AND tstzrange(b.start_time, b.end_time) && tstzrange(NEW.start_time, NEW.end_time)
      AND b.status = ANY (ARRAY['confirmed', 'briefing', 'flying']::booking_status[])
  ) INTO conflict_exists;
  IF conflict_exists THEN
    RAISE EXCEPTION 'This aircraft is already booked for the selected time range.';
  END IF;
  -- Check for conflicting bookings (user)
  SELECT EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id <> NEW.id
      AND b.user_id = NEW.user_id
      AND tstzrange(b.start_time, b.end_time) && tstzrange(NEW.start_time, NEW.end_time)
      AND b.status = ANY (ARRAY['confirmed', 'briefing', 'flying']::booking_status[])
  ) INTO conflict_exists;
  IF conflict_exists THEN
    RAISE EXCEPTION 'This user is already booked for the selected time range.';
  END IF;
  -- Check for conflicting bookings (instructor)
  IF NEW.instructor_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id <> NEW.id
        AND b.instructor_id = NEW.instructor_id
        AND tstzrange(b.start_time, b.end_time) && tstzrange(NEW.start_time, NEW.end_time)
        AND b.status = ANY (ARRAY['confirmed', 'briefing', 'flying']::booking_status[])
    ) INTO conflict_exists;
    IF conflict_exists THEN
      RAISE EXCEPTION 'This instructor is already booked for the selected time range.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."prevent_double_booking_on_bookings"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_invoice_approval"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_transaction_id UUID;
  v_existing_transaction_id UUID;
  v_amount NUMERIC;
BEGIN
  -- Only run if status changes from draft to pending
  IF (OLD.status = 'draft' AND NEW.status = 'pending') THEN
    v_amount := NEW.total_amount;
    -- Create debit transaction
    INSERT INTO transactions (
      organization_id, user_id, type, status, amount, description, metadata, reference_number, completed_at
    ) VALUES (
      NEW.organization_id, NEW.user_id, 'debit', 'completed', -v_amount,
      'Invoice approved: ' || NEW.invoice_number,
      jsonb_build_object('invoice_id', NEW.id),
      NEW.invoice_number,
      now()
    ) RETURNING id INTO v_transaction_id;
    -- Update user account balance
    UPDATE users SET account_balance = account_balance + v_amount WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."process_invoice_approval"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_payment"("p_invoice_id" "uuid", "p_amount" numeric, "p_payment_method" "text", "p_payment_reference" "text", "p_notes" "text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_invoice invoices%ROWTYPE;
    v_transaction_id UUID;
    v_payment_id UUID;
    v_remaining DECIMAL;
    v_payment_method_enum payment_method;
BEGIN
    -- Get invoice details
    SELECT * INTO v_invoice
    FROM invoices
    WHERE id = p_invoice_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invoice not found';
    END IF;

    -- Validate payment amount
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Payment amount must be positive';
    END IF;

    -- Calculate remaining amount
    SELECT COALESCE(v_invoice.total_amount - SUM(amount), v_invoice.total_amount)
    INTO v_remaining
    FROM payments
    WHERE invoice_id = p_invoice_id;

    IF p_amount > v_remaining THEN
        RAISE EXCEPTION 'Payment amount exceeds remaining balance';
    END IF;

    -- Cast payment_method to enum
    v_payment_method_enum := p_payment_method::payment_method;

    -- Create transaction
    INSERT INTO transactions (
        organization_id,
        user_id,
        type,
        status,
        amount,
        description,
        reference_number,
        completed_at
    )
    VALUES (
        v_invoice.organization_id,
        v_invoice.user_id,
        'payment',
        'completed',
        p_amount,
        'Payment for invoice ' || v_invoice.invoice_number,
        p_payment_reference,
        now()
    )
    RETURNING id INTO v_transaction_id;

    -- Create payment record
    INSERT INTO payments (
        organization_id,
        invoice_id,
        transaction_id,
        amount,
        payment_method,
        payment_reference,
        notes
    )
    VALUES (
        v_invoice.organization_id,
        p_invoice_id,
        v_transaction_id,
        p_amount,
        v_payment_method_enum,
        p_payment_reference,
        p_notes
    )
    RETURNING id INTO v_payment_id;

    -- Update invoice if fully paid
    IF p_amount >= v_remaining THEN
        UPDATE invoices
        SET 
            status = 'paid',
            paid_date = now(),
            payment_method = v_payment_method_enum,
            payment_reference = p_payment_reference,
            updated_at = now()
        WHERE id = p_invoice_id;
    END IF;

    -- Update user account balance
    UPDATE users
    SET account_balance = account_balance - p_amount
    WHERE id = v_invoice.user_id;

    RETURN v_payment_id;
END;
$$;


ALTER FUNCTION "public"."process_payment"("p_invoice_id" "uuid", "p_amount" numeric, "p_payment_method" "text", "p_payment_reference" "text", "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_refund"("p_payment_id" "uuid", "p_amount" numeric) RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_payment payments%ROWTYPE;
    v_invoice invoices%ROWTYPE;
    v_transaction_id UUID;
BEGIN
    -- Get payment details
    SELECT * INTO v_payment
    FROM payments
    WHERE id = p_payment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment not found';
    END IF;

    -- Get invoice details
    SELECT * INTO v_invoice
    FROM invoices
    WHERE id = v_payment.invoice_id;

    -- Validate refund amount
    IF p_amount <= 0 OR p_amount > v_payment.amount THEN
        RAISE EXCEPTION 'Invalid refund amount';
    END IF;

    -- Create refund transaction
    INSERT INTO transactions (
        organization_id,
        user_id,
        type,
        status,
        amount,
        description,
        reference_number,
        completed_at
    )
    VALUES (
        v_payment.organization_id,
        v_invoice.user_id,
        'refund',
        'completed',
        -p_amount,
        'Refund for payment ' || v_payment.id,
        'REF-' || v_payment.payment_reference,
        now()
    )
    RETURNING id INTO v_transaction_id;

    -- Update user account balance
    UPDATE users
    SET account_balance = account_balance + p_amount
    WHERE id = v_invoice.user_id;

    -- Update invoice status if necessary
    IF v_invoice.status = 'paid' THEN
        UPDATE invoices
        SET 
            status = 'refunded',
            updated_at = now()
        WHERE id = v_payment.invoice_id;
    END IF;

    RETURN v_transaction_id;
END;
$$;


ALTER FUNCTION "public"."process_refund"("p_payment_id" "uuid", "p_amount" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_refund"("p_payment_id" "uuid", "p_amount" numeric, "p_notes" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_payment payments%ROWTYPE;
    v_invoice invoices%ROWTYPE;
    v_transaction_id UUID;
    v_refund_id UUID;
BEGIN
    -- Get payment details
    SELECT * INTO v_payment
    FROM payments
    WHERE id = p_payment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment not found';
    END IF;

    -- Get invoice details
    SELECT * INTO v_invoice
    FROM invoices
    WHERE id = v_payment.invoice_id;

    -- Validate refund amount
    IF p_amount <= 0 OR p_amount > v_payment.amount THEN
        RAISE EXCEPTION 'Invalid refund amount';
    END IF;

    -- Create refund transaction
    INSERT INTO transactions (
        organization_id,
        user_id,
        type,
        status,
        amount,
        description,
        reference_number,
        completed_at
    )
    VALUES (
        v_payment.organization_id,
        v_invoice.user_id,
        'refund',
        'completed',
        -p_amount,
        'Refund for payment ' || v_payment.id,
        'REF-' || v_payment.payment_reference,
        now()
    )
    RETURNING id INTO v_transaction_id;

    -- Update account balance
    INSERT INTO account_balances (
        organization_id,
        user_id,
        balance,
        last_transaction_id
    )
    VALUES (
        v_payment.organization_id,
        v_invoice.user_id,
        p_amount,
        v_transaction_id
    )
    ON CONFLICT (organization_id, user_id)
    DO UPDATE SET
        balance = account_balances.balance + p_amount,
        last_transaction_id = v_transaction_id,
        updated_at = now();

    -- Update invoice status if necessary
    IF v_invoice.status = 'paid' THEN
        UPDATE invoices
        SET 
            status = 'refunded',
            updated_at = now()
        WHERE id = v_payment.invoice_id;
    END IF;

    RETURN v_transaction_id;
END;
$$;


ALTER FUNCTION "public"."process_refund"("p_payment_id" "uuid", "p_amount" numeric, "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reverse_invoice_debit_transaction"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_transaction_id UUID;
  v_amount NUMERIC;
BEGIN
  -- Only run if invoice is cancelled or deleted and was previously pending
  IF ((OLD.status = 'pending' OR OLD.status = 'overdue') AND (NEW.status = 'cancelled' OR TG_OP = 'DELETE')) THEN
    -- Find the existing debit transaction for this invoice
    SELECT id, amount INTO v_transaction_id, v_amount
    FROM transactions
    WHERE metadata->>'invoice_id' = OLD.id::text AND type = 'debit' AND status = 'completed'
    ORDER BY created_at ASC LIMIT 1;
    IF v_transaction_id IS NOT NULL THEN
      -- Mark the transaction as reversed
      UPDATE transactions SET status = 'reversed' WHERE id = v_transaction_id;
      -- Update user account balance
      UPDATE users SET account_balance = account_balance - (v_amount * -1) WHERE id = OLD.user_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."reverse_invoice_debit_transaction"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_invoice_number"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Only set invoice_number if it's not already set
    IF NEW.invoice_number IS NULL THEN
        NEW.invoice_number := generate_invoice_number(NEW.organization_id);
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_invoice_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_lesson_progress_attempt"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  max_attempt integer;
BEGIN
  -- Find the max attempt for this user/lesson/syllabus/org
  SELECT COALESCE(MAX(attempt), 0) INTO max_attempt
  FROM lesson_progress
  WHERE user_id = NEW.user_id
    AND lesson_id = NEW.lesson_id
    AND syllabus_id IS NOT DISTINCT FROM NEW.syllabus_id
    AND organization_id = NEW.organization_id;

  NEW.attempt := max_attempt + 1;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_lesson_progress_attempt"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_invoice_debit_transaction"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_transaction_id UUID;
  v_old_amount NUMERIC;
  v_new_amount NUMERIC;
  v_diff NUMERIC;
BEGIN
  -- Only run if status is pending and total_amount changes
  IF (NEW.status = 'pending' AND OLD.status = 'pending' AND NEW.total_amount <> OLD.total_amount) THEN
    -- Find the existing debit transaction for this invoice
    SELECT id, amount INTO v_transaction_id, v_old_amount
    FROM transactions
    WHERE metadata->>'invoice_id' = NEW.id::text AND type = 'debit' AND status = 'completed'
    ORDER BY created_at ASC LIMIT 1;
    IF v_transaction_id IS NOT NULL THEN
      v_new_amount := -NEW.total_amount;
      v_diff := v_new_amount - v_old_amount;
      -- Update the transaction amount
      UPDATE transactions SET amount = v_new_amount WHERE id = v_transaction_id;
      -- Update user account balance by the difference
      UPDATE users SET account_balance = account_balance + (v_diff * -1) WHERE id = NEW.user_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_invoice_debit_transaction"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_defects_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."update_defects_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_instructors_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_instructors_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_invoice_balance_due"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_total numeric;
  v_paid numeric;
BEGIN
  -- Get the invoice total and paid
  SELECT total_amount, paid INTO v_total, v_paid FROM invoices WHERE id = NEW.id;
  -- Update balance_due
  UPDATE invoices
    SET balance_due = GREATEST(v_total - COALESCE(v_paid, 0), 0)
    WHERE id = NEW.id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_invoice_balance_due"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_invoice_payment_totals"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_invoice_id uuid;
  v_paid numeric;
  v_total numeric;
BEGIN
  -- Determine the invoice_id affected
  IF (TG_OP = 'DELETE') THEN
    v_invoice_id := OLD.invoice_id;
  ELSE
    v_invoice_id := NEW.invoice_id;
  END IF;

  -- Sum all payments for this invoice
  SELECT COALESCE(SUM(amount), 0) INTO v_paid FROM payments WHERE invoice_id = v_invoice_id;

  -- Get the invoice total
  SELECT total_amount INTO v_total FROM invoices WHERE id = v_invoice_id;

  -- Update the invoice
  UPDATE invoices
    SET paid = v_paid,
        balance_due = GREATEST(v_total - v_paid, 0)
    WHERE id = v_invoice_id;

  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_invoice_payment_totals"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_invoice_status"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    IF NEW.paid_date IS NOT NULL AND OLD.paid_date IS NULL THEN
        NEW.status = 'paid';
    ELSIF NEW.paid_date IS NULL AND OLD.paid_date IS NOT NULL THEN
        NEW.status = 
            CASE 
                WHEN NEW.due_date < CURRENT_DATE THEN 'overdue'
                ELSE 'pending'
            END;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_invoice_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_invoice_totals"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Update the invoice totals for invoices with items
    WITH totals AS (
        SELECT
            invoice_id,
            SUM(amount) as subtotal,
            SUM(tax_amount) as tax_amount,
            SUM(total_amount) as total_amount
        FROM invoice_items
        WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)
        GROUP BY invoice_id
    )
    UPDATE invoices
    SET
        subtotal = COALESCE(totals.subtotal, 0),
        tax_amount = COALESCE(totals.tax_amount, 0),
        total_amount = COALESCE(totals.total_amount, 0),
        tax_rate = 0.15,
        updated_at = now()
    FROM totals
    WHERE invoices.id = totals.invoice_id;

    -- If there are no items left, set all totals to zero
    UPDATE invoices
    SET
        subtotal = 0,
        tax_amount = 0,
        total_amount = 0,
        tax_rate = 0.15,
        updated_at = now()
    WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id)
      AND NOT EXISTS (
        SELECT 1 FROM invoice_items WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)
      );

    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_invoice_totals"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_transaction_status"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        NEW.completed_at = now();
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_transaction_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_belongs_to_organization"("uid" "uuid", "org_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_organizations uo
    WHERE uo.user_id = uid AND uo.organization_id = org_id
  );
END;
$$;


ALTER FUNCTION "public"."user_belongs_to_organization"("uid" "uuid", "org_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."aircraft" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "registration" "text" NOT NULL,
    "type" "text" NOT NULL,
    "manufacturer" "text",
    "year_manufactured" integer,
    "total_hours" numeric(10,2) DEFAULT 0 NOT NULL,
    "last_maintenance_date" timestamp with time zone,
    "next_maintenance_date" timestamp with time zone,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "capacity" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "current_tach" numeric DEFAULT 0 NOT NULL,
    "current_hobbs" numeric DEFAULT 0 NOT NULL,
    "record_tacho" boolean DEFAULT false NOT NULL,
    "record_hobbs" boolean DEFAULT false NOT NULL,
    "record_airswitch" boolean DEFAULT false NOT NULL,
    "on_line" boolean DEFAULT true NOT NULL,
    "for_ato" boolean DEFAULT false NOT NULL,
    "fuel_consumption" integer,
    "engine_count" integer DEFAULT 1 NOT NULL,
    "prioritise_scheduling" boolean DEFAULT false NOT NULL,
    "aircraft_image_url" "text",
    "total_time_method" "public"."total_time_method"
);


ALTER TABLE "public"."aircraft" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."aircraft_charge_rates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "aircraft_id" "uuid" NOT NULL,
    "flight_type_id" "uuid" NOT NULL,
    "rate_per_hour" numeric(10,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "charge_hobbs" boolean DEFAULT false NOT NULL,
    "charge_tacho" boolean DEFAULT false NOT NULL,
    "charge_airswitch" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."aircraft_charge_rates" OWNER TO "postgres";


COMMENT ON COLUMN "public"."aircraft_charge_rates"."rate_per_hour" IS 'tax exclusive';



CREATE TABLE IF NOT EXISTS "public"."aircraft_components" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "aircraft_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "due_at_hours" numeric,
    "due_at_date" timestamp with time zone,
    "last_completed_hours" numeric,
    "last_completed_date" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "component_type" "public"."component_type_enum",
    "interval_type" "public"."interval_type_enum",
    "interval_hours" numeric,
    "interval_days" integer,
    "current_due_date" timestamp with time zone,
    "current_due_hours" numeric,
    "status" "public"."component_status_enum",
    "priority" "text",
    "notes" "text",
    "scheduled_due_hours" numeric,
    "extension_limit_hours" numeric
);


ALTER TABLE "public"."aircraft_components" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."aircraft_tech_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "aircraft_id" "uuid" NOT NULL,
    "entry_type" "text" NOT NULL,
    "description" "text" NOT NULL,
    "tach" numeric,
    "hobbs" numeric,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."aircraft_tech_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "table_name" "text" NOT NULL,
    "row_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "changed_by" "uuid",
    "changed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "old_data" "jsonb",
    "new_data" "jsonb",
    "column_changes" "jsonb",
    "organization_id" "uuid",
    CONSTRAINT "audit_logs_action_check" CHECK (("action" = ANY (ARRAY['INSERT'::"text", 'UPDATE'::"text", 'DELETE'::"text"])))
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."booking_details" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "eta" timestamp with time zone,
    "passengers" "text",
    "route" "text",
    "equipment" "jsonb",
    "remarks" "text",
    "authorization_completed" boolean DEFAULT false NOT NULL,
    "booking_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "override_conflict" boolean DEFAULT false NOT NULL,
    "actual_start" timestamp with time zone,
    "actual_end" timestamp with time zone,
    "fuel_on_board" integer
);


ALTER TABLE "public"."booking_details" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bookings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "aircraft_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "instructor_id" "uuid",
    "start_time" timestamp with time zone NOT NULL,
    "end_time" timestamp with time zone NOT NULL,
    "status" "public"."booking_status" DEFAULT 'unconfirmed'::"public"."booking_status" NOT NULL,
    "purpose" "text" NOT NULL,
    "remarks" "text",
    "hobbs_start" numeric(10,2),
    "hobbs_end" numeric(10,2),
    "tach_start" numeric(10,2),
    "tach_end" numeric(10,2),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "flight_type_id" "uuid",
    "lesson_id" "uuid",
    "booking_type" "public"."booking_type",
    "briefing_completed" boolean DEFAULT false NOT NULL,
    "flight_time" numeric,
    "checked_out_aircraft_id" "uuid",
    "checked_out_instructor_id" "uuid",
    "cancellation_reason" "text",
    "cancellation_category_id" "uuid"
);


ALTER TABLE "public"."bookings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cancellation_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text"
);


ALTER TABLE "public"."cancellation_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chargeables" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "type" "public"."chargeable_type" NOT NULL,
    "rate" numeric(10,2) NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chargeables_rate_positive" CHECK (("rate" >= (0)::numeric))
);


ALTER TABLE "public"."chargeables" OWNER TO "postgres";


COMMENT ON COLUMN "public"."chargeables"."rate" IS 'excluding TAX';



CREATE TABLE IF NOT EXISTS "public"."endorsements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."endorsements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."equipment" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "serial_number" "text",
    "status" "public"."equipment_status" DEFAULT 'active'::"public"."equipment_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "type" "public"."equipment_type",
    "location" "text",
    "year_purchased" integer
);


ALTER TABLE "public"."equipment" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."equipment_issuance" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "equipment_id" "uuid" NOT NULL,
    "issued_to" "uuid" NOT NULL,
    "issued_by" "uuid" NOT NULL,
    "issued_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "returned_at" timestamp with time zone,
    "notes" "text",
    "expected_return_date" "date"
);


ALTER TABLE "public"."equipment_issuance" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."equipment_updates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "equipment_id" "uuid" NOT NULL,
    "updated_by" "uuid" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "notes" "text",
    "next_due_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "organization_id" "uuid" NOT NULL
);


ALTER TABLE "public"."equipment_updates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."exam" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "syllabus_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."exam" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."exam_results" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "exam_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "score" numeric,
    "result" "public"."exam_result" NOT NULL,
    "date_completed" "date",
    "kdrs_completed" boolean DEFAULT false,
    "kdrs_signed_by" "uuid",
    "organization_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."exam_results" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."flight_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."flight_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."instructor_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "instructor_id" "uuid" NOT NULL,
    "comment" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."instructor_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."instructor_endorsements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "instructor_id" "uuid" NOT NULL,
    "endorsement_id" "uuid" NOT NULL,
    "granted_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."instructor_endorsements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."instructor_flight_type_rates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "instructor_id" "uuid" NOT NULL,
    "flight_type_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "rate" numeric NOT NULL,
    "currency" "text" DEFAULT 'NZD'::"text" NOT NULL,
    "effective_from" "date" DEFAULT CURRENT_DATE NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "instructor_flight_type_rates_rate_check" CHECK (("rate" >= (0)::numeric))
);


ALTER TABLE "public"."instructor_flight_type_rates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."instructors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "approved_by" "uuid",
    "approved_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone,
    "instructor_check_due_date" "date",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "instrument_check_due_date" "date",
    "is_actively_instructing" boolean DEFAULT false NOT NULL,
    "class_1_medical_due_date" "date",
    "employment_type" "public"."employment_type",
    "status" "public"."instructor_status" DEFAULT 'active'::"public"."instructor_status" NOT NULL
);


ALTER TABLE "public"."instructors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoice_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "invoice_id" "uuid" NOT NULL,
    "chargeable_id" "uuid",
    "description" "text" NOT NULL,
    "quantity" numeric(10,2) DEFAULT 1 NOT NULL,
    "rate" numeric(10,2) NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "tax_rate" numeric(5,2) DEFAULT 0.15 NOT NULL,
    "tax_amount" numeric(10,2) DEFAULT 0 NOT NULL,
    "total_amount" numeric(10,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "rate_inclusive" numeric(12,2),
    CONSTRAINT "invoice_items_quantities_positive" CHECK ((("quantity" > (0)::numeric) AND ("rate" >= (0)::numeric) AND ("amount" >= (0)::numeric) AND ("tax_rate" >= (0)::numeric) AND ("tax_amount" >= (0)::numeric) AND ("total_amount" >= (0)::numeric)))
);


ALTER TABLE "public"."invoice_items" OWNER TO "postgres";


COMMENT ON COLUMN "public"."invoice_items"."rate" IS 'rate exclusive of TAX';



COMMENT ON COLUMN "public"."invoice_items"."amount" IS 'total amount excluding tax';



CREATE TABLE IF NOT EXISTS "public"."invoice_sequences" (
    "organization_id" "uuid" NOT NULL,
    "year_month" character varying(6) NOT NULL,
    "last_sequence" integer DEFAULT 0
);


ALTER TABLE "public"."invoice_sequences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "invoice_number" "text" NOT NULL,
    "status" "public"."invoice_status" DEFAULT 'draft'::"public"."invoice_status" NOT NULL,
    "subtotal" numeric(10,2) DEFAULT 0 NOT NULL,
    "tax_rate" numeric(5,2) DEFAULT 0.15 NOT NULL,
    "tax_amount" numeric(10,2) DEFAULT 0 NOT NULL,
    "total_amount" numeric(10,2) DEFAULT 0 NOT NULL,
    "notes" "text",
    "issue_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "due_date" "date" NOT NULL,
    "paid_date" timestamp with time zone,
    "payment_method" "public"."payment_method",
    "payment_reference" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "booking_id" "uuid",
    "reference" "text",
    "paid" numeric DEFAULT 0,
    "balance_due" numeric DEFAULT 0,
    CONSTRAINT "invoices_amounts_positive" CHECK ((("subtotal" >= (0)::numeric) AND ("tax_rate" >= (0)::numeric) AND ("tax_amount" >= (0)::numeric) AND ("total_amount" >= (0)::numeric))),
    CONSTRAINT "invoices_dates_valid" CHECK ((("issue_date" <= "due_date") AND (("paid_date" IS NULL) OR ("paid_date" >= "issue_date"))))
);


ALTER TABLE "public"."invoices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lesson_progress" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "syllabus_id" "uuid",
    "lesson_id" "uuid",
    "booking_id" "uuid",
    "attempt" integer DEFAULT 1,
    "status" "text" NOT NULL,
    "comments" "text",
    "instructor_id" "uuid",
    "date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "lesson_highlights" "text",
    "areas_for_improvement" "text",
    "airmanship" "text",
    "focus_next_lesson" "text",
    "safety_concerns" "text",
    "weather_conditions" "text",
    CONSTRAINT "lesson_progress_status_check" CHECK (("status" = ANY (ARRAY['pass'::"text", 'fail'::"text", 'incomplete'::"text"])))
);


ALTER TABLE "public"."lesson_progress" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lessons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "syllabus_id" "uuid",
    "order" integer,
    "is_required" boolean DEFAULT true,
    "syllabus_stage" "public"."syllabus_stage"
);


ALTER TABLE "public"."lessons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."maintenance_visits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "aircraft_id" "uuid" NOT NULL,
    "component_id" "uuid",
    "visit_date" timestamp with time zone NOT NULL,
    "visit_type" "text" NOT NULL,
    "description" "text" NOT NULL,
    "technician_name" "text",
    "hours_at_visit" numeric,
    "total_cost" numeric,
    "status" "text" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "organization_id" "uuid",
    "date_out_of_maintenance" timestamp with time zone,
    "booking_id" "uuid",
    "scheduled_for" timestamp with time zone,
    "scheduled_end" timestamp with time zone,
    "scheduled_by" "uuid"
);


ALTER TABLE "public"."maintenance_visits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."memberships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "membership_type" "public"."membership_type" NOT NULL,
    "start_date" "date" NOT NULL,
    "expiry_date" "date" NOT NULL,
    "purchased_date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "fee_paid" boolean DEFAULT false NOT NULL,
    "amount_paid" numeric(10,2),
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."memberships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."observation_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "defect_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "comment" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."observation_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."observations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "status" "public"."observation_status" DEFAULT 'low'::"public"."observation_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "resolved_at" timestamp with time zone,
    "closed_by" "uuid",
    "aircraft_id" "uuid" NOT NULL,
    "observation_stage" "public"."observation_stage" DEFAULT 'open'::"public"."observation_stage" NOT NULL,
    "resolution_comments" "text"
);


ALTER TABLE "public"."observations" OWNER TO "postgres";


COMMENT ON COLUMN "public"."observations"."resolution_comments" IS 'Resolution notes/comments when defect is closed.';



CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "logo_url" "text",
    "contact_email" "text",
    "contact_phone" "text",
    "address" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "default_tax_rate_id" "uuid"
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "invoice_id" "uuid" NOT NULL,
    "transaction_id" "uuid" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "payment_method" "public"."payment_method" NOT NULL,
    "payment_reference" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "payments_amount_positive" CHECK (("amount" > (0)::numeric))
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text"
);


ALTER TABLE "public"."permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."role_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "role" "public"."user_role" NOT NULL,
    "permission_id" "uuid" NOT NULL,
    "role_id" "uuid" NOT NULL
);


ALTER TABLE "public"."role_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."student_syllabus_enrollment" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "syllabus_id" "uuid" NOT NULL,
    "enrolled_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "primary_instructor_id" "uuid"
);


ALTER TABLE "public"."student_syllabus_enrollment" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."syllabus" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "number_of_exams" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."syllabus" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tax_rates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid",
    "country_code" "text" NOT NULL,
    "region_code" "text",
    "tax_name" "text" NOT NULL,
    "rate" numeric(6,4) NOT NULL,
    "is_default" boolean DEFAULT false NOT NULL,
    "effective_from" "date" DEFAULT CURRENT_DATE NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tax_rates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "public"."transaction_type" NOT NULL,
    "status" "public"."transaction_status" DEFAULT 'pending'::"public"."transaction_status" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "description" "text" NOT NULL,
    "metadata" "jsonb",
    "reference_number" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    CONSTRAINT "transactions_amount_not_zero" CHECK (("amount" <> (0)::numeric))
);


ALTER TABLE "public"."transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "role" "public"."user_role" DEFAULT 'member'::"public"."user_role" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "role_id" "uuid" NOT NULL
);


ALTER TABLE "public"."user_organizations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_organization_id" "uuid" NOT NULL,
    "permission_id" "uuid" NOT NULL,
    "allowed" boolean NOT NULL
);


ALTER TABLE "public"."user_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "email" "text" NOT NULL,
    "phone" "text",
    "date_of_birth" "date",
    "license_number" "text",
    "license_expiry" "date",
    "medical_expiry" "date",
    "date_of_last_flight" timestamp with time zone,
    "profile_image_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "street_address" "text",
    "gender" "public"."gender_enum",
    "next_of_kin_name" "text",
    "next_of_kin_phone" "text",
    "company_name" "text",
    "occupation" "text",
    "employer" "text",
    "notes" "text",
    "account_balance" numeric DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."aircraft_charge_rates"
    ADD CONSTRAINT "aircraft_charge_rates_aircraft_id_flight_type_id_key" UNIQUE ("aircraft_id", "flight_type_id");



ALTER TABLE ONLY "public"."aircraft_charge_rates"
    ADD CONSTRAINT "aircraft_charge_rates_org_aircraft_flighttype_unique" UNIQUE ("organization_id", "aircraft_id", "flight_type_id");



ALTER TABLE ONLY "public"."aircraft_charge_rates"
    ADD CONSTRAINT "aircraft_charge_rates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."aircraft_components"
    ADD CONSTRAINT "aircraft_equipment_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."aircraft"
    ADD CONSTRAINT "aircraft_organization_id_registration_key" UNIQUE ("organization_id", "registration");



ALTER TABLE ONLY "public"."aircraft"
    ADD CONSTRAINT "aircraft_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."aircraft_tech_log"
    ADD CONSTRAINT "aircraft_tech_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."booking_details"
    ADD CONSTRAINT "booking_details_booking_id_unique" UNIQUE ("booking_id");



ALTER TABLE ONLY "public"."booking_details"
    ADD CONSTRAINT "booking_details_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cancellation_categories"
    ADD CONSTRAINT "cancellation_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chargeables"
    ADD CONSTRAINT "chargeables_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."observation_comments"
    ADD CONSTRAINT "defect_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."observations"
    ADD CONSTRAINT "defects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."endorsements"
    ADD CONSTRAINT "endorsements_organization_id_name_key" UNIQUE ("organization_id", "name");



ALTER TABLE ONLY "public"."endorsements"
    ADD CONSTRAINT "endorsements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."equipment_issuance"
    ADD CONSTRAINT "equipment_issuance_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."equipment"
    ADD CONSTRAINT "equipment_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."equipment_updates"
    ADD CONSTRAINT "equipment_updates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."exam"
    ADD CONSTRAINT "exam_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."exam_results"
    ADD CONSTRAINT "exam_results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."flight_types"
    ADD CONSTRAINT "flight_types_organization_id_name_key" UNIQUE ("organization_id", "name");



ALTER TABLE ONLY "public"."flight_types"
    ADD CONSTRAINT "flight_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."instructor_comments"
    ADD CONSTRAINT "instructor_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."instructor_endorsements"
    ADD CONSTRAINT "instructor_endorsements_instructor_id_endorsement_id_key" UNIQUE ("instructor_id", "endorsement_id");



ALTER TABLE ONLY "public"."instructor_endorsements"
    ADD CONSTRAINT "instructor_endorsements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."instructor_flight_type_rates"
    ADD CONSTRAINT "instructor_flight_type_rates_instructor_id_flight_type_id_o_key" UNIQUE ("instructor_id", "flight_type_id", "organization_id");



ALTER TABLE ONLY "public"."instructor_flight_type_rates"
    ADD CONSTRAINT "instructor_flight_type_rates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."instructors"
    ADD CONSTRAINT "instructors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."instructors"
    ADD CONSTRAINT "instructors_user_id_organization_id_key" UNIQUE ("user_id", "organization_id");



ALTER TABLE ONLY "public"."invoice_items"
    ADD CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoice_sequences"
    ADD CONSTRAINT "invoice_sequences_pkey" PRIMARY KEY ("organization_id", "year_month");



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



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "no_aircraft_overlap" EXCLUDE USING "gist" ("aircraft_id" WITH =, "tstzrange"("start_time", "end_time") WITH &&) WHERE ((("aircraft_id" IS NOT NULL) AND ("status" = ANY (ARRAY['confirmed'::"public"."booking_status", 'flying'::"public"."booking_status"]))));



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "no_instructor_overlap" EXCLUDE USING "gist" ("instructor_id" WITH =, "tstzrange"("start_time", "end_time") WITH &&) WHERE ((("instructor_id" IS NOT NULL) AND ("status" = ANY (ARRAY['confirmed'::"public"."booking_status", 'flying'::"public"."booking_status"]))));



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."permissions"
    ADD CONSTRAINT "permissions_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."permissions"
    ADD CONSTRAINT "permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_role_permission_id_key" UNIQUE ("role", "permission_id");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."student_syllabus_enrollment"
    ADD CONSTRAINT "student_syllabus_enrollment_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."student_syllabus_enrollment"
    ADD CONSTRAINT "student_syllabus_enrollment_user_id_syllabus_id_key" UNIQUE ("user_id", "syllabus_id");



ALTER TABLE ONLY "public"."syllabus"
    ADD CONSTRAINT "syllabus_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tax_rates"
    ADD CONSTRAINT "tax_rates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_organizations"
    ADD CONSTRAINT "user_organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_organizations"
    ADD CONSTRAINT "user_organizations_user_id_organization_id_key" UNIQUE ("user_id", "organization_id");



ALTER TABLE ONLY "public"."user_permissions"
    ADD CONSTRAINT "user_permission_overrides_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_permissions"
    ADD CONSTRAINT "user_permission_overrides_user_organization_id_permission_i_key" UNIQUE ("user_organization_id", "permission_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_aircraft_charge_rates_aircraft_id" ON "public"."aircraft_charge_rates" USING "btree" ("aircraft_id");



CREATE INDEX "idx_aircraft_charge_rates_flight_type_id" ON "public"."aircraft_charge_rates" USING "btree" ("flight_type_id");



CREATE INDEX "idx_bookings_flight_type_id" ON "public"."bookings" USING "btree" ("flight_type_id");



CREATE INDEX "idx_bookings_instructor_id" ON "public"."bookings" USING "btree" ("instructor_id");



CREATE INDEX "idx_bookings_lesson_id" ON "public"."bookings" USING "btree" ("lesson_id");



CREATE INDEX "idx_checked_out_aircraft_id" ON "public"."bookings" USING "btree" ("checked_out_aircraft_id");



CREATE INDEX "idx_checked_out_instructor_id" ON "public"."bookings" USING "btree" ("checked_out_instructor_id");



CREATE INDEX "idx_defect_comments_defect_id" ON "public"."observation_comments" USING "btree" ("defect_id");



CREATE INDEX "idx_defect_comments_defect_id_created_at" ON "public"."observation_comments" USING "btree" ("defect_id", "created_at");



CREATE INDEX "idx_defects_org_id" ON "public"."observations" USING "btree" ("organization_id");



CREATE INDEX "idx_equipment_issuance_equipment_id" ON "public"."equipment_issuance" USING "btree" ("equipment_id");



CREATE INDEX "idx_equipment_issuance_issued_to" ON "public"."equipment_issuance" USING "btree" ("issued_to");



CREATE INDEX "idx_equipment_updates_equipment_id" ON "public"."equipment_updates" USING "btree" ("equipment_id");



CREATE INDEX "idx_equipment_updates_updated_by" ON "public"."equipment_updates" USING "btree" ("updated_by");



CREATE INDEX "idx_exam_results_exam_id" ON "public"."exam_results" USING "btree" ("exam_id");



CREATE INDEX "idx_exam_results_user_id" ON "public"."exam_results" USING "btree" ("user_id");



CREATE INDEX "idx_exam_syllabus_id" ON "public"."exam" USING "btree" ("syllabus_id");



CREATE INDEX "idx_instructor_comments_booking_id" ON "public"."instructor_comments" USING "btree" ("booking_id");



CREATE INDEX "idx_instructor_flight_type_rates_flight_type_id" ON "public"."instructor_flight_type_rates" USING "btree" ("flight_type_id");



CREATE INDEX "idx_instructor_flight_type_rates_instructor_id" ON "public"."instructor_flight_type_rates" USING "btree" ("instructor_id");



CREATE INDEX "idx_instructor_flight_type_rates_organization_id" ON "public"."instructor_flight_type_rates" USING "btree" ("organization_id");



CREATE INDEX "idx_invoices_booking_id" ON "public"."invoices" USING "btree" ("booking_id");



CREATE INDEX "idx_lesson_progress_user_syllabus" ON "public"."lesson_progress" USING "btree" ("user_id", "syllabus_id");



CREATE INDEX "idx_payments_invoice_id" ON "public"."payments" USING "btree" ("invoice_id");



CREATE INDEX "idx_payments_transaction_id" ON "public"."payments" USING "btree" ("transaction_id");



CREATE INDEX "idx_role_permissions_role_id" ON "public"."role_permissions" USING "btree" ("role_id");



CREATE INDEX "idx_student_syllabus_enrollment_primary_instructor_id" ON "public"."student_syllabus_enrollment" USING "btree" ("primary_instructor_id");



CREATE INDEX "idx_tax_rates_org_country" ON "public"."tax_rates" USING "btree" ("organization_id", "country_code", "region_code");



CREATE INDEX "idx_transactions_organization_id" ON "public"."transactions" USING "btree" ("organization_id");



CREATE INDEX "idx_transactions_user_id" ON "public"."transactions" USING "btree" ("user_id");



CREATE INDEX "idx_user_org_organization_id" ON "public"."user_organizations" USING "btree" ("organization_id");



CREATE INDEX "idx_user_org_user_id" ON "public"."user_organizations" USING "btree" ("user_id");



CREATE INDEX "idx_user_organizations_role_id" ON "public"."user_organizations" USING "btree" ("role_id");



CREATE INDEX "memberships_organization_id_idx" ON "public"."memberships" USING "btree" ("organization_id");



CREATE INDEX "memberships_user_id_idx" ON "public"."memberships" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "bookings_audit" AFTER INSERT OR DELETE OR UPDATE ON "public"."bookings" FOR EACH ROW EXECUTE FUNCTION "public"."log_booking_audit"();



CREATE OR REPLACE TRIGGER "calculate_invoice_item_amounts_trigger" BEFORE INSERT OR UPDATE ON "public"."invoice_items" FOR EACH ROW EXECUTE FUNCTION "public"."calculate_invoice_item_amounts"();



CREATE OR REPLACE TRIGGER "ensure_invoice_number" BEFORE INSERT ON "public"."invoices" FOR EACH ROW EXECUTE FUNCTION "public"."set_invoice_number"();



CREATE OR REPLACE TRIGGER "prevent_double_booking_trigger" BEFORE INSERT OR UPDATE ON "public"."bookings" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_double_booking_on_bookings"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."memberships" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at_aircraft" BEFORE UPDATE ON "public"."aircraft" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at_booking_details" BEFORE UPDATE ON "public"."booking_details" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at_bookings" BEFORE UPDATE ON "public"."bookings" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at_organizations" BEFORE UPDATE ON "public"."organizations" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();



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



ALTER TABLE ONLY "public"."aircraft_charge_rates"
    ADD CONSTRAINT "aircraft_charge_rates_aircraft_id_fkey" FOREIGN KEY ("aircraft_id") REFERENCES "public"."aircraft"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."aircraft_charge_rates"
    ADD CONSTRAINT "aircraft_charge_rates_flight_type_id_fkey" FOREIGN KEY ("flight_type_id") REFERENCES "public"."flight_types"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."aircraft_charge_rates"
    ADD CONSTRAINT "aircraft_charge_rates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."aircraft_components"
    ADD CONSTRAINT "aircraft_components_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."aircraft_components"
    ADD CONSTRAINT "aircraft_equipment_aircraft_id_fkey" FOREIGN KEY ("aircraft_id") REFERENCES "public"."aircraft"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."aircraft"
    ADD CONSTRAINT "aircraft_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."aircraft_tech_log"
    ADD CONSTRAINT "aircraft_tech_log_aircraft_id_fkey" FOREIGN KEY ("aircraft_id") REFERENCES "public"."aircraft"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."aircraft_tech_log"
    ADD CONSTRAINT "aircraft_tech_log_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."booking_details"
    ADD CONSTRAINT "booking_details_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."booking_details"
    ADD CONSTRAINT "booking_details_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_aircraft_id_fkey" FOREIGN KEY ("aircraft_id") REFERENCES "public"."aircraft"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_cancellation_category_id_fkey" FOREIGN KEY ("cancellation_category_id") REFERENCES "public"."cancellation_categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_checked_out_aircraft_id_fkey" FOREIGN KEY ("checked_out_aircraft_id") REFERENCES "public"."aircraft"("id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_checked_out_instructor_id_fkey" FOREIGN KEY ("checked_out_instructor_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_flight_type_id_fkey" FOREIGN KEY ("flight_type_id") REFERENCES "public"."flight_types"("id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cancellation_categories"
    ADD CONSTRAINT "cancellation_categories_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chargeables"
    ADD CONSTRAINT "chargeables_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."observation_comments"
    ADD CONSTRAINT "defect_comments_defect_id_fkey" FOREIGN KEY ("defect_id") REFERENCES "public"."observations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."observation_comments"
    ADD CONSTRAINT "defect_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."observations"
    ADD CONSTRAINT "defects_aircraft_id_fkey" FOREIGN KEY ("aircraft_id") REFERENCES "public"."aircraft"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."observations"
    ADD CONSTRAINT "defects_closed_by_fkey" FOREIGN KEY ("closed_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."observations"
    ADD CONSTRAINT "defects_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."observations"
    ADD CONSTRAINT "defects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."endorsements"
    ADD CONSTRAINT "endorsements_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."equipment_issuance"
    ADD CONSTRAINT "equipment_issuance_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."equipment_issuance"
    ADD CONSTRAINT "equipment_issuance_issued_by_fkey" FOREIGN KEY ("issued_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."equipment_issuance"
    ADD CONSTRAINT "equipment_issuance_issued_to_fkey" FOREIGN KEY ("issued_to") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."equipment"
    ADD CONSTRAINT "equipment_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."equipment_updates"
    ADD CONSTRAINT "equipment_updates_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."equipment_updates"
    ADD CONSTRAINT "equipment_updates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."equipment_updates"
    ADD CONSTRAINT "equipment_updates_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."exam"
    ADD CONSTRAINT "exam_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exam_results"
    ADD CONSTRAINT "exam_results_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "public"."exam"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exam_results"
    ADD CONSTRAINT "exam_results_kdrs_signed_by_fkey" FOREIGN KEY ("kdrs_signed_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."exam_results"
    ADD CONSTRAINT "exam_results_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exam_results"
    ADD CONSTRAINT "exam_results_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exam"
    ADD CONSTRAINT "exam_syllabus_id_fkey" FOREIGN KEY ("syllabus_id") REFERENCES "public"."syllabus"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."flight_types"
    ADD CONSTRAINT "flight_types_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."instructor_comments"
    ADD CONSTRAINT "instructor_comments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."instructor_comments"
    ADD CONSTRAINT "instructor_comments_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."instructor_comments"
    ADD CONSTRAINT "instructor_comments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."instructor_endorsements"
    ADD CONSTRAINT "instructor_endorsements_endorsement_id_fkey" FOREIGN KEY ("endorsement_id") REFERENCES "public"."endorsements"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."instructor_endorsements"
    ADD CONSTRAINT "instructor_endorsements_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "public"."instructors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."instructor_flight_type_rates"
    ADD CONSTRAINT "instructor_flight_type_rates_flight_type_id_fkey" FOREIGN KEY ("flight_type_id") REFERENCES "public"."flight_types"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."instructor_flight_type_rates"
    ADD CONSTRAINT "instructor_flight_type_rates_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "public"."instructors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."instructor_flight_type_rates"
    ADD CONSTRAINT "instructor_flight_type_rates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."instructors"
    ADD CONSTRAINT "instructors_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."instructors"
    ADD CONSTRAINT "instructors_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."instructors"
    ADD CONSTRAINT "instructors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoice_items"
    ADD CONSTRAINT "invoice_items_chargeable_id_fkey" FOREIGN KEY ("chargeable_id") REFERENCES "public"."chargeables"("id");



ALTER TABLE ONLY "public"."invoice_items"
    ADD CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoice_sequences"
    ADD CONSTRAINT "invoice_sequences_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."lesson_progress"
    ADD CONSTRAINT "lesson_progress_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id");



ALTER TABLE ONLY "public"."lesson_progress"
    ADD CONSTRAINT "lesson_progress_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."lesson_progress"
    ADD CONSTRAINT "lesson_progress_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lesson_progress"
    ADD CONSTRAINT "lesson_progress_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."lesson_progress"
    ADD CONSTRAINT "lesson_progress_syllabus_id_fkey" FOREIGN KEY ("syllabus_id") REFERENCES "public"."syllabus"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lesson_progress"
    ADD CONSTRAINT "lesson_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."lessons"
    ADD CONSTRAINT "lessons_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lessons"
    ADD CONSTRAINT "lessons_syllabus_id_fkey" FOREIGN KEY ("syllabus_id") REFERENCES "public"."syllabus"("id");



ALTER TABLE ONLY "public"."maintenance_visits"
    ADD CONSTRAINT "maintenance_visits_aircraft_id_fkey" FOREIGN KEY ("aircraft_id") REFERENCES "public"."aircraft"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."maintenance_visits"
    ADD CONSTRAINT "maintenance_visits_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."maintenance_visits"
    ADD CONSTRAINT "maintenance_visits_component_id_fkey" FOREIGN KEY ("component_id") REFERENCES "public"."aircraft_components"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."maintenance_visits"
    ADD CONSTRAINT "maintenance_visits_scheduled_by_fkey" FOREIGN KEY ("scheduled_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."memberships"
    ADD CONSTRAINT "memberships_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."memberships"
    ADD CONSTRAINT "memberships_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."memberships"
    ADD CONSTRAINT "memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_default_tax_rate_id_fkey" FOREIGN KEY ("default_tax_rate_id") REFERENCES "public"."tax_rates"("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id");



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id");



ALTER TABLE ONLY "public"."student_syllabus_enrollment"
    ADD CONSTRAINT "student_syllabus_enrollment_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."student_syllabus_enrollment"
    ADD CONSTRAINT "student_syllabus_enrollment_primary_instructor_id_fkey" FOREIGN KEY ("primary_instructor_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."student_syllabus_enrollment"
    ADD CONSTRAINT "student_syllabus_enrollment_syllabus_id_fkey" FOREIGN KEY ("syllabus_id") REFERENCES "public"."syllabus"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_syllabus_enrollment"
    ADD CONSTRAINT "student_syllabus_enrollment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."syllabus"
    ADD CONSTRAINT "syllabus_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."tax_rates"
    ADD CONSTRAINT "tax_rates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."user_organizations"
    ADD CONSTRAINT "user_organizations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_organizations"
    ADD CONSTRAINT "user_organizations_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id");



ALTER TABLE ONLY "public"."user_organizations"
    ADD CONSTRAINT "user_organizations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_permissions"
    ADD CONSTRAINT "user_permission_overrides_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_permissions"
    ADD CONSTRAINT "user_permission_overrides_user_organization_id_fkey" FOREIGN KEY ("user_organization_id") REFERENCES "public"."user_organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admins and owners can manage payments in their org" ON "public"."payments" USING ((EXISTS ( SELECT 1
   FROM "public"."user_organizations"
  WHERE (("user_organizations"."user_id" = "auth"."uid"()) AND ("user_organizations"."organization_id" = "payments"."organization_id") AND ("user_organizations"."role" = ANY (ARRAY['owner'::"public"."user_role", 'admin'::"public"."user_role"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_organizations"
  WHERE (("user_organizations"."user_id" = "auth"."uid"()) AND ("user_organizations"."organization_id" = "payments"."organization_id") AND ("user_organizations"."role" = ANY (ARRAY['owner'::"public"."user_role", 'admin'::"public"."user_role"]))))));



CREATE POLICY "Admins and owners can manage transactions in their org" ON "public"."transactions" USING ((EXISTS ( SELECT 1
   FROM "public"."user_organizations"
  WHERE (("user_organizations"."user_id" = "auth"."uid"()) AND ("user_organizations"."organization_id" = "transactions"."organization_id") AND ("user_organizations"."role" = ANY (ARRAY['owner'::"public"."user_role", 'admin'::"public"."user_role"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_organizations"
  WHERE (("user_organizations"."user_id" = "auth"."uid"()) AND ("user_organizations"."organization_id" = "transactions"."organization_id") AND ("user_organizations"."role" = ANY (ARRAY['owner'::"public"."user_role", 'admin'::"public"."user_role"]))))));



CREATE POLICY "Admins and owners can update invoices in their org" ON "public"."invoices" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."user_organizations"
  WHERE (("user_organizations"."user_id" = "auth"."uid"()) AND ("user_organizations"."organization_id" = "invoices"."organization_id") AND ("user_organizations"."role" = ANY (ARRAY['owner'::"public"."user_role", 'admin'::"public"."user_role"]))))));



CREATE POLICY "Admins can update all memberships" ON "public"."memberships" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."user_organizations"
  WHERE (("user_organizations"."user_id" = "auth"."uid"()) AND ("user_organizations"."organization_id" = "memberships"."organization_id") AND (("user_organizations"."role")::"text" = ANY (ARRAY['owner'::"text", 'admin'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_organizations"
  WHERE (("user_organizations"."user_id" = "auth"."uid"()) AND ("user_organizations"."organization_id" = "memberships"."organization_id") AND (("user_organizations"."role")::"text" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "Allow delete if user has can_delete_aircraft in org" ON "public"."aircraft" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."user_organizations" "uo"
  WHERE (("uo"."user_id" = "auth"."uid"()) AND ("uo"."organization_id" = "aircraft"."organization_id") AND ((EXISTS ( SELECT 1
           FROM ("public"."user_permissions" "up"
             JOIN "public"."permissions" "p" ON (("up"."permission_id" = "p"."id")))
          WHERE (("up"."user_organization_id" = "uo"."id") AND ("p"."name" = 'can_delete_aircraft'::"text") AND ("up"."allowed" = true)))) OR (EXISTS ( SELECT 1
           FROM ("public"."role_permissions" "rp"
             JOIN "public"."permissions" "p" ON (("rp"."permission_id" = "p"."id")))
          WHERE (("rp"."role" = "uo"."role") AND ("p"."name" = 'can_delete_aircraft'::"text")))))))));



CREATE POLICY "Allow delete if user has can_delete_equipment in org" ON "public"."equipment" FOR DELETE USING ((("auth"."uid"() IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM ((("public"."user_organizations" "uo"
     JOIN "public"."permissions" "p" ON (("p"."name" = 'can_delete_equipment'::"text")))
     LEFT JOIN "public"."user_permissions" "up" ON ((("up"."user_organization_id" = "uo"."id") AND ("up"."permission_id" = "p"."id"))))
     LEFT JOIN "public"."role_permissions" "rp" ON ((("rp"."role" = "uo"."role") AND ("rp"."permission_id" = "p"."id"))))
  WHERE (("uo"."user_id" = "auth"."uid"()) AND ("uo"."organization_id" = "equipment"."organization_id") AND COALESCE("up"."allowed",
        CASE
            WHEN ("rp"."permission_id" IS NOT NULL) THEN true
            ELSE false
        END))))));



CREATE POLICY "Allow insert if user has can_create_equipment in org" ON "public"."equipment" FOR INSERT WITH CHECK ((("auth"."uid"() IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM ((("public"."user_organizations" "uo"
     JOIN "public"."permissions" "p" ON (("p"."name" = 'can_create_equipment'::"text")))
     LEFT JOIN "public"."user_permissions" "up" ON ((("up"."user_organization_id" = "uo"."id") AND ("up"."permission_id" = "p"."id"))))
     LEFT JOIN "public"."role_permissions" "rp" ON ((("rp"."role" = "uo"."role") AND ("rp"."permission_id" = "p"."id"))))
  WHERE (("uo"."user_id" = "auth"."uid"()) AND ("uo"."organization_id" = "equipment"."organization_id") AND COALESCE("up"."allowed",
        CASE
            WHEN ("rp"."permission_id" IS NOT NULL) THEN true
            ELSE false
        END))))));



CREATE POLICY "Allow update if user has can_update_aircraft in org" ON "public"."aircraft" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."user_organizations" "uo"
  WHERE (("uo"."user_id" = "auth"."uid"()) AND ("uo"."organization_id" = "aircraft"."organization_id") AND ((EXISTS ( SELECT 1
           FROM ("public"."user_permissions" "up"
             JOIN "public"."permissions" "p" ON (("up"."permission_id" = "p"."id")))
          WHERE (("up"."user_organization_id" = "uo"."id") AND ("p"."name" = 'can_update_aircraft'::"text") AND ("up"."allowed" = true)))) OR (EXISTS ( SELECT 1
           FROM ("public"."role_permissions" "rp"
             JOIN "public"."permissions" "p" ON (("rp"."permission_id" = "p"."id")))
          WHERE (("rp"."role" = "uo"."role") AND ("p"."name" = 'can_update_aircraft'::"text")))))))));



CREATE POLICY "Allow update if user has can_update_equipment in org" ON "public"."equipment" FOR UPDATE USING ((("auth"."uid"() IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM ((("public"."user_organizations" "uo"
     JOIN "public"."permissions" "p" ON (("p"."name" = 'can_update_equipment'::"text")))
     LEFT JOIN "public"."user_permissions" "up" ON ((("up"."user_organization_id" = "uo"."id") AND ("up"."permission_id" = "p"."id"))))
     LEFT JOIN "public"."role_permissions" "rp" ON ((("rp"."role" = "uo"."role") AND ("rp"."permission_id" = "p"."id"))))
  WHERE (("uo"."user_id" = "auth"."uid"()) AND ("uo"."organization_id" = "equipment"."organization_id") AND COALESCE("up"."allowed",
        CASE
            WHEN ("rp"."permission_id" IS NOT NULL) THEN true
            ELSE false
        END))))));



CREATE POLICY "Allow view if user has can_view_aircraft in org" ON "public"."aircraft" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_organizations" "uo"
  WHERE (("uo"."user_id" = "auth"."uid"()) AND ("uo"."organization_id" = "aircraft"."organization_id") AND ((EXISTS ( SELECT 1
           FROM ("public"."user_permissions" "up"
             JOIN "public"."permissions" "p" ON (("up"."permission_id" = "p"."id")))
          WHERE (("up"."user_organization_id" = "uo"."id") AND ("p"."name" = 'can_view_aircraft'::"text") AND ("up"."allowed" = true)))) OR (EXISTS ( SELECT 1
           FROM ("public"."role_permissions" "rp"
             JOIN "public"."permissions" "p" ON (("rp"."permission_id" = "p"."id")))
          WHERE (("rp"."role" = "uo"."role") AND ("p"."name" = 'can_view_aircraft'::"text")))))))));



CREATE POLICY "Allow view if user has can_view_equipment in org" ON "public"."equipment" FOR SELECT USING ((("auth"."uid"() IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM ((("public"."user_organizations" "uo"
     JOIN "public"."permissions" "p" ON (("p"."name" = 'can_view_equipment'::"text")))
     LEFT JOIN "public"."user_permissions" "up" ON ((("up"."user_organization_id" = "uo"."id") AND ("up"."permission_id" = "p"."id"))))
     LEFT JOIN "public"."role_permissions" "rp" ON ((("rp"."role" = "uo"."role") AND ("rp"."permission_id" = "p"."id"))))
  WHERE (("uo"."user_id" = "auth"."uid"()) AND ("uo"."organization_id" = "equipment"."organization_id") AND COALESCE("up"."allowed",
        CASE
            WHEN ("rp"."permission_id" IS NOT NULL) THEN true
            ELSE false
        END))))));



CREATE POLICY "DefectComments: org role can read" ON "public"."observation_comments" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_organizations" "uo"
  WHERE (("uo"."user_id" = "auth"."uid"()) AND ("uo"."organization_id" = ( SELECT "d"."organization_id"
           FROM "public"."observations" "d"
          WHERE ("d"."id" = "observation_comments"."defect_id"))) AND ("uo"."role" = ANY (ARRAY['instructor'::"public"."user_role", 'admin'::"public"."user_role", 'owner'::"public"."user_role"]))))));



CREATE POLICY "DefectComments: user can insert own" ON "public"."observation_comments" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Defects: org role can manage" ON "public"."observations" USING ((EXISTS ( SELECT 1
   FROM "public"."user_organizations" "uo"
  WHERE (("uo"."user_id" = "auth"."uid"()) AND ("uo"."organization_id" = "observations"."organization_id") AND ("uo"."role" = ANY (ARRAY['instructor'::"public"."user_role", 'admin'::"public"."user_role", 'owner'::"public"."user_role"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_organizations" "uo"
  WHERE (("uo"."user_id" = "auth"."uid"()) AND ("uo"."organization_id" = "observations"."organization_id") AND ("uo"."role" = ANY (ARRAY['instructor'::"public"."user_role", 'admin'::"public"."user_role", 'owner'::"public"."user_role"]))))));



CREATE POLICY "Enable delete for organization owners" ON "public"."organizations" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."user_organizations"
  WHERE (("user_organizations"."organization_id" = "organizations"."id") AND ("user_organizations"."user_id" = "auth"."uid"()) AND ("user_organizations"."role" = 'owner'::"public"."user_role")))));



CREATE POLICY "Enable insert for authenticated users" ON "public"."organizations" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable read access for users with organization membership" ON "public"."organizations" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_organizations"
  WHERE (("user_organizations"."organization_id" = "organizations"."id") AND ("user_organizations"."user_id" = "auth"."uid"())))));



CREATE POLICY "Enable update for organization owners and admins" ON "public"."organizations" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."user_organizations"
  WHERE (("user_organizations"."organization_id" = "organizations"."id") AND ("user_organizations"."user_id" = "auth"."uid"()) AND ("user_organizations"."role" = ANY (ARRAY['owner'::"public"."user_role", 'admin'::"public"."user_role"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_organizations"
  WHERE (("user_organizations"."organization_id" = "organizations"."id") AND ("user_organizations"."user_id" = "auth"."uid"()) AND ("user_organizations"."role" = ANY (ARRAY['owner'::"public"."user_role", 'admin'::"public"."user_role"]))))));



CREATE POLICY "Instructors and owners can insert comments" ON "public"."instructor_comments" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_organizations"
  WHERE (("user_organizations"."user_id" = "auth"."uid"()) AND ("user_organizations"."organization_id" = "instructor_comments"."organization_id") AND ("user_organizations"."role" = ANY (ARRAY['instructor'::"public"."user_role", 'owner'::"public"."user_role"]))))));



CREATE POLICY "Instructors and owners can read instructor comments" ON "public"."instructor_comments" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_organizations"
  WHERE (("user_organizations"."user_id" = "auth"."uid"()) AND ("user_organizations"."organization_id" = "instructor_comments"."organization_id") AND ("user_organizations"."role" = ANY (ARRAY['instructor'::"public"."user_role", 'owner'::"public"."user_role"]))))));



CREATE POLICY "Instructors and owners can update their own comments" ON "public"."instructor_comments" FOR UPDATE USING ((("instructor_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."user_organizations"
  WHERE (("user_organizations"."user_id" = "auth"."uid"()) AND ("user_organizations"."organization_id" = "instructor_comments"."organization_id") AND ("user_organizations"."role" = ANY (ARRAY['instructor'::"public"."user_role", 'owner'::"public"."user_role"])))))));



CREATE POLICY "Org members can DELETE equipment" ON "public"."aircraft_components" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM ("public"."aircraft" "a"
     JOIN "public"."user_organizations" "uo" ON (("a"."organization_id" = "uo"."organization_id")))
  WHERE (("a"."id" = "aircraft_components"."aircraft_id") AND ("uo"."user_id" = "auth"."uid"())))));



CREATE POLICY "Org members can DELETE tech log" ON "public"."aircraft_tech_log" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM ("public"."aircraft" "a"
     JOIN "public"."user_organizations" "uo" ON (("a"."organization_id" = "uo"."organization_id")))
  WHERE (("a"."id" = "aircraft_tech_log"."aircraft_id") AND ("uo"."user_id" = "auth"."uid"())))));



CREATE POLICY "Org members can INSERT equipment" ON "public"."aircraft_components" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."aircraft" "a"
     JOIN "public"."user_organizations" "uo" ON (("a"."organization_id" = "uo"."organization_id")))
  WHERE (("a"."id" = "aircraft_components"."aircraft_id") AND ("uo"."user_id" = "auth"."uid"())))));



CREATE POLICY "Org members can INSERT tech log" ON "public"."aircraft_tech_log" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."aircraft" "a"
     JOIN "public"."user_organizations" "uo" ON (("a"."organization_id" = "uo"."organization_id")))
  WHERE (("a"."id" = "aircraft_tech_log"."aircraft_id") AND ("uo"."user_id" = "auth"."uid"())))));



CREATE POLICY "Org members can SELECT equipment" ON "public"."aircraft_components" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."aircraft" "a"
     JOIN "public"."user_organizations" "uo" ON (("a"."organization_id" = "uo"."organization_id")))
  WHERE (("a"."id" = "aircraft_components"."aircraft_id") AND ("uo"."user_id" = "auth"."uid"())))));



CREATE POLICY "Org members can SELECT tech log" ON "public"."aircraft_tech_log" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."aircraft" "a"
     JOIN "public"."user_organizations" "uo" ON (("a"."organization_id" = "uo"."organization_id")))
  WHERE (("a"."id" = "aircraft_tech_log"."aircraft_id") AND ("uo"."user_id" = "auth"."uid"())))));



CREATE POLICY "Org members can UPDATE equipment" ON "public"."aircraft_components" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM ("public"."aircraft" "a"
     JOIN "public"."user_organizations" "uo" ON (("a"."organization_id" = "uo"."organization_id")))
  WHERE (("a"."id" = "aircraft_components"."aircraft_id") AND ("uo"."user_id" = "auth"."uid"())))));



CREATE POLICY "Org members can UPDATE tech log" ON "public"."aircraft_tech_log" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM ("public"."aircraft" "a"
     JOIN "public"."user_organizations" "uo" ON (("a"."organization_id" = "uo"."organization_id")))
  WHERE (("a"."id" = "aircraft_tech_log"."aircraft_id") AND ("uo"."user_id" = "auth"."uid"())))));



CREATE POLICY "Org members can delete aircraft_charge_rates" ON "public"."aircraft_charge_rates" FOR DELETE USING ("public"."user_belongs_to_organization"("auth"."uid"(), "organization_id"));



CREATE POLICY "Org members can insert aircraft_charge_rates" ON "public"."aircraft_charge_rates" FOR INSERT WITH CHECK ("public"."user_belongs_to_organization"("auth"."uid"(), "organization_id"));



CREATE POLICY "Org members can manage aircraft_charge_rates" ON "public"."aircraft_charge_rates" USING ("public"."user_belongs_to_organization"("auth"."uid"(), "organization_id"));



CREATE POLICY "Org members can manage flight_types" ON "public"."flight_types" USING ("public"."user_belongs_to_organization"("auth"."uid"(), "organization_id"));



CREATE POLICY "Org members can select aircraft_charge_rates" ON "public"."aircraft_charge_rates" FOR SELECT USING ("public"."user_belongs_to_organization"("auth"."uid"(), "organization_id"));



CREATE POLICY "Org members can update aircraft_charge_rates" ON "public"."aircraft_charge_rates" FOR UPDATE USING ("public"."user_belongs_to_organization"("auth"."uid"(), "organization_id")) WITH CHECK ("public"."user_belongs_to_organization"("auth"."uid"(), "organization_id"));



CREATE POLICY "Organization staff can view all memberships" ON "public"."memberships" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_organizations"
  WHERE (("user_organizations"."user_id" = "auth"."uid"()) AND ("user_organizations"."organization_id" = "memberships"."organization_id") AND (("user_organizations"."role")::"text" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'instructor'::"text"]))))));



CREATE POLICY "Owners and admins can manage chargeables" ON "public"."chargeables" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_organizations"
  WHERE (("user_organizations"."organization_id" = "chargeables"."organization_id") AND ("user_organizations"."user_id" = "auth"."uid"()) AND ("user_organizations"."role" = ANY (ARRAY['owner'::"public"."user_role", 'admin'::"public"."user_role"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_organizations"
  WHERE (("user_organizations"."organization_id" = "chargeables"."organization_id") AND ("user_organizations"."user_id" = "auth"."uid"()) AND ("user_organizations"."role" = ANY (ARRAY['owner'::"public"."user_role", 'admin'::"public"."user_role"]))))));



CREATE POLICY "Owners and admins can manage invoice items" ON "public"."invoice_items" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."invoices"
     JOIN "public"."user_organizations" ON (("user_organizations"."organization_id" = "invoices"."organization_id")))
  WHERE (("invoices"."id" = "invoice_items"."invoice_id") AND ("user_organizations"."user_id" = "auth"."uid"()) AND ("user_organizations"."role" = ANY (ARRAY['owner'::"public"."user_role", 'admin'::"public"."user_role"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."invoices"
     JOIN "public"."user_organizations" ON (("user_organizations"."organization_id" = "invoices"."organization_id")))
  WHERE (("invoices"."id" = "invoice_items"."invoice_id") AND ("user_organizations"."user_id" = "auth"."uid"()) AND ("user_organizations"."role" = ANY (ARRAY['owner'::"public"."user_role", 'admin'::"public"."user_role"]))))));



CREATE POLICY "Owners and admins can manage invoices" ON "public"."invoices" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_organizations"
  WHERE (("user_organizations"."organization_id" = "invoices"."organization_id") AND ("user_organizations"."user_id" = "auth"."uid"()) AND ("user_organizations"."role" = ANY (ARRAY['owner'::"public"."user_role", 'admin'::"public"."user_role"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_organizations"
  WHERE (("user_organizations"."organization_id" = "invoices"."organization_id") AND ("user_organizations"."user_id" = "auth"."uid"()) AND ("user_organizations"."role" = ANY (ARRAY['owner'::"public"."user_role", 'admin'::"public"."user_role"]))))));



CREATE POLICY "Owners and admins can manage payments" ON "public"."payments" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_organizations"
  WHERE (("user_organizations"."organization_id" = "payments"."organization_id") AND ("user_organizations"."user_id" = "auth"."uid"()) AND ("user_organizations"."role" = ANY (ARRAY['owner'::"public"."user_role", 'admin'::"public"."user_role"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_organizations"
  WHERE (("user_organizations"."organization_id" = "payments"."organization_id") AND ("user_organizations"."user_id" = "auth"."uid"()) AND ("user_organizations"."role" = ANY (ARRAY['owner'::"public"."user_role", 'admin'::"public"."user_role"]))))));



CREATE POLICY "Owners and admins can manage transactions" ON "public"."transactions" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_organizations"
  WHERE (("user_organizations"."organization_id" = "transactions"."organization_id") AND ("user_organizations"."user_id" = "auth"."uid"()) AND ("user_organizations"."role" = ANY (ARRAY['owner'::"public"."user_role", 'admin'::"public"."user_role"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_organizations"
  WHERE (("user_organizations"."organization_id" = "transactions"."organization_id") AND ("user_organizations"."user_id" = "auth"."uid"()) AND ("user_organizations"."role" = ANY (ARRAY['owner'::"public"."user_role", 'admin'::"public"."user_role"]))))));



CREATE POLICY "Staff can update bookings in their organizations" ON "public"."bookings" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."user_organizations"
  WHERE (("user_organizations"."user_id" = "auth"."uid"()) AND ("user_organizations"."organization_id" = "bookings"."organization_id") AND ("user_organizations"."role" = ANY (ARRAY['owner'::"public"."user_role", 'admin'::"public"."user_role", 'instructor'::"public"."user_role"]))))));



CREATE POLICY "Users can create booking_details in their organizations" ON "public"."booking_details" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."bookings" "b"
  WHERE (("b"."id" = "booking_details"."booking_id") AND "public"."user_belongs_to_organization"("auth"."uid"(), "b"."organization_id")))));



CREATE POLICY "Users can create bookings in their organizations" ON "public"."bookings" FOR INSERT WITH CHECK ("public"."user_belongs_to_organization"("auth"."uid"(), "organization_id"));



CREATE POLICY "Users can insert booking_details in their organizations" ON "public"."booking_details" FOR INSERT WITH CHECK ("public"."user_belongs_to_organization"("auth"."uid"(), "organization_id"));



CREATE POLICY "Users can update booking_details in their organizations" ON "public"."booking_details" FOR UPDATE USING ("public"."user_belongs_to_organization"("auth"."uid"(), "organization_id"));



CREATE POLICY "Users can update their own booking_details" ON "public"."booking_details" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."bookings" "b"
  WHERE (("b"."id" = "booking_details"."booking_id") AND ("b"."user_id" = "auth"."uid"()) AND ("b"."status" <> 'complete'::"public"."booking_status")))));



CREATE POLICY "Users can update their own memberships" ON "public"."memberships" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view booking_details in their organizations" ON "public"."booking_details" FOR SELECT USING ("public"."user_belongs_to_organization"("auth"."uid"(), "organization_id"));



CREATE POLICY "Users can view bookings in their organizations" ON "public"."bookings" FOR SELECT USING ("public"."user_belongs_to_organization"("auth"."uid"(), "organization_id"));



CREATE POLICY "Users can view chargeables from their organization" ON "public"."chargeables" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_organizations"
  WHERE (("user_organizations"."organization_id" = "chargeables"."organization_id") AND ("user_organizations"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view invoice items for their invoices" ON "public"."invoice_items" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."invoices"
  WHERE (("invoices"."id" = "invoice_items"."invoice_id") AND (("invoices"."user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."user_organizations"
          WHERE (("user_organizations"."organization_id" = "invoices"."organization_id") AND ("user_organizations"."user_id" = "auth"."uid"()) AND ("user_organizations"."role" = ANY (ARRAY['owner'::"public"."user_role", 'admin'::"public"."user_role", 'instructor'::"public"."user_role"]))))))))));



CREATE POLICY "Users can view lessons in their organizations" ON "public"."lessons" FOR SELECT USING ("public"."user_belongs_to_organization"("auth"."uid"(), "organization_id"));



CREATE POLICY "Users can view their own booking_details" ON "public"."booking_details" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."bookings" "b"
  WHERE (("b"."id" = "booking_details"."booking_id") AND (("b"."user_id" = "auth"."uid"()) OR ("b"."instructor_id" = "auth"."uid"()))))));



CREATE POLICY "Users can view their own bookings" ON "public"."bookings" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR ("instructor_id" = "auth"."uid"())));



CREATE POLICY "Users can view their own invoices" ON "public"."invoices" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."user_organizations"
  WHERE (("user_organizations"."organization_id" = "invoices"."organization_id") AND ("user_organizations"."user_id" = "auth"."uid"()) AND ("user_organizations"."role" = ANY (ARRAY['owner'::"public"."user_role", 'admin'::"public"."user_role", 'instructor'::"public"."user_role"])))))));



CREATE POLICY "Users can view their own memberships" ON "public"."memberships" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own payments" ON "public"."payments" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."invoices"
  WHERE (("invoices"."id" = "payments"."invoice_id") AND (("invoices"."user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."user_organizations"
          WHERE (("user_organizations"."organization_id" = "payments"."organization_id") AND ("user_organizations"."user_id" = "auth"."uid"()) AND ("user_organizations"."role" = ANY (ARRAY['owner'::"public"."user_role", 'admin'::"public"."user_role"]))))))))));



CREATE POLICY "Users can view their own transactions" ON "public"."transactions" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."user_organizations"
  WHERE (("user_organizations"."organization_id" = "transactions"."organization_id") AND ("user_organizations"."user_id" = "auth"."uid"()) AND ("user_organizations"."role" = ANY (ARRAY['owner'::"public"."user_role", 'admin'::"public"."user_role"])))))));



ALTER TABLE "public"."aircraft" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."aircraft_charge_rates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."aircraft_components" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."aircraft_tech_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."booking_details" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chargeables" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."equipment" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."flight_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."instructor_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invoice_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invoices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lessons" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."memberships" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."observation_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."observations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."transactions" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_flight_time"() TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_flight_time"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_flight_time"() TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_invoice_item_amounts"() TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_invoice_item_amounts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_invoice_item_amounts"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_user_role"("user_id" "uuid", "org_id" "uuid", "allowed_roles" "public"."user_role"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."check_user_role"("user_id" "uuid", "org_id" "uuid", "allowed_roles" "public"."user_role"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_user_role"("user_id" "uuid", "org_id" "uuid", "allowed_roles" "public"."user_role"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."equipment_update_summary"("org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."equipment_update_summary"("org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."equipment_update_summary"("org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_invoice_number"("org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_invoice_number"("org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_invoice_number"("org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_account_balance"("p_organization_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_account_balance"("p_organization_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_account_balance"("p_organization_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_booking_audit"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_booking_audit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_booking_audit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_double_booking_on_bookings"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_double_booking_on_bookings"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_double_booking_on_bookings"() TO "service_role";



GRANT ALL ON FUNCTION "public"."process_invoice_approval"() TO "anon";
GRANT ALL ON FUNCTION "public"."process_invoice_approval"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_invoice_approval"() TO "service_role";



GRANT ALL ON FUNCTION "public"."process_payment"("p_invoice_id" "uuid", "p_amount" numeric, "p_payment_method" "text", "p_payment_reference" "text", "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."process_payment"("p_invoice_id" "uuid", "p_amount" numeric, "p_payment_method" "text", "p_payment_reference" "text", "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_payment"("p_invoice_id" "uuid", "p_amount" numeric, "p_payment_method" "text", "p_payment_reference" "text", "p_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."process_refund"("p_payment_id" "uuid", "p_amount" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."process_refund"("p_payment_id" "uuid", "p_amount" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_refund"("p_payment_id" "uuid", "p_amount" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."process_refund"("p_payment_id" "uuid", "p_amount" numeric, "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."process_refund"("p_payment_id" "uuid", "p_amount" numeric, "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_refund"("p_payment_id" "uuid", "p_amount" numeric, "p_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."reverse_invoice_debit_transaction"() TO "anon";
GRANT ALL ON FUNCTION "public"."reverse_invoice_debit_transaction"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."reverse_invoice_debit_transaction"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_invoice_number"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_invoice_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_invoice_number"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_lesson_progress_attempt"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_lesson_progress_attempt"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_lesson_progress_attempt"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_invoice_debit_transaction"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_invoice_debit_transaction"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_invoice_debit_transaction"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_defects_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_defects_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_defects_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_instructors_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_instructors_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_instructors_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_invoice_balance_due"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_invoice_balance_due"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_invoice_balance_due"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_invoice_payment_totals"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_invoice_payment_totals"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_invoice_payment_totals"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_invoice_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_invoice_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_invoice_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_invoice_totals"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_invoice_totals"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_invoice_totals"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_transaction_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_transaction_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_transaction_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."user_belongs_to_organization"("uid" "uuid", "org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_belongs_to_organization"("uid" "uuid", "org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_belongs_to_organization"("uid" "uuid", "org_id" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."aircraft" TO "anon";
GRANT ALL ON TABLE "public"."aircraft" TO "authenticated";
GRANT ALL ON TABLE "public"."aircraft" TO "service_role";



GRANT ALL ON TABLE "public"."aircraft_charge_rates" TO "anon";
GRANT ALL ON TABLE "public"."aircraft_charge_rates" TO "authenticated";
GRANT ALL ON TABLE "public"."aircraft_charge_rates" TO "service_role";



GRANT ALL ON TABLE "public"."aircraft_components" TO "anon";
GRANT ALL ON TABLE "public"."aircraft_components" TO "authenticated";
GRANT ALL ON TABLE "public"."aircraft_components" TO "service_role";



GRANT ALL ON TABLE "public"."aircraft_tech_log" TO "anon";
GRANT ALL ON TABLE "public"."aircraft_tech_log" TO "authenticated";
GRANT ALL ON TABLE "public"."aircraft_tech_log" TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."booking_details" TO "anon";
GRANT ALL ON TABLE "public"."booking_details" TO "authenticated";
GRANT ALL ON TABLE "public"."booking_details" TO "service_role";



GRANT ALL ON TABLE "public"."bookings" TO "anon";
GRANT ALL ON TABLE "public"."bookings" TO "authenticated";
GRANT ALL ON TABLE "public"."bookings" TO "service_role";



GRANT ALL ON TABLE "public"."cancellation_categories" TO "anon";
GRANT ALL ON TABLE "public"."cancellation_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."cancellation_categories" TO "service_role";



GRANT ALL ON TABLE "public"."chargeables" TO "anon";
GRANT ALL ON TABLE "public"."chargeables" TO "authenticated";
GRANT ALL ON TABLE "public"."chargeables" TO "service_role";



GRANT ALL ON TABLE "public"."endorsements" TO "anon";
GRANT ALL ON TABLE "public"."endorsements" TO "authenticated";
GRANT ALL ON TABLE "public"."endorsements" TO "service_role";



GRANT ALL ON TABLE "public"."equipment" TO "anon";
GRANT ALL ON TABLE "public"."equipment" TO "authenticated";
GRANT ALL ON TABLE "public"."equipment" TO "service_role";



GRANT ALL ON TABLE "public"."equipment_issuance" TO "anon";
GRANT ALL ON TABLE "public"."equipment_issuance" TO "authenticated";
GRANT ALL ON TABLE "public"."equipment_issuance" TO "service_role";



GRANT ALL ON TABLE "public"."equipment_updates" TO "anon";
GRANT ALL ON TABLE "public"."equipment_updates" TO "authenticated";
GRANT ALL ON TABLE "public"."equipment_updates" TO "service_role";



GRANT ALL ON TABLE "public"."exam" TO "anon";
GRANT ALL ON TABLE "public"."exam" TO "authenticated";
GRANT ALL ON TABLE "public"."exam" TO "service_role";



GRANT ALL ON TABLE "public"."exam_results" TO "anon";
GRANT ALL ON TABLE "public"."exam_results" TO "authenticated";
GRANT ALL ON TABLE "public"."exam_results" TO "service_role";



GRANT ALL ON TABLE "public"."flight_types" TO "anon";
GRANT ALL ON TABLE "public"."flight_types" TO "authenticated";
GRANT ALL ON TABLE "public"."flight_types" TO "service_role";



GRANT ALL ON TABLE "public"."instructor_comments" TO "anon";
GRANT ALL ON TABLE "public"."instructor_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."instructor_comments" TO "service_role";



GRANT ALL ON TABLE "public"."instructor_endorsements" TO "anon";
GRANT ALL ON TABLE "public"."instructor_endorsements" TO "authenticated";
GRANT ALL ON TABLE "public"."instructor_endorsements" TO "service_role";



GRANT ALL ON TABLE "public"."instructor_flight_type_rates" TO "anon";
GRANT ALL ON TABLE "public"."instructor_flight_type_rates" TO "authenticated";
GRANT ALL ON TABLE "public"."instructor_flight_type_rates" TO "service_role";



GRANT ALL ON TABLE "public"."instructors" TO "anon";
GRANT ALL ON TABLE "public"."instructors" TO "authenticated";
GRANT ALL ON TABLE "public"."instructors" TO "service_role";



GRANT ALL ON TABLE "public"."invoice_items" TO "anon";
GRANT ALL ON TABLE "public"."invoice_items" TO "authenticated";
GRANT ALL ON TABLE "public"."invoice_items" TO "service_role";



GRANT ALL ON TABLE "public"."invoice_sequences" TO "anon";
GRANT ALL ON TABLE "public"."invoice_sequences" TO "authenticated";
GRANT ALL ON TABLE "public"."invoice_sequences" TO "service_role";



GRANT ALL ON TABLE "public"."invoices" TO "anon";
GRANT ALL ON TABLE "public"."invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."invoices" TO "service_role";



GRANT ALL ON TABLE "public"."lesson_progress" TO "anon";
GRANT ALL ON TABLE "public"."lesson_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."lesson_progress" TO "service_role";



GRANT ALL ON TABLE "public"."lessons" TO "anon";
GRANT ALL ON TABLE "public"."lessons" TO "authenticated";
GRANT ALL ON TABLE "public"."lessons" TO "service_role";



GRANT ALL ON TABLE "public"."maintenance_visits" TO "anon";
GRANT ALL ON TABLE "public"."maintenance_visits" TO "authenticated";
GRANT ALL ON TABLE "public"."maintenance_visits" TO "service_role";



GRANT ALL ON TABLE "public"."memberships" TO "anon";
GRANT ALL ON TABLE "public"."memberships" TO "authenticated";
GRANT ALL ON TABLE "public"."memberships" TO "service_role";



GRANT ALL ON TABLE "public"."observation_comments" TO "anon";
GRANT ALL ON TABLE "public"."observation_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."observation_comments" TO "service_role";



GRANT ALL ON TABLE "public"."observations" TO "anon";
GRANT ALL ON TABLE "public"."observations" TO "authenticated";
GRANT ALL ON TABLE "public"."observations" TO "service_role";



GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON TABLE "public"."permissions" TO "anon";
GRANT ALL ON TABLE "public"."permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."permissions" TO "service_role";



GRANT ALL ON TABLE "public"."role_permissions" TO "anon";
GRANT ALL ON TABLE "public"."role_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."role_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."roles" TO "anon";
GRANT ALL ON TABLE "public"."roles" TO "authenticated";
GRANT ALL ON TABLE "public"."roles" TO "service_role";



GRANT ALL ON TABLE "public"."student_syllabus_enrollment" TO "anon";
GRANT ALL ON TABLE "public"."student_syllabus_enrollment" TO "authenticated";
GRANT ALL ON TABLE "public"."student_syllabus_enrollment" TO "service_role";



GRANT ALL ON TABLE "public"."syllabus" TO "anon";
GRANT ALL ON TABLE "public"."syllabus" TO "authenticated";
GRANT ALL ON TABLE "public"."syllabus" TO "service_role";



GRANT ALL ON TABLE "public"."tax_rates" TO "anon";
GRANT ALL ON TABLE "public"."tax_rates" TO "authenticated";
GRANT ALL ON TABLE "public"."tax_rates" TO "service_role";



GRANT ALL ON TABLE "public"."transactions" TO "anon";
GRANT ALL ON TABLE "public"."transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."transactions" TO "service_role";



GRANT ALL ON TABLE "public"."user_organizations" TO "anon";
GRANT ALL ON TABLE "public"."user_organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."user_organizations" TO "service_role";



GRANT ALL ON TABLE "public"."user_permissions" TO "anon";
GRANT ALL ON TABLE "public"."user_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






RESET ALL;




-- AUTH TRIGGER
CREATE TRIGGER "on_auth_user_created" AFTER INSERT ON "auth"."users" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_user"(); 