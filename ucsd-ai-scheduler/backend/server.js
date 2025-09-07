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
app.use(express.json());

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
function loadCourses() {
  const rawData = fs.readFileSync(COURSE_FILE, "utf-8");
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
        });
      }
    }
  }
  console.log("Loaded Courses:", Object.keys(transformed).length);
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
const majorReqs = loadAllMajorReqs();
console.log("Loaded Major Reqs:", Object.keys(majorReqs).length);


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
console.log("Loaded Prereqs:", Object.keys(allPrereqs).length);

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
  const { major, college, completed } = req.body;

  if (!college || !colleges[college]) {
    return res.status(400).json({ error: "Invalid or missing college" })
  }

  if (!major || !majorReqs[major]) {
    return res.status(400).json({ error: "Invalid or missing major" });
  }

  const unmet = [];             // raw course codes for section matching
  const urgent = [];            // courses ready to take
  const future = [];            // courses with missing prereqs
  const addedRaw = new Set();   // tracks what's in unmet
  const addedUrgent = new Set(); // tracks urgent
  const addedFuture = new Set(); // tracks future

  const reqs = [
    ...majorReqs[major].requirements.lower_division.courses,
    ...colleges[college].requirements.courses,
    ...majorReqs[major].requirements.upper_division.courses
  ];

  function addCourseWithPrereqs(course) {
    if (completed.includes(course) || addedRaw.has(course)) return;

    const prereqData = allPrereqs[course];
    let missingPrereqs = [];

    if (prereqData && prereqData.prereqs) {
      const prereqsArray = Array.isArray(prereqData.prereqs)
        ? prereqData.prereqs
        : [prereqData.prereqs];

      for (const pr of prereqsArray) {
        if (pr.type === "one") {
          const anyCompleted = pr.courses.some(c => completed.includes(c) || addedRaw.has(c));
          if (!anyCompleted) {
            for (const option of pr.courses) {
              if (!completed.includes(option)) {
                addCourseWithPrereqs(option);
                missingPrereqs.push(option);
              }
            }
          }
        } else if (typeof pr === "string") {
          addCourseWithPrereqs(pr);
          if (!completed.includes(pr)) missingPrereqs.push(pr);
        } 
      }
    }

    unmet.push(course);
    addedRaw.add(course);

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
          const prereqs = allPrereqs[c]?.prereqs || [];
          let ready = true;
    
          if (prereqs && prereqs.length > 0) {
            const prereqArray = Array.isArray(prereqs) ? prereqs : [prereqs];
            for (const pr of prereqArray) {
              if (pr.type === "one") {
                const anyPrCompleted = pr.courses.some(pc => completed.includes(pc));
                if (!anyPrCompleted) {
                  ready = false;
                  break;
                }
              } else if (typeof pr === "string") {
                if (!completed.includes(pr)) {
                  ready = false;
                  break;
                }
              }
            }
          }
    
          if (ready) eligibleCourses.push(c);
          else blockedCourses.push(c);
        });
    
        // Add eligible couses to blocked
        if (eligibleCourses.length > 0) {
          const key = eligibleCourses.join(" / ");
          if (!addedUrgent.has(key)) {
            urgent.push({ type: "one", courses: eligibleCourses});
            addedUrgent.add(key);
          }
        }
    
        // Add blocked courses to future
        if (blockedCourses.length > 0) {
          const key = blockedCourses.join(" / ");
          if (!addedFuture.has(key)) {
            future.push({ type: "one", courses: blockedCourses });
            addedFuture.add(key);
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
          }
        }
      }
    }
  }

  const sections = allCourses.filter(sec => {
    const code = `${sec.dept} ${sec.code}`;
  
    if (unmet.includes(code)) return true;
  
    for (const u of urgent) {
      if (u.type === "one" && u.courses.includes(code)) {
        return true;
      }
    }
  
    return false;
  });

  console.log(sections);
  res.json({ urgent, future, sections });
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
    console.error('Gemini API error:', error);
    res.status(500).json({ error: 'Failed to parse preferences with Gemini.' });
  }
});


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
