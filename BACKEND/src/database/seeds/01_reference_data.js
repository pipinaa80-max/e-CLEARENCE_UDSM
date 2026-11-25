/**
 * Reference Data Seeder for UDSM e-Clearance
 * Seeds institutional reference entities: Colleges, Departments, Collection Stations,
 * Sponsors, Ref Lookup Tables, and Default System Branding.
 *
 * NOTE: Strictly adheres to production security rules: ZERO default user credentials or passwords.
 */

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function(knex) {
  // 1. Seed Colleges
  const colleges = [
    { id: 'col-coict', code: 'CoICT', name: 'College of Information and Communication Technologies', description: 'Kijitonyama Campus - Computing, Software, and Telecommunications', is_active: 1 },
    { id: 'col-coet', code: 'CoET', name: 'College of Engineering and Technology', description: 'Main Campus - Engineering, Architecture and Technology', is_active: 1 },
    { id: 'col-conas', code: 'CoNAS', name: 'College of Natural and Applied Sciences', description: 'Main Campus - Natural, Physical and Biological Sciences', is_active: 1 },
    { id: 'col-cohu', code: 'CoHU', name: 'College of Humanities', description: 'Main Campus - Literature, History, Languages and Arts', is_active: 1 },
    { id: 'col-coss', code: 'CoSS', name: 'College of Social Sciences', description: 'Main Campus - Economics, Sociology, Statistics and Political Science', is_active: 1 },
    { id: 'col-udbs', code: 'UDBS', name: 'University of Dar es Salaam Business School', description: 'Main Campus - Accounting, Finance, Marketing and Management', is_active: 1 },
    { id: 'col-soed', code: 'SoED', name: 'School of Education', description: 'Main Campus - Educational Foundations and Curriculum', is_active: 1 },
    { id: 'col-udsol', code: 'UDSoL', name: 'University of Dar es Salaam School of Law', description: 'Main Campus - Legal Studies, Public and Private Law', is_active: 1 },
    { id: 'col-somg', code: 'SoMG', name: 'College of Mines and Geosciences', description: 'Main Campus - Geosciences, Mining and Petroleum Engineering', is_active: 1 },
    { id: 'col-sjmc', code: 'SJMC', name: 'School of Journalism and Mass Communication', description: 'Mikocheni Campus - Journalism, Media and PR', is_active: 1 },
    { id: 'col-ids', code: 'IDS', name: 'Institute of Development Studies', description: 'Main Campus - Development Studies and Research', is_active: 1 },
    { id: 'col-coaf', code: 'CoAF', name: 'College of Agricultural Sciences and Food Technology', description: 'Main Campus - Agriculture, Food and Bio-resources', is_active: 1 },
    { id: 'col-mchas', code: 'MCHAS', name: 'Mbeya College of Health and Allied Sciences', description: 'Mbeya Campus - Health, Medicine and Clinical Sciences', is_active: 1 },
    { id: 'col-duce', code: 'DUCE', name: 'Dar es Salaam University College of Education', description: 'Chang\'ombe Campus - Constituent College of Education', is_active: 1 },
    { id: 'col-muce', code: 'MUCE', name: 'Mkwawa University College of Education', description: 'Iringa Campus - Constituent College of Education', is_active: 1 },
    { id: 'col-soaf', code: 'SoAF', name: 'School of Aquatic Sciences and Fisheries Technology', description: 'Kunduchi Campus - Marine and Aquatic Sciences', is_active: 1 },
    { id: 'col-iks', code: 'IKS', name: 'Institute of Kiswahili Studies', description: 'Main Campus - Kiswahili Language, Literature and Linguistics', is_active: 1 },
    { id: 'col-ims', code: 'IMS', name: 'Institute of Marine Sciences', description: 'Zanzibar Campus - Oceanography and Marine Resources', is_active: 1 }
  ];

  for (const c of colleges) {
    await knex('colleges')
      .insert({
        id: c.id,
        code: c.code,
        name: c.name,
        description: c.description,
        is_active: c.is_active
      })
      .onConflict('code')
      .merge(['name', 'description', 'is_active']);
  }

  // 2. Seed Departments
  const departments = [
    // CoICT
    { id: 'dept-coict-cse', college_id: 'col-coict', code: 'CSE', name: 'Department of Computer Science and Engineering', description: 'Software Engineering, Computer Science, AI and Computer Networks' },
    { id: 'dept-coict-ete', college_id: 'col-coict', code: 'ETE', name: 'Department of Electronics and Telecommunications Engineering', description: 'Telecommunications, Signal Processing and Electronics' },
    { id: 'dept-coict-is', college_id: 'col-coict', code: 'IS', name: 'Department of Information Systems', description: 'Information Systems, Informatics and Data Management' },

    // CoET
    { id: 'dept-coet-cpe', college_id: 'col-coet', code: 'CPE', name: 'Chemical and Process Engineering', description: 'Chemical Engineering and Petrochemical Processes' },
    { id: 'dept-coet-ee', college_id: 'col-coet', code: 'EE', name: 'Electrical Engineering', description: 'Power Systems, Energy and Electrical Technology' },
    { id: 'dept-coet-mie', college_id: 'col-coet', code: 'MIE', name: 'Mechanical and Industrial Engineering', description: 'Mechanical, Industrial and Textile Engineering' },
    { id: 'dept-coet-sce', college_id: 'col-coet', code: 'SCE', name: 'Structural and Construction Engineering', description: 'Civil Engineering, Architecture and Quantity Surveying' },
    { id: 'dept-coet-tge', college_id: 'col-coet', code: 'TGE', name: 'Transportation and Geotechnical Engineering', description: 'Geomatics and Transportation Engineering' },
    { id: 'dept-coet-wre', college_id: 'col-coet', code: 'WRE', name: 'Water Resources Engineering', description: 'Hydrology and Environmental Engineering' },

    // CoNAS
    { id: 'dept-conas-bot', college_id: 'col-conas', code: 'BOT', name: 'Botany', description: 'Plant Biology, Ecology and Biodiversity' },
    { id: 'dept-conas-chm', college_id: 'col-conas', code: 'CHM', name: 'Chemistry', description: 'Organic, Inorganic, Physical and Analytical Chemistry' },
    { id: 'dept-conas-geo', college_id: 'col-conas', code: 'GEO', name: 'Geology', description: 'Geosciences and Earth Systems' },
    { id: 'dept-conas-mth', college_id: 'col-conas', code: 'MTH', name: 'Mathematics', description: 'Pure and Applied Mathematics, Statistics' },
    { id: 'dept-conas-mbb', college_id: 'col-conas', code: 'MBB', name: 'Molecular Biology and Biotechnology', description: 'Genetics, Biochemistry and Biotechnology' },
    { id: 'dept-conas-phy', college_id: 'col-conas', code: 'PHY', name: 'Physics', description: 'Applied Physics, Materials and Renewable Energy' },
    { id: 'dept-conas-zwc', college_id: 'col-conas', code: 'ZWC', name: 'Zoology and Wildlife Conservation', description: 'Animal Biology, Ecology and Wildlife Management' },

    // CoHU
    { id: 'dept-cohu-ash', college_id: 'col-cohu', code: 'ASH', name: 'Archaeology and Heritage Studies', description: 'Archaeological Research and Cultural Heritage' },
    { id: 'dept-cohu-ca', college_id: 'col-cohu', code: 'CA', name: 'Creative Arts', description: 'Fine Arts, Music, Theatre and Design' },
    { id: 'dept-cohu-fll', college_id: 'col-cohu', code: 'FLL', name: 'Foreign Languages and Linguistics', description: 'Linguistics, French, Chinese and Literature' },
    { id: 'dept-cohu-his', college_id: 'col-cohu', code: 'HIS', name: 'History', description: 'African, Regional and Global History' },
    { id: 'dept-cohu-prs', college_id: 'col-cohu', code: 'PRS', name: 'Philosophy and Religious Studies', description: 'Ethics, Philosophy and Comparative Religion' },
    { id: 'dept-cohu-lcm', college_id: 'col-cohu', code: 'LCM', name: 'Literature, Communication and Media', description: 'Literary Studies and Publishing' },

    // CoSS
    { id: 'dept-coss-econ', college_id: 'col-coss', code: 'ECON', name: 'Economics', description: 'Applied, Development and Financial Economics' },
    { id: 'dept-coss-geo', college_id: 'col-coss', code: 'GEO-SS', name: 'Geography', description: 'Human Geography, GIS and Environmental Management' },
    { id: 'dept-coss-pspa', college_id: 'col-coss', code: 'PSPA', name: 'Political Science and Public Administration', description: 'Governance, Policy and Public Administration' },
    { id: 'dept-coss-soc', college_id: 'col-coss', code: 'SOC', name: 'Sociology', description: 'Social Development and Anthropology' },
    { id: 'dept-coss-stat', college_id: 'col-coss', code: 'STAT', name: 'Statistics', description: 'Official Statistics and Data Analytics' },

    // UDBS
    { id: 'dept-udbs-acct', college_id: 'col-udbs', code: 'ACCT', name: 'Accounting', description: 'Financial, Forensic and Management Accounting' },
    { id: 'dept-udbs-fin', college_id: 'col-udbs', code: 'FIN', name: 'Finance', description: 'Banking, Corporate Finance and Investment' },
    { id: 'dept-udbs-gm', college_id: 'col-udbs', code: 'GM', name: 'General Management', description: 'Human Resource and Strategic Management' },
    { id: 'dept-udbs-mkt', college_id: 'col-udbs', code: 'MKT', name: 'Marketing', description: 'Commerce, Supply Chain and Marketing' },

    // SoED
    { id: 'dept-soed-efml', college_id: 'col-soed', code: 'EFML', name: 'Educational Foundations, Management and Lifelong Learning', description: 'Policy, Leadership and Foundations' },
    { id: 'dept-soed-epcs', college_id: 'col-soed', code: 'EPCS', name: 'Educational Psychology and Curriculum Studies', description: 'Psychology, Special Needs and Curriculum' },
    { id: 'dept-soed-pess', college_id: 'col-soed', code: 'PESS', name: 'Physical Education and Sport Sciences', description: 'Sports Science and Physical Education' },

    // UDSoL
    { id: 'dept-udsol-publ', college_id: 'col-udsol', code: 'PUB-L', name: 'Public Law', description: 'Constitutional, Human Rights and Administrative Law' },
    { id: 'dept-udsol-privl', college_id: 'col-udsol', code: 'PRIV-L', name: 'Private Law', description: 'Commercial, Contract and Family Law' },
    { id: 'dept-udsol-econl', college_id: 'col-udsol', code: 'ECON-L', name: 'Economic Law', description: 'Trade, Tax and Intellectual Property Law' },

    // SoMG
    { id: 'dept-somg-gs', college_id: 'col-somg', code: 'GS', name: 'Geosciences', description: 'Geology, Geophysics and Earth Sciences' },
    { id: 'dept-somg-mmpe', college_id: 'col-somg', code: 'MMPE', name: 'Mining and Mineral Processing Engineering', description: 'Mining, Mineral Processing and Metallurgy' },
    { id: 'dept-somg-pse', college_id: 'col-somg', code: 'PSE', name: 'Petroleum Science and Engineering', description: 'Oil, Gas and Petroleum Geosciences' },

    // CoAF
    { id: 'dept-coaf-aeb', college_id: 'col-coaf', code: 'AEB', name: 'Agricultural Economics and Business', description: 'Agribusiness and Resource Economics' },
    { id: 'dept-coaf-ae', college_id: 'col-coaf', code: 'AE', name: 'Agricultural Engineering', description: 'Farm Mechanization and Irrigation Engineering' },
    { id: 'dept-coaf-csbt', college_id: 'col-coaf', code: 'CSBT', name: 'Crop Sciences and Beekeeping Technology', description: 'Agronomy and Apiculture' },
    { id: 'dept-coaf-fst', college_id: 'col-coaf', code: 'FST', name: 'Food Science and Technology', description: 'Food Processing, Nutrition and Quality Control' },

    // MCHAS
    { id: 'dept-mchas-med', college_id: 'col-mchas', code: 'MED', name: 'Clinical Medicine', description: 'Internal Medicine and Clinical Practice' },
    { id: 'dept-mchas-pharm', college_id: 'col-mchas', code: 'PHARM', name: 'Pharmacy', description: 'Pharmaceutical Sciences and Therapeutics' },
    { id: 'dept-mchas-nurs', college_id: 'col-mchas', code: 'NURS', name: 'Nursing', description: 'Nursing Sciences and Community Health' }
  ];

  for (const d of departments) {
    await knex('departments')
      .insert({
        id: d.id,
        college_id: d.college_id,
        code: d.code,
        name: d.name,
        description: d.description,
        is_active: 1
      })
      .onConflict(['college_id', 'code'])
      .merge(['name', 'description', 'is_active']);
  }

  // 3. Seed Collection Stations
  const stations = [
    { id: 'stn-udsm-main', code: 'UDSM-MAIN', name: 'UDSM Main Campus - DUS Central Station', region: 'Dar es Salaam', district: 'Ubunifu / Kinondoni', address: 'DUS Building Room 102, Main Campus', operating_hours: 'Mon - Fri: 08:00 - 16:00', contact_phone: '+255 22 2410500', contact_email: 'dus.collection@udsm.ac.tz' },
    { id: 'stn-coict-kijito', code: 'COICT-HUB', name: 'CoICT Kijitonyama Dispatch Center', region: 'Dar es Salaam', district: 'Kijitonyama', address: 'CoICT Block A Ground Floor, Kijitonyama Campus', operating_hours: 'Mon - Fri: 08:00 - 16:00', contact_phone: '+255 22 2700010', contact_email: 'coict.collection@udsm.ac.tz' },
    { id: 'stn-arusha-hub', code: 'ARUSHA-HUB', name: 'UDSM Arusha Regional Collection Station', region: 'Arusha', district: 'Arusha Urban', address: 'UDSM Extension Center, Clocktower Street', operating_hours: 'Mon - Fri: 08:30 - 16:30', contact_phone: '+255 27 2548890', contact_email: 'arusha.center@udsm.ac.tz' },
    { id: 'stn-mwanza-hub', code: 'MWANZA-HUB', name: 'UDSM Mwanza Regional Collection Station', region: 'Mwanza', district: 'Nyamagana', address: 'UDSM Lake Zone Center, Station Road', operating_hours: 'Mon - Fri: 08:30 - 16:30', contact_phone: '+255 28 2500411', contact_email: 'mwanza.center@udsm.ac.tz' },
    { id: 'stn-mbeya-hub', code: 'MBEYA-HUB', name: 'UDSM Mbeya Regional Collection Station', region: 'Mbeya', district: 'Mbeya City', address: 'UDSM Southern Highlands Bureau, Posta Street', operating_hours: 'Mon - Fri: 08:30 - 16:30', contact_phone: '+255 25 2502200', contact_email: 'mbeya.center@udsm.ac.tz' },
    { id: 'stn-dodoma-hub', code: 'DODOMA-HUB', name: 'UDSM Capital Dodoma Collection Bureau', region: 'Dodoma', district: 'Dodoma Urban', address: 'Government City Sub-Bureau, Block B', operating_hours: 'Mon - Fri: 08:00 - 16:00', contact_phone: '+255 26 2321100', contact_email: 'dodoma.center@udsm.ac.tz' }
  ];

  for (const s of stations) {
    await knex('collection_stations')
      .insert({
        id: s.id,
        code: s.code,
        name: s.name,
        region: s.region,
        district: s.district,
        address: s.address,
        operating_hours: s.operating_hours,
        contact_phone: s.contact_phone,
        contact_email: s.contact_email,
        is_active: 1
      })
      .onConflict('code')
      .merge(['name', 'address', 'operating_hours', 'contact_phone', 'contact_email', 'is_active']);
  }

  // 4. Seed Sponsors
  const sponsors = [
    { id: 'spn-heslb', name: 'HESLB', code: 'HESLB', description: 'Higher Education Students\' Loans Board' },
    { id: 'spn-karimjee', name: 'Karimjee Scholarships', code: 'KARIMJEE', description: 'Karimjee Jivanjee Foundation Scholarship' },
    { id: 'spn-mo', name: 'MO scholarship', code: 'MO', description: 'Mo Dewji Foundation Scholarship' },
    { id: 'spn-private', name: 'PRIVATE', code: 'PRIVATE', description: 'Self-sponsored / Private funding' }
  ];

  for (const sp of sponsors) {
    await knex('sponsors')
      .insert({
        id: sp.id,
        name: sp.name,
        code: sp.code,
        description: sp.description,
        is_active: 1
      })
      .onConflict('name')
      .merge(['code', 'description', 'is_active']);
  }

  // 5. Seed 3NF Reference Lookup Tables (ref_colleges, ref_departments, ref_programmes, ref_halls)
  for (const c of colleges) {
    await knex('ref_colleges')
      .insert({ id: c.id, code: c.code, name: c.name })
      .onConflict('code')
      .merge(['name']);
  }

  for (const d of departments) {
    await knex('ref_departments')
      .insert({ id: d.id, college_id: d.college_id, code: d.code, name: d.name })
      .onConflict('id')
      .merge(['name', 'code', 'college_id']);
  }

  const defaultHalls = [
    { id: 'hall-1', name: 'Hall 1' },
    { id: 'hall-2', name: 'Hall 2' },
    { id: 'hall-3', name: 'Hall 3' },
    { id: 'hall-4', name: 'Hall 4' },
    { id: 'hall-5', name: 'Hall 5' },
    { id: 'hall-6', name: 'Hall 6' },
    { id: 'hall-7', name: 'Hall 7' },
    { id: 'hall-mabibo', name: 'Mabibo Hostel' },
    { id: 'hall-kurasini', name: 'Kurasini Hostel' },
    { id: 'hall-magufuli', name: 'Magufuli Hostel' },
    { id: 'hall-offcampus', name: 'Off Campus' }
  ];

  for (const h of defaultHalls) {
    await knex('ref_halls')
      .insert({ id: h.id, name: h.name })
      .onConflict('name')
      .merge(['name']);
  }

  // 6. Seed Default System Branding (project_settings 'default')
  const defaultDashboards = [
    { id: 'academic-staff', name: 'Academic Staff', description: 'Academic Staff clearance office', enabled: true },
    { id: 'administrator', name: 'Administrator', description: 'Administrator clearance office', enabled: true },
    { id: 'convocation', name: 'Convocation', description: 'Convocation clearance office', enabled: true },
    { id: 'daruso', name: 'DARUSO', description: 'DARUSO clearance office', enabled: true },
    { id: 'dean-of-students', name: 'Dean of Students', description: 'Dean of Students clearance office', enabled: true },
    { id: 'department', name: 'Department', description: 'Department clearance office', enabled: true },
    { id: 'finance', name: 'Finance', description: 'Finance clearance office', enabled: true },
    { id: 'games-coach', name: 'Games Coach', description: 'Games Coach clearance office', enabled: true },
    { id: 'hall-warden', name: 'Hall Warden', description: 'Hall Warden clearance office', enabled: true },
    { id: 'laboratory', name: 'Laboratory', description: 'Laboratory clearance office', enabled: true },
    { id: 'lecturer', name: 'Lecturer', description: 'Lecturer clearance office', enabled: true },
    { id: 'library', name: 'Library', description: 'Library clearance office', enabled: true },
    { id: 'principal', name: 'Principal', description: 'Principal clearance office', enabled: true },
    { id: 'smart-card', name: 'Smart Card', description: 'Smart Card clearance office', enabled: true },
    { id: 'usab', name: 'USAB', description: 'USAB clearance office', enabled: true },
    { id: 'workshop', name: 'Workshop', description: 'Workshop clearance office', enabled: true }
  ];

  await knex('project_settings')
    .insert({
      project_id: 'default',
      university_name: 'University of Dar es Salaam',
      short_name: 'Clearance',
      logo_url: '/assets/logo.png',
      background_url: '/public/background.png',
      primary_color: '#123c69',
      font_family: 'Georgia',
      dashboards_json: JSON.stringify(defaultDashboards),
      footer_links_json: JSON.stringify([
        { label: 'ARIS 3', url: 'https://aris3.udsm.ac.tz/' },
        { label: 'UDSM', url: 'https://www.udsm.ac.tz/' }
      ]),
      blocked_ips_json: '[]'
    })
    .onConflict('project_id')
    .merge(['university_name', 'short_name', 'dashboards_json', 'primary_color']);
};
