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
