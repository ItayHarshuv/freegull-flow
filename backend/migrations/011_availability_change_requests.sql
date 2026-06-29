ALTER TABLE shift_change_requests
  DROP CONSTRAINT IF EXISTS shift_change_requests_request_type_check;

ALTER TABLE shift_change_requests
  ADD CONSTRAINT shift_change_requests_request_type_check
  CHECK (request_type IN ('remove', 'time_change', 'availability_change'));
