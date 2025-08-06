import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from "fs/promises";



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
    const rawData = await fs.readFile("Classes_Scraper/data/fa25.json", "utf-8");
    const data = JSON.parse(rawData);

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

    res.json(transformed);

  } catch (err) {
    console.error(err);
    res.status(500).send("Course data unavailable or parsing failed");
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


app.get("/api/courses", (req, res) => {
  try {
    const data = fs.readFileSync("./data/courses.json", "utf-8");
    res.json(JSON.parse(data));
  } catch (err) {
    res.status(500).send("Course data unavailable");
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
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
