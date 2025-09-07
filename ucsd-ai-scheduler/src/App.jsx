import { useState, useEffect } from 'react';

function App() {
  const [form, setForm] = useState({
    major: '',
    completedCourses: '',
    college: '',
    honorsSequence: false
  });

  const [majors, setMajors] = useState([]);
  const [results, setResults] = useState({ 
    unmet: [], 
    urgent: [],
    sections: [],
    future: [], 
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [colleges, setColleges] = useState([]);
  const [selectedCollege, setSelectedCollege] = useState("");
  
  // AI filtering state
  const [aiQuery, setAiQuery] = useState("");
  const [aiResults, setAiResults] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  
  useEffect(() => {
    async function fetchMajors() {
      try {
        const response = await fetch("http://localhost:3001/api/major-reqs");
        if (!response.ok) throw new Error("Failed to fetch majors");
        const data = await response.json();
        const majorList = Object.values(data).map(major => ({
          code: major.code,
          name: major.major
        }));
        setMajors(majorList);
      } catch (err) {
        console.error(err);
        setMajors([]);
      }
    }
    fetchMajors();
  }, []);

  useEffect(() => {
    async function fetchColleges() {
      try {
        const response = await fetch("http://localhost:3001/api/colleges");
        if (!response.ok) throw new Error("Failed to fetch colleges");
        const data = await response.json();
  
        // Assuming data is an array of objects like { code, name }
        setColleges(data);
      } catch (err) {
        console.error(err);
        setColleges([]);
      }
    }
    fetchColleges();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  async function handleSubmit(e) {
    e.preventDefault();
  
    if (!form.major) {
      setError("Please select a major.");
      return;
    }

    if (!form.college) {
      setError("Please select a college");
      return;
    }

    const completedCourses = form.completedCourses
      .split(',')
      .map(c => c.trim())
      .filter(c => c);

    setLoading(true);
    setError(null);
  
    try {
      const response = await fetch("http://localhost:3001/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          major: form.major,
          completed: completedCourses,
          college: form.college,
          honorsSequence: form.honorsSequence
        }),
      });
    
      if (!response.ok) throw new Error("Failed to fetch suggest");
    
      const data = await response.json();
      setResults({
        urgent: Array.isArray(data.urgent) ? data.urgent : [],
        future: Array.isArray(data.future) ? data.future : [],
        sections: Array.isArray(data.sections) ? data.sections : []
      });
    } catch (err) {
      console.error(err);
      setResults({ urgent: [], future: [], sections: [] });
    } finally {
      setLoading(false);
    }
  }

  async function handleAiFilter() {
    if (!aiQuery.trim() || !form.major) {
      alert("Please enter a query and select a major first");
      return;
    }

    setAiLoading(true);
    try {
      const completedCourses = form.completedCourses.split(',').map(c => c.trim()).filter(c => c);
      const allCourses = [...results.urgent, ...results.future];
      
      const response = await fetch("http://localhost:3001/api/ai-filter-courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userQuery: aiQuery,
          courses: allCourses,
          completedCourses,
          major: form.major
        })
      });

      if (!response.ok) throw new Error("Failed to filter courses with AI");
      const data = await response.json();
      setAiResults(data);
    } catch (err) {
      console.error(err);
      alert("Failed to filter courses with AI");
    } finally {
      setAiLoading(false);
    }
  }

  function groupSections(sections) {
    const grouped = [];
    let currentLecture = null;
  
    for (const sec of sections) {
      if (sec.sectionType === "LE" || sec.sectionType == "SE") {
        currentLecture = { lecture: sec, discussions: [], labs: [] };
        grouped.push(currentLecture);
      } else if (currentLecture) {
        if (sec.sectionType === "DI") currentLecture.discussions.push(sec);
        if (sec.sectionType === "LA") currentLecture.labs.push(sec);
        if (sec.sectionType === "SE") currentLecture.seminars.push(sec);
      }
    }
  
    return grouped;
  }

  function renderCourseItem(item) {
    if (!item) return "Unknown";
  
    if (item.type === "string") {
      const courseName = typeof item.course === "string" 
        ? item.course 
        : JSON.stringify(item.course);
      return item.missingPrereqs?.length
        ? `${courseName} (needs: ${item.missingPrereqs.join(", ")})`
        : courseName;
    }
  
    if (item.type === "one" && Array.isArray(item.courses)) {
      return item.courses.join(" / ");
    }
    
    if (item.type === "at_least" && Array.isArray(item.courses)) {
      return `Take at least ${item.count} of: ${item.courses.join(", ")}`;
    }
  
    return "Unknown course format";
  }

  function RenderUrgentItem({ item, sections }) {
    const [open, setOpen] = useState(false);
  
    if (item.type === "one") {
      return (
        <div className="mb-2">
          <button
            onClick={() => setOpen(!open)}
            className="text-left w-full font-medium flex justify-between items-center"
          >
            <span>{item.courses.join(" / ")}</span>
            <span>{open ? "▲" : "▼"}</span>
          </button>
          {open && (
            <div className="ml-4 mt-2">
              {item.courses.map((c, idx) => {
                const secForCourse = sections.filter(
                  sec => `${sec.dept} ${sec.code}`.toUpperCase().trim() === c.toUpperCase().trim());
                if (secForCourse.length === 0) return null;
  
                return (
                  <div key={idx} className="mt-2">
                    <strong>{c}</strong>
                    <ul className="ml-4">
                      {groupSections(secForCourse).map((group, gIdx) => (
                        <li key={gIdx}>
                          <div>
                            Lecture: {group.lecture.days.join(", ")}{" "}
                            {group.lecture.times.start} - {group.lecture.times.end}
                            {" | "}
                            Prof: {group.lecture.professor}{" "}
                            (Seats: {group.lecture.seatsRemaining ?? "N/A"})
                          </div>
                          {group.discussions.length > 0 && (
                            <div className="ml-4">
                              Discussions:
                              <ul className="list-disc ml-6">
                                {group.discussions.map((d, i) => (
                                  <li key={i}>
                                    {d.days.join(", ")} {d.times.start} - {d.times.end}{" "}
                                    ({d.buildingName} {d.roomNumber}) Seats:{" "}
                                    {d.seatsRemaining ?? "N/A"}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }
  
    // For non-"one" items, same dropdown pattern
    const courseLabel = renderCourseItem(item);
    const secForCourse = sections.filter(
      sec => `${sec.dept} ${sec.code}`.toUpperCase().trim() === courseLabel.toUpperCase().trim()
    );
  
    return (
      <div className="mb-2">
        <button
          onClick={() => setOpen(!open)}
          className="text-left w-full font-medium flex justify-between items-center"
        >
          <span>{courseLabel}</span>
          <span>{open ? "▲" : "▼"}</span>
        </button>
        {open && secForCourse.length > 0 && (
          <div className="ml-4 mt-2">
            {groupSections(secForCourse).map((group, gIdx) => (
              <div key={gIdx} className="mb-2">
                {/* Lecture */}
                {group.lecture && (
                  <div>
                    Lecture: {group.lecture.days.join(", ")}{" "}
                    {group.lecture.times.start} - {group.lecture.times.end} |{" "}
                    Prof: {group.lecture.professor} (Seats: {group.lecture.seatsRemaining ?? "N/A"})
                  </div>
                )}

                {/* Discussions */}
                {group.discussions.length > 0 && (
                  <div className="ml-4">
                    Discussions:
                    <ul className="list-disc ml-6">
                      {group.discussions.map((d, i) => (
                        <li key={i}>
                          {d.days.join(", ")} {d.times.start} - {d.times.end} ({d.buildingName} {d.roomNumber}) Seats:{" "}
                          {d.seatsRemaining ?? "N/A"}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Labs */}
                {group.labs.length > 0 && (
                  <div className="ml-4">
                    Labs:
                    <ul className="list-disc ml-6">
                      {group.labs.map((l, i) => (
                        <li key={i}>
                          {l.days.join(", ")} {l.times.start} - {l.times.end} ({l.buildingName} {l.roomNumber}) Seats:{" "}
                          {l.seatsRemaining ?? "N/A"}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Seminars */}
                {group.seminars && group.seminars.length > 0 && (
                  <div className="ml-4">
                    Seminars:
                    <ul className="list-disc ml-6">
                      {group.seminars.map((s, i) => (
                        <li key={i}>
                          {s.days.join(", ")} {s.times.start} - {s.times.end} ({s.buildingName} {s.roomNumber}) Seats:{" "}
                          {s.seatsRemaining ?? "N/A"}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-xl mx-auto bg-white p-6 rounded-2xl shadow-lg">
        <h1 className="text-2xl font-bold mb-4">UCSD AI Course Scheduler</h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 font-medium">Major</label>
            <select
              name="major"
              value={form.major}
              onChange={e => setForm({ ...form, major: e.target.value })}
              className="w-full border rounded p-2"
            >
              <option value="">Select</option>
              {majors.map(m => (<option key={m.code} value={m.code}>{m.name}</option>))}
            </select>
          </div>

          <div>
            <label className="block mb-1 font-medium">College</label>
            <select
              name="college"
              value={form.college}
              onChange={handleChange}
              className="w-full border rounded p-2"
            >
              <option value="">Select a college</option>
              {colleges.map((c) => (
                <option key={c.name} value={c.code}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1 font-medium">Completed Courses</label>
            <textarea
              name="completedCourses"
              value={form.completedCourses}
              onChange={handleChange}
              className="w-full border rounded p-2"
              placeholder="e.g. CSE 11, MATH 20C"
            />
          </div>

          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                name="honorsSequence"
                checked={form.honorsSequence}
                onChange={(e) => setForm({ ...form, honorsSequence: e.target.checked })}
                className="rounded"
              />
              <span className="font-medium">Use Honors Math Sequence (MATH 31AH, 31BH, 31CH)</span>
            </label>
            <p className="text-sm text-gray-600 mt-1">
              Check this if you want to take the honors math sequence instead of the regular sequence (MATH 18, 20C, etc.)
            </p>
          </div>

          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            disabled={loading}
          >
            {loading ? 'Generating...' : 'Generate Schedule'}
          </button>
        </form>

        {error && <p className="text-red-500 mt-4">{error}</p>}

        {/* AI Course Filtering Section */}
        {results.urgent.length > 0 || results.future.length > 0 ? (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">🤖 AI Course Filter</h2>
            <p className="text-gray-600 mb-4">
              Ask AI to help you find courses based on your interests, career goals, or specific requirements.
            </p>
            
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                placeholder="e.g., 'courses for machine learning', 'easy courses to boost GPA', 'courses for software engineering'"
                className="flex-1 border rounded p-2"
                onKeyPress={(e) => e.key === 'Enter' && handleAiFilter()}
              />
              <button
                onClick={handleAiFilter}
                disabled={aiLoading || !aiQuery.trim()}
                className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:bg-gray-400"
              >
                {aiLoading ? 'Filtering...' : 'Filter with AI'}
              </button>
            </div>

            {aiResults && (
              <div className="mt-4 p-4 bg-white rounded border">
                <h3 className="font-semibold text-lg mb-2">🎯 AI Recommendations</h3>
                <p className="text-gray-700 mb-4">{aiResults.summary}</p>
                
                {aiResults.filtered_courses && aiResults.filtered_courses.length > 0 ? (
                  <div className="space-y-3">
                    {aiResults.filtered_courses.map((course, idx) => (
                      <div key={idx} className="p-3 border rounded bg-blue-50">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium text-blue-900">{course.course_code}</h4>
                            <p className="text-sm text-gray-600 mt-1">{course.reason}</p>
                            <div className="flex gap-4 mt-2 text-xs">
                              <span className={`px-2 py-1 rounded ${course.prerequisites_met ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                Prereqs: {course.prerequisites_met ? 'Met' : 'Not Met'}
                              </span>
                              <span className="px-2 py-1 rounded bg-gray-100 text-gray-800">
                                Difficulty: {course.difficulty}
                              </span>
                              <span className="px-2 py-1 rounded bg-blue-100 text-blue-800">
                                Relevance: {Math.round(course.relevance_score * 100)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No courses found matching your criteria.</p>
                )}
                
                {aiResults.recommendations && (
                  <div className="mt-4 p-3 bg-yellow-50 rounded border-l-4 border-yellow-400">
                    <h4 className="font-medium text-yellow-800">💡 Recommendations</h4>
                    <p className="text-yellow-700 mt-1">{aiResults.recommendations}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}

        <div className="mt-6 grid grid-cols-2 gap-6">
          <div>
            <h2 className="text-xl font-semibold">Urgent Courses</h2>
            <ul className="list-disc ml-6">
              {results.urgent.length > 0 ? (
                results.urgent.map((item, idx) => (
                  <li key={idx}>
                    <RenderUrgentItem item={item} sections={results.sections} />
                  </li>
                ))
              ) : (
                <li>None</li>
              )}
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold">Future Courses</h2>
            <ul className="list-disc ml-6">
              {results.future.length > 0 ? (
                results.future.map((item, idx) => (
                  <li key={idx}>{renderCourseItem(item)}</li>
                ))
              ) : (
                <li>None</li>
              )}
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;