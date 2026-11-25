/**
 * UDSM e-Clearance - Dashboard Inspection Accounts & Demo Clearance Data Seed
 * Creates 21 approved canonical accounts with shared temporary password.
 * Idempotent: checks for existing accounts before inserting or updating.
 */

if (process.env.NODE_ENV === 'production') {
  console.error('FATAL: Development inspection seeding script is disabled in production (NODE_ENV=production).');
  process.exit(1);
}

const crypto = require('crypto');
const { db } = require('../src/config/database');
const { hashPassword } = require('../src/utils/password');
const { ROLES } = require('../src/constants/roles');

const SHARED_PASSWORD = 'Clearance@2026!';

const ACCOUNTS = [
  {
    role: ROLES.SUPERUSER,
    email: 'superuser@example.test',
    username: 'superuser',
    first_name: 'Super',
    last_name: 'User',
    full_name: 'System Superuser'
  },
  {
    role: ROLES.ADMINISTRATOR,
    email: 'administrator@example.test',
    username: 'administrator',
    first_name: 'Central',
    last_name: 'Administrator',
    full_name: 'System Administrator'
  },
  {
    role: ROLES.ADMIN,
    email: 'admin@example.test',
    username: 'admin',
    first_name: 'Admin',
    last_name: 'Officer',
    full_name: 'Clearance Admin'
  },
  {
    role: ROLES.STUDENT,
    email: 'student@example.test',
    username: 'student',
    registration_number: '2022-04-01234',
    first_name: 'Baraka',
    last_name: 'Mussa',
    full_name: 'Baraka Juma Mussa',
    programme: 'BSc in Electrical Engineering',
    college: 'CoET',
    department: 'Electrical Engineering',
    academic_year: '2025/2026',
    graduation_year: '2026',
    year_of_study: '4',
    hall: 'Hall 5'
  },
  {
    role: ROLES.CONVOCATION_OFFICER,
    email: 'convocation@example.test',
    username: 'convocation_officer',
    first_name: 'Amina',
    last_name: 'Makame',
    full_name: 'Amina Makame (Convocation Officer)'
  },
  {
    role: ROLES.GAMES_COACH,
    email: 'games.coach@example.test',
    username: 'games_coach',
    first_name: 'Juma',
    last_name: 'Shabani',
    full_name: 'Juma Shabani (Games Coach)'
  },
  {
    role: ROLES.HALL_WARDEN,
    email: 'hall.warden@example.test',
    username: 'hall_warden',
    first_name: 'Edward',
    last_name: 'Mrema',
    full_name: 'Edward Mrema (Hall Warden - Hall 5)',
    hall: 'Hall 5'
  },
  {
    role: ROLES.USAB_OFFICER,
    email: 'usab@example.test',
    username: 'usab_officer',
    first_name: 'Rehema',
    last_name: 'Kessy',
    full_name: 'Rehema Kessy (USAB Officer)'
  },
  {
    role: ROLES.DARUSO_OFFICER,
    email: 'daruso@example.test',
    username: 'daruso_officer',
    first_name: 'Emmanuel',
    last_name: 'Kiwelu',
    full_name: 'Emmanuel Kiwelu (DARUSO Officer)'
  },
  {
    role: ROLES.LIBRARY_OFFICER,
    email: 'library@example.test',
    username: 'library_officer',
    first_name: 'Grace',
    last_name: 'Mvungi',
    full_name: 'Grace Mvungi (Library Officer)'
  },
  {
    role: ROLES.DEAN_OF_STUDENTS,
    email: 'dean.students@example.test',
    username: 'dean_of_students',
    first_name: 'Paul',
    last_name: 'Mollel',
    full_name: 'Dr. Paul Mollel (Dean of Students)'
  },
  {
    role: ROLES.SMART_CARD_OFFICER,
    email: 'smart.card@example.test',
    username: 'smart_card_officer',
    first_name: 'Farida',
    last_name: 'Bakari',
    full_name: 'Farida Bakari (Smart Card Officer)'
  },
  {
    role: ROLES.WORKSHOP_OFFICER,
    email: 'workshop@example.test',
    username: 'workshop_officer',
    first_name: 'Godfrey',
    last_name: 'Temba',
    full_name: 'Eng. Godfrey Temba (Workshop Officer)',
    college: 'CoET',
    department: 'Mechanical and Industrial Engineering'
  },
  {
    role: ROLES.LABORATORY_OFFICER,
    email: 'laboratory@example.test',
    username: 'laboratory_officer',
    first_name: 'Neema',
    last_name: 'Chacha',
    full_name: 'Neema Chacha (Laboratory Officer)',
    college: 'CoET',
    department: 'Chemical and Process Engineering'
  },
  {
    role: ROLES.LECTURER,
    email: 'lecturer@example.test',
    username: 'lecturer',
    first_name: 'Daudi',
    last_name: 'Lymo',
    full_name: 'Dr. Daudi Lymo (Lecturer)',
    college: 'CoET',
    department: 'Electrical Engineering'
  },
  {
    role: ROLES.DEPARTMENT_OFFICER,
    email: 'department.officer@example.test',
    username: 'department_officer',
    first_name: 'Hassan',
    last_name: 'Mchome',
    full_name: 'Prof. Hassan Mchome (Department Officer)',
    college: 'CoET',
    department: 'Electrical Engineering'
  },
  {
    role: ROLES.PRINCIPAL,
    email: 'principal@example.test',
    username: 'principal',
    first_name: 'Bakari',
    last_name: 'Mwinyi',
    full_name: 'Prof. Bakari Mwinyi (Principal, CoET)',
    college: 'CoET'
  },
  {
    role: ROLES.FINANCE_OFFICER,
    email: 'finance@example.test',
    username: 'finance_officer',
    first_name: 'Salome',
    last_name: 'Kitundu',
    full_name: 'Salome Kitundu (Finance Officer)'
  },
  {
    role: ROLES.ACADEMIC_STAFF,
    email: 'academic.staff@example.test',
    username: 'academic_staff',
    first_name: 'Zuberi',
    last_name: 'Nassor',
    full_name: 'Zuberi Nassor (Academic Staff)',
    college: 'CoET',
    department: 'Electrical Engineering'
  },
  {
    role: ROLES.DIRECTOR_OF_UNDERGRADUATE_STUDIES,
    email: 'dus@example.test',
    username: 'dus',
    first_name: 'John',
    last_name: 'Mtei',
    full_name: 'Dr. John Mtei (Director of Undergraduate Studies)'
  },
  {
    role: ROLES.DUS_SECRETARY,
    email: 'dus.secretary@example.test',
    username: 'dus_secretary',
    first_name: 'Mary',
    last_name: 'Maswe',
    full_name: 'Mary Maswe (DUS Secretary)',
    station_code: 'DUS-HQ',
    station_name: 'DUS Central Administration Desk'
  }
];

