ALTER TABLE lessons
  DROP COLUMN IF EXISTS credit_card_number,
  DROP COLUMN IF EXISTS credit_card_expiry,
  DROP COLUMN IF EXISTS credit_card_cvv,
  DROP COLUMN IF EXISTS credit_card_owner_id;

ALTER TABLE event_participants
  DROP COLUMN IF EXISTS credit_card_number,
  DROP COLUMN IF EXISTS credit_card_expiry,
  DROP COLUMN IF EXISTS credit_card_cvv,
  DROP COLUMN IF EXISTS credit_card_owner_id;
