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

//Endpoint for suggest
app.post("/api/suggest", (req, res) => {
  const { major, completed } = req.body;

  if (!major || !majorReqs[major]) {
    return res.status(400).json({ error: "Invalid or missing major" });
  }

  const unmet = [];             // raw course codes for section matching
  const urgent = [];            // courses ready to take
  const future = [];            // courses with missing prereqs
  const addedRaw = new Set();   // tracks what's in unmet
  const addedUrgent = new Set(); // tracks urgent
  const addedFuture = new Set(); // tracks future

  const reqs = majorReqs[major].requirements.lower_division.courses;

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
      const anyCompleted = item.courses.some(c => completed.includes(c));
      if (!anyCompleted) {
        for (const option of item.courses) {
          addCourseWithPrereqs(option);
        }

        const oneOfString = item.courses.join(" / ");
        const canTake = item.courses.some(c => {
          const prereqs = allPrereqs[c]?.prereqs || [];
          if (Array.isArray(prereqs) && prereqs.length === 0) return true;
          return Array.isArray(prereqs)
            ? prereqs.every(pr => completed.includes(pr))
            : completed.includes(prereqs);
        });

        if (canTake && !addedUrgent.has(oneOfString)) {
          urgent.push({ type: "one", courses: item.courses });
          addedUrgent.add(oneOfString);
        } else if (!canTake && !addedFuture.has(oneOfString)) {
          future.push({ type: "one", courses: item.courses });
          addedFuture.add(oneOfString);
        }
      }
    }
  }

  const sections = allCourses.filter(sec =>
    unmet.includes(`${sec.dept} ${sec.code}`)
  );

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