// Additional demo students to provide active workflow requests across stages
const DEMO_STUDENTS = [
  {
    email: 'aisha.ramadhani@example.test',
    username: 'aisha_ramadhani',
    registration_number: '2022-04-05678',
    first_name: 'Aisha',
    last_name: 'Ramadhani',
    full_name: 'Aisha Selemani Ramadhani',
    programme: 'BSc in Electrical Engineering',
    college: 'CoET',
    department: 'Electrical Engineering',
    academic_year: '2025/2026',
    graduation_year: '2026',
    year_of_study: '4',
    hall: 'Hall 5'
  },
  {
    email: 'kelvin.massawe@example.test',
    username: 'kelvin_massawe',
    registration_number: '2021-04-09876',
    first_name: 'Kelvin',
    last_name: 'Massawe',
    full_name: 'Kelvin Prosper Massawe',
    programme: 'BSc in Electrical Engineering',
    college: 'CoET',
    department: 'Electrical Engineering',
    academic_year: '2024/2025',
    graduation_year: '2025',
    year_of_study: '4',
    hall: 'Hall 5'
  }
];

const ALL_OFFICES = [
  'CONVOCATION',
  'LIBRARY',
  'GAMES_COACH',
  'HALL_WARDEN',
  'USAB',
  'DARUSO',
  'DEAN_OF_STUDENTS',
  'SMART_CARD',
  'WORKSHOP',
  'LABORATORY',
  'DEPARTMENT',
  'PRINCIPAL',
  'FINANCE'
];

