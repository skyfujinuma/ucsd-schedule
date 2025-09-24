import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from "fs"; 
import path from "path";

const PORT = process.env.PORT || 3001;
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Utility to split days string like "TuTh" => ["Tu", "Th"]
function parseDays(daysStr) {
  // Always parse in order: M Tu W Th F (handle abbreviations properly)
  const days = ["M", "Tu", "W", "Th", "F"];
  const result = [];

  // Walk through days in order and check if daysStr contains them
  for (const day of days) {
    if (daysStr.includes(day)) {
      result.push(day);
      // Remove found day so it’s not double counted (important for 'Th' and 'T')
      daysStr = daysStr.replace(day, '');
    }
  }
  return result;
}

// Utility to parse times like "3:30p-4:50p" into { start: "15:30", end: "16:50" }
function parseTimes(timesStr) {
  // Simple regex to split start/end and convert to 24h format
  // Assumes times are always like "h:mmp-h:mmp" or "hh:mmp-h:mmp"
  const parts = timesStr.split('-');
  if (parts.length !== 2) return { start: null, end: null };

  function convert12to24(time12h) {
    const match = time12h.match(/(\d{1,2}):(\d{2})(a|p)/i);
    if (!match) return null;
    let [_, hour, min, ampm] = match;
    hour = parseInt(hour);
    min = parseInt(min);
    if (ampm.toLowerCase() === 'p' && hour !== 12) hour += 12;
    if (ampm.toLowerCase() === 'a' && hour === 12) hour = 0;
    return `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
  }

  return {
    start: convert12to24(parts[0]),
    end: convert12to24(parts[1]),
  };
}


// Utility to load all on-demand course data at startup
const COURSE_FILE = "Classes_Scraper/data/fa25.json";
const COURSE_FILE_WITH_RATINGS = "Classes_Scraper/data/fa25_with_ratings.json";
const COURSE_FILE_WITH_CSE_MATH_RATINGS = "Classes_Scraper/data/fa25_with_cse_math_ratings.json";
const COURSE_FILE_WITH_INDIVIDUAL_RATINGS = "Classes_Scraper/data/fa25_with_individual_professor_ratings.json";
function loadCourses() {
  // Try to load enhanced data with ratings first, fallback to original data
  let courseFile = COURSE_FILE;
  if (fs.existsSync(COURSE_FILE_WITH_INDIVIDUAL_RATINGS)) {
    courseFile = COURSE_FILE_WITH_INDIVIDUAL_RATINGS;
  } else if (fs.existsSync(COURSE_FILE_WITH_CSE_MATH_RATINGS)) {
    courseFile = COURSE_FILE_WITH_CSE_MATH_RATINGS;
  } else if (fs.existsSync(COURSE_FILE_WITH_RATINGS)) {
    courseFile = COURSE_FILE_WITH_RATINGS;
  } else {
  }
  
  const rawData = fs.readFileSync(courseFile, "utf-8");
  const data = JSON.parse(rawData);

  const transformed = [];
  for (const dept in data) {
    for (const courseNum in data[dept]) {
      for (const section of data[dept][courseNum]) {
        transformed.push({
          dept,
          code: courseNum,
          sectionType: section.sectionType,
          days: Array.isArray(section.days) ? section.days : parseDays(section.days),
          times: typeof section.times === "object" ? section.times : parseTimes(section.times),
          buildingName: section.buildingName,
          roomNumber: section.roomNumber,
          professor: section.professor,
          seatsRemaining: section.seatsRemaining?.toString().trim() === "" ? null : Number(section.seatsRemaining),
          spaces: section.spaces?.toString().trim() === "" ? null : Number(section.spaces),
          // Add professor rating data if available
          professor_rating: section.professor_rating || null,
        });
      }
    }
  }
  return transformed;
}
const allCourses = loadCourses(); 

// Endpoint for all on-demand course data
app.get("/api/courses", (req, res) => {
  res.json(allCourses);
});

// Utility to load all majors at startup into memory
const majorReqsDir = path.join(process.cwd(), "requirementdata/majorreq");
function loadAllMajorReqs() {
  const majors = {};
  const files = fs.readdirSync(majorReqsDir);
  files.forEach(file => {
    if (file.endsWith(".json")) {
      const code = path.basename(file, ".json").toUpperCase(); // e.g. cs25.json -> CS25
      const data = JSON.parse(fs.readFileSync(path.join(majorReqsDir, file), "utf-8"));
      majors[code] = data;
    }
  });
  return majors;
}
const allMajorReqs = loadAllMajorReqs();

// Create a version for dropdown (excluding honors variants)
const majorReqs = {};
Object.keys(allMajorReqs).forEach(code => {
  if (!code.endsWith("H")) {
    majorReqs[code] = allMajorReqs[code];
  }
});


// Endpoint for all major requirements
app.get("/api/major-reqs", (req, res) => {
  res.json(majorReqs);
});

// Endpoint for single major requirements
app.get("/api/major-reqs/:major", (req, res) => {
  const major = req.params.major.toUpperCase();
  if (majorReqs[major]) {
    res.json(majorReqs[major]);
  } else {
    res.status(404).json({ error: `Major ${major} not found` });
  }
});


// Utility to load all prereqs at startup into memory
const PREQ_DIR = path.join(process.cwd(), "requirementdata/prereqdata/data");
function loadAllPrereqsSync() {
  const files = fs.readdirSync(PREQ_DIR);
  const allPrereqs = {};

  files.forEach(file => {
    if (file.endsWith(".json")) {
      const raw = fs.readFileSync(path.join(PREQ_DIR, file), "utf-8");
      const data = JSON.parse(raw);
      allPrereqs[data.code] = data;
    }
  });

  return allPrereqs;
}
const allPrereqs = loadAllPrereqsSync();

// Endpoint for all course prereqs
app.get("/api/prereqs", (req, res) => {
  res.json(allPrereqs);
});

// Endpoint for specific course prereq
app.get("/api/prereqs/:course", (req, res) => {
  const courseParam = req.params.course; // e.g., "CSE100"
  const normalized = courseParam.replace("_", " ").toUpperCase();
  const prereqData = allPrereqs[normalized];

  if (prereqData) {
    res.json(prereqData);
  } else {
    res.status(404).json({ error: `Prereqs for ${courseParam} not found` });
  }
});

// Load all college requirements at startup
const collegesDir = path.join(process.cwd(), "requirementdata", "collegedata");
function loadColleges() {
  const colleges = {};
  const files = fs.readdirSync(collegesDir);

  files.forEach(file => {
    if (file.endsWith(".json")) {
      const data = JSON.parse(fs.readFileSync(path.join(collegesDir, file), "utf8"));
      // Use `data.code` or `data.college` as the key, whichever you prefer
      colleges[data.college] = data;
    }
  });

  return colleges;
}
const colleges = loadColleges();

// Endpoint for all college requirements
app.get("/api/colleges", (req, res) => {
  const collegeList = Object.values(colleges).map(c => ({
    code: c.code || c.college,
    name: c.college
  }));
  res.json(collegeList);
});

// Endpoint for specific college requirements
app.get("/api/colleges/:college", (req, res) => {
  const collegeName = req.params.college;
  const collegeData = colleges[collegeName];

  if (!collegeData) {
    return res.status(404).json({ error: "College not found" });
  }

  res.json(collegeData);
});

//Endpoint for suggest
app.post("/api/suggest", (req, res) => {
  const { major, college, completed, honorsSequence } = req.body;

  if (!college || !colleges[college]) {
    return res.status(400).json({ error: "Invalid or missing college" })
  }

  if (!major || !majorReqs[major]) {
    return res.status(400).json({ error: "Invalid or missing major" });
  }

  // Check if the selected major exists (for honors variants)
  const selectedMajor = (major === "CS26" && honorsSequence) ? "CS26H" : major;
  if (!allMajorReqs[selectedMajor]) {
    return res.status(400).json({ error: "Invalid major configuration" });
  }

  const unmet = [];             // raw course codes for section matching
  const urgent = [];            // courses ready to take
  const future = [];            // courses with missing prereqs
  const addedRaw = new Set();   // tracks what's in unmet
  const addedUrgent = new Set(); // tracks urgent
  const addedFuture = new Set(); // tracks future
  const allProcessedCourses = new Set(); // tracks ALL courses across all categories to prevent duplicates

  // selectedMajor is already defined above

  const reqs = [
    ...allMajorReqs[selectedMajor].requirements.lower_division.courses,
    ...colleges[college].requirements.courses,
    ...allMajorReqs[selectedMajor].requirements.upper_division.courses
  ];

  function addCourseWithPrereqs(course, processingStack = new Set()) {
    if (completed.includes(course) || addedRaw.has(course) || allProcessedCourses.has(course)) return;
    if (processingStack.has(course)) return; // Prevent infinite recursion
    
    // Skip honors courses when honors sequence is not selected
    if (!honorsSequence && (course.includes("31AH") || course.includes("31BH") || course.includes("31CH"))) {
      return;
    }
    
    processingStack.add(course);

    const prereqData = allPrereqs[course];
    let missingPrereqs = [];
    

    if (prereqData && prereqData.prereqs) {
      const prereq = prereqData.prereqs;
      
      if (prereq.type === "one") {
        const anyCompleted = prereq.courses.some(c => completed.includes(c));
        if (!anyCompleted) {
          for (const option of prereq.courses) {
            if (!completed.includes(option)) {
              missingPrereqs.push(option);
            }
          }
        }
      } else if (prereq.type === "all") {
        // Handle "all" type prerequisites
        for (const subPrereq of prereq.courses) {
          if (subPrereq.type === "one") {
            const anyCompleted = subPrereq.courses.some(c => completed.includes(c));
            if (!anyCompleted) {
              for (const option of subPrereq.courses) {
                if (!completed.includes(option)) {
                  missingPrereqs.push(option);
                }
              }
            }
          } else if (typeof subPrereq === "string") {
            if (!completed.includes(subPrereq)) missingPrereqs.push(subPrereq);
          }
        }
      } else if (typeof prereq === "string") {
        if (!completed.includes(prereq)) missingPrereqs.push(prereq);
      }
    }

    unmet.push(course);
    addedRaw.add(course);
    allProcessedCourses.add(course);

    if (missingPrereqs.length === 0) {
      if (!addedUrgent.has(course)) {
        urgent.push({ type: "string", course });
        addedUrgent.add(course);
      }
    } else {
      if (!addedFuture.has(course)) {
        future.push({ type: "string", course, missingPrereqs });
        addedFuture.add(course);
      }
    }
  }

  for (const item of reqs) {
    if (typeof item === "string") {
      addCourseWithPrereqs(item);
    } else if (item.type === "one") {
      // Skip the whole group if you already completed any of the courses
      const anyCompleted = item.courses.some(c => completed.includes(c));
      if (!anyCompleted) {
        const eligibleCourses = [];
        const blockedCourses = [];
    
        // Check each course individually for prereqs
        item.courses.forEach(c => {
          // Skip if course is already processed
          if (allProcessedCourses.has(c)) return;
          
          const prereqData = allPrereqs[c];
          let ready = true;
    
          if (prereqData && prereqData.prereqs) {
            const prereq = prereqData.prereqs;
            
            if (prereq.type === "one") {
              const anyPrCompleted = prereq.courses.some(pc => completed.includes(pc));
              if (!anyPrCompleted) {
                ready = false;
              }
            } else if (prereq.type === "all") {
              // Handle "all" type prerequisites
              for (const subPrereq of prereq.courses) {
                if (subPrereq.type === "one") {
                  const anyPrCompleted = subPrereq.courses.some(pc => completed.includes(pc));
                  if (!anyPrCompleted) {
                    ready = false;
                    break;
                  }
                } else if (typeof subPrereq === "string") {
                  if (!completed.includes(subPrereq)) {
                    ready = false;
                    break;
                  }
                }
              }
            } else if (typeof prereq === "string") {
              if (!completed.includes(prereq)) {
                ready = false;
              }
            }
          }
    
          if (ready) eligibleCourses.push(c);
          else blockedCourses.push(c);
        });
    
        // Add eligible courses to urgent
        if (eligibleCourses.length > 0) {
          const key = eligibleCourses.join(" / ");
          if (!addedUrgent.has(key)) {
            urgent.push({ type: "one", courses: eligibleCourses});
            addedUrgent.add(key);
            // Mark all eligible courses as processed
            eligibleCourses.forEach(c => allProcessedCourses.add(c));
          }
        }
    
        // Only add blocked courses to future if NO courses are eligible
        // For "one" type requirements, if any course is eligible, don't show blocked ones
        if (blockedCourses.length > 0 && eligibleCourses.length === 0) {
          const key = blockedCourses.join(" / ");
          if (!addedFuture.has(key)) {
            future.push({ type: "one", courses: blockedCourses });
            addedFuture.add(key);
            // Mark all blocked courses as processed
            blockedCourses.forEach(c => allProcessedCourses.add(c));
          }
        }
      }
    } else if (item.type === "at_least") {
      const taken = item.courses.filter(c => completed.includes(c));
      if (taken.length < item.count) {
        const needed = item.count - taken.length;
        const remaining = item.courses.filter(c => !completed.includes(c));
    
        // Check if at least one remaining course is actually eligible right now
        const eligibleCourses = remaining.filter(c => {
          // Skip if course is already processed
          if (allProcessedCourses.has(c)) return false;
          
          const prereqs = allPrereqs[c]?.prereqs || [];
          if (!prereqs || prereqs.length === 0) return true;
          return Array.isArray(prereqs)
            ? prereqs.every(pr => completed.includes(pr))
            : completed.includes(prereqs);
        });
    
        if (eligibleCourses.length >= 0) {
          const key = `at_least_${item.count}_${item.courses.join(" / ")}`;
          if (!addedUrgent.has(key)) {
            urgent.push({
              type: "at_least",
              count: needed,
              courses: item.courses,
              eligible: eligibleCourses
            });
            addedUrgent.add(key);
            // Mark all courses in this group as processed
            item.courses.forEach(c => allProcessedCourses.add(c));
          }
        } else {
          const key = `at_least_${item.count}_${item.courses.join(" / ")}`;
          if (!addedFuture.has(key)) {
            future.push({
              type: "at_least",
              count: needed,
              courses: item.courses
            });
            addedFuture.add(key);
            // Mark all courses in this group as processed
            item.courses.forEach(c => allProcessedCourses.add(c));
          }
        }
      }
    }
  }

  const sections = allCourses.filter(sec => {
    const code = `${sec.dept} ${sec.code}`;
  
    // Check if this section matches any unmet course
    if (unmet.includes(code)) return true;
  
    // Check if this section matches any urgent course
    for (const u of urgent) {
      if (u.type === "one" && u.courses.includes(code)) {
        return true;
      }
      if (u.type === "string" && u.course === code) {
        return true;
      }
      if (u.type === "at_least" && u.courses.includes(code)) {
        return true;
      }
    }
  
    return false;
  });

  // Post-processing: Remove standalone courses that are already covered by "one" type requirements
  const coursesInOneType = new Set();
  urgent.forEach(item => {
    if (item.type === "one") {
      item.courses.forEach(course => coursesInOneType.add(course));
    }
  });

  // Filter out standalone courses that are already in "one" type requirements
  const filteredUrgent = urgent.filter(item => {
    if (item.type === "string" && coursesInOneType.has(item.course)) {
      return false; // Remove this standalone course
    }
    return true; // Keep this item
  });

  // Add missing prerequisites to future courses (if their own prerequisites are met and not already in urgent)
  const processedFuture = [...future];
  const urgentCourses = new Set();
  
  
  // Collect all courses that are in urgent (for deduplication)
  filteredUrgent.forEach(item => {
    if (item.type === "string") {
      urgentCourses.add(item.course);
    } else if (item.type === "one" && item.courses) {
      item.courses.forEach(course => urgentCourses.add(course));
    } else if (item.type === "at_least" && item.courses) {
      item.courses.forEach(course => urgentCourses.add(course));
    }
  });


  // Process each future course to add its missing prerequisites
  future.forEach((futureCourse, idx) => {
    if (futureCourse.missingPrereqs && futureCourse.missingPrereqs.length > 0) {
      futureCourse.missingPrereqs.forEach(prereq => {
        
        // Skip if this prerequisite is already in urgent courses
        if (urgentCourses.has(prereq) || allProcessedCourses.has(prereq)) {
          return;
        }

        // Check if this prerequisite's own prerequisites are met
        const prereqData = allPrereqs[prereq];
        let prereqReady = true;
        
        if (prereqData && prereqData.prereqs) {
          const prereqReqs = prereqData.prereqs;
          
          if (prereqReqs.type === "one") {
            prereqReady = prereqReqs.courses.some(c => completed.includes(c));
          } else if (prereqReqs.type === "all") {
            prereqReady = prereqReqs.courses.every(subPrereq => {
              if (subPrereq.type === "one") {
                return subPrereq.courses.some(c => completed.includes(c));
              } else if (typeof subPrereq === "string") {
                return completed.includes(subPrereq);
              }
              return true;
            });
          } else if (typeof prereqReqs === "string") {
            prereqReady = completed.includes(prereqReqs);
          }
        } else {
        }

        // If the prerequisite is ready and not already processed, add it to urgent (not future!)
        if (prereqReady && !allProcessedCourses.has(prereq)) {
          filteredUrgent.push({
            type: "string",
            course: prereq
          });
          urgentCourses.add(prereq);
          allProcessedCourses.add(prereq);
        } else {
        }
      });
    }
  });


  res.json({ urgent: filteredUrgent, future: processedFuture, sections });
});


// AI part

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/api/preferences', async (req, res) => {
  const { preferencesText } = req.body;

  const prompt = `
Parse the following user preferences into a JSON object with these keys:
- noEarly: boolean (true if user wants no classes before 10am)
- preferredProfsRatingAbove: number (minimum professor rating)
- avoidDays: array of strings (days of week to avoid classes)

User preferences: "${preferencesText}"

Respond ONLY with the JSON.
`;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}') + 1;
    const jsonText = text.slice(jsonStart, jsonEnd);

    const parsed = JSON.parse(jsonText);
    res.json(parsed);
  } catch (error) {
    res.status(500).json({ error: 'Failed to parse preferences with Gemini.' });
  }
});

app.post('/api/ai-filter-courses', async (req, res) => {
  const { userQuery, courses, completedCourses, major } = req.body;

  // Prepare course data for the AI
  const courseData = courses.map(course => {
    // Handle both section data (dept + code) and requirement data (course/courses)
    let courseCode = 'Unknown';
    if (course.dept && course.code) {
      courseCode = `${course.dept} ${course.code}`;
    } else if (course.course) {
      courseCode = course.course;
    } else if (course.courses && course.courses[0]) {
      courseCode = course.courses[0];
    }
    
    const courseInfo = {
      code: courseCode,
      title: course.title || 'Unknown',
      units: course.units || 'Unknown',
      description: course.description || 'No description available',
      type: course.type || 'string',
      courses: course.courses || [courseCode],
      professor: course.professor || 'TBA',
      sectionType: course.sectionType || 'Unknown'
    };
    
    // Add professor rating information if available
    if (course.professor_rating) {
      courseInfo.professor_rating = {
        rating: course.professor_rating.rating,
        difficulty: course.professor_rating.difficulty,
        num_ratings: course.professor_rating.num_ratings,
        would_take_again: course.professor_rating.would_take_again,
        department: course.professor_rating.department
      };
    }
    
    return courseInfo;
  });

  const prompt = `
You are an academic advisor helping a ${major} major student select courses.

STUDENT CONTEXT:
- Major: ${major}
- Completed courses: ${completedCourses.join(', ') || 'None yet'}
- Available courses: ${JSON.stringify(courseData, null, 2)}

USER REQUEST: "${userQuery}"

TASK: Filter and rank the available courses based on the user's request. Consider:
1. Course relevance to the request
2. Prerequisites (student's completed courses)
3. Course difficulty and workload
4. Career/academic goals alignment
5. Course sequencing and timing
6. Professor ratings and quality (if available) - ratings are 1-5 scale, higher is better
7. Professor difficulty ratings and "would take again" percentages

IMPORTANT: When users ask for "good professor ratings" or "highly rated professors", prioritize courses with professor_rating.rating >= 4.0. When they ask for "easy courses", consider both course difficulty and professor difficulty ratings.

RESPONSE FORMAT (JSON only):
{
  "filtered_courses": [
    {
      "course_code": "CSE 151A",
      "relevance_score": 0.9,
      "reason": "Core machine learning course, perfect for AI focus",
      "prerequisites_met": true,
      "difficulty": "intermediate",
      "professor": "Professor Name",
      "professor_rating": {
        "rating": 4.2,
        "difficulty": 3.1,
        "num_ratings": 89,
        "would_take_again": 78.5
      }
    }
  ],
  "summary": "Found X courses that match your request",
  "recommendations": "Consider taking these courses in this order for optimal learning path"
}

Respond ONLY with valid JSON.`;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Extract JSON from response
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}') + 1;
    const jsonText = text.slice(jsonStart, jsonEnd);

    const parsed = JSON.parse(jsonText);
    res.json(parsed);
  } catch (error) {
    res.status(500).json({ error: 'Failed to filter courses with AI.' });
  }
});

app.listen(PORT, () => {
});
