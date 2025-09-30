-- Pre-Migration Verification Script
-- Run this BEFORE disabling triggers to verify calculations are consistent

-- Create temporary verification table
CREATE TEMP TABLE calculation_verification (
    invoice_id UUID,
    item_id UUID,
    description TEXT,
    quantity NUMERIC,
    unit_price NUMERIC,
    tax_rate NUMERIC,

    -- Current database values (calculated by triggers)
    db_amount NUMERIC,
    db_tax_amount NUMERIC,
    db_line_total NUMERIC,
    db_rate_inclusive NUMERIC,

    -- Application calculated values
    app_amount NUMERIC,
    app_tax_amount NUMERIC,
    app_line_total NUMERIC,
    app_rate_inclusive NUMERIC,

    -- Differences
    amount_diff NUMERIC,
    tax_diff NUMERIC,
    total_diff NUMERIC,
    rate_diff NUMERIC,

    -- Status
    matches BOOLEAN,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Function to calculate using application logic (simulated)
CREATE OR REPLACE FUNCTION app_calculate_item_amounts(
    p_quantity NUMERIC,
    p_unit_price NUMERIC,
    p_tax_rate NUMERIC
) RETURNS RECORD AS $$
DECLARE
    result RECORD;
    amount NUMERIC;
    tax_amount NUMERIC;
    line_total NUMERIC;
    rate_inclusive NUMERIC;
BEGIN
    -- Simulate the application logic from InvoiceService.calculateItemAmounts
    amount := ROUND(p_quantity * p_unit_price, 2);
    tax_amount := ROUND(amount * p_tax_rate, 2);
    line_total := ROUND(amount + tax_amount, 2);
    rate_inclusive := ROUND(p_unit_price * (1 + p_tax_rate), 2);

    SELECT amount, tax_amount, line_total, rate_inclusive INTO result;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Populate verification table with sample of recent invoice items
INSERT INTO calculation_verification (
    invoice_id, item_id, description, quantity, unit_price, tax_rate,
    db_amount, db_tax_amount, db_line_total, db_rate_inclusive
)
SELECT
    ii.invoice_id,
    ii.id,
    ii.description,
    ii.quantity,
    ii.unit_price,
    ii.tax_rate,
    ii.amount,
    ii.tax_amount,
    ii.line_total,
    ii.rate_inclusive
FROM invoice_items ii
WHERE ii.created_at >= NOW() - INTERVAL '30 days'
LIMIT 100;

-- Calculate application values and update verification table
DO $$
DECLARE
    rec RECORD;
    calc_result RECORD;
BEGIN
    FOR rec IN SELECT * FROM calculation_verification LOOP
        SELECT * FROM app_calculate_item_amounts(rec.quantity, rec.unit_price, rec.tax_rate) AS (
            amount NUMERIC, tax_amount NUMERIC, line_total NUMERIC, rate_inclusive NUMERIC
        ) INTO calc_result;

        UPDATE calculation_verification SET
            app_amount = calc_result.amount,
            app_tax_amount = calc_result.tax_amount,
            app_line_total = calc_result.line_total,
            app_rate_inclusive = calc_result.rate_inclusive,
            amount_diff = ABS(db_amount - calc_result.amount),
            tax_diff = ABS(db_tax_amount - calc_result.tax_amount),
            total_diff = ABS(db_line_total - calc_result.line_total),
            rate_diff = ABS(db_rate_inclusive - calc_result.rate_inclusive),
            matches = (
                ABS(db_amount - calc_result.amount) < 0.01 AND
                ABS(db_tax_amount - calc_result.tax_amount) < 0.01 AND
                ABS(db_line_total - calc_result.line_total) < 0.01 AND
                ABS(db_rate_inclusive - calc_result.rate_inclusive) < 0.01
            )
        WHERE item_id = rec.item_id;
    END LOOP;
END $$;

-- Generate verification report
SELECT
    'VERIFICATION SUMMARY' as report_section,
    COUNT(*) as total_items_checked,
    COUNT(*) FILTER (WHERE matches = true) as matching_calculations,
    COUNT(*) FILTER (WHERE matches = false) as mismatched_calculations,
    ROUND(AVG(amount_diff), 4) as avg_amount_difference,
    ROUND(AVG(tax_diff), 4) as avg_tax_difference,
    ROUND(AVG(total_diff), 4) as avg_total_difference,
    ROUND(MAX(amount_diff), 4) as max_amount_difference,
    ROUND(MAX(tax_diff), 4) as max_tax_difference,
    ROUND(MAX(total_diff), 4) as max_total_difference
FROM calculation_verification;

-- Show any significant mismatches
SELECT
    'CALCULATION MISMATCHES' as report_section,
    item_id,
    description,
    quantity,
    unit_price,
    tax_rate,
    db_amount,
    app_amount,
    amount_diff,
    db_tax_amount,
    app_tax_amount,
    tax_diff,
    db_line_total,
    app_line_total,
    total_diff
FROM calculation_verification
WHERE matches = false
ORDER BY total_diff DESC;

-- Clean up
DROP FUNCTION IF EXISTS app_calculate_item_amounts(NUMERIC, NUMERIC, NUMERIC);

-- Instructions
SELECT
    'NEXT STEPS' as instructions,
    CASE
        WHEN (SELECT COUNT(*) FILTER (WHERE matches = false) FROM calculation_verification) = 0
        THEN 'ALL CALCULATIONS MATCH! Safe to proceed with trigger removal.'
        WHEN (SELECT MAX(total_diff) FROM calculation_verification) < 0.05
        THEN 'Minor differences found (< 5 cents). Review mismatches but likely safe to proceed.'
        ELSE 'SIGNIFICANT DIFFERENCES FOUND! DO NOT proceed with trigger removal until issues are resolved.'
    END as recommendation;