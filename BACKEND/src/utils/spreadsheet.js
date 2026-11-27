const ExcelJS = require('exceljs');

const EXPORT_HEADERS = [
  'SN', 'Registration', 'Password', 'First Name', 'Other Name', 'Surname', 'Gender',
  'Programme', 'GPA', 'Classification', 'Qualification', 'Prefix', 'Campus',
  'Color', 'College', 'Department', 'Role', 'Email', 'Phone', 'Added By', 'Reason', 'DUS COMMENT'
];

const STUDENT_TEMPLATE_HEADERS = [
  'First Name', 'Middle Name', 'Last Name', 'Email', 'Role',
  'Registration Number', 'Password', 'College', 'Department', 'Programme', 'Award', 'Phone'
];

const STAFF_TEMPLATE_HEADERS = [
  'First Name', 'Middle Name', 'Last Name', 'Email', 'Role',
  'Staff ID (PF Number)', 'Password', 'College', 'Department', 'Phone'
];

const DEBT_FLAG_TEMPLATE_HEADERS = [
  'Registration Number', 'Student Name', 'Category', 'Amount', 'Reason', 'Due Date', 'Negotiation Notes'
];

function parseCsvLine(line) {
  const tokens = [];
  let sb = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        sb += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      tokens.push(sb.trim());
      sb = '';
    } else {
      sb += c;
    }
  }
  tokens.push(sb.trim());
  return tokens;
}

function mapHeaders(headers) {
  const map = {};
  for (let i = 0; i < headers.length; i++) {
    if (!headers[i]) continue;
    const h = String(headers[i]).toLowerCase().replace(/[^a-z0-9]/g, '');

    if (
      h.includes('reg') || h.includes('matric') || h.includes('staffid') ||
      h.includes('pfno') || h.includes('pfnumber') || h === 'id' ||
      h.includes('studentid') || h.includes('employeeid') || h.includes('fileno')
    ) {
      if (map.reg === undefined) map.reg = i;
    } else if (h.includes('first') || h === 'fname' || h === 'givenname') {
      if (map.firstName === undefined) map.firstName = i;
    } else if (h.includes('other') || h.includes('middle') || h === 'mname' || h.includes('secondname')) {
      if (map.middleName === undefined) map.middleName = i;
    } else if (h.includes('sur') || h.includes('last') || h === 'lname' || h.includes('familyname')) {
      if (map.lastName === undefined) map.lastName = i;
    } else if (h.includes('fullname') || h === 'name' || h === 'names' || h.includes('studentname') || h.includes('staffname')) {
      if (map.fullName === undefined) map.fullName = i;
    } else if (h.includes('email') || h.includes('mail')) {
      if (map.email === undefined) map.email = i;
    } else if (h.includes('role') || h.includes('designation') || h.includes('position') || h.includes('usertype')) {
      if (map.role === undefined) map.role = i;
    } else if (h.includes('pass') || h.includes('pwd')) {
      if (map.password === undefined) map.password = i;
    } else if (h.includes('colleg') || h.includes('facult') || h.includes('school') || h.includes('institution')) {
      if (map.college === undefined) map.college = i;
    } else if (h.includes('dept') || h.includes('department') || h.includes('unit') || h.includes('section')) {
      if (map.department === undefined) map.department = i;
    } else if (h.includes('prog') || h.includes('course') || h.includes('degree') || h.includes('major')) {
      if (map.programme === undefined) map.programme = i;
    } else if (h.includes('award') || h.includes('qualification') || h === 'level' || h.includes('studylevel') || h.includes('degreetype')) {
      if (map.award === undefined) map.award = i;
    } else if (h.includes('postgrad') || h === 'ispostgraduate' || h === 'pg') {
      if (map.isPostgraduate === undefined) map.isPostgraduate = i;
    } else if (h.includes('phone') || h.includes('mobile') || h.includes('tel') || h.includes('contact')) {
      if (map.phone === undefined) map.phone = i;
    } else if (h.includes('year') || h.includes('cohort')) {
      if (map.year === undefined) map.year = i;
    }
  }
  return map;
}

