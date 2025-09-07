import { useState, useEffect } from 'react';

function App() {
  const [form, setForm] = useState({
    major: '',
    completedCourses: '',
    college: ''
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
          college: form.college
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
                  sec => `${sec.dept} ${sec.code}`);
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

          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            disabled={loading}
          >
            {loading ? 'Generating...' : 'Generate Schedule'}
          </button>
        </form>

        {error && <p className="text-red-500 mt-4">{error}</p>}

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