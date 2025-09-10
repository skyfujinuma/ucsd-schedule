import { useMemo } from 'react';

const Calendar = ({ sections = [], selectedSections = new Set(), onToggleSection }) => {

  // Parse time string like "15:30" (24-hour format) to minutes since midnight
  const parseTime = (timeStr) => {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Convert minutes to time string
  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
    return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
  };

  // Create events from sections
  const events = useMemo(() => {
    const eventList = [];
    
    sections.forEach(section => {
      const sectionId = `${section.dept} ${section.code} ${section.sectionType} ${section.days.join('')} ${section.times.start}`;
      
      // Only process if this specific section is selected
      if (!selectedSections.has(sectionId)) return;
      
      // Create event for each day
      section.days.forEach(day => {
        const event = {
          id: sectionId,
          course: `${section.dept} ${section.code}`,
          type: section.sectionType === 'LE' ? 'Lecture' : 
                section.sectionType === 'DI' ? 'Discussion' :
                section.sectionType === 'LA' ? 'Lab' : 'Seminar',
          day: day,
          startTime: parseTime(section.times.start),
          endTime: parseTime(section.times.end),
          professor: section.professor,
          professorRating: section.professor_rating,
          location: `${section.buildingName} ${section.roomNumber}`,
          section: section.sectionType
        };
        eventList.push(event);
      });
    });
    
    return eventList;
  }, [sections, selectedSections]);

  const days = ['M', 'Tu', 'W', 'Th', 'F'];
  
  // Create time slots from 7 AM to 8 PM
  const timeSlots = [];
  for (let hour = 7; hour <= 20; hour++) {
    timeSlots.push(hour * 60);
  }

  const getEventStyle = (event) => {
    // Create a simple hash from the course code to get consistent colors
    const courseCode = event.course;
    const hash = courseCode.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    // Use the hash to select from a predefined color palette
    const colorPalette = [
      { bg: '#3B82F6', border: '#1D4ED8', text: '#FFFFFF' }, // Blue
      { bg: '#10B981', border: '#047857', text: '#FFFFFF' }, // Green
      { bg: '#F59E0B', border: '#D97706', text: '#FFFFFF' }, // Orange
      { bg: '#8B5CF6', border: '#7C3AED', text: '#FFFFFF' }, // Purple
      { bg: '#EF4444', border: '#DC2626', text: '#FFFFFF' }, // Red
      { bg: '#06B6D4', border: '#0891B2', text: '#FFFFFF' }, // Cyan
      { bg: '#84CC16', border: '#65A30D', text: '#FFFFFF' }, // Lime
      { bg: '#F97316', border: '#EA580C', text: '#FFFFFF' }, // Orange
      { bg: '#EC4899', border: '#DB2777', text: '#FFFFFF' }, // Pink
      { bg: '#6366F1', border: '#4F46E5', text: '#FFFFFF' }, // Indigo
    ];
    
    const colorIndex = Math.abs(hash) % colorPalette.length;
    const color = colorPalette[colorIndex];
    
    return {
      position: 'absolute',
      left: '0',
      right: '0',
      borderRadius: '4px',
      fontSize: '12px',
      padding: '4px',
      borderLeft: `4px solid ${color.border}`,
      zIndex: 10,
      backgroundColor: color.bg,
      color: color.text,
      top: `${((event.startTime - 420) / 60) * 48}px`,
      height: `${((event.endTime - event.startTime) / 60) * 48}px`,
      minHeight: '24px'
    };
  };

  const formatProfessorWithRating = (professor, professorRating) => {
    if (!professor) return "TBA";
    if (!professorRating) return professor;
    
    const stars = "★".repeat(Math.floor(professorRating.rating || 0));
    const rating = professorRating.rating ? professorRating.rating.toFixed(1) : "N/A";
    const difficulty = professorRating.difficulty ? professorRating.difficulty.toFixed(1) : "N/A";
    const numRatings = professorRating.num_ratings || 0;
    
    return `${professor} ${stars} (${rating}/5, ${difficulty}/5 difficulty, ${numRatings} ratings)`;
  };

  return (
    <div className="mt-6">
      <h2 className="text-xl font-semibold mb-4 text-white">📅 Course Schedule Calendar</h2>
      
      {/* Calendar Grid */}
      <div className="bg-gray-700 rounded-lg shadow overflow-hidden border border-gray-600">
        <div className="grid grid-cols-5 border-b border-gray-600">
          {days.map(day => (
            <div key={day} className="p-3 font-medium bg-gray-600 text-center border-l border-gray-600 text-white">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-5" style={{ height: '624px' }}>
          
          {/* Day columns */}
          {days.map(day => (
            <div key={day} className="relative border-r border-gray-600" style={{ height: '624px' }}>
              {/* Time slot grid lines */}
              {timeSlots.map(time => (
                <div key={time} className="h-12 border-b border-gray-600"></div>
              ))}
              
              {/* Events for this day */}
              {events
                .filter(event => event.day === day)
                .map(event => (
                  <div
                    key={event.id}
                    style={getEventStyle(event)}
                    title={`${event.course} ${event.type} - ${formatProfessorWithRating(event.professor, event.professorRating)}`}
                  >
                    <div className="text-2xs font-medium truncate">{event.course}</div>
                    <div className="text-2xs truncate">{event.type}</div>
                    <div className="text-2xs truncate">{formatTime(event.startTime)} - {formatTime(event.endTime)}</div>
                  </div>
                ))}
            </div>
          ))}
        </div>
      </div>
      
      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-100 border-l-4 border-blue-500 rounded"></div>
          <span>Lecture</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-100 border-l-4 border-green-500 rounded"></div>
          <span>Discussion</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-purple-100 border-l-4 border-purple-500 rounded"></div>
          <span>Lab</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-orange-100 border-l-4 border-orange-500 rounded"></div>
          <span>Seminar</span>
        </div>
      </div>
    </div>
  );
};

export default Calendar;