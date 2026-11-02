-- Ensure superuser account has SUPERUSER role, active status, and verified email
UPDATE users
SET role = 'SUPERUSER', is_active = true, is_email_verified = true
WHERE LOWER(email) = 'superuser@admin.local';
