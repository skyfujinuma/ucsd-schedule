import { useState } from 'react';

function App() {
  const [form, setForm] = useState({
    major: '',
    completedCourses: '',
  });

  
  const [results, setResults] = useState({ 
    unmet: [], 
    urgent: [],
    sections: [],
    future: [], });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  async function handleSubmit(e) {
    e.preventDefault();
  
    const completedCourses = form.completedCourses
      .split(',')
      .map(c => c.trim())
      .filter(c => c);
  
      try {
        const response = await fetch("http://localhost:3001/api/suggest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            major: form.major,
            completed: completedCourses
          }),
        });
      
        if (!response.ok) throw new Error("Failed to fetch suggest");
      
        const data = await response.json();

        console.log("Suggest API response:", data);

        setResults({
          urgent: Array.isArray(data.urgent) ? data.urgent : [],
          future: Array.isArray(data.future) ? data.future : [],
          sections: Array.isArray(data.sections) ? data.sections : []
        });
      } catch (err) {
        console.error(err);
        setResults({ urgent: [], future: [], sections: [] });
      }
  }
  function groupSections(sections) {
    const grouped = [];
    let currentLecture = null;
  
    for (const sec of sections) {
      if (sec.sectionType === "LE") {
        currentLecture = { lecture: sec, discussions: [], labs: [] };
        grouped.push(currentLecture);
      } else if (currentLecture) {
        if (sec.sectionType === "DI") currentLecture.discussions.push(sec);
        if (sec.sectionType === "LA") currentLecture.labs.push(sec);
      }
    }
  
    return grouped;
  }
  
  function renderCourseItem(item) {
    if (!item) return "Unknown";
  
    if (item.type === "string") {
      const courseName = typeof item.course === "string" 
        ? item.course 
        : JSON.stringify(item.course); // fallback if it's an object
  
      return item.missingPrereqs?.length
        ? `${courseName} (needs: ${item.missingPrereqs.join(", ")})`
        : courseName;
    }
  
    if (item.type === "one" && Array.isArray(item.courses)) {
      return item.courses.join(" / ");
    }
  
    return "Unknown course format";
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
              onChange={handleChange}
              className="w-full border rounded p-2"
            >
              <option value="">Select</option>
              <option value="CS25">B.S. Computer Engineering</option>
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
                  <li key={idx}>{renderCourseItem(item)}</li>
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

        {results.sections?.length > 0 && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-2">Available Sections</h2>
            <ul className="divide-y divide-gray-200">
              {groupSections(results.sections).map((group, idx) => (
                <li key={idx} className="py-4">
                  <div className="mb-2">
                    <strong>
                      {group.lecture.dept} {group.lecture.code} Lecture
                    </strong>
                    <div>{group.lecture.days.join(', ')} {group.lecture.times.start} - {group.lecture.times.end}</div>
                    <div>{group.lecture.buildingName} {group.lecture.roomNumber}</div>
                    <div>Prof: {group.lecture.professor}</div>
                    <div>Seats Remaining: {group.lecture.seatsRemaining ?? 'N/A'}</div>
                  </div>

                  {group.discussions.length > 0 && (
                    <div className="ml-4">
                      <strong>Discussions:</strong>
                      <ul className="list-disc ml-6">
                        {group.discussions.map((d, i) => (
                          <li key={i}>
                            {d.days.join(', ')} {d.times.start} - {d.times.end} ({d.buildingName} {d.roomNumber})
                            <span className="ml-2"> Seats Remaining: {d.seatsRemaining ?? "N/A"}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {group.labs.length > 0 && (
                    <div className="ml-4 mt-2">
                      <strong>Labs:</strong>
                      <ul className="list-disc ml-6">
                        {group.labs.map((l, i) => (
                          <li key={i}>
                            {l.days.join(', ')} {l.times.start} - {l.times.end} ({l.buildingName} {l.roomNumber})
                            <span className="ml-2">Seats Remaining: {l.seatsRemaining ?? "N/A"}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;
