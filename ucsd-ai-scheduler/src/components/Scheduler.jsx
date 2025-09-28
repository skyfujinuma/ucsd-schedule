import React, { useState, useEffect } from 'react';
import Calendar from './Calendar';

// Function to find prerequisite groups based on "choose one" logic
const findPrereqGroup = (prereq, allPrereqs) => {
  // Define known prerequisite groups based on common course patterns
  const prereqGroups = [
    // CSE 101 prerequisites: choose one from first group, choose one from second group
    {
      group1: ['CSE 21', 'MATH 154', 'MATH 158', 'MATH 184', 'MATH 188'],
      group2: ['CSE 12', 'DSC 30']
    },
    // CSE 100/CSE 100R: choose one
    {
      group1: ['CSE 100', 'CSE 100R']
    }
  ];
  
  // Check if the prerequisite is part of any known group
  for (const group of prereqGroups) {
    if (group.group1 && group.group1.includes(prereq)) {
      // Return all group1 courses that are in the missing prerequisites
      return group.group1.filter(course => allPrereqs.includes(course));
    }
    if (group.group2 && group.group2.includes(prereq)) {
      // Return all group2 courses that are in the missing prerequisites
      return group.group2.filter(course => allPrereqs.includes(course));
    }
  }
  
  // If not part of any known group, return just this prerequisite
  return [prereq];
};

// Function to group prerequisites for display
const groupPrerequisites = (prereqs, courseType = null, courseCount = null) => {
  const groups = [];
  const processed = new Set();
  
  // If this is an "at_least" type course, handle it specially
  if (courseType === "at_least" && courseCount && prereqs.length > courseCount) {
    groups.push({
      type: "at_least",
      courses: prereqs,
      count: courseCount
    });
    return groups;
  }
  
  prereqs.forEach(prereq => {
    if (processed.has(prereq)) return;
    
    const group = findPrereqGroup(prereq, prereqs);
    
    if (group.length > 1) {
      // This is a "choose one" group
      groups.push({
        type: "choose_one",
        courses: group
      });
      group.forEach(course => processed.add(course));
    } else {
      // Individual prerequisite
      groups.push({
        type: "individual",
        course: prereq
      });
      processed.add(prereq);
    }
  });
  
  return groups;
};

