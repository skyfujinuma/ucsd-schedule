import { MajorRequirements } from "../data/majorReqs";
import { CollegeGEs } from "../data/geReqs";
import { courseUnits } from "../data/courseUnits";
import { coursePrereqs } from '../data/prereqs';
import { mockCourses } from "../data/courseData";

function hasPreReqs(course, completed) {
  const prereqs = coursePrereqs[course] || [];
  return prereqs.every(pr => completed.has(pr));
}

function isPreferredCourse(courseCode, preferences) {
  const sections = mockCourses.filter(c => c.code === courseCode);

  const validSections = sections.filter(s => {
    const earliestStart = parseInt(s.startTime.split(":")[0]);

    if (preferences.noEarly && earliestStart < 10) return false;
    if (
      preferences.avoidDays &&
      s.days.some(day => preferences.avoidDays.includes(day))
    ) return false;
    if (
      preferences.preferredProfsRatingAbove &&
      s.rating < preferences.preferredProfsRatingAbove
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