function getVal(data, index) {
  if (index === undefined || index === null || index < 0 || index >= data.length) return '';
  if (data[index] === undefined || data[index] === null) return '';
  const v = String(data[index]).trim();
  if (/^(null|n\/a|-)$/i.test(v)) return '';
  return v;
}

function getDefaultUnitName(roleUpper) {
  if (!roleUpper) return 'University Administration';
  if (roleUpper.includes('LIBRARY')) return 'Library Services';
  if (roleUpper.includes('FINANCE')) return 'Bursar & Treasury';
  if (roleUpper.includes('ICT')) return 'Centre for Information and Communication Technology';
  if (roleUpper.includes('CONVOCATION')) return 'Convocation Relations';
  if (roleUpper.includes('GAMES') || roleUpper.includes('COACH')) return 'Sports and Games Department';
  if (roleUpper.includes('WARDEN') || roleUpper.includes('HALL') || roleUpper.includes('USAB')) return 'Accommodation Bureau (USAB)';
  if (roleUpper.includes('DARUSO')) return 'DARUSO Student Union';
  if (roleUpper.includes('DEAN')) return 'Dean of Students Office';
  if (roleUpper.includes('SMART')) return 'Smart Card Unit';
  if (roleUpper.includes('POSTGRADUATE') || roleUpper.includes('DPGS')) return 'Directorate of Postgraduate Studies';
  if (roleUpper.includes('DUS') || roleUpper.includes('UNDERGRADUATE')) return 'Directorate of Undergraduate Studies';
  if (roleUpper.includes('SUPERVISOR')) return 'Postgraduate Research Studies';
  return 'University Administration';
}

function simpleHashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function buildUserRequestFromRow(data, headerMap, uploadType = 'STUDENT') {
  const req = {};

  if (
    headerMap.firstName !== undefined ||
    headerMap.reg !== undefined ||
    headerMap.fullName !== undefined ||
    headerMap.email !== undefined
  ) {
    let first = getVal(data, headerMap.firstName);
    let middle = getVal(data, headerMap.middleName);
    let last = getVal(data, headerMap.lastName);

    if (!first && headerMap.fullName !== undefined) {
      const full = getVal(data, headerMap.fullName);
      if (full) {
        const parts = full.split(/\s+/);
        if (parts.length === 1) {
          first = parts[0];
          last = parts[0];
        } else if (parts.length === 2) {
          first = parts[0];
          last = parts[1];
        } else {
          first = parts[0];
          middle = parts[1];
          last = parts.slice(2).join(' ');
        }
      }
    }

    req.firstName = first;
    req.middleName = middle;
    req.lastName = last;
    req.registrationNumber = getVal(data, headerMap.reg);
    req.email = getVal(data, headerMap.email);
    req.role = getVal(data, headerMap.role);
    req.password = getVal(data, headerMap.password);
    req.college = getVal(data, headerMap.college);
    req.faculty = req.college;
    req.department = getVal(data, headerMap.department);
    req.programme = getVal(data, headerMap.programme);
    req.award = getVal(data, headerMap.award);
    const rawPgFlag = getVal(data, headerMap.isPostgraduate);
    if (rawPgFlag) {
      req.isPostgraduate = /^(true|1|yes|y|pg|postgraduate)$/i.test(rawPgFlag);
    }
    req.phone = getVal(data, headerMap.phone);
    req.yearOfStudy = getVal(data, headerMap.year);
  } else {
    // Positional fallback matching manual registration fields
    req.firstName = getVal(data, 0);
    req.middleName = getVal(data, 1);
    req.lastName = getVal(data, 2);
    req.email = getVal(data, 3);
    req.role = getVal(data, 4);
    req.registrationNumber = getVal(data, 5);
    req.password = getVal(data, 6);
    req.college = getVal(data, 7);
    req.faculty = req.college;
    req.department = getVal(data, 8);
    req.programme = getVal(data, 9);
    if (data.length > 11) {
      req.award = getVal(data, 10);
      req.phone = getVal(data, 11);
    } else if (data.length > 10) {
      req.phone = getVal(data, 10);
    }
  }

  // Auto-generate email if missing
  if (!req.email) {
    const f = req.firstName ? req.firstName.toLowerCase().replace(/[^a-z0-9]/g, '') : 'user';
    const l = req.lastName ? req.lastName.toLowerCase().replace(/[^a-z0-9]/g, '') : 'udsm';
    req.email = `${f}.${l}@udsm.ac.tz`;
  }

  // Infer role from registration / staff PF prefix if missing
  const reg = req.registrationNumber ? req.registrationNumber.toUpperCase().trim() : '';
  if (!req.role) {
    if (reg.startsWith('STF') || reg.startsWith('PF')) {
      if (reg.includes('LIB')) req.role = 'LIBRARY';
      else if (reg.includes('SPO') || reg.includes('GAMES')) req.role = 'GAMES_COACH';
      else if (reg.includes('WRD') || reg.includes('HALL')) req.role = 'HALL_WARDEN';
      else if (reg.includes('USB') || reg.includes('USAB')) req.role = 'USAB';
      else if (reg.includes('DAR')) req.role = 'DARUSO';
      else if (reg.includes('DOS') || reg.includes('DEAN')) req.role = 'DEAN_OF_STUDENTS';
      else if (reg.includes('SMC') || reg.includes('CARD') || reg.includes('ICT')) req.role = 'SMART_CARD';
      else if (reg.includes('DPT')) req.role = 'DEPARTMENT';
      else if (reg.includes('PRN') || reg.includes('PRIN')) req.role = 'PRINCIPAL';
      else if (reg.includes('FIN') || reg.includes('BUR')) req.role = 'FINANCE';
      else if (reg.includes('LEC')) req.role = 'LECTURER';
      else if (reg.includes('SUP')) req.role = 'SUPERVISOR';
      else if (reg.includes('DPG')) req.role = 'DPGS';
      else if (reg.includes('DUS')) req.role = 'DUS';
      else if (reg.includes('ADM')) req.role = 'ADMIN';
      else req.role = 'ACADEMIC_STAFF';
    } else {
      req.role = String(uploadType || '').toUpperCase() === 'STAFF' ? 'ACADEMIC_STAFF' : 'STUDENT';
    }
  }

  // Automatic role-specific field trimming matching Spring Boot rules
  const roleUpper = req.role.toUpperCase().trim().replace(/\s+/g, '_');
  const isStudent = roleUpper === 'STUDENT';
  const isPrincipal = roleUpper === 'PRINCIPAL';
  const isCentralOffice =
    roleUpper.includes('LIBRARY') || roleUpper.includes('FINANCE') ||
    roleUpper.includes('CONVOCATION') || roleUpper.includes('GAMES') ||
    roleUpper.includes('WARDEN') || roleUpper.includes('USAB') ||
    roleUpper.includes('DARUSO') || roleUpper.includes('DEAN') ||
    roleUpper.includes('SMART') || roleUpper.includes('DUS') ||
    roleUpper.includes('DPGS') || roleUpper.includes('POSTGRADUATE') ||
    roleUpper.includes('ADMIN');

  if (isCentralOffice) {
    req.college = '';
    req.faculty = '';
    req.programme = '';
    if (!req.department) {
      req.department = getDefaultUnitName(roleUpper);
    }
  } else if (isPrincipal) {
    req.department = '';
    req.programme = '';
  } else if (!isStudent) {
    req.programme = '';
  }

  if (!req.password) {
    req.password = reg || 'Welcome@UDSM123';
  }

  if (!req.phone) {
    const seedVal = reg ? simpleHashCode(reg) : 123456;
    req.phone = '+255712' + String((seedVal % 900000) + 100000).padStart(6, '0');
  }

  if (!isStudent && !reg) {
    const prefix = roleUpper.length >= 3 ? roleUpper.substring(0, 3) : 'STF';
    const rand = Math.floor(1000 + Math.random() * 9000);
    req.registrationNumber = `STF-${prefix}-${rand}`;
  }

  if (!req.yearOfStudy) {
    if (/^\d{4}-/.test(reg)) {
      req.yearOfStudy = reg.substring(0, 4);
    } else {
      req.yearOfStudy = '2026';
    }
  }

  return req;
}

