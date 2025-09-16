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

  // Function to detect overlapping events and calculate stacking positions
  const calculateEventStacking = (dayEvents) => {
    const stackedEvents = [];
    
    dayEvents.forEach(event => {
      const overlappingEvents = dayEvents.filter(otherEvent => {
        if (otherEvent.id === event.id) return false;
        // Check if events overlap in time
        return (event.startTime < otherEvent.endTime && event.endTime > otherEvent.startTime);
      });
      
      // Find the highest stack level among overlapping events
      let stackLevel = 0;
      overlappingEvents.forEach(overlappingEvent => {
        const existingStack = stackedEvents.find(se => se.id === overlappingEvent.id);
        if (existingStack && existingStack.stackLevel >= stackLevel) {
          stackLevel = existingStack.stackLevel + 1;
        }
      });
      
      stackedEvents.push({
        ...event,
        stackLevel: stackLevel,
        totalStacks: Math.max(stackLevel + 1, overlappingEvents.length + 1)
      });
    });
    
    return stackedEvents;
  };

  const getEventStyle = (event, stackLevel = 0, totalStacks = 1) => {
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
    
    // Calculate stacking layout (horizontal only, no vertical offset)
    const stackWidth = totalStacks > 1 ? `${100 / totalStacks}%` : '100%';
    const stackLeft = totalStacks > 1 ? `${(stackLevel * 100) / totalStacks}%` : '0';
    
    return {
      position: 'absolute',
      left: stackLeft,
      width: stackWidth,
      borderRadius: '4px',
      fontSize: '12px',
      padding: '4px',
      borderLeft: `4px solid ${color.border}`,
      zIndex: 10 + stackLevel,
      backgroundColor: color.bg,
      color: color.text,
      top: `${((event.startTime - 420) / 60) * 60}px`,
      height: `${((event.endTime - event.startTime) / 60) * 60}px`,
      minHeight: '30px',
      boxShadow: stackLevel > 0 ? '2px 2px 4px rgba(0,0,0,0.3)' : 'none'
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

  // Get unique courses and their colors for the legend
  const getCourseLegend = () => {
    const uniqueCourses = new Map();
    
    events.forEach(event => {
      if (!uniqueCourses.has(event.course)) {
        // Get the color for this course using the same logic as getEventStyle
        const courseCode = event.course;
        const hash = courseCode.split('').reduce((a, b) => {
          a = ((a << 5) - a) + b.charCodeAt(0);
          return a & a;
        }, 0);
        
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
        
        uniqueCourses.set(event.course, color);
      }
    });
    
    return Array.from(uniqueCourses.entries());
  };

  return (
    <div className="mt-6">
      <h2 className="text-xl font-semibold mb-4 text-white">📅 Course Schedule Calendar</h2>
      
      {/* Calendar Grid */}
      <div className="bg-gray-700 rounded-lg shadow overflow-hidden border border-gray-600">
        <div className="flex border-b border-gray-600">
          {/* Time column header */}
          <div className="p-2 font-medium bg-gray-600 text-center border-r border-gray-600 text-white w-16 flex-shrink-0">
            Time
          </div>
          <div className="flex flex-1">
            {days.map(day => (
              <div key={day} className="p-3 font-medium bg-gray-600 text-center border-l border-gray-600 text-white flex-1">
                {day}
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex" style={{ height: '780px' }}>
          
          {/* Time indicators column */}
          <div className="border-r border-gray-600 w-16 flex-shrink-0" style={{ height: '780px' }}>
            {timeSlots.map(time => (
              <div key={time} className="h-15 border-b border-gray-600 relative">
                <span className="text-xs text-gray-300 font-medium absolute top-1 right-1">
                  {formatTime(time)}
                </span>
              </div>
            ))}
          </div>
          
          {/* Day columns container */}
          <div className="flex flex-1">
            {days.map(day => (
              <div key={day} className="relative border-r border-gray-600 flex-1" style={{ height: '780px' }}>
                {/* Time slot grid lines */}
                {timeSlots.map(time => (
                  <div key={time} className="h-15 border-b border-gray-600"></div>
                ))}
                
                {/* Events for this day */}
                {(() => {
                  const dayEvents = events.filter(event => event.day === day);
                  const stackedEvents = calculateEventStacking(dayEvents);
                  
                  return stackedEvents.map(event => (
                    <div
                      key={event.id}
                      style={getEventStyle(event, event.stackLevel, event.totalStacks)}
                      title={`${event.course} ${event.type} - ${formatProfessorWithRating(event.professor, event.professorRating)}${event.stackLevel > 0 ? ' (Stacked due to conflict)' : ''}`}
                    >
                      <div className="text-2xs font-medium truncate">{event.course}</div>
                      <div className="text-2xs truncate">{event.type}</div>
                      <div className="text-2xs truncate">{formatTime(event.startTime)} - {formatTime(event.endTime)}</div>
                      {event.stackLevel > 0 && (
                        <div className="text-2xs opacity-75">⚠️ Conflict</div>
                      )}
                    </div>
                  ));
                })()}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Legend */}
      {events.length > 0 && (
        <div className="mt-4">
          <div className="text-sm text-gray-300 mb-2">Course Legend</div>
          <div className="flex flex-wrap gap-4 text-sm">
            {getCourseLegend().map(([course, color]) => (
              <div key={course} className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded border-l-4" 
                  style={{ 
                    backgroundColor: color.bg, 
                    borderLeftColor: color.border 
                  }}
                ></div>
                <span className="text-white">{course}</span>
              </div>
            ))}
          </div>
          {(() => {
            const hasConflicts = events.some(event => {
              const dayEvents = events.filter(e => e.day === event.day);
              return dayEvents.some(otherEvent => 
                otherEvent.id !== event.id && 
                event.startTime < otherEvent.endTime && 
                event.endTime > otherEvent.startTime
              );
            });
            
            return hasConflicts && (
              <div className="mt-3 p-2 bg-orange-900/30 border border-orange-600 rounded text-sm">
                <div className="flex items-center gap-2 text-orange-300">
                  <span>⚠️</span>
                  <span>There are time conflicts between the sections you're trying to add</span>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default Calendar;