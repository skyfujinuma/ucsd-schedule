import { useState } from 'react';

function App() {
  const [form, setForm] = useState({
    major: '',
    completedCourses: '',
  });

  const [results, setResults] = useState({ unmet: [], sections: [] });
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
      const response = await fetch("http://localhost:3001/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          major: form.major,
          completed: completedCourses
        }),
      });
  
      if (!response.ok) throw new Error("Failed to fetch schedule");
  
      const data = await response.json();
      // Make sure data.unmet exists and is an array
      setResults({
        unmet: Array.isArray(data.unmet) ? data.unmet : [],
        sections: Array.isArray(data.sections) ? data.sections : []
      });
    } catch (err) {
      console.error(err);
      setResults([]);
    }
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

        {results.unmet.length > 0 && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-2">Suggested Courses</h2>
            <ul className="list-disc list-inside space-y-1">
              {results.unmet.map((course, idx) => {
                // If it's a string, render directly
                if (typeof course === "string") return <li key={idx}>{course}</li>;

                // If it's a 'one-of' object
                if (course.type === "one" && Array.isArray(course.courses)) {
                  return <li key={idx}>{course.courses.join(" / ")}</li>;
                }

                // Fallback: stringify any other unexpected object
                return <li key={idx}>{JSON.stringify(course)}</li>;
              })}
            </ul>
          </div>
        )}

        {results.sections.length > 0 && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-2">Available Sections</h2>
            <ul className="divide-y divide-gray-200">
              {results.sections.map((s, idx) => (
                <li key={idx} className="py-2">
                  <strong>{s.dept} {s.code} {s.sectionType}</strong>
                  <div>{s.days.join(', ')} {s.times.start} - {s.times.end}</div>
                  <div>{s.buildingName} {s.roomNumber}</div>
                  <div>Prof: {s.professor}</div>
                  <div>Seats Remaining: {s.seatsRemaining ?? 'N/A'}</div>
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