function parseCsvBuffer(buffer, uploadType = 'STUDENT') {
  const text = buffer.toString('utf8').replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);
  const headerMap = mapHeaders(headers);
  const requests = [];

  for (let i = 1; i < lines.length; i++) {
    const data = parseCsvLine(lines[i]);
    if (data.length < 2) continue;
    const req = buildUserRequestFromRow(data, headerMap, uploadType);
    if (!req.firstName) continue;
    requests.push(req);
  }
  return requests;
}

async function parseExcelBuffer(buffer, uploadType = 'STUDENT') {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet || sheet.rowCount < 2) return [];

  const headerRow = sheet.getRow(1);
  const headers = [];
  for (let col = 1; col <= Math.min(headerRow.cellCount || 30, 30); col++) {
    const cellVal = headerRow.getCell(col).text || headerRow.getCell(col).value;
    headers.push(cellVal !== null && cellVal !== undefined ? String(cellVal).trim() : '');
  }
  const headerMap = mapHeaders(headers);
  const requests = [];

  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    if (!row || !row.hasValues) continue;
    const data = [];
    const maxCols = Math.min(Math.max(headers.length, row.cellCount || 0), 30);
    for (let col = 1; col <= maxCols; col++) {
      const cell = row.getCell(col);
      let val = '';
      if (cell.value !== null && cell.value !== undefined) {
        if (typeof cell.value === 'object' && cell.value.text) {
          val = String(cell.value.text).trim();
        } else if (typeof cell.value === 'object' && cell.value.result !== undefined) {
          val = String(cell.value.result).trim();
        } else {
          val = String(cell.value).trim();
        }
      }
      data.push(val);
    }
    const req = buildUserRequestFromRow(data, headerMap, uploadType);
    if (!req.firstName) continue;
    requests.push(req);
  }

  return requests;
}

function mapEntitiesToTableRows(users, students) {
  const studentMap = new Map();
  for (const s of students || []) {
    if (s.registration_number && s.registration_number.trim()) {
      studentMap.set(s.registration_number.trim().toLowerCase(), s);
    }
    if (s.user_id) {
      studentMap.set(String(s.user_id), s);
    }
  }

  return (users || []).map((u, idx) => {
    const reg = (u.registration_number && u.registration_number.trim())
      ? u.registration_number.trim()
      : (u.username || '');

    const matchedStudent = studentMap.get(reg.toLowerCase()) || studentMap.get(String(u.id)) || null;
    const role = u.role || 'STUDENT';
    const qualification = role === 'STUDENT' ? 'Bachelor' : 'Staff';
    const reason = u.is_active ? 'Active Clearance Account' : 'Pending Verification';
    const dusComment = (matchedStudent && Boolean(matchedStudent.certificate_verified))
      ? 'Verified & Sealed'
      : 'Pending Verification';

    return [
      String(idx + 1),
      reg,
      '', // Blank password for security & privacy
      u.first_name || '',
      u.middle_name || '',
      u.last_name || '',
      '', // Gender
      u.programme || (matchedStudent?.programme || ''),
      '', // GPA
      '', // Classification
      qualification,
      '', // Prefix
      'MAIN CAMPUS',
      '', // Color
      u.college || (matchedStudent?.college || ''),
      u.department || (matchedStudent?.department || ''),
      role,
      u.email || '',
      u.phone_number || '',
      'Backend Database',
      reason,
      dusComment
    ];
  });
}