async function seed() {
  console.log('--- Seeding 21 Inspection Accounts & Demo Data into clearance_db ---');

  const hashedPassword = await hashPassword(SHARED_PASSWORD);
  console.log('Password hashed successfully with BCrypt ($2a$10$)');

  // 1. Seed 21 Accounts
  for (const acc of ACCOUNTS) {
    const existing = await db('users').where({ email: acc.email }).first();

    const userData = {
      username: acc.username,
      email: acc.email,
      password: hashedPassword,
      first_name: acc.first_name,
      last_name: acc.last_name,
      full_name: acc.full_name,
      role: acc.role,
      registration_number: acc.registration_number || null,
      programme: acc.programme || null,
      college: acc.college || null,
      department: acc.department || null,
      academic_year: acc.academic_year || null,
      graduation_year: acc.graduation_year || null,
      year_of_study: acc.year_of_study || null,
      hall: acc.hall || null,
      station_code: acc.station_code || null,
      station_name: acc.station_name || null,
      is_active: 1,
      is_email_verified: 1,
      is_locked: 0,
      updated_at: new Date()
    };

    let userId;
    if (existing) {
      userId = existing.id;
      await db('users').where({ id: userId }).update(userData);
      console.log(`Updated existing account: ${acc.email} (${acc.role})`);
    } else {
      userId = crypto.randomUUID();
      await db('users').insert({
        id: userId,
        ...userData,
        created_at: new Date()
      });
      console.log(`Created account: ${acc.email} (${acc.role})`);
    }

    // If student, ensure students table record exists
    if (acc.role === ROLES.STUDENT && acc.registration_number) {
      const existingStudent = await db('students').where({ registration_number: acc.registration_number }).first();
      const studentData = {
        registration_number: acc.registration_number,
        full_name: acc.full_name,
        email: acc.email,
        programme: acc.programme,
        college: acc.college,
        department: acc.department,
        academic_year: acc.academic_year,
        graduation_year: acc.graduation_year,
        year_of_study: acc.year_of_study,
        hall: acc.hall,
        user_id: userId,
        updated_at: new Date()
      };

      if (existingStudent) {
        await db('students').where({ id: existingStudent.id }).update(studentData);
      } else {
        await db('students').insert({
          id: crypto.randomUUID(),
          ...studentData,
          created_at: new Date()
        });
      }
    }
  }

  // 2. Seed Demo Students
  const demoStudentIds = {};
  for (const s of DEMO_STUDENTS) {
    let u = await db('users').where({ email: s.email }).first();
    let uId;
    const uData = {
      username: s.username,
      email: s.email,
      password: hashedPassword,
      first_name: s.first_name,
      last_name: s.last_name,
      full_name: s.full_name,
      role: ROLES.STUDENT,
      registration_number: s.registration_number,
      programme: s.programme,
      college: s.college,
      department: s.department,
      academic_year: s.academic_year,
      graduation_year: s.graduation_year,
      year_of_study: s.year_of_study,
      hall: s.hall,
      is_active: 1,
      is_email_verified: 1,
      is_locked: 0,
      updated_at: new Date()
    };
    if (u) {
      uId = u.id;
      await db('users').where({ id: uId }).update(uData);
    } else {
      uId = crypto.randomUUID();
      await db('users').insert({ id: uId, ...uData, created_at: new Date() });
    }

    let st = await db('students').where({ registration_number: s.registration_number }).first();
    let stId;
    const stData = {
      registration_number: s.registration_number,
      full_name: s.full_name,
      email: s.email,
      programme: s.programme,
      college: s.college,
      department: s.department,
      academic_year: s.academic_year,
      graduation_year: s.graduation_year,
      year_of_study: s.year_of_study,
      hall: s.hall,
      user_id: uId,
      updated_at: new Date()
    };
    if (st) {
      stId = st.id;
      await db('students').where({ id: stId }).update(stData);
    } else {
      stId = crypto.randomUUID();
      await db('students').insert({ id: stId, ...stData, created_at: new Date() });
    }
    demoStudentIds[s.registration_number] = { userId: uId, studentId: stId };
  }

  // Also get main student's ID
  const mainStudent = await db('students').where({ registration_number: '2022-04-01234' }).first();
  if (mainStudent) {
    demoStudentIds['2022-04-01234'] = { studentId: mainStudent.id };
  }

  // 3. Seed Clearance Requests & Approvals for Inspection
  // Request 1: Main student (Baraka) -> STAGE 1 (Convocation Pending)
  const bStudentId = demoStudentIds['2022-04-01234'].studentId;
  let req1 = await db('clearance_requests').where({ student_id: bStudentId }).first();
  if (!req1) {
    const [insertedId] = await db('clearance_requests').insert({
      student_id: bStudentId,
      status: 'IN_PROGRESS',
      current_stage: 'CONVOCATION',
      current_office: 'CONVOCATION',
      college: 'CoET',
      department: 'Electrical Engineering',
      programme: 'BSc in Electrical Engineering',
      submitted_at: new Date(),
      updated_at: new Date()
    });
    req1 = { id: insertedId };

    // Insert approvals
    let order = 1;
    for (const off of ALL_OFFICES) {
      await db('department_approvals').insert({
        clearance_request_id: req1.id,
        department: off,
        status: 'PENDING',
        order_number: order++
      });
    }
    console.log(`Created Stage 1 clearance request for Baraka Mussa (ID: ${req1.id})`);
  }

  // Request 2: Aisha Ramadhani -> STAGE 2 (Convocation Approved, Parallel Offices PENDING)
  const aStudentId = demoStudentIds['2022-04-05678'].studentId;
  let req2 = await db('clearance_requests').where({ student_id: aStudentId }).first();
  if (!req2) {
    const [insertedId] = await db('clearance_requests').insert({
      student_id: aStudentId,
      status: 'IN_PROGRESS',
      current_stage: 'PARALLEL_OFFICES',
      current_office: 'PARALLEL',
      college: 'CoET',
      department: 'Electrical Engineering',
      programme: 'BSc in Electrical Engineering',
      submitted_at: new Date(),
      updated_at: new Date()
    });
    req2 = { id: insertedId };

    let order = 1;
    for (const off of ALL_OFFICES) {
      const isConvo = off === 'CONVOCATION';
      await db('department_approvals').insert({
        clearance_request_id: req2.id,
        department: off,
        status: isConvo ? 'APPROVED' : 'PENDING',
        approved_by: isConvo ? 'Amina Makame (Convocation Officer)' : null,
        approval_date: isConvo ? new Date() : null,
        comments: isConvo ? 'Convocation fee verified and cleared.' : null,
        order_number: order++
      });
    }
    console.log(`Created Stage 2 clearance request for Aisha Ramadhani (ID: ${req2.id}) - Parallel offices pending`);
  }

  // Request 3: Kelvin Massawe -> COMPLETED (All 13 Offices Approved + Certificate)
  const kStudentId = demoStudentIds['2021-04-09876'].studentId;
  let req3 = await db('clearance_requests').where({ student_id: kStudentId }).first();
  if (!req3) {
    const [insertedId] = await db('clearance_requests').insert({
      student_id: kStudentId,
      status: 'COMPLETED',
      current_stage: 'COMPLETED',
      current_office: 'COMPLETED',
      college: 'CoET',
      department: 'Electrical Engineering',
      programme: 'BSc in Electrical Engineering',
      submitted_at: new Date(),
      updated_at: new Date()
    });
    req3 = { id: insertedId };

    let order = 1;
    for (const off of ALL_OFFICES) {
      await db('department_approvals').insert({
        clearance_request_id: req3.id,
        department: off,
        status: 'APPROVED',
        approved_by: 'Staff Officer',
        approval_date: new Date(),
        comments: 'Approved and cleared.',
        order_number: order++
      });
    }

    // Insert Certificate record
    const certCode = crypto.randomBytes(24).toString('hex');
    await db('clearance_certificates').insert({
      id: crypto.randomUUID(),
      clearance_request_id: req3.id,
      student_id: kStudentId,
      certificate_number: 'UDSM-CLR-2026-0001',
      verification_code: certCode,
      digital_signature_hash: crypto.randomBytes(32).toString('hex'),
      issued_at: new Date(),
      issued_by: 'Director of Undergraduate Studies',
      is_revoked: 0,
      certificate_data: JSON.stringify({
        fullName: 'Kelvin Prosper Massawe',
        registrationNumber: '2021-04-09876',
        programme: 'BSc in Electrical Engineering',
        college: 'CoET',
        department: 'Electrical Engineering'
      }),
      created_at: new Date(),
      updated_at: new Date()
    });
    console.log(`Created Completed clearance request & certificate for Kelvin Massawe (ID: ${req3.id}, Code: ${certCode})`);
  }

  console.log('\n--- Seeding Completed Successfully ---');
  await db.destroy();
}

seed().catch(err => {
  console.error('Seeding error:', err);
  process.exit(1);
});
