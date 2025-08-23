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


app.get("/api/courses", async (req, res) => {
  try {
    const rawData = await fs.readFileSync("Classes_Scraper/data/fa25.json", "utf-8");
    const data = JSON.parse(rawData);

    /* option A: store backend data NESTED

    const transformed = {};
    for (const [dept, courses] of Object.entries(data)) {
      transformed[dept] = {};
      for (const [courseNum, sections] of Object.entries(courses)) {
        transformed[dept][courseNum] = sections.map(section => ({
          sectionType: section.sectionType,
          days: parseDays(section.days),
          times: parseTimes(section.times),
          buildingName: section.buildingName,
          roomNumber: section.roomNumber,
          professor: section.professor,
          seatsRemaining: section.seatsRemaining.trim() === '' ? null : Number(section.seatsRemaining),
          spaces: section.spaces.trim() === '' ? null : Number(section.spaces),
        }));
      }
    }
    */

    // option B: store backend data FLAT
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

    res.json(transformed);

  } catch (err) {
    console.error("Error in /api/courses:", err);
    res.status(500).send("Course data unavailable or parsing failed");
  }
});

const majorReqsDir = path.join(process.cwd(), "requirementdata/majorreq");

// Load all majors at startup into memory
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

// GET all majors (returns an object with all codes)
app.get("/api/major-reqs", (req, res) => {
  res.json(majorReqs);
});

// GET single major, e.g. /api/major-reqs/CS25
app.get("/api/major-reqs/:major", (req, res) => {
  const major = req.params.major.toUpperCase();
  if (majorReqs[major]) {
    res.json(majorReqs[major]);
  } else {
    res.status(404).json({ error: `Major ${major} not found` });
  }
});


//prereqs
const PREQ_DIR = path.join(process.cwd(), "requirementdata/prereqdata/data");

// Load all prereqs synchronously
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

// Load once at server start
const allPrereqs = loadAllPrereqsSync();
console.log("Loaded prereqs:", Object.keys(allPrereqs).length);

// Endpoint for all courses
app.get("/api/prereqs", (req, res) => {
  res.json(allPrereqs);
});

// Endpoint for a specific course
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



//AI part
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
