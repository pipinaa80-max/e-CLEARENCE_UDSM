export interface AcademicUnitData {
  [college: string]: {
    [department: string]: string[];
  };
}

export const UDSM_ACADEMIC_UNITS: AcademicUnitData = {
  'College of Agricultural Sciences and Food Technology (CoAF)': {
    'Agricultural Economics and Business': [
      'BSc in Agricultural and Natural Resources Economics and Business'
    ],
    'Agricultural Engineering': [
      'BSc in Agricultural Engineering and Mechanization'
    ],
    'Crop Sciences and Beekeeping Technology': [
      'BSc in Beekeeping Science and Technology',
      'BSc in Crop Science and Technology'
    ],
    'Food Science and Technology': [
      'BSc in Food Science and Technology'
    ]
  },
  'College of Engineering and Technology (CoET)': {
    'Chemical and Process Engineering': [
      'BSc in Chemical and Process Engineering'
    ],
    'Electrical Engineering': [
      'BSc in Electrical Engineering'
    ],
    'Structural and Construction Engineering': [
      'BSc in Civil Engineering',
      'Bachelor of Architecture',
      'BSc in Quantity Surveying'
    ],
    'Transportation and Geotechnical Engineering': [
      'BSc in Geomatics'
    ],
    'Mechanical and Industrial Engineering': [
      'BSc in Mechanical Engineering',
      'BSc in Industrial Engineering',
      'BSc in Textile Engineering',
      'BSc in Textile Design and Technology'
    ],
    'Water Resources Engineering': []
  },
  'College of Humanities (CoHU)': {
    'Archaeology and Heritage Studies': [
      'BA in Archaeology',
      'BA in Heritage Management'
    ],
    'Creative Arts': [
      'BA in Art and Design',
      'BA in Theatre Arts',
      'BA in Film and Television Studies'
    ],
    'Foreign Languages and Linguistics': [
      'BA in French',
      'BA in Literature',
      'BA in Linguistics'
    ],
    'History': [
      'BA in History'
    ],
    'Philosophy and Religious Studies': [
      'BA in Philosophy and Ethics'
    ],
    'Literature, Communication and Media': [
      'BA in Mass Communication',
      'BA in Journalism'
    ]
  },
  'College of Information and Communication Technologies (CoICT)': {
    'Department of Computer Science & Engineering': [
      'BSc in Computer Science',
      'BSc in Computer Engineering',
      'BSc in Business Information Technology'
    ],
    'Electronics and Telecommunication Engineering': [
      'BSc in Telecommunication Engineering',
      'BSc in Electronics Science and Engineering'
    ]
  },
  'College of Natural and Applied Sciences (CoNAS)': {
    'Botany': ['BSc in Botany'],
    'Chemistry': ['BSc in Chemistry'],
    'Geology': ['BSc in Geology'],
    'Mathematics': ['BSc in Mathematics'],
    'Molecular Biology and Biotechnology': ['BSc in Biotechnology'],
    'Physics': ['BSc in Physics'],
    'Zoology and Wildlife Conservation': ['BSc in Zoology', 'BSc in Wildlife Conservation']
  },
  'College of Social Sciences (CoSS)': {
    'Economics': ['BA in Economics'],
    'Geography': ['BA in Geography and Environmental Studies'],
    'Political Science and Public Administration': ['BA in Political Science and Public Administration'],
    'Sociology': ['BA in Sociology'],
    'Statistics': ['BA in Statistics']
  },
  'University of Dar es Salaam Business School (UDBS)': {
    'Accounting': ['Bachelor of Commerce in Accounting'],
    'Finance': ['Bachelor of Commerce in Finance'],
    'General Management': ['Bachelor of Business Administration'],
    'Marketing': ['Bachelor of Commerce in Marketing']
  },
  'School of Education (SoED)': {
    'Educational Foundations, Management and Lifelong Learning': ['Bachelor of Education in Adult Education'],
    'Educational Psychology and Curriculum Studies': ['Bachelor of Education in Psychology']
  },
  'School of Mines and Geosciences (SoMG)': {
    'Geosciences': ['BSc in Petroleum Geosciences'],
    'Mining and Mineral Processing Engineering': ['BSc in Mining Engineering']
  },
  'Dar es Salaam University College of Education (DUCE)': {
    'Educational Foundations, Management and Lifelong Learning': ['Bachelor of Education in Arts'],
    'Humanities and Social Sciences': ['BA with Education'],
    'Science, Mathematics and Technology': ['BSc with Education']
  },
  'Mkwawa University College of Education (MUCE)': {
    'Educational Foundations and Psychology': ['Bachelor of Education in Science'],
    'Humanities and Social Sciences': ['BA with Education'],
    'Science': ['BSc with Education']
  },
  'Mbeya College of Health and Allied Sciences (MCHAS)': {
    'Biochemistry': ['Doctor of Medicine (MD)'],
    'Clinical Medicine': ['Doctor of Medicine (MD)'],
    'Human Anatomy': ['Doctor of Medicine (MD)']
  }
};
