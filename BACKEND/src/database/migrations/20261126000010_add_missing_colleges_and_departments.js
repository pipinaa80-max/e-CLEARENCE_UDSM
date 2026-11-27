/**
 * Migration: Sync Missing Colleges (UDSE, MRI) and 14 Departments
 * Ensures 100% coverage of all 18 colleges and 53 departments in the
 * UDSM 2024/2025 student dataset across colleges, ref_colleges,
 * departments, and ref_departments.
 */

const NEW_COLLEGES = [
  { id: 'col-udse', code: 'UDSE', name: 'University of Dar es Salaam School of Economics', description: 'Main Campus - Economics and Applied Statistics' },
  { id: 'col-mri', code: 'MRI', name: 'Mineral Resources Institute', description: 'Dodoma / Affiliated Institute - Mining, Geology and Surveying' }
];

const NEW_DEPARTMENTS = [
  { id: 'dept-conas-nas', college_id: 'col-conas', code: 'NAS', name: 'Natural and Applied Sciences', description: 'Interdisciplinary Natural and Applied Sciences with Education' },
  { id: 'dept-coss-is', college_id: 'col-coss', code: 'IS-SS', name: 'Information Studies', description: 'Library and Information Studies' },
  { id: 'dept-coss-ss', college_id: 'col-coss', code: 'SS', name: 'Social Sciences', description: 'Interdisciplinary Social Sciences and Arts with Education' },
  { id: 'dept-udse-econ', college_id: 'col-udse', code: 'ECON-SE', name: 'Economics', description: 'Economics and Applied Statistics' },
  { id: 'dept-ids-ds', college_id: 'col-ids', code: 'DS', name: 'Development Studies', description: 'Development Studies and Research' },
  { id: 'dept-iks-kis', college_id: 'col-iks', code: 'KIS', name: 'Kiswahili', description: 'Kiswahili Language, Literature and Linguistics' },
  { id: 'dept-ims-ms', college_id: 'col-ims', code: 'MS', name: 'Marine Sciences', description: 'Oceanography and Marine Sciences' },
  { id: 'dept-sjmc-jmc', college_id: 'col-sjmc', code: 'JMC', name: 'Journalism and Mass Communication', description: 'Journalism, Mass Communication and Public Relations' },
  { id: 'dept-soaf-asft', college_id: 'col-soaf', code: 'ASFT', name: 'Aquatic Sciences and Fisheries Technology', description: 'Aquatic Sciences and Fisheries Technology' },
  { id: 'dept-mri-eem', college_id: 'col-mri', code: 'EEM', name: 'Environmental Engineering and Management', description: 'Environmental Engineering and Management in Mines' },
  { id: 'dept-mri-gme', college_id: 'col-mri', code: 'GME', name: 'Geology and Mineral Exploration', description: 'Geology and Mineral Exploration' },
  { id: 'dept-mri-lms', college_id: 'col-mri', code: 'LMS', name: 'Land and Mine Surveying', description: 'Land and Mine Surveying' },
  { id: 'dept-mri-me', college_id: 'col-mri', code: 'ME', name: 'Mining Engineering', description: 'Mining Engineering and Mineral Extraction' },
  { id: 'dept-mri-pge', college_id: 'col-mri', code: 'PGE', name: 'Petroleum Geosciences and Exploration', description: 'Petroleum Geosciences and Exploration' }
];

exports.up = async function(knex) {
  const hasColleges = await knex.schema.hasTable('colleges');
  const hasRefColleges = await knex.schema.hasTable('ref_colleges');
  const hasDepartments = await knex.schema.hasTable('departments');
  const hasRefDepartments = await knex.schema.hasTable('ref_departments');

  for (const c of NEW_COLLEGES) {
    if (hasColleges) {
      await knex('colleges')
        .insert({ ...c, is_active: 1 })
        .onConflict('code')
        .merge(['name', 'description', 'is_active']);
    }
    if (hasRefColleges) {
      await knex('ref_colleges')
        .insert({ id: c.id, code: c.code, name: c.name })
        .onConflict('code')
        .merge(['name']);
    }
  }

  for (const d of NEW_DEPARTMENTS) {
    if (hasDepartments) {
      await knex('departments')
        .insert({ ...d, is_active: 1 })
        .onConflict(['college_id', 'code'])
        .merge(['name', 'description', 'is_active']);
    }
    if (hasRefDepartments) {
      await knex('ref_departments')
        .insert({ id: d.id, college_id: d.college_id, code: d.code, name: d.name })
        .onConflict('id')
        .merge(['name', 'code', 'college_id']);
    }
  }
};

exports.down = async function(knex) {
  const deptIds = NEW_DEPARTMENTS.map(d => d.id);
  const colIds = NEW_COLLEGES.map(c => c.id);
  if (await knex.schema.hasTable('ref_departments')) {
    await knex('ref_departments').whereIn('id', deptIds).del();
  }
  if (await knex.schema.hasTable('departments')) {
    await knex('departments').whereIn('id', deptIds).del();
  }
  if (await knex.schema.hasTable('ref_colleges')) {
    await knex('ref_colleges').whereIn('id', colIds).del();
  }
  if (await knex.schema.hasTable('colleges')) {
    await knex('colleges').whereIn('id', colIds).del();
  }
};