async function generateExcelBuffer(rows) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('UDSM_Clearance_Data');

  const headerRow = sheet.addRow(EXPORT_HEADERS);
  headerRow.height = 26;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF002060' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  for (const rowData of rows) {
    const row = sheet.addRow(rowData);
    row.height = 20;
    const isStaff = rowData.length > 16 && String(rowData[16]).toUpperCase() !== 'STUDENT';
    row.eachCell((cell) => {
      cell.alignment = { vertical: 'middle' };
      if (isStaff) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0FFFF' } };
      }
    });
  }

  sheet.columns.forEach((col, i) => {
    const headerLen = (EXPORT_HEADERS[i] || '').length;
    col.width = Math.max(headerLen + 4, 14);
  });

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

function generateCsvBuffer(rows) {
  const escapeCsv = (val) => {
    const str = val !== null && val !== undefined ? String(val) : '';
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines = [EXPORT_HEADERS.join(',')];
  for (const rowData of rows) {
    lines.push(rowData.map(escapeCsv).join(','));
  }
  return Buffer.from(lines.join('\n') + '\n', 'utf8');
}

async function generateEmptyTemplateExcelBuffer(type = 'STUDENT') {
  const isStaff = String(type || '').toUpperCase() === 'STAFF';
  const headers = isStaff ? STAFF_TEMPLATE_HEADERS : STUDENT_TEMPLATE_HEADERS;
  const sheetName = isStaff ? 'Staff_Registration_Template' : 'Student_Registration_Template';

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  const headerRow = sheet.addRow(headers);
  headerRow.height = 26;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF002060' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  sheet.columns.forEach((col, i) => {
    col.width = Math.max((headers[i] || '').length + 6, 16);
  });

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

function generateEmptyTemplateCsvBuffer(type = 'STUDENT') {
  const isStaff = String(type || '').toUpperCase() === 'STAFF';
  const headers = isStaff ? STAFF_TEMPLATE_HEADERS : STUDENT_TEMPLATE_HEADERS;
  return Buffer.from(headers.join(',') + '\n', 'utf8');
}

function generateDebtFlagTemplateCsvBuffer() {
  return Buffer.from(DEBT_FLAG_TEMPLATE_HEADERS.join(',') + '\n', 'utf8');
}

function mapDebtFlagHeaders(headers) {
  const map = {};
  for (let i = 0; i < headers.length; i++) {
    if (!headers[i]) continue;
    const h = String(headers[i]).toLowerCase().replace(/[^a-z0-9]/g, '');
    if (h.includes('reg') || h.includes('matric') || h.includes('studentnumber') || h === 'id' || h.includes('studentid')) {
      if (map.reg === undefined) map.reg = i;
    } else if (h.includes('name') || h.includes('student')) {
      if (map.name === undefined) map.name = i;
    } else if (h.includes('cat') || h.includes('item') || h.includes('type')) {
      if (map.category === undefined) map.category = i;
    } else if (h.includes('amount') || h.includes('value') || h.includes('debt') || h.includes('cost') || h.includes('tzs') || h.includes('fee')) {
      if (map.amount === undefined) map.amount = i;
    } else if (h.includes('reason') || h.includes('desc') || h.includes('liability') || h.includes('issue') || h.includes('remark')) {
      if (map.reason === undefined) map.reason = i;
    } else if (h.includes('due') || h.includes('date') || h.includes('target')) {
      if (map.dueDate === undefined) map.dueDate = i;
    } else if (h.includes('note') || h.includes('negotiat') || h.includes('comment')) {
      if (map.notes === undefined) map.notes = i;
    }
  }
  if (map.reg === undefined && headers.length > 0) map.reg = 0;
  if (map.name === undefined && headers.length > 1) map.name = 1;
  if (map.category === undefined && headers.length > 2) map.category = 2;
  if (map.amount === undefined && headers.length > 3) map.amount = 3;
  if (map.reason === undefined && headers.length > 4) map.reason = 4;
  if (map.dueDate === undefined && headers.length > 5) map.dueDate = 5;
  if (map.notes === undefined && headers.length > 6) map.notes = 6;
  return map;
}

