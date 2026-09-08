ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
    ADD CONSTRAINT users_role_check CHECK (
        role IN (
            'SUPERUSER',
            'STUDENT',
            'DEPARTMENT_OFFICER',
            'FINANCE_OFFICER',
            'LIBRARY_OFFICER',
            'ICT_OFFICER',
            'ADMINISTRATOR',
            'ADMIN',
            'CONVOCATION_OFFICER',
            'GAMES_COACH',
            'HALL_WARDEN',
            'USAB_OFFICER',
            'DARUSO_OFFICER',
            'DEAN_OF_STUDENTS',
            'SMART_CARD_OFFICER',
            'WORKSHOP_OFFICER',
            'PRINCIPAL',
            'LABORATORY_OFFICER'
        )
    );
