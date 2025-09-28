import React, { useState } from 'react';
import moment from 'moment';

const SyllabusParser = ({ onEventsParsed, onClose }) => {
  const [syllabusText, setSyllabusText] = useState('');
  const [parsedEvents, setParsedEvents] = useState([]);

  // Parse syllabus text and extract schedule
  const parseSyllabus = (text) => {
    const events = [];
    
    // Extract course times
    const timeMatch = text.match(/Lecture: ([^\n]+)\nLab: ([^\n]+)/);
    if (timeMatch) {
      const [, lectureTime, labTime] = timeMatch;
      
      // Parse lecture schedule (M, W 1:00 – 2:15 pm)
      const lectureDaysMatch = lectureTime.match(/([A-Za-z,]+) (\d+:\d+) – (\d+:\d+) ([ap]m)/);
      if (lectureDaysMatch) {
        const [, days, startTime, endTime, period] = lectureDaysMatch;
        const lectureDays = days.split(',').map(day => day.trim());
        
        // Create recurring lecture events for the semester
        const semesterStart = moment('2025-08-25'); // Fall 2025 start
        const semesterEnd = moment('2025-12-17'); // Final exam date
        
        lectureDays.forEach(day => {
          let currentDate = semesterStart.clone();
          
          // Find first occurrence of this day
          while (currentDate.format('ddd').substring(0, 2) !== getDayAbbreviation(day)) {
            currentDate.add(1, 'day');
          }
          
          // Create events for each week until semester end
          while (currentDate.isBefore(semesterEnd)) {
            const startDateTime = parseTime(startTime, period, currentDate);
            const endDateTime = parseTime(endTime, period, currentDate);
            const duration = moment.duration(endDateTime.diff(startDateTime)).asMinutes();
            
            events.push({
              title: 'CMPE 306 Lecture',
              date: startDateTime,
              duration: duration,
              color: '#007aff',
              description: 'Introductory Circuit Theory - Performance Arts & Humanity 132',
              type: 'class',
              recurring: true
            });
            
            currentDate.add(1, 'week');
          }
        });
      }
    }

    // Extract exam dates from the schedule
    const examMatches = [
      { text: 'midterm exam 1', date: '10/06', color: '#ff9500' },
      { text: 'midterm exam 2', date: '11/10', color: '#ff9500' },
      { text: 'final exam', date: '12/17', color: '#ff2d55' }
    ];

    examMatches.forEach(exam => {
      const dateMatch = text.match(new RegExp(`${exam.text}.*?(\\d+/\\d+)`, 'i'));
      if (dateMatch) {
        const examDate = moment(`2025/${dateMatch[1]}`, 'YYYY/MM/DD').hour(13).minute(0); // 1:00 PM
        events.push({
          title: `CMPE 306 - ${exam.text}`,
          date: examDate,
          duration: 75, // 75 minutes
          color: exam.color,
          description: 'Exam - In Class',
          type: 'exam'
        });
      }
    });

    return events;
  };

  // Helper function to convert day string to abbreviation
  const getDayAbbreviation = (day) => {
    const days = { 'M': 'Mo', 'Tu': 'Tu', 'W': 'We', 'Th': 'Th', 'F': 'Fr', 'Sa': 'Sa', 'Su': 'Su' };
    return days[day] || day.substring(0, 2);
  };

  // Convert time string to Date object
  const parseTime = (timeString, period, baseDate) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    
    let hour = hours;
    if (period === 'pm' && hours !== 12) hour += 12;
    if (period === 'am' && hours === 12) hour = 0;
    
    return baseDate.clone().hour(hour).minute(minutes).second(0);
  };

  const handleParseSyllabus = () => {
    if (!syllabusText.trim()) return;
    
    const events = parseSyllabus(syllabusText);
    setParsedEvents(events);
  };

  const handleAddToCalendar = () => {
    if (parsedEvents.length > 0 && onEventsParsed) {
      onEventsParsed(parsedEvents);
      onClose();
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSyllabusText(e.target.result);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Import Class Schedule from Syllabus</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="event-form">
          <div className="form-group">
            <label>Upload Syllabus File (Text/PDF)</label>
            <input
              type="file"
              accept=".txt,.pdf"
              onChange={handleFileUpload}
              className="file-input"
            />
            <small>Or paste syllabus text below:</small>
          </div>

          <div className="form-group">
            <label>Syllabus Text</label>
            <textarea
              value={syllabusText}
              onChange={(e) => setSyllabusText(e.target.value)}
              placeholder="Paste your syllabus content here..."
              rows="10"
              style={{ width: '100%', fontFamily: 'monospace', fontSize: '12px' }}
            />
          </div>

          <div className="form-group">
            <button 
              onClick={handleParseSyllabus}
              className="save-btn"
              disabled={!syllabusText.trim()}
            >
              Parse Syllabus
            </button>
          </div>

          {parsedEvents.length > 0 && (
            <div className="form-group">
              <h4>Found {parsedEvents.length} Events:</h4>
              <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #ddd', padding: '10px' }}>
                {parsedEvents.map((event, index) => (
                  <div key={index} style={{ 
                    padding: '5px', 
                    margin: '5px 0', 
                    borderLeft: `3px solid ${event.color}`,
                    fontSize: '12px'
                  }}>
                    <strong>{event.title}</strong><br />
                    {event.date.format('MMM D, YYYY h:mm A')} • {event.duration}min
                  </div>
                ))}
              </div>
              
              <button 
                onClick={handleAddToCalendar}
                className="save-btn"
                style={{ marginTop: '10px', backgroundColor: '#34c759' }}
              >
                Add {parsedEvents.length} Events to Calendar
              </button>
            </div>
          )}

          <div className="form-info">
            <h4>Supported Format:</h4>
            <p>The parser looks for patterns like:</p>
            <ul>
              <li>"Lecture: M, W 1:00 – 2:15 pm"</li>
              <li>"midterm exam 1", "final exam" with dates</li>
              <li>Weekly schedule with dates</li>
            </ul>
          </div>

          <div className="form-actions">
            <button className="cancel-btn" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SyllabusParser;