function buildDebtFlagFromRow(data, headerMap) {
  const registrationNumber = getVal(data, headerMap.reg);
  if (!registrationNumber) return null;

  const studentName = getVal(data, headerMap.name) || null;
  const category = getVal(data, headerMap.category) || 'Equipment / Item Rental';
  const rawAmount = getVal(data, headerMap.amount).replace(/[^0-9.]/g, '');
  let amount = 0;
  if (rawAmount) {
    const parsed = Number(rawAmount);
    if (!Number.isNaN(parsed) && parsed > 0) {
      amount = parsed;
    }
  }
  const reason = getVal(data, headerMap.reason);
  const dueDate = getVal(data, headerMap.dueDate) || null;
  const negotiationNotes = getVal(data, headerMap.notes) || null;

  return {
    registrationNumber,
    studentName,
    category,
    amount,
    reason,
    dueDate,
    negotiationNotes
  };
}

function parseDebtFlagCsvBuffer(buffer) {
  const text = buffer.toString('utf8').replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);
  const headerMap = mapDebtFlagHeaders(headers);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const data = parseCsvLine(lines[i]);
    if (data.length === 0) continue;
    const flag = buildDebtFlagFromRow(data, headerMap);
    if (flag) rows.push(flag);
  }
  return rows;
}

async function parseDebtFlagExcelBuffer(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet || sheet.rowCount < 2) return [];

  const headerRow = sheet.getRow(1);
  const headers = [];
  for (let col = 1; col <= Math.min(headerRow.cellCount || 15, 15); col++) {
    const cellVal = headerRow.getCell(col).text || headerRow.getCell(col).value;
    headers.push(cellVal !== null && cellVal !== undefined ? String(cellVal).trim() : '');
  }
  const headerMap = mapDebtFlagHeaders(headers);
  const rows = [];

  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    if (!row || !row.hasValues) continue;
    const data = [];
    const maxCols = Math.min(Math.max(headers.length, row.cellCount || 0), 15);
    for (let col = 1; col <= maxCols; col++) {
      const cell = row.getCell(col);
      let val = '';
      if (cell.value !== null && cell.value !== undefined) {
        if (cell.value instanceof Date) {
          val = cell.value.toISOString().split('T')[0];
        } else if (typeof cell.value === 'object' && cell.value.text) {
          val = String(cell.value.text).trim();
        } else if (typeof cell.value === 'object' && cell.value.result !== undefined) {
          val = String(cell.value.result).trim();
        } else {
          val = String(cell.value).trim();
        }
      }
      data.push(val);
    }
    const flag = buildDebtFlagFromRow(data, headerMap);
    if (flag) rows.push(flag);
  }
  return rows;
}

module.exports = {
  EXPORT_HEADERS,
  STUDENT_TEMPLATE_HEADERS,
  STAFF_TEMPLATE_HEADERS,
  DEBT_FLAG_TEMPLATE_HEADERS,
  parseCsvLine,
  mapHeaders,
  buildUserRequestFromRow,
  parseCsvBuffer,
  parseExcelBuffer,
  mapEntitiesToTableRows,
  generateExcelBuffer,
  generateCsvBuffer,
  generateEmptyTemplateExcelBuffer,
  generateEmptyTemplateCsvBuffer,
  generateDebtFlagTemplateCsvBuffer,
  parseDebtFlagCsvBuffer,
  parseDebtFlagExcelBuffer
};
