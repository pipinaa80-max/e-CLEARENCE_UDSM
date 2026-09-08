UPDATE users
SET is_email_verified = TRUE,
    updated_at = CURRENT_TIMESTAMP
WHERE role IN ('ADMIN', 'ADMINISTRATOR')
  AND is_active = TRUE
  AND is_email_verified = FALSE;