const Scheduler = ({ onBackToLanding, onAbout }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [form, setForm] = useState({
    major: '',
    completedCourses: '',
    college: '',
    honorsSequence: false
  });

  const [majors, setMajors] = useState([]);
  const [results, setResults] = useState({ 
    future: [], 
    urgent: [], 
    sections: [] 
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // AI filtering state
  const [aiQuery, setAiQuery] = useState("");
  const [aiResults, setAiResults] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  
  // Calendar state
  const [selectedSections, setSelectedSections] = useState(new Set());
  
  // Prerequisite checking state
  const [prereqStatus, setPrereqStatus] = useState({});
  
  // Course selection state for "choose one" and "at_least" groups
  const [selectedUrgentCourses, setSelectedUrgentCourses] = useState({});
  const [selectedElectiveCourses, setSelectedElectiveCourses] = useState({});
  const [selectedFutureCourses, setSelectedFutureCourses] = useState({});
  
  // State for course section dropdowns
  const [expandedCourses, setExpandedCourses] = useState(new Set());
  
  // Conflict detection state
  const [conflictPopup, setConflictPopup] = useState(null);
  
  // Toggle course section expansion
  const toggleCourseExpansion = (courseCode) => {
    setExpandedCourses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(courseCode)) {
        newSet.delete(courseCode);
      } else {
        newSet.add(courseCode);
      }
      return newSet;
    });
  };

  // Check if any sections for a course are selected
  const hasSelectedSections = (courseCode) => {
    if (!results.sections) return false;
    return results.sections.some(section => {
      const sectionCourseCode = `${section.dept} ${section.code}`;
      if (sectionCourseCode !== courseCode) return false;
      
      const sectionId = `${section.dept} ${section.code} ${section.sectionType} ${section.days.join('')} ${section.times.start}`;
      return selectedSections.has(sectionId);
    });
  };

  // Check if a course has any available sections in the current quarter
  const hasAvailableSections = (courseCode) => {
    if (!results.sections) return false;
    return results.sections.some(section => {
      const sectionCourseCode = `${section.dept} ${section.code}`;
      return sectionCourseCode === courseCode;
    });
  };

  // Helper function to check if a course is AI-filtered
  const isAIFiltered = (courseCode) => {
    if (!aiResults || !aiResults.filtered_courses) return false;
    return aiResults.filtered_courses.some(course => course.course_code === courseCode);
  };

  // Helper function to get AI data for a course
  const getAIData = (courseCode) => {
    if (!aiResults || !aiResults.filtered_courses) return null;
    return aiResults.filtered_courses.find(course => course.course_code === courseCode);
  };

  // Check for time conflicts between sections
  const checkTimeConflict = (newSection, existingSection) => {
    // Check if sections have overlapping days
    const hasOverlappingDays = newSection.days.some(day => existingSection.days.includes(day));
    if (!hasOverlappingDays) return false;

    // Check if sections have overlapping times
    const newStart = newSection.times.start;
    const newEnd = newSection.times.end;
    const existingStart = existingSection.times.start;
    const existingEnd = existingSection.times.end;

    // Convert time strings to minutes for easier comparison
    const timeToMinutes = (timeStr) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const newStartMin = timeToMinutes(newStart);
    const newEndMin = timeToMinutes(newEnd);
    const existingStartMin = timeToMinutes(existingStart);
    const existingEndMin = timeToMinutes(existingEnd);

    // Check for overlap: new section starts before existing ends AND new section ends after existing starts
    return newStartMin < existingEndMin && newEndMin > existingStartMin;
  };

  // Find conflicting sections
  const findConflictingSections = (sectionToAdd) => {
    if (!results.sections) return [];
    
    const conflicts = [];
    selectedSections.forEach(selectedSectionId => {
      // Find the section data for the selected section
      const existingSection = results.sections.find(section => {
        const sectionId = `${section.dept} ${section.code} ${section.sectionType} ${section.days.join('')} ${section.times.start}`;
        return sectionId === selectedSectionId;
      });

      if (existingSection && checkTimeConflict(sectionToAdd, existingSection)) {
        conflicts.push({
          sectionId: selectedSectionId,
          section: existingSection
        });
      }
    });

    return conflicts;
  };
  
  useEffect(() => {
    setIsVisible(true);
  }, []);
  
  useEffect(() => {
    async function fetchMajors() {
      try {
        const response = await fetch("https://ucsd-back-production.up.railway.app/api/major-reqs");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        // Convert object to array of major names
        const majorList = Object.values(data).map(major => major.major || major);
        setMajors(majorList);
      } catch (error) {
        setError("Failed to load majors. Please try again.");
        setMajors([]); // Set empty array as fallback
      }
    }
    fetchMajors();
  }, []);

  // Check prerequisites when results change
  useEffect(() => {
    async function checkPrerequisites() {
      if (!results.future || results.future.length === 0) {
        setPrereqStatus({});
        return;
      }

      // Collect all missing prerequisites from future courses
      const missingPrereqs = [];
      results.future.forEach(course => {
        if (course.missingPrereqs && course.missingPrereqs.length > 0) {
          course.missingPrereqs.forEach(prereq => {
            if (!missingPrereqs.includes(prereq)) {
              missingPrereqs.push(prereq);
            }
          });
        }
      });

      // Check each prerequisite's own prerequisites using the same logic as backend
      const prereqStatusMap = {};
      const completed = form.completedCourses.split(',').map(c => c.trim()).filter(c => c);

      for (const prereq of missingPrereqs) {
        try {
          const response = await fetch(`https://ucsd-back-production.up.railway.app/api/prereqs/${prereq.replace(' ', '_')}`);
          if (!response.ok) {
            prereqStatusMap[prereq] = true; // Assume no prereqs if no data
            continue;
          }
          
          const prereqData = await response.json();
          if (!prereqData.prereqs) {
            prereqStatusMap[prereq] = true; // No prerequisites
            continue;
          }
          
          // Use the same prerequisite checking logic as the backend
          const prereqReqs = prereqData.prereqs;
          let prereqsMet = false;
          
          if (prereqReqs.type === "one") {
            prereqsMet = prereqReqs.courses.some(c => completed.includes(c));
          } else if (prereqReqs.type === "all") {
            prereqsMet = prereqReqs.courses.every(subPrereq => {
              if (subPrereq.type === "one") {
                return subPrereq.courses.some(c => completed.includes(c));
              } else if (typeof subPrereq === "string") {
                return completed.includes(subPrereq);
              }
              return true;
            });
          } else if (typeof prereqReqs === "string") {
            prereqsMet = completed.includes(prereqReqs);
          } else {
            prereqsMet = true; // Unknown format, assume met
          }
          
          prereqStatusMap[prereq] = prereqsMet;
        } catch (error) {
          prereqStatusMap[prereq] = true; // Assume no prereqs if error
        }
      }
      
      setPrereqStatus(prereqStatusMap);
    }

    checkPrerequisites();
  }, [results, form.completedCourses]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch("https://ucsd-back-production.up.railway.app/api/suggest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          major: "CS26", // Hardcoded for now since only CS26 is available
          college: "Warren", // Hardcoded for now since only Warren is available
          completed: form.completedCourses.split(',').map(course => course.trim()).filter(course => course),
          honorsSequence: form.honorsSequence
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setResults(data);
    } catch (error) {
      setError("Failed to fetch courses. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAIQuery = async (e) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;
    
    setAiLoading(true);
    setError(null);
    
    try {
      // Group sections by course and professor to send the best professor rating for each course
      const groupedCourses = {};
      
      if (results.sections) {
        results.sections.forEach(section => {
          const courseCode = `${section.dept} ${section.code}`;
          
          if (!groupedCourses[courseCode]) {
            groupedCourses[courseCode] = {
              dept: section.dept,
              code: section.code,
              title: section.title,
              units: section.units,
              description: section.description,
              professor: section.professor,
              professor_rating: section.professor_rating,
              sectionType: 'LE' // Default to lecture
            };
          } else {
            // Keep the professor with the highest rating
            if (section.professor_rating && section.professor_rating.rating > 
                (groupedCourses[courseCode].professor_rating?.rating || 0)) {
              groupedCourses[courseCode].professor = section.professor;
              groupedCourses[courseCode].professor_rating = section.professor_rating;
            }
          }
        });
      }

      // Also include electives that have available sections
      if (results.electives) {
        results.electives.forEach(electiveGroup => {
          electiveGroup.courses.forEach(courseCode => {
            // Only include if it has available sections and isn't already included
            if (hasAvailableSections(courseCode) && !groupedCourses[courseCode]) {
              // Find the section data for this elective course
              const electiveSection = results.sections?.find(section => 
                `${section.dept} ${section.code}` === courseCode
              );
              
              if (electiveSection) {
                groupedCourses[courseCode] = {
                  dept: electiveSection.dept,
                  code: electiveSection.code,
                  title: electiveSection.title,
                  units: electiveSection.units,
                  description: electiveSection.description,
                  professor: electiveSection.professor,
                  professor_rating: electiveSection.professor_rating,
                  sectionType: 'LE' // Default to lecture
                };
              }
            }
          });
        });
      }
      
      const courseData = Object.values(groupedCourses);
      
      const response = await fetch("https://ucsd-back-production.up.railway.app/api/ai-filter-courses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          userQuery: aiQuery,
          courses: courseData,
          completedCourses: form.completedCourses.split(',').map(course => course.trim()).filter(course => course),
          major: "CS26" // Hardcoded for now since only CS26 is available
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setAiResults(data);
    } catch (error) {
      setError("Failed to process AI query. Please try again.");
    } finally {
      setAiLoading(false);
    }
  };

  const groupSections = (sections) => {
    const groups = {};
    
    sections.forEach(section => {
      const key = `${section.dept} ${section.code}`;
      if (!groups[key]) {
        groups[key] = {
          lecture: null,
          discussions: [],
          labs: [],
          seminars: []
        };
      }
      
      switch(section.sectionType) {
        case 'LE':
          groups[key].lecture = section;
          break;
        case 'DI':
          groups[key].discussions.push(section);
          break;
        case 'LA':
          groups[key].labs.push(section);
          break;
        case 'SE':
          groups[key].seminars.push(section);
          break;
      }
    });
    
    return Object.values(groups);
  };

  // New function to group sections by professor
  const groupSectionsByProfessor = (sections) => {
    const groups = {};
    
    sections.forEach(section => {
      // Create a key that includes both course code and professor
      const professor = section.professor || 'TBA';
      const key = `${section.dept} ${section.code} - ${professor}`;
      
      if (!groups[key]) {
        groups[key] = {
          lecture: null,
          discussions: [],
          labs: [],
          seminars: [],
          professor: professor,
          professorRating: section.professor_rating
        };
      }
      
      switch(section.sectionType) {
        case 'LE':
          groups[key].lecture = section;
          break;
        case 'DI':
          groups[key].discussions.push(section);
          break;
        case 'LA':
          groups[key].labs.push(section);
          break;
        case 'SE':
          groups[key].seminars.push(section);
          break;
      }
    });
    
    return Object.values(groups);
  };

  const formatProfessorWithRating = (professor, professorRating) => {
    if (!professor) return "TBA";
    if (!professorRating) return professor;
    
    const rating = professorRating.rating;
    const difficulty = professorRating.difficulty;
    const numRatings = professorRating.num_ratings;
    
    // Create star rating display
    const stars = '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));
    
    return (
      <span>
        {professor} 
        <span className="text-sm text-slate-600 ml-2">
          {stars} ({rating}/5) 
          <span className="text-xs text-slate-500 ml-1">
            Difficulty: {difficulty}/5 • {numRatings} ratings
          </span>
        </span>
      </span>
    );
  }

  // New function for multi-line professor display
  const formatProfessorMultiLine = (professor, professorRating) => {
    if (!professor) return { name: "TBA", stars: "", difficulty: "" };
    if (!professorRating) return { name: professor, stars: "", difficulty: "" };
    
    const rating = professorRating.rating;
    const difficulty = professorRating.difficulty;
    const numRatings = professorRating.num_ratings;
    
    // Create star rating display
    const stars = '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));
    
    return {
      name: professor,
      stars: `${stars} (${rating}/5)`,
      difficulty: `Difficulty: ${difficulty}/5 • ${numRatings} ratings`
    };
  };

  const toggleSectionInCalendar = (sectionId, associatedLectureId = null, associatedDiscussionId = null) => {
    const newSelected = new Set(selectedSections);
    if (newSelected.has(sectionId)) {
      // Remove the section and its associated sections
      newSelected.delete(sectionId);
      if (associatedLectureId) {
        newSelected.delete(associatedLectureId);
      }
      if (associatedDiscussionId) {
        newSelected.delete(associatedDiscussionId);
      }
      setSelectedSections(newSelected);
    } else {
      // Check for conflicts before adding
      const sectionToAdd = results.sections.find(section => {
        const id = `${section.dept} ${section.code} ${section.sectionType} ${section.days.join('')} ${section.times.start}`;
        return id === sectionId;
      });

      if (sectionToAdd) {
        
        // Find all sections that will be added (main section + associated sections)
        const sectionsToAdd = [sectionToAdd];
        
        // Add associated lecture if provided
        if (associatedLectureId) {
          const associatedLecture = results.sections.find(section => {
            const id = `${section.dept} ${section.code} ${section.sectionType} ${section.days.join('')} ${section.times.start}`;
            return id === associatedLectureId;
          });
          if (associatedLecture) {
            sectionsToAdd.push(associatedLecture);
          }
        }
        
        // Add associated discussion if provided
        if (associatedDiscussionId) {
          const associatedDiscussion = results.sections.find(section => {
            const id = `${section.dept} ${section.code} ${section.sectionType} ${section.days.join('')} ${section.times.start}`;
            return id === associatedDiscussionId;
          });
          if (associatedDiscussion) {
            sectionsToAdd.push(associatedDiscussion);
          }
        }
        
        
        // Check for conflicts with all sections that will be added
        let allConflicts = [];
        sectionsToAdd.forEach(section => {
          const conflicts = findConflictingSections(section);
          allConflicts = allConflicts.concat(conflicts);
        });
        
        // Remove duplicate conflicts
        const uniqueConflicts = allConflicts.filter((conflict, index, self) => 
          index === self.findIndex(c => c.sectionId === conflict.sectionId)
        );
        
        
        if (uniqueConflicts.length > 0) {
          // Show conflict popup with all sections that will be added
          setConflictPopup({
            sectionsToAdd: sectionsToAdd,
            sectionId,
            associatedLectureId,
            associatedDiscussionId,
            conflicts: uniqueConflicts
          });
          return;
        }
      } else {
      }

      // No conflicts, add the section and its associated sections
      newSelected.add(sectionId);
      if (associatedLectureId) {
        newSelected.add(associatedLectureId);
      }
      if (associatedDiscussionId) {
        newSelected.add(associatedDiscussionId);
      }
      setSelectedSections(newSelected);
    }
  };

  // Handle conflict popup actions
  const handleConflictAddAnyway = () => {
    if (!conflictPopup) return;
    
    const { sectionId, associatedLectureId, associatedDiscussionId } = conflictPopup;
    const newSelected = new Set(selectedSections);
    
    // Add the section and its associated sections
    newSelected.add(sectionId);
    if (associatedLectureId) {
      newSelected.add(associatedLectureId);
    }
    if (associatedDiscussionId) {
      newSelected.add(associatedDiscussionId);
    }
    
    setSelectedSections(newSelected);
    setConflictPopup(null);
  };

  const handleConflictCancel = () => {
    setConflictPopup(null);
  };

  // Handle course selection from "choose one" and "at_least" groups for urgent courses
  const selectUrgentCourse = (groupIndex, courseCode, groupType) => {
    setSelectedUrgentCourses(prev => {
      const currentSelection = prev[groupIndex] || [];
      
      if (groupType === "one") {
        // For "choose one", replace the selection
        return {
          ...prev,
          [groupIndex]: courseCode
        };
      } else if (groupType === "at_least") {
        // For "at_least", toggle the course in the array
        const isSelected = currentSelection.includes(courseCode);
        if (isSelected) {
          return {
            ...prev,
            [groupIndex]: currentSelection.filter(c => c !== courseCode)
          };
        } else {
          return {
            ...prev,
            [groupIndex]: [...currentSelection, courseCode]
          };
        }
      }
      
      return prev;
    });
  };

  // Handle course selection from "choose one" and "at_least" groups for elective courses
  const selectElectiveCourse = (groupIndex, courseCode, groupType) => {
    setSelectedElectiveCourses(prev => {
      const currentSelection = prev[groupIndex] || [];
      
      if (groupType === "one") {
        // For "choose one", replace the selection
        return {
          ...prev,
          [groupIndex]: courseCode
        };
      } else if (groupType === "at_least") {
        // For "at_least", toggle the course in the array
        const isSelected = currentSelection.includes(courseCode);
        if (isSelected) {
          return {
            ...prev,
            [groupIndex]: currentSelection.filter(c => c !== courseCode)
          };
        } else {
          return {
            ...prev,
            [groupIndex]: [...currentSelection, courseCode]
          };
        }
      }
      
      return prev;
    });
  };

  // Reset course selection for urgent courses
  const resetUrgentCourseSelection = (groupIndex) => {
    setSelectedUrgentCourses(prev => {
      const newState = { ...prev };
      delete newState[groupIndex];
      return newState;
    });
  };

  // Reset course selection for elective courses
  const resetElectiveCourseSelection = (groupIndex) => {
    setSelectedElectiveCourses(prev => {
      const newState = { ...prev };
      delete newState[groupIndex];
      return newState;
    });
  };

  // Handle course selection from "choose one" and "at_least" groups for future courses
  const selectFutureCourse = (groupIndex, courseCode, groupType) => {
    setSelectedFutureCourses(prev => {
      const currentSelection = prev[groupIndex] || [];
      
      if (groupType === "one") {
        // For "choose one", replace the selection
        return {
          ...prev,
          [groupIndex]: courseCode
        };
      } else if (groupType === "at_least") {
        // For "at_least", toggle the course in the array
        const isSelected = currentSelection.includes(courseCode);
        if (isSelected) {
          return {
            ...prev,
            [groupIndex]: currentSelection.filter(c => c !== courseCode)
          };
        } else {
          return {
            ...prev,
            [groupIndex]: [...currentSelection, courseCode]
          };
        }
      }
      
      return prev;
    });
  };

  // Reset course selection for future courses
  const resetFutureCourseSelection = (groupIndex) => {
    setSelectedFutureCourses(prev => {
      const newState = { ...prev };
      delete newState[groupIndex];
      return newState;
    });
  };

  // Use results directly since deduplication is now handled in the backend
  const processedResults = { urgent: results.urgent || [], future: results.future || [] };
  

  function renderCourseItem(item) {
    if (!item) return "Unknown";
  
    if (item.type === "string") {
      return item.course || item.value || "Unknown course";
    } else if (item.type === "array") {
      return (item.courses || item.value || []).join(", ");
    } else if (item.type === "one") {
      // Handle urgent courses structure: {type: "one", courses: ["CSE 11"]}
      return (item.courses || []).join(", ");
    } else if (item.type === "object") {
      return Object.entries(item.course || item.value || {})
        .map(([key, value]) => `${key}: ${value}`)
        .join(", ");
    }
    return JSON.stringify(item.course || item.value || item);
  }

  // Component for rendering singular courses with optional dropdown arrows
  const SingularCourseItem = ({ item, showDropdown = true, isFutureCourse = false }) => {
    const courseText = renderCourseItem(item);
    const courseCode = item.type === "string" ? item.course : courseText;
    const hasSections = hasSelectedSections(courseCode);
    const hasAvailable = hasAvailableSections(courseCode);
    const isAIFilteredCourse = isAIFiltered(courseCode);
    
    return (
      <>
        <div className="flex items-center justify-between">
          <div className={`${
            !hasAvailable
              ? isAIFilteredCourse
                ? "text-purple-400" // AI filtered but no sections
                : "text-slate-500" // Grey out if no sections available
              : hasSections 
                ? isAIFilteredCourse
                  ? "text-purple-200" // AI filtered and has sections
                  : "text-green-100" // Has sections but not AI filtered
                : isAIFilteredCourse
                  ? "text-purple-300" // AI filtered but no selected sections
                  : "text-white" // No selected sections and not AI filtered
          }`}>
            • {courseText}
          </div>
          {showDropdown && (hasAvailable || isAIFilteredCourse) && (
            <button
              onClick={() => toggleCourseExpansion(courseCode)}
              className="text-slate-400 hover:text-slate-200 text-sm"
            >
              {expandedCourses.has(courseCode) ? "▲" : "▼"}
            </button>
          )}
        </div>
        {showDropdown && expandedCourses.has(courseCode) && (
          hasAvailable ? (
            <InlineCourseSections courseCode={courseCode} isFutureCourse={isFutureCourse} />
          ) : isAIFilteredCourse ? (
            <InlineAIReasoning courseCode={courseCode} />
          ) : null
        )}
      </>
    );
  };

  // Component for displaying AI reasoning without sections (for future courses)
  const InlineAIReasoning = ({ courseCode }) => {
    const aiData = getAIData(courseCode);
    
    if (!aiData) {
      return null;
    }

    return (
      <div className="mt-2 ml-4">
        <div className="p-3 bg-purple-900/30 border border-purple-600/50 rounded">
          <div className="flex justify-between items-start mb-2">
            <div className="text-purple-200 text-sm font-medium">🤖 AI Recommendation</div>
            <div className="text-purple-300 text-xs">
              Relevance: {Math.round(aiData.relevance_score * 100)}%
            </div>
          </div>
          <div className="text-purple-100 text-sm mb-2">{aiData.reason}</div>
          {aiData.professor_rating && (
            <div className="text-purple-200 text-xs">
              Professor: {aiData.professor} | Rating: {aiData.professor_rating.rating}/5 | 
              Difficulty: {aiData.professor_rating.difficulty}/5 | 
              Would take again: {aiData.professor_rating.would_take_again}%
            </div>
          )}
        </div>
      </div>
    );
  };

  // Component for displaying missing prerequisites for elective courses
  const ElectivePrerequisites = ({ courseCode, showCheckmark = false }) => {
    const [missingPrereqs, setMissingPrereqs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    useEffect(() => {
      async function fetchPrerequisites() {
        try {
          setError(null);
          const response = await fetch(`https://ucsd-back-production.up.railway.app/api/prereqs/${courseCode.replace(' ', '_')}`);
          if (!response.ok) {
            setMissingPrereqs([]);
            setLoading(false);
            return;
          }
          
          const prereqData = await response.json();
          if (!prereqData.prereqs) {
            setMissingPrereqs([]);
            setLoading(false);
            return;
          }
          
          // Check which prerequisites are missing based on completed courses
          const completed = form.completedCourses.split(',').map(c => c.trim()).filter(c => c);
          const missing = [];
          
          const prereq = prereqData.prereqs;
          
          if (prereq.type === "one") {
            const anyCompleted = prereq.courses.some(c => completed.includes(c));
            if (!anyCompleted) {
              missing.push(...prereq.courses.filter(c => !completed.includes(c)));
            }
          } else if (prereq.type === "all") {
            for (const subPrereq of prereq.courses) {
              if (subPrereq.type === "one") {
                const anyCompleted = subPrereq.courses.some(c => completed.includes(c));
                if (!anyCompleted) {
                  missing.push(...subPrereq.courses.filter(c => !completed.includes(c)));
                }
              } else if (typeof subPrereq === "string") {
                if (!completed.includes(subPrereq)) missing.push(subPrereq);
              }
            }
          } else if (typeof prereq === "string") {
            if (!completed.includes(prereq)) missing.push(prereq);
          }
          
          setMissingPrereqs(missing);
        } catch (error) {
          setError(error.message);
          setMissingPrereqs([]);
        } finally {
          setLoading(false);
        }
      }
      
      fetchPrerequisites();
    }, [courseCode, form.completedCourses]);
    
    if (loading) {
      return (
        <div className="text-sm text-green-200 mt-2">
          <div className="text-green-300">Loading prerequisites...</div>
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="text-sm text-green-200 mt-2">
          <div className="text-green-300">Error loading prerequisites</div>
        </div>
      );
    }
    
    if (missingPrereqs.length === 0) {
      return (
        <div className="text-sm text-green-200 mt-2">
          <div className="flex items-center justify-between">
            <span className="text-green-300">✓ All prerequisites met</span>
            <span className="text-green-400 text-lg">✓</span>
          </div>
        </div>
      );
    }
    
    try {
      const groupedPrereqs = groupPrerequisites(missingPrereqs, "string", null);
      
      // Check if all groups are invalid
      const validGroups = groupedPrereqs.filter(group => group && group.courses && Array.isArray(group.courses));
      
      if (validGroups.length === 0 && missingPrereqs.length > 0) {
        // Fallback: show raw prerequisites if grouping failed
        return (
          <div className="text-sm text-green-200 mt-2">
            <strong>Missing prerequisites:</strong>
            <div className="ml-4 mt-1 space-y-1">
              {missingPrereqs.map((prereq, i) => (
                <div key={i} className="text-green-200">
                  • {prereq}
                </div>
              ))}
            </div>
          </div>
        );
      }
      
      return (
        <div className="text-sm text-green-200 mt-2">
          <strong>Missing prerequisites:</strong>
          <div className="ml-4 mt-1 space-y-1">
            {groupedPrereqs.map((group, i) => {
              // Add safety checks for group structure
              if (!group || !group.courses || !Array.isArray(group.courses)) {
                return null; // Skip invalid groups instead of showing "Unknown prerequisites"
              }
              
              return (
                <div key={i}>
                  {group.type === "choose_one" ? (
                    <div>
                      <span className="text-green-300 font-medium">Choose one:</span>
                      <div className="ml-2 mt-1">
                        {group.courses.map((course, j) => (
                          <div key={j} className="text-green-200">
                            • {course}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : group.type === "at_least" ? (
                    <div>
                      <span className="text-green-300 font-medium">Choose {group.count || group.courses.length}:</span>
                      <div className="ml-2 mt-1">
                        {group.courses.map((course, j) => (
                          <div key={j} className="text-green-200">
                            • {course}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-green-200">
                      • {group.courses.join(", ")}
                    </div>
                  )}
                </div>
              );
            }).filter(Boolean)} {/* Remove null entries from invalid groups */}
          </div>
        </div>
      );
    } catch (error) {
      return (
        <div className="text-sm text-green-200 mt-2">
          <div className="text-green-300">Error displaying prerequisites</div>
        </div>
      );
    }
  };

  // Component for displaying elective course with prerequisites status
  const ElectiveCourseDisplay = ({ courseCode }) => {
    const [missingPrereqs, setMissingPrereqs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    useEffect(() => {
      async function fetchPrerequisites() {
        try {
          setError(null);
          const response = await fetch(`https://ucsd-back-production.up.railway.app/api/prereqs/${courseCode.replace(' ', '_')}`);
          if (!response.ok) {
            setMissingPrereqs([]);
            setLoading(false);
            return;
          }
          
          const prereqData = await response.json();
          if (!prereqData.prereqs) {
            setMissingPrereqs([]);
            setLoading(false);
            return;
          }
          
          // Check which prerequisites are missing based on completed courses
          const completed = form.completedCourses.split(',').map(c => c.trim()).filter(c => c);
          const missingGroups = [];
          
          const prereq = prereqData.prereqs;
          
          if (prereq.type === "one") {
            const anyCompleted = prereq.courses.some(c => completed.includes(c));
            if (!anyCompleted) {
              missingGroups.push({
                type: "choose_one",
                courses: prereq.courses.filter(c => !completed.includes(c))
              });
            }
          } else if (prereq.type === "all") {
            for (const subPrereq of prereq.courses) {
              if (subPrereq.type === "one") {
                const anyCompleted = subPrereq.courses.some(c => completed.includes(c));
                if (!anyCompleted) {
                  missingGroups.push({
                    type: "choose_one",
                    courses: subPrereq.courses.filter(c => !completed.includes(c))
                  });
                }
              } else if (typeof subPrereq === "string") {
                if (!completed.includes(subPrereq)) {
                  missingGroups.push({
                    type: "individual",
                    course: subPrereq
                  });
                }
              }
            }
          } else if (typeof prereq === "string") {
            if (!completed.includes(prereq)) {
              missingGroups.push({
                type: "individual",
                course: prereq
              });
            }
          }
          
          setMissingPrereqs(missingGroups);
        } catch (error) {
          setError(error.message);
          setMissingPrereqs([]);
        } finally {
          setLoading(false);
        }
      }
      
      fetchPrerequisites();
    }, [courseCode, form.completedCourses]);
    
    const hasAvailable = hasAvailableSections(courseCode);
    const allPrereqsMet = !loading && !error && missingPrereqs.length === 0;
    const isAIFilteredCourse = isAIFiltered(courseCode);
    
    return (
      <div className={`p-2 border rounded ${
        isAIFilteredCourse
          ? "bg-green-800 border-purple-500 border-2" // AI filtered
          : "bg-green-800 border-green-500" // Not AI filtered
      }`}>
        <div className="flex items-center justify-between">
          <div className={`text-sm font-medium ${
            !hasAvailable
              ? "text-slate-500" // Grey out if no sections available
              : "text-green-100"
          }`}>
            ✓ {courseCode}
          </div>
          {allPrereqsMet && (
            <span className="text-green-400 text-lg" title="All prerequisites met - can take this course">
              ✓
            </span>
          )}
        </div>
        
        {/* Always show AI reasoning first if available */}
        {isAIFilteredCourse && (
          <div className="mt-2">
            <InlineAIReasoning courseCode={courseCode} />
          </div>
        )}
        
        {/* Show prerequisites status or available sections */}
        {loading && (
          <div className="text-sm text-green-200 mt-2">
            <div className="text-green-300">Loading prerequisites...</div>
          </div>
        )}
        
        {error && (
          <div className="text-sm text-green-200 mt-2">
            <div className="text-green-300">Error loading prerequisites</div>
          </div>
        )}
        
        {!loading && !error && missingPrereqs.length > 0 && (
          <div className="text-sm text-green-200 mt-2">
            <strong>Missing prerequisites:</strong>
            <div className="ml-4 mt-1 space-y-1">
              {missingPrereqs.map((group, i) => {
                if (group.type === "choose_one") {
                  return (
                    <div key={i} className="text-green-200">
                      <div className="font-medium">Choose one:</div>
                      <div className="ml-4 space-y-1">
                        {group.courses.map((course, courseIdx) => (
                          <div key={courseIdx} className="text-green-200">
                            • {course}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                } else if (group.type === "individual") {
                  return (
                    <div key={i} className="text-green-200">
                      • {group.course}
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </div>
        )}
        
        {allPrereqsMet && hasAvailable && (
          <div className="text-sm text-green-200 mt-2">
            <InlineCourseSections courseCode={courseCode} isFutureCourse={false} />
          </div>
        )}
      </div>
    );
  };

  // Component for displaying available elective course options with prerequisites status
  const ElectiveCourseOption = ({ courseCode, isSelected, hasAvailable, onClick }) => {
    const [missingPrereqs, setMissingPrereqs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    useEffect(() => {
      async function fetchPrerequisites() {
        try {
          setError(null);
          const response = await fetch(`https://ucsd-back-production.up.railway.app/api/prereqs/${courseCode.replace(' ', '_')}`);
          if (!response.ok) {
            setMissingPrereqs([]);
            setLoading(false);
            return;
          }
          
          const prereqData = await response.json();
          if (!prereqData.prereqs) {
            setMissingPrereqs([]);
            setLoading(false);
            return;
          }
          
          // Check which prerequisites are missing based on completed courses
          const completed = form.completedCourses.split(',').map(c => c.trim()).filter(c => c);
          const missing = [];
          
          const prereq = prereqData.prereqs;
          
          if (prereq.type === "one") {
            const anyCompleted = prereq.courses.some(c => completed.includes(c));
            if (!anyCompleted) {
              missing.push(...prereq.courses.filter(c => !completed.includes(c)));
            }
          } else if (prereq.type === "all") {
            for (const subPrereq of prereq.courses) {
              if (subPrereq.type === "one") {
                const anyCompleted = subPrereq.courses.some(c => completed.includes(c));
                if (!anyCompleted) {
                  missing.push(...subPrereq.courses.filter(c => !completed.includes(c)));
                }
              } else if (typeof subPrereq === "string") {
                if (!completed.includes(subPrereq)) missing.push(subPrereq);
              }
            }
          } else if (typeof prereq === "string") {
            if (!completed.includes(prereq)) missing.push(prereq);
          }
          
          setMissingPrereqs(missing);
        } catch (error) {
          setError(error.message);
          setMissingPrereqs([]);
        } finally {
          setLoading(false);
        }
      }
      
      fetchPrerequisites();
    }, [courseCode, form.completedCourses]);
    
    const allPrereqsMet = !loading && !error && missingPrereqs.length === 0;
    const isAIFilteredCourse = isAIFiltered(courseCode);
    
    return (
      <div 
        className={`p-2 border rounded transition-all ${
          !hasAvailable
            ? isAIFilteredCourse
              ? "bg-slate-700/50 border-purple-500 text-purple-400 cursor-not-allowed" // AI filtered but no sections
              : "bg-slate-700/50 border-slate-500 text-slate-500 cursor-not-allowed" // Grey out if no sections available
            : isSelected 
              ? isAIFilteredCourse
                ? "bg-slate-600/50 border-purple-500 text-purple-300 opacity-50 cursor-pointer" // AI filtered and selected
                : "bg-slate-600/50 border-gray-500 text-slate-300 opacity-50 cursor-pointer" // Selected but not AI filtered
              : isAIFilteredCourse
                ? "bg-red-800 border-purple-500 border-2 text-purple-100 hover:bg-red-700 cursor-pointer" // AI filtered and available
                : "bg-red-800 border-red-500 text-red-100 hover:bg-red-700 cursor-pointer" // Available but not AI filtered
        }`}
        onClick={hasAvailable ? onClick : undefined}
      >
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">
            ○ {courseCode}
          </div>
          {allPrereqsMet && hasAvailable && (
            <span className="text-green-400 text-lg" title="All prerequisites met - can take this course">
              ✓
            </span>
          )}
        </div>
      </div>
    );
  };

  const CourseSection = ({ courseLabel, secForCourse }) => {
    const [open, setOpen] = useState(false);
  
    return (
      <div className="mb-2">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setOpen(!open)}
            className="text-left font-medium flex items-center gap-2 text-white hover:text-slate-300"
          >
            <span>{courseLabel}</span>
            <span>{open ? "▲" : "▼"}</span>
          </button>
        </div>
        {open && secForCourse.length > 0 && (
          <div className="ml-4 mt-2">
            {groupSections(secForCourse).map((group, gIdx) => {
              const lectureSectionId = group.lecture ? `${group.lecture.dept} ${group.lecture.code} ${group.lecture.sectionType} ${group.lecture.days.join('')} ${group.lecture.times.start}` : null;
              
              return (
                <div key={gIdx} className="mb-2">
                  {/* Lecture */}
                  {group.lecture && (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-300">
                        Lecture: {group.lecture.days.join(", ")}{" "}
                        {group.lecture.times.start} - {group.lecture.times.end} |{" "}
                        Prof: {formatProfessorWithRating(group.lecture.professor, group.lecture.professor_rating)} (Seats: {group.lecture.seatsRemaining ?? "N/A"})
                      </span>
                      {/* Show add button for lecture if no discussions/labs available */}
                      {group.discussions.length === 0 && group.labs.length === 0 && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleSectionInCalendar(lectureSectionId);
                          }}
                          className={`px-2 py-1 text-xs rounded transition-colors flex-shrink-0 ${
                            selectedSections.has(lectureSectionId)
                              ? 'bg-green-500 text-white'
                              : 'bg-blue-500 text-white hover:bg-blue-600'
                          }`}
                          title={selectedSections.has(lectureSectionId) ? 'Remove from calendar' : 'Add to calendar'}
                        >
                          {selectedSections.has(lectureSectionId) ? '📅 Added' : '📅 Add'}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Discussions */}
                  {group.discussions.length > 0 && (
                    <div className="ml-4">
                      <span className="text-slate-300">Discussions:</span>
                      <ul className="list-disc ml-6">
                        {group.discussions.map((d, i) => {
                          const discussionSectionId = `${d.dept} ${d.code} ${d.sectionType} ${d.days.join('')} ${d.times.start}`;
                          
                          return (
                            <li key={i} className="flex items-center gap-2">
                              <span className="text-slate-300">
                                {d.days.join(", ")} {d.times.start} - {d.times.end} ({d.buildingName} {d.roomNumber}) Seats:{" "}
                                {d.seatsRemaining ?? "N/A"}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  toggleSectionInCalendar(discussionSectionId, lectureSectionId);
                                }}
                                className={`px-2 py-1 text-xs rounded transition-colors flex-shrink-0 ${
                                  selectedSections.has(discussionSectionId)
                                    ? 'bg-green-500 text-white'
                                    : 'bg-blue-500 text-white hover:bg-blue-600'
                                }`}
                                title={selectedSections.has(discussionSectionId) ? 'Remove from calendar' : 'Add to calendar (includes lecture)'}
                              >
                                {selectedSections.has(discussionSectionId) ? '📅 Added' : '📅 Add'}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  {/* Labs */}
                  {group.labs.length > 0 && (
                    <div className="ml-4">
                      <span className="text-slate-300">Labs:</span>
                      <ul className="list-disc ml-6">
                        {group.labs.map((l, i) => {
                          const labSectionId = `${l.dept} ${l.code} ${l.sectionType} ${l.days.join('')} ${l.times.start}`;
                          
                          return (
                            <li key={i} className="flex items-center gap-2">
                              <span className="text-slate-300">
                                {l.days.join(", ")} {l.times.start} - {l.times.end} ({l.buildingName} {l.roomNumber}) Seats:{" "}
                                {l.seatsRemaining ?? "N/A"}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  toggleSectionInCalendar(labSectionId, lectureSectionId);
                                }}
                                className={`px-2 py-1 text-xs rounded transition-colors flex-shrink-0 ${
                                  selectedSections.has(labSectionId)
                                    ? 'bg-green-500 text-white'
                                    : 'bg-blue-500 text-white hover:bg-blue-600'
                                }`}
                                title={selectedSections.has(labSectionId) ? 'Remove from calendar' : 'Add to calendar (includes lecture)'}
                              >
                                {selectedSections.has(labSectionId) ? '📅 Added' : '📅 Add'}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  {/* Seminars */}
                  {group.seminars && group.seminars.length > 0 && (
                    <div className="ml-4">
                      <span className="text-slate-300">Seminars:</span>
                      <ul className="list-disc ml-6">
                        {group.seminars.map((s, i) => {
                          const seminarSectionId = `${s.dept} ${s.code} ${s.sectionType} ${s.days.join('')} ${s.times.start}`;
                          
                          return (
                            <li key={i} className="flex items-center gap-2">
                              <span className="text-slate-300">
                                {s.days.join(", ")} {s.times.start} - {s.times.end} ({s.buildingName} {s.roomNumber}) Seats:{" "}
                                {s.seatsRemaining ?? "N/A"}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  toggleSectionInCalendar(seminarSectionId, lectureSectionId);
                                }}
                                className={`px-2 py-1 text-xs rounded transition-colors flex-shrink-0 ${
                                  selectedSections.has(seminarSectionId)
                                    ? 'bg-green-500 text-white'
                                    : 'bg-blue-500 text-white hover:bg-blue-600'
                                }`}
                                title={selectedSections.has(seminarSectionId) ? 'Remove from calendar' : 'Add to calendar (includes lecture)'}
                              >
                                {selectedSections.has(seminarSectionId) ? '📅 Added' : '📅 Add'}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Component for displaying course sections inline
  const InlineCourseSections = ({ courseCode, isFutureCourse = false }) => {
    const secForCourse = results.sections ? results.sections.filter(s => 
      `${s.dept} ${s.code}` === courseCode
    ) : [];
    const aiData = getAIData(courseCode);
    
    // For future courses, only show AI reasoning if available
    if (isFutureCourse) {
      if (!aiData) {
        return null;
      }
      return (
        <div className="mt-2 ml-4">
          <div className="p-3 bg-purple-900/30 border border-purple-600/50 rounded">
            <div className="flex justify-between items-start mb-2">
              <div className="text-purple-200 text-sm font-medium">🤖 AI Recommendation</div>
              <div className="text-purple-300 text-xs">
                Relevance: {Math.round(aiData.relevance_score * 100)}%
              </div>
            </div>
            <div className="text-purple-100 text-sm mb-2">{aiData.reason}</div>
            {aiData.professor_rating && (
              <div className="text-purple-200 text-xs">
                Professor: {aiData.professor} | Rating: {aiData.professor_rating.rating}/5 | 
                Difficulty: {aiData.professor_rating.difficulty}/5 | 
                Would take again: {aiData.professor_rating.would_take_again}%
              </div>
            )}
          </div>
        </div>
      );
    }
    
    if (secForCourse.length === 0) {
      return (
        <div className="mt-2 ml-4">
          <div className="text-slate-400 text-sm italic">
            No available sections found this quarter
          </div>
        </div>
      );
    }

  return (
      <div className="mt-2 ml-4">
        {/* AI Reasoning Section */}
        {aiData && (
          <div className="mb-4 p-3 bg-purple-900/30 border border-purple-600/50 rounded">
            <div className="flex justify-between items-start mb-2">
              <div className="text-purple-200 text-sm font-medium">🤖 AI Recommendation</div>
              <div className="text-purple-300 text-xs">
                Relevance: {Math.round(aiData.relevance_score * 100)}%
              </div>
            </div>
            <div className="text-purple-100 text-sm mb-2">{aiData.reason}</div>
            {aiData.professor_rating && (
              <div className="text-purple-200 text-xs">
                Professor: {aiData.professor} | Rating: {aiData.professor_rating.rating}/5 | 
                Difficulty: {aiData.professor_rating.difficulty}/5 | 
                Would take again: {aiData.professor_rating.would_take_again}%
              </div>
            )}
          </div>
        )}
        
        {/* Course Sections */}
        {groupSectionsByProfessor(secForCourse).map((group, gIdx) => {
          const lectureSectionId = group.lecture ? `${group.lecture.dept} ${group.lecture.code} ${group.lecture.sectionType} ${group.lecture.days.join('')} ${group.lecture.times.start}` : null;
          
          return (
            <div key={gIdx} className="mb-2">
              {/* Lecture */}
              {group.lecture && (
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <div className="text-slate-300 text-sm">
                      Lecture: {group.lecture.days.join(", ")} {group.lecture.times.start} - {group.lecture.times.end} (Seats: {group.lecture.seatsRemaining ?? "N/A"})
                    </div>
                    {(() => {
                      const profInfo = formatProfessorMultiLine(group.professor, group.professorRating);
                      return (
                        <>
                          <div className="text-slate-300 text-sm">
                            {profInfo.name} <span className="text-amber-400">{profInfo.stars}</span>
                          </div>
                          <div className="text-slate-400 text-xs">
                            {profInfo.difficulty}
                          </div>
                        </>
                      );
                    })()}
                    
                    {/* Show discussion info under lecture when there's exactly one discussion */}
                    {group.discussions.length === 1 && (
                      <div className="text-slate-300 text-sm mt-1">
                        Discussion: {group.discussions[0].days.join(", ")} {group.discussions[0].times.start} - {group.discussions[0].times.end} ({group.discussions[0].buildingName} {group.discussions[0].roomNumber}) (Seats: {group.discussions[0].seatsRemaining ?? "N/A"})
                      </div>
                    )}
                  </div>
                  {(group.discussions.length === 0 && group.labs.length === 0) || (group.discussions.length === 1 && group.labs.length === 0) ? (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        // If there's exactly one discussion, include it automatically
                        if (group.discussions.length === 1) {
                          const discussionSectionId = `${group.discussions[0].dept} ${group.discussions[0].code} ${group.discussions[0].sectionType} ${group.discussions[0].days.join('')} ${group.discussions[0].times.start}`;
                          toggleSectionInCalendar(lectureSectionId, null, discussionSectionId);
                        } else {
                          toggleSectionInCalendar(lectureSectionId);
                        }
                      }}
                      className={`px-2 py-1 text-xs rounded transition-colors flex-shrink-0 ${
                        selectedSections.has(lectureSectionId)
                          ? 'bg-green-500 text-white'
                          : 'bg-blue-500 text-white hover:bg-blue-600'
                      }`}
                      title={selectedSections.has(lectureSectionId) ? 'Remove from calendar' : group.discussions.length === 1 ? 'Add to calendar (includes lecture and discussion)' : 'Add to calendar'}
                    >
                      {selectedSections.has(lectureSectionId) ? '📅 Added' : '📅 Add'}
                    </button>
                  ) : null}
                </div>
              )}

              {/* Discussions - only show when there are multiple discussions */}
              {group.discussions.length > 1 && (
                <div className="ml-4">
                  <span className="text-slate-300 text-sm">Discussions:</span>
                  <ul className="list-disc ml-6">
                    {group.discussions.map((d, i) => {
                      const discussionSectionId = `${d.dept} ${d.code} ${d.sectionType} ${d.days.join('')} ${d.times.start}`;
                      
                      return (
                        <li key={i} className="flex items-center gap-2">
                          <span className="text-slate-300 text-sm">
                            {d.days.join(", ")} {d.times.start} - {d.times.end} ({d.buildingName} {d.roomNumber}) Seats:{" "}
                            {d.seatsRemaining ?? "N/A"}
                          </span>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleSectionInCalendar(discussionSectionId, lectureSectionId);
                            }}
                            className={`px-2 py-1 text-xs rounded transition-colors flex-shrink-0 ${
                              selectedSections.has(discussionSectionId)
                                ? 'bg-green-500 text-white'
                                : 'bg-blue-500 text-white hover:bg-blue-600'
                            }`}
                            title={selectedSections.has(discussionSectionId) ? 'Remove from calendar' : 'Add to calendar (includes lecture)'}
                          >
                            {selectedSections.has(discussionSectionId) ? '📅 Added' : '📅 Add'}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Labs */}
              {group.labs.length > 0 && (
                <div className="ml-4">
                  <span className="text-slate-300 text-sm">Labs:</span>
                  <ul className="list-disc ml-6">
                    {group.labs.map((l, i) => {
                      const labSectionId = `${l.dept} ${l.code} ${l.sectionType} ${l.days.join('')} ${l.times.start}`;
                      
                      return (
                        <li key={i} className="flex items-center gap-2">
                          <span className="text-slate-300 text-sm">
                            {l.days.join(", ")} {l.times.start} - {l.times.end} ({l.buildingName} {l.roomNumber}) Seats:{" "}
                            {l.seatsRemaining ?? "N/A"}
                          </span>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              // If there's exactly one discussion, include it automatically
                              if (group.discussions.length === 1) {
                                const discussionSectionId = `${group.discussions[0].dept} ${group.discussions[0].code} ${group.discussions[0].sectionType} ${group.discussions[0].days.join('')} ${group.discussions[0].times.start}`;
                                toggleSectionInCalendar(labSectionId, lectureSectionId, discussionSectionId);
                              } else {
                                toggleSectionInCalendar(labSectionId, lectureSectionId);
                              }
                            }}
                            className={`px-2 py-1 text-xs rounded transition-colors flex-shrink-0 ${
                              selectedSections.has(labSectionId)
                                ? 'bg-green-500 text-white'
                                : 'bg-blue-500 text-white hover:bg-blue-600'
                            }`}
                            title={selectedSections.has(labSectionId) ? 'Remove from calendar' : group.discussions.length === 1 ? 'Add to calendar (includes lecture and discussion)' : 'Add to calendar (includes lecture)'}
                          >
                            {selectedSections.has(labSectionId) ? '📅 Added' : '📅 Add'}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Seminars */}
              {group.seminars && group.seminars.length > 0 && (
                <div className="ml-4">
                  <span className="text-slate-300 text-sm">Seminars:</span>
                  <ul className="list-disc ml-6">
                    {group.seminars.map((s, i) => {
                      const seminarSectionId = `${s.dept} ${s.code} ${s.sectionType} ${s.days.join('')} ${s.times.start}`;
                      
                      return (
                        <li key={i} className="flex items-center gap-2">
                          <span className="text-slate-300 text-sm">
                            {s.days.join(", ")} {s.times.start} - {s.times.end} ({s.buildingName} {s.roomNumber}) Seats:{" "}
                            {s.seatsRemaining ?? "N/A"}
                          </span>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleSectionInCalendar(seminarSectionId, lectureSectionId);
                            }}
                            className={`px-2 py-1 text-xs rounded transition-colors flex-shrink-0 ${
                              selectedSections.has(seminarSectionId)
                                ? 'bg-green-500 text-white'
                                : 'bg-blue-500 text-white hover:bg-blue-600'
                            }`}
                            title={selectedSections.has(seminarSectionId) ? 'Remove from calendar' : 'Add to calendar (includes lecture)'}
                          >
                            {selectedSections.has(seminarSectionId) ? '📅 Added' : '📅 Add'}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>    
    );
  };

  return (
    <div className="h-screen w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-y-auto">
      {/* Navigation */}
      <nav className="bg-slate-800/80 backdrop-blur-sm border-b border-slate-700/50">
        <div className="flex justify-between items-center px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center space-x-4">
            <a 
              href="#home" 
              onClick={(e) => { e.preventDefault(); onBackToLanding(); }}
              className="text-2xl sm:text-3xl lg:text-4xl font-black hover:text-slate-300 transition-colors no-underline"
              style={{ color: 'white', textDecoration: 'none' }}
            >
              taco
            </a>
          </div>
          <div className="flex items-center space-x-3 sm:space-x-4 lg:space-x-6">
            <a 
              href="#home" 
              onClick={(e) => { e.preventDefault(); onBackToLanding(); }}
              className="text-sm sm:text-base hover:text-slate-300 transition-colors no-underline" 
              style={{ color: 'white', textDecoration: 'none' }}
            >
              Home
            </a>
            <a onClick={onAbout} className="text-sm sm:text-base hover:text-slate-300 transition-colors cursor-pointer" style={{ color: 'white', textDecoration: 'none' }}>About</a>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="w-full mx-auto">
        
        {/* Responsive layout with three columns */}
        <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 sm:gap-3 h-[calc(100vh-180px)] sm:h-[calc(100vh-200px)] lg:h-[calc(100vh-220px)]">
          {/* Left column - Form and Course Suggestions */}
          <div className={`md:col-span-1 lg:col-span-1 xl:col-span-1 2xl:col-span-1 bg-slate-800/80 backdrop-blur-sm p-4 sm:p-6 rounded-2xl shadow-lg border border-slate-700/50 h-full overflow-y-auto transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block mb-1 font-medium text-slate-300">Major</label>
              <select
                value={form.major}
                onChange={(e) => setForm({...form, major: e.target.value})}
                className="w-full p-2 border border-slate-600/50 rounded bg-slate-700/50 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select a major</option>
                {Array.isArray(majors) && majors.map((major) => (
                  <option key={major} value={major}>
                    {major}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-1 font-medium text-slate-300">College</label>
              <select
                value={form.college}
                onChange={(e) => setForm({...form, college: e.target.value})}
                className="w-full p-2 border border-slate-600/50 rounded bg-slate-700/50 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select a college</option>
                <option value="Warren">Warren</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block mb-1 font-medium text-slate-300">Completed Courses (comma-separated)</label>
            <input
              type="text"
              value={form.completedCourses}
              onChange={(e) => setForm({...form, completedCourses: e.target.value})}
              className="w-full p-2 border border-slate-600/50 rounded bg-slate-700/50 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., CSE 8A, MATH 20A"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="honorsSequence"
              checked={form.honorsSequence}
              onChange={(e) => setForm({...form, honorsSequence: e.target.checked})}
              className="mr-2 w-4 h-4 text-blue-600 bg-slate-700/50 border-slate-600/50 rounded focus:ring-blue-500"
            />
            <label htmlFor="honorsSequence" className="font-medium text-slate-300">
              Honors Sequence
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Loading..." : "Get Course Recommendations"}
          </button>
        </form>

        {error && (
          <div className="mt-4 p-3 bg-red-900 border border-red-600 text-red-200 rounded">
            {error}
          </div>
        )}


        {/* AI Filter Section */}
        {results.sections && results.sections.length > 0 && (
          <div className="mt-6 p-4 bg-slate-700/50 rounded-lg border border-slate-600/50">
            <h3 className="text-lg font-semibold mb-3 text-white">🤖 AI Course Filter</h3>
            <form onSubmit={handleAIQuery} className="space-y-3">
              <input
                type="text"
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                placeholder="e.g., 'Show me easy math courses' or 'Find courses with good professors'"
                className="w-full p-2 border border-slate-600/50 rounded bg-slate-800/80 backdrop-blur-sm text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
              />
              <button
                type="submit"
                disabled={aiLoading}
                className="w-full bg-purple-600 text-white py-2 px-4 rounded hover:bg-purple-700 disabled:opacity-50 text-sm"
              >
                {aiLoading ? "Thinking..." : "Filter with AI"}
              </button>
            </form>
            
            {/* AI Summary and Recommendations */}
            {aiResults && (
              <div className="mt-4 space-y-3">
                {/* AI Summary */}
                {aiResults.summary && (
                  <div className="p-3 bg-purple-900/30 border border-purple-600 rounded text-purple-200 text-sm">
                    {aiResults.summary}
                  </div>
                )}
                
                {/* AI Recommendations */}
                {aiResults.recommendations && (
                  <div className="p-3 bg-blue-900/30 border border-blue-600 rounded text-blue-200 text-sm">
                    <strong>Recommendations:</strong> {aiResults.recommendations}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {(() => {
          // Separate urgent items into regular urgent and electives
          const regularUrgentItems = processedResults.urgent.filter(item => item.type !== "at_least");
          const electiveItems = processedResults.urgent.filter(item => item.type === "at_least");

          return (
            <div className="mt-6">
              {regularUrgentItems.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-xl font-semibold mb-3 text-white">Urgent Courses</h2>
                  <div className="space-y-2">
                    {regularUrgentItems.map((courseGroup, idx) => {
                      const selectedCourse = selectedUrgentCourses[idx];
                      const isChooseOne = courseGroup.type === "one" && courseGroup.courses && courseGroup.courses.length > 1;
                      
                      return (
                    <div key={idx} className={`p-3 border rounded ${
                      selectedCourse && isChooseOne 
                        ? hasSelectedSections(selectedCourse)
                          ? isAIFiltered(selectedCourse)
                            ? "bg-green-900 border-purple-500 border-2" // AI filtered + selected
                            : "bg-green-900 border-orange-500 border-2" // Selected but not AI filtered
                          : isAIFiltered(selectedCourse)
                            ? "bg-red-900 border-purple-500 border-2" // AI filtered but not selected
                            : "bg-red-900 border-orange-500 border-2" // Not selected and not AI filtered
                        : courseGroup.type === "string" && hasSelectedSections(courseGroup.course)
                        ? isAIFiltered(courseGroup.course)
                          ? "bg-green-900 border-purple-500" // AI filtered + has sections
                          : "bg-green-900 border-green-600" // Has sections but not AI filtered
                        : courseGroup.type === "string" && isAIFiltered(courseGroup.course)
                        ? "bg-red-900 border-purple-500" // AI filtered but no sections
                        : "bg-red-900 border-red-600" // No sections and not AI filtered
                    }`}>
                      <div className="font-medium text-red-100">
                        {courseGroup.courses && courseGroup.courses.length > 0 ? (
                          <div>
                            {selectedCourse && isChooseOne ? (
                              // Show selected course with reset button
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-green-200 text-sm">Selected:</span>
                                  <button
                                    onClick={() => resetUrgentCourseSelection(idx)}
                                    className="text-xs bg-slate-600/50 hover:bg-slate-500/50 text-white px-2 py-1 rounded transition-colors"
                                  >
                                    Choose Again
                                  </button>
                                </div>
                                <div className="flex items-center justify-between">
                                  <div className={`font-medium ${
                                    !hasAvailableSections(selectedCourse)
                                      ? isAIFiltered(selectedCourse)
                                        ? "text-purple-400" // AI filtered but no sections
                                        : "text-slate-500" // Grey out if no sections available
                                      : hasSelectedSections(selectedCourse) 
                                        ? isAIFiltered(selectedCourse)
                                          ? "text-purple-200" // AI filtered and has sections
                                          : "text-green-100" // Has sections but not AI filtered
                                        : isAIFiltered(selectedCourse)
                                          ? "text-purple-300" // AI filtered but no selected sections
                                          : "text-red-100" // No selected sections and not AI filtered
                                  }`}>
                                  • {selectedCourse}
                                </div>
                                  {hasAvailableSections(selectedCourse) && (
                                    <button
                                      onClick={() => toggleCourseExpansion(selectedCourse)}
                                      className="text-slate-400 hover:text-slate-200 text-sm"
                                    >
                                      {expandedCourses.has(selectedCourse) ? "▲" : "▼"}
                                    </button>
                                  )}
                                </div>
                                {expandedCourses.has(selectedCourse) && hasAvailableSections(selectedCourse) && (
                                  <InlineCourseSections courseCode={selectedCourse} />
                                )}
                              </div>
                            ) : (
                              // Show course options
                              <div>
                                {courseGroup.courses.length > 1 && (
                                  <div className="mb-2 text-sm text-red-200">
                                    {courseGroup.type === "at_least" ? (
                                      `Choose ${courseGroup.count || courseGroup.courses.length}:`
                                    ) : (
                                      "Choose one:"
                                    )}
                                  </div>
                                )}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                                  {courseGroup.courses.map((course, courseIdx) => {
                                    const hasAvailable = hasAvailableSections(course);
                                    const isAIFilteredCourse = isAIFiltered(course);
                                    return (
                                      <div 
                                        key={courseIdx} 
                                        className={`text-sm p-1 rounded transition-colors ${
                                          !hasAvailable
                                            ? isAIFilteredCourse
                                              ? "text-purple-400 cursor-not-allowed border border-purple-500" // AI filtered but no sections
                                              : "text-slate-500 cursor-not-allowed" // Grey out if no sections available
                                            : isAIFilteredCourse
                                              ? `cursor-pointer hover:bg-purple-800 text-purple-200 border border-purple-500 ${isChooseOne ? "hover:text-purple-100" : ""}` // AI filtered and available
                                              : `cursor-pointer hover:bg-red-800 ${isChooseOne ? "hover:text-red-100" : ""}` // Available but not AI filtered
                                        }`}
                                        onClick={hasAvailable && isChooseOne ? () => selectUrgentCourse(idx, course, "one") : undefined}
                                      >
                                        • {course}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <SingularCourseItem item={courseGroup} />
                        )}
                      </div>
                    </div>
                  );
                })}
                  </div>
                </div>
              )}
              
            </div>
          );
        })()}

        {processedResults.future && processedResults.future.length > 0 && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-3 text-white">Future Course Requirements</h2>
            <div className="space-y-2">
              {processedResults.future.map((course, idx) => {
                const selectedCourse = selectedFutureCourses[idx];
                const isChooseOne = course.type === "one" && course.courses && course.courses.length > 1;
                const isAtLeast = course.type === "at_least";
                const selectedCoursesList = Array.isArray(selectedCourse) ? selectedCourse : (selectedCourse ? [selectedCourse] : []);
                
                return (
                  <div key={idx} className={`p-3 border rounded ${
                    (selectedCourse && isChooseOne) || (selectedCoursesList.length > 0 && isAtLeast)
                      ? (selectedCourse && isChooseOne && hasSelectedSections(selectedCourse)) || 
                        (selectedCoursesList.length > 0 && isAtLeast && selectedCoursesList.some(course => hasSelectedSections(course)))
                        ? isAIFiltered(selectedCourse) || (selectedCoursesList.length > 0 && selectedCoursesList.some(c => isAIFiltered(c)))
                          ? "bg-green-900 border-purple-500 border-2" // AI filtered + selected
                          : "bg-green-900 border-orange-500 border-2" // Selected but not AI filtered
                        : isAIFiltered(selectedCourse) || (selectedCoursesList.length > 0 && selectedCoursesList.some(c => isAIFiltered(c)))
                          ? "bg-yellow-900 border-purple-500 border-2" // AI filtered but not selected
                          : "bg-yellow-900 border-orange-500 border-2" // Not selected and not AI filtered
                      : course.type === "string" && hasSelectedSections(course.course)
                        ? isAIFiltered(course.course)
                          ? "bg-green-900 border-purple-500" // AI filtered + has sections
                          : "bg-green-900 border-green-600" // Has sections but not AI filtered
                        : course.type === "string" && isAIFiltered(course.course)
                        ? "bg-yellow-900 border-purple-500" // AI filtered but no sections
                        : "bg-yellow-900 border-yellow-600" // No sections and not AI filtered
                  }`}>
                  <div className="font-medium text-yellow-100">
                    {course.courses && course.courses.length > 0 ? (
                        <div>
                          {selectedCourse && isChooseOne ? (
                            // Show selected course with reset button for "choose one"
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-green-200 text-sm">Selected:</span>
                                <button
                                  onClick={() => resetFutureCourseSelection(idx)}
                                  className="text-xs bg-slate-600/50 hover:bg-slate-500/50 text-white px-2 py-1 rounded transition-colors"
                                >
                                  Choose Again
                                </button>
                              </div>
                              <div className={`font-medium ${
                                isAIFiltered(selectedCourse)
                                  ? "text-purple-200" // AI filtered
                                  : "text-yellow-100" // Not AI filtered
                              }`}>
                                • {selectedCourse}
                              </div>
                            </div>
                          ) : selectedCoursesList.length > 0 && isAtLeast ? (
                            // Show selected courses with reset button for "at_least"
                            <div>
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-green-200 text-sm">
                                  Selected: {selectedCoursesList.length} / {course.count || course.courses.length}
                                </span>
                                <button
                                  onClick={() => resetFutureCourseSelection(idx)}
                                  className="text-xs bg-slate-600/50 hover:bg-slate-500/50 text-white px-2 py-1 rounded transition-colors"
                                >
                                  Reset All
                                </button>
                              </div>
                              <div className="space-y-1">
                                {selectedCoursesList.map((selectedCourseCode, selectedIdx) => (
                                  <div key={selectedIdx}>
                                    <div className={`font-medium ${
                                      isAIFiltered(selectedCourseCode)
                                        ? "text-purple-200" // AI filtered
                                        : "text-yellow-100" // Not AI filtered
                                    }`}>
                                      • {selectedCourseCode}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            // Show course options
                      <div>
                        {course.courses.length > 1 && (
                          <div className="mb-2 text-sm text-yellow-200">
                            {course.type === "at_least" ? (
                              `Choose ${course.count || course.courses.length}:`
                            ) : (
                              "Choose one:"
                            )}
                          </div>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                                {course.courses.map((courseCode, courseIdx) => {
                                  const isSelected = selectedCoursesList.includes(courseCode);
                                  const isAIFilteredCourse = isAIFiltered(courseCode);
                                  return (
                                    <div 
                                      key={courseIdx} 
                                      className={`text-sm cursor-pointer p-1 rounded transition-colors ${
                                        isAIFilteredCourse
                                          ? "hover:bg-purple-800 text-purple-200 hover:text-purple-100 border border-purple-500" // AI filtered
                                          : "hover:bg-yellow-800 hover:text-yellow-100" // Not AI filtered
                                      }`}
                                      onClick={(isChooseOne || isAtLeast) ? () => selectFutureCourse(idx, courseCode, course.type) : undefined}
                                    >
                              • {courseCode}
                            </div>
                                  );
                                })}
                        </div>
                            </div>
                          )}
                      </div>
                    ) : (
                        <SingularCourseItem item={course} showDropdown={isAIFiltered(course.course)} isFutureCourse={true} />
                    )}
                  </div>
                  {course.missingPrereqs && course.missingPrereqs.length > 0 && (
                    <div className="text-sm text-yellow-200 mt-1">
                      <strong>Missing prerequisites:</strong>
                      <div className="ml-4 mt-1 space-y-1">
                        {groupPrerequisites(course.missingPrereqs, course.type, course.count).map((group, i) => (
                          <div key={i}>
                            {group.type === "choose_one" ? (
                              <div>
                                <span className="text-yellow-300 font-medium">Choose one:</span>
                                <div className="ml-2 mt-1">
                                  {group.courses.map((course, j) => (
                                    <div key={j} className="text-yellow-200">
                                      • {course}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : group.type === "at_least" ? (
                              <div>
                                <span className="text-yellow-300 font-medium">Choose {group.count}:</span>
                                <div className="ml-2 mt-1">
                                  {group.courses.map((course, j) => (
                                    <div key={j} className="text-yellow-200">
                                      • {course}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="text-yellow-200">
                                • {group.course}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          </div>
        )}



          </div>
          
          {/* Middle column - Calendar */}
          <div className={`md:col-span-1 lg:col-span-1 xl:col-span-2 2xl:col-span-3 bg-slate-800/80 backdrop-blur-sm p-4 sm:p-6 rounded-2xl shadow-lg border border-slate-700/50 h-full overflow-y-auto transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {results.sections && results.sections.length > 0 ? (
              <Calendar 
                sections={results.sections} 
                selectedSections={selectedSections}
                onToggleSection={toggleSectionInCalendar}
              />
            ) : (
              <div className="flex items-center justify-center h-96 text-slate-400">
                <div className="text-center">
                  <div className="text-4xl mb-4">📅</div>
                  <p>Submit the form to see your course calendar</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Right column - Electives */}
          <div className={`md:col-span-1 lg:col-span-1 xl:col-span-1 2xl:col-span-1 bg-slate-800/80 backdrop-blur-sm p-4 sm:p-6 rounded-2xl shadow-lg border border-slate-700/50 h-full overflow-y-auto transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-xl font-semibold mb-3 text-white">Electives</h2>
            {(() => {
              // Get elective items from the processed urgent items
              const electiveItems = processedResults.urgent ? processedResults.urgent.filter(item => item.type === "at_least") : [];
              
              return electiveItems.length > 0 ? (
                <div className="space-y-2">
                  {electiveItems.map((courseGroup, idx) => {
                    const selectedCourse = selectedElectiveCourses[idx];
                    const selectedCoursesList = Array.isArray(selectedCourse) ? selectedCourse : (selectedCourse ? [selectedCourse] : []);
                    
                    return (
                      <div key={idx} className="p-3 bg-red-900 border border-red-600 rounded">
                        <div className="font-medium text-red-100">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm text-red-200">
                              Choose {courseGroup.count || courseGroup.courses.length}:
                            </span>
                            {selectedCoursesList.length > 0 && (
                              <button
                                onClick={() => resetElectiveCourseSelection(idx)}
                                className="text-xs bg-slate-600/50 hover:bg-slate-500/50 text-white px-2 py-1 rounded transition-colors"
                              >
                                Reset All
                              </button>
                            )}
                          </div>
                          <div className="text-xs text-red-300 mb-2">
                            Selected: {selectedCoursesList.length} / {courseGroup.count || courseGroup.courses.length}
                          </div>
                          
                          {/* Selected courses - shown above */}
                          {selectedCoursesList.length > 0 && (
                            <div className="mb-3">
                              <div className="text-xs text-green-200 mb-2">Selected:</div>
                              <div className="space-y-1">
                                {selectedCoursesList.map((selectedCourse, selectedIdx) => (
                                  <ElectiveCourseDisplay key={selectedIdx} courseCode={selectedCourse} />
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Available course options */}
                          <div className="grid grid-cols-1 gap-2">
                            {courseGroup.courses.map((course, courseIdx) => {
                              const isSelected = selectedCoursesList.includes(course);
                              const hasAvailable = hasAvailableSections(course);
                              return (
                                <ElectiveCourseOption
                                  key={courseIdx}
                                  courseCode={course}
                                  isSelected={isSelected}
                                  hasAvailable={hasAvailable}
                                  onClick={() => selectElectiveCourse(idx, course, "at_least")}
                                />
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-slate-400 text-center py-8">
                  <div className="text-4xl mb-4">📚</div>
                  <p>Elective courses will appear here when available</p>
                </div>
              );
            })()}
          </div>
        </div>
        </div>
      </main>

      {/* Conflict Popup */}
      {conflictPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-600 rounded-lg p-6 max-w-lg mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">⚠️ Schedule Conflict Detected</h3>
            
            <div className="mb-4">
              <p className="text-slate-300 mb-3">
                The following sections you're trying to add conflict with existing sections:
              </p>
              
              {/* Show sections being added */}
              <div className="mb-4">
                <div className="text-sm font-medium text-blue-300 mb-2">Sections to be added:</div>
                <div className="space-y-2">
                  {conflictPopup.sectionsToAdd.map((section, idx) => {
                    const hasConflicts = conflictPopup.conflicts.some(conflict => 
                      findConflictingSections(section).some(c => c.sectionId === conflict.sectionId)
                    );
                    return (
                      <div key={idx} className={`rounded p-3 ${
                        hasConflicts 
                          ? "bg-orange-900/50 border border-orange-600" 
                          : "bg-slate-700"
                      }`}>
                        <div className="text-sm font-medium text-blue-300 mb-1">
                          {section.dept} {section.code} {section.sectionType}
                        </div>
                        <div className="text-xs text-slate-400">
                          {section.days.join(", ")} {section.times.start} - {section.times.end}
                        </div>
                        {hasConflicts && (
                          <div className="text-xs text-orange-300 mt-1">⚠️ Has conflicts</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Show conflicting existing sections */}
              <div>
                <div className="text-sm font-medium text-red-300 mb-2">Conflicting existing sections:</div>
                <div className="space-y-2">
                  {conflictPopup.conflicts.map((conflict, idx) => (
                    <div key={idx} className="bg-red-900/50 border border-red-600 rounded p-3">
                      <div className="text-sm font-medium text-red-300 mb-1">
                        {conflict.section.dept} {conflict.section.code} {conflict.section.sectionType}
                      </div>
                      <div className="text-xs text-red-200">
                        {conflict.section.days.join(", ")} {conflict.section.times.start} - {conflict.section.times.end}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleConflictCancel}
                className="flex-1 bg-slate-600 hover:bg-slate-700 text-white py-2 px-4 rounded transition-colors"
              >
                Go Back
              </button>
              <button
                onClick={handleConflictAddAnyway}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded transition-colors"
              >
                Add Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Scheduler;
