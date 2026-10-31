-- Ensure foreign key from department_approvals to clearance_requests cascades on delete
ALTER TABLE department_approvals DROP CONSTRAINT IF EXISTS fk_department_approvals_request;
ALTER TABLE department_approvals
    ADD CONSTRAINT fk_department_approvals_request
    FOREIGN KEY (clearance_request_id) REFERENCES clearance_requests (id) ON DELETE CASCADE;

-- Ensure foreign key from clearance_requests to students cascades on delete
ALTER TABLE clearance_requests DROP CONSTRAINT IF EXISTS fk_clearance_requests_student;
ALTER TABLE clearance_requests
    ADD CONSTRAINT fk_clearance_requests_student
    FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE;

-- Ensure foreign key from documents to students cascades on delete
ALTER TABLE documents DROP CONSTRAINT IF EXISTS fk_documents_student;
ALTER TABLE documents
    ADD CONSTRAINT fk_documents_student
    FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE;

-- Ensure foreign key from notifications to students cascades on delete
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS fk_notifications_student;
ALTER TABLE notifications
    ADD CONSTRAINT fk_notifications_student
    FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE;

-- Ensure foreign key from notifications to users cascades on delete
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS fk_notifications_user;
ALTER TABLE notifications
    ADD CONSTRAINT fk_notifications_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;

-- Ensure foreign key from students to users cascades on delete
ALTER TABLE students DROP CONSTRAINT IF EXISTS fk_students_user;
ALTER TABLE students
    ADD CONSTRAINT fk_students_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;
