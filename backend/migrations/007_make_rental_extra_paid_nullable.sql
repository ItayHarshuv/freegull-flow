ALTER TABLE rentals
ALTER COLUMN extra_paid DROP NOT NULL;

ALTER TABLE rentals
ALTER COLUMN extra_paid DROP DEFAULT;

UPDATE rentals
SET extra_paid = NULL
WHERE overdue_minutes IS NULL
  AND extra_paid = FALSE;
