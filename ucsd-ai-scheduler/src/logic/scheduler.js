const mockMajorRequirements = {
  "Computer Science": [
    "CSE 12", "CSE 15L", "CSE 20", "CSE 21", "CSE 30", "CSE 100", "CSE 101", "CSE 110"
  ],
  "Cognitive Science": [
    "COGS 1", "COGS 14A", "COGS 18", "MATH 18", "CSE 7", "CSE 11"
  ]
};

const mockCollegeGEs = {
  "Warren": [
    "PHIL 1", "PHYS 1A", "POLI 10"
  ],
  "Muir": [
    "MCWP 40", "MCWP 50", "HUM 1"
  ],
  "Revelle": [
    "HUM 1", "HUM 2", "CHEM 6A"
  ],
  "Marshall": [
    "DOC 1", "DOC 2", "SOCI 1"
  ],
  "ERC": [
    "MMW 11", "MMW 12", "MMW 13"
  ],
  "Sixth": [
    "CAT 1", "CAT 2", "CAT 3"
  ],
  "Seventh": [
    "SYN 1", "SYN 2", "SYN 3"
  ],
  "Eigth": [
    "EIG 1", "EIG 2", "EIG 3"
  ]
};


export function suggestCourses({ major, college, completedCourses, preferences }) {
    // Load your major and GE requirements (mock data for now)
    const majorReqs = mockMajorRequirements[major] || [];
    const geReqs = mockCollegeGEs[college] || [];
  
    // Filter out already completed courses
    const remainingMajorCourses = majorReqs.filter(course => !completedCourses.includes(course));
    const remainingGECourses = geReqs.filter(course => !completedCourses.includes(course));
  
    // Simple logic: prioritize major, then GE
    const urgentCourses = [...remainingMajorCourses.slice(0, 2), ...remainingGECourses.slice(0, 1)];
  
    return urgentCourses;
  }
  