import { useState } from 'react';
import { suggestCourses } from './logic/scheduler';

function App() {
  const [form, setForm] = useState({
    major: '',
    college: '',
    completedCourses: '',
    preferences: ''
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const [results, setResults] = useState([]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const courses = suggestCourses({
      ...form,
      completedCourses: form.completedCourses.split(',').map(c => c.trim())
    });
    setResults(courses);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-xl mx-auto bg-white p-6 rounded-2xl shadow-lg">
        <h1 className="text-2xl font-bold mb-4">UCSD AI Course Scheduler</h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 font-medium">Major</label>
            <input
              type="text"
              name="major"
              value={form.major}
              onChange={handleChange}
              className="w-full border rounded p-2"
              placeholder="e.g. Computer Science"
            />
          </div>

          <div>
            <label className="block mb-1 font-medium">College</label>
            <select
              name="college"
              value={form.college}
              onChange={handleChange}
              className="w-full border rounded p-2"
            >
              <option value="">Select</option>
              <option value="Warren">Warren</option>
              <option value="Muir">Muir</option>
              <option value="Revelle">Revelle</option>
              <option value="Marshall">Marshall</option>
              <option value="ERC">ERC</option>
              <option value="Sixth">Sixth</option>
              <option value="Seventh">Seventh</option>
              <option value="Eigth">Eigth</option>
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
            <label className="block mb-1 font-medium">Preferences</label>
            <textarea
              name="preferences"
              value={form.preferences}
              onChange={handleChange}
              className="w-full border rounded p-2"
              placeholder="e.g. No early morning classes, prefer certain profs"
            />
          </div>

          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Generate Schedule
          </button>
        </form>

        {results.length > 0 && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-2">Suggested Courses</h2>
            <ul className="list-disc list-inside space-y-1">
              {results.map((course, idx) => (
                <li key={idx}>{course}</li>
              ))}
    </ul>
  </div>
)}

      </div>
    </div>
  );
}

export default App;
