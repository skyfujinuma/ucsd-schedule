import { MajorRequirements } from "../data/majorReqs";
import { CollegeGEs } from "../data/geReqs";
import { coursePrereqs } from "../data/prereqs";

// Fetch 
const res = await fetch("http://localhost:3001/api/courses");
const allCourses = await res.json();

// Turn nested JSON like { AAS: { 10R: [...] }, ... } into flat list
const flatCourses = Object.entries(allCourses)
  .flatMap(([subject, courses]) =>
    Object.entries(courses).flatMap(([number, sections]) =>
      sections.map(section => ({
        ...section,
        code: `${subject} ${number}`
      }))
    )
  );

function hasPreReqs(course, completed) {
  const prereqs = coursePrereqs[course] || [];
  return prereqs.every(pr => completed.has(pr));
}

function isPreferredCourse(courseCode, preferences) {
  const sections = flatCourses.filter(c => c.code === courseCode);

  const validSections = sections.filter(s => {
    const earliestStart = parseInt(s.startTime?.split(":")[0]) || 0;

    if (preferences.noEarly && earliestStart < 10) return false;
    if (
      preferences.avoidDays &&
      s.days.some(day => preferences.avoidDays.includes(day))
    ) return false;

    return true;
  });

  return validSections.length > 0;
}

export function suggestCourses({ major, college, completedCourses, preferences }) {
  const majorReqs = MajorRequirements[major] || [];
  const geReqs = CollegeGEs[college] || [];

  const completed = new Set(completedCourses);

  const filteredMajorCourses = majorReqs.filter(course =>
    !completed.has(course) &&
    hasPreReqs(course, completed) &&
    isPreferredCourse(course, preferences)
  );

  const filteredGECourses = geReqs.filter(course =>
    !completed.has(course) &&
    hasPreReqs(course, completed) &&
    isPreferredCourse(course, preferences)
  );

  const urgentCourses = [
    ...filteredMajorCourses.slice(0, 3),
    ...filteredGECourses.slice(0, 1)
  ];

  return urgentCourses;
}
