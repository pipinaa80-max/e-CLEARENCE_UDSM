const CANONICAL_BRANDING = {
  universityName: 'University of Dar es Salaam',
  shortName: 'UDSM',
  logoUrl: '/udsm-logo.png',
  backgroundUrl: '/background.png',
  primaryColor: '#0864af',
  fontFamily: 'Segoe UI',
  projectId: 'default',
  footerLinks: []
};

const DEFAULT_DASHBOARDS = [
  { id: 'Convocation', name: 'Convocation Office', description: 'Convocation and Alumni Clearance', enabled: true },
  { id: 'Department', name: 'Academic Department', description: 'Departmental Head Clearance', enabled: true },
  { id: 'Dean of Students', name: 'Dean of Students', description: 'Student Affairs Clearance', enabled: true },
  { id: 'Library', name: 'University Library', description: 'Library Books and Equipment Return', enabled: true },
  { id: 'Finance', name: 'Bursar / Finance', description: 'Financial Obligations and Fees', enabled: true },
  { id: 'Principal', name: 'College Principal', description: 'College Executive Clearance', enabled: true },
  { id: 'Smart Card', name: 'Smart Card Unit', description: 'Student ID and Smart Card Clearance', enabled: true },
  { id: 'USAB', name: 'USAB', description: 'University Students Accommodation Bureau', enabled: true },
  { id: 'Hall Warden', name: 'Hall Warden', description: 'Hostel Accommodation Clearance', enabled: true },
  { id: 'Games Coach', name: 'Games Coach', description: 'Sports and Sports Equipment Clearance', enabled: true },
  { id: 'DARUSO', name: 'DARUSO', description: 'Student Government Clearance', enabled: true }
];

exports.getPublicBranding = (req, res) => {
  res.status(200).json(CANONICAL_BRANDING);
};

exports.getMyBranding = (req, res) => {
  res.status(200).json(CANONICAL_BRANDING);
};

exports.getOverview = (req, res) => {
  res.status(200).json({
    role: req.user?.role || 'INSTITUTIONAL_ADMIN',
    projectId: 'default',
    branding: CANONICAL_BRANDING,
    dashboards: DEFAULT_DASHBOARDS,
    subAdmins: []
  });
};
