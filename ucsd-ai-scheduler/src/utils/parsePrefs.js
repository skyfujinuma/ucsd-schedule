export async function parsePreferences(preferencesText) {
    try {
      const res = await fetch("http://localhost:3001/api/preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ preferencesText }),
      });
  
      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }
  
      const parsed = await res.json();
      return parsed;
    } catch (error) {
      console.error("Failed to fetch preferences:", error);
      return {}; // fallback if API fails
    }
  }
  