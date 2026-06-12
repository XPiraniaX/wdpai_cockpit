-- Development/testing helper.
-- Reopens all active vehicles for admin approval so the moderation queue can be tested
-- on multiple records at once.

WITH ordered_vehicles AS (
    SELECT
        id,
        ROW_NUMBER() OVER (ORDER BY id ASC) AS queue_position,
        COUNT(*) OVER () AS vehicle_count
    FROM vehicles
    WHERE status = 'active'
)
UPDATE vehicles v
SET
    approval_status = 'pending',
    approval_submitted_at = CURRENT_TIMESTAMP - ((ordered_vehicles.vehicle_count - ordered_vehicles.queue_position) * INTERVAL '1 minute'),
    approval_rejected_at = NULL,
    approval_rejection_reason = NULL,
    approval_rejection_fields_json = NULL,
    approval_correction_due_at = NULL,
    approval_reviewed_at = NULL
FROM ordered_vehicles
WHERE ordered_vehicles.id = v.id;
