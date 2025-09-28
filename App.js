import React, { useState } from 'react';
import moment from 'moment';
import SyllabusParser from './SyllabusParser';
import './App.css';

function App() {
  const [currentWeek, setCurrentWeek] = useState(moment());
  const [showEventForm, setShowEventForm] = useState(false);
  const [showClassForm, setShowClassForm] = useState(false);
  const [showSyllabusParser, setShowSyllabusParser] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    date: moment(),
    duration: 60,
    color: '#007aff',
    description: ''
  });

  const [events, setEvents] = useState([
    { id: 1, title: 'Team Meeting', date: moment().hour(10).minute(0), duration: 60, color: '#007aff', description: 'Weekly team sync' },
    { id: 2, title: 'Lunch with Alex', date: moment().add(1, 'day').hour(12).minute(30), duration: 45, color: '#34c759', description: 'At Italian restaurant' },
    { id: 3, title: 'Project Review', date: moment().add(3, 'day').hour(14).minute(0), duration: 90, color: '#ff9500', description: 'Quarterly project review' },
    { id: 4, title: 'Dentist Appointment', date: moment().add(5, 'day').hour(11).minute(0), duration: 30, color: '#af52de', description: 'Regular checkup' },
  ]);

  // Add this function to handle parsed events
  const handleEventsParsed = (newEvents) => {
    const eventsWithIds = newEvents.map((event, index) => ({
      ...event,
      id: events.length + index + 1
    }));
    setEvents([...events, ...eventsWithIds]);
  };

  // Generate week days
  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const date = currentWeek.clone().startOf('week').add(i, 'days');
    return {
      date: date.toDate(),
      dayName: date.format('ddd'),
      dayNumber: date.date(),
      isToday: date.isSame(moment(), 'day'),
      isWeekend: date.day() === 0 || date.day() === 6,
      fullDate: date.format('YYYY-MM-DD')
    };
  });

  // Generate time slots (8 AM to 6 PM)
  const timeSlots = Array.from({ length: 11 }).map((_, i) => {
    const hour = i + 8;
    return {
      hour: hour,
      display: hour <= 12 ? `${hour} AM` : `${hour === 12 ? 12 : hour - 12} PM`,
      time: `${hour.toString().padStart(2, '0')}:00`
    };
  });

  // Navigation
  const goToPreviousWeek = () => {
    setCurrentWeek(currentWeek.clone().subtract(1, 'week'));
  };

  const goToNextWeek = () => {
    setCurrentWeek(currentWeek.clone().add(1, 'week'));
  };

  const goToToday = () => {
    setCurrentWeek(moment());
  };

  // Get events for a specific day
  const getEventsForDay = (day) => {
    return events.filter(event => 
      moment(event.date).format('YYYY-MM-DD') === day.fullDate
    );
  };

  // Calculate event position
  const calculateEventStyle = (event) => {
    const eventStart = moment(event.date);
    const eventEnd = eventStart.clone().add(event.duration, 'minutes');
    
    const startHour = eventStart.hour() + (eventStart.minute() / 60);
    const endHour = eventEnd.hour() + (eventEnd.minute() / 60);
    
    const top = ((startHour - 8) / 11) * 100;
    const height = ((endHour - startHour) / 11) * 100;
    
    return {
      top: `${top}%`,
      height: `${height}%`,
      backgroundColor: event.color
    };
  };

  // Get upcoming events
  const getUpcomingEvents = () => {
    const today = moment().startOf('day');
    const nextWeek = today.clone().add(7, 'days');
    
    return events
      .filter(event => moment(event.date).isSameOrAfter(today) && moment(event.date).isBefore(nextWeek))
      .sort((a, b) => moment(a.date) - moment(b.date))
      .slice(0, 10);
  };

  // Group upcoming events by day
  const upcomingEvents = getUpcomingEvents();
  const eventsByDay = upcomingEvents.reduce((acc, event) => {
    const dayKey = moment(event.date).format('YYYY-MM-DD');
    if (!acc[dayKey]) {
      acc[dayKey] = [];
    }
    acc[dayKey].push(event);
    return acc;
  }, {});

  // Open event form for a specific date/time
  const openEventForm = (day, hour) => {
    setNewEvent({
      title: '',
      date: moment(day.fullDate).hour(hour).minute(0),
      duration: 60,
      color: '#007aff',
      description: ''
    });
    setShowEventForm(true);
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewEvent(prev => ({
      ...prev,
      [name]: name === 'duration' ? parseInt(value) : value
    }));
  };

  // Handle date change separately
  const handleDateChange = (e) => {
    const newDate = moment(e.target.value);
    setNewEvent(prev => ({
      ...prev,
      date: newDate.hour(prev.date.hour()).minute(prev.date.minute())
    }));
  };

  // Handle time change
  const handleTimeChange = (e) => {
    const [hours, minutes] = e.target.value.split(':').map(Number);
    setNewEvent(prev => ({
      ...prev,
      date: prev.date.hour(hours).minute(minutes)
    }));
  };

  // Add new event manually
  const addManualEvent = (e) => {
    e.preventDefault();
    if (!newEvent.title.trim()) return;

    const eventToAdd = {
      id: events.length + 1,
      title: newEvent.title,
      date: newEvent.date,
      duration: newEvent.duration,
      color: newEvent.color,
      description: newEvent.description
    };

    setEvents([...events, eventToAdd]);
    setShowEventForm(false);
    setNewEvent({
      title: '',
      date: moment(),
      duration: 60,
      color: '#007aff',
      description: ''
    });
  };

  // Quick add event (click on calendar)
  const quickAddEvent = (day, hour) => {
    const colors = ['#007aff', '#34c759', '#ff9500', '#af52de', '#ff2d55', '#5856d6'];
    const eventToAdd = {
      id: events.length + 1,
      title: 'New Event',
      date: moment(day.fullDate).hour(hour).minute(0),
      duration: 60,
      color: colors[Math.floor(Math.random() * colors.length)],
      description: ''
    };
    setEvents([...events, eventToAdd]);
  };

  // Edit existing event
  const editEvent = (event) => {
    setNewEvent(event);
    setShowEventForm(true);
  };

  // Handle class schedule file upload
  const handleClassFileUpload = (e) => {
    e.preventDefault();
    // Simulate file processing - in real app, this would read the file
    alert('Class schedule file would be processed here! This would extract dates and add classes to the calendar.');
    
    // Simulate adding sample classes from file
    const sampleClasses = [
      {
        id: events.length + 1,
        title: 'Math 101',
        date: moment().add(1, 'day').hour(9).minute(0),
        duration: 90,
        color: '#5856d6',
        description: 'Calculus I'
      },
      {
        id: events.length + 2,
        title: 'Computer Science',
        date: moment().add(3, 'day').hour(11).minute(0),
        duration: 120,
        color: '#af52de',
        description: 'Data Structures'
      },
      {
        id: events.length + 3,
        title: 'Physics Lab',
        date: moment().add(5, 'day').hour(14).minute(0),
        duration: 180,
        color: '#007aff',
        description: 'Lab Session'
      }
    ];
    
    setEvents([...events, ...sampleClasses]);
    setShowClassForm(false);
  };

  // Color options for events
  const colorOptions = [
    { value: '#007aff', label: 'Blue' },
    { value: '#34c759', label: 'Green' },
    { value: '#ff9500', label: 'Orange' },
    { value: '#af52de', label: 'Purple' },
    { value: '#ff2d55', label: 'Pink' },
    { value: '#5856d6', label: 'Indigo' }
  ];

  return (
    <div className="app-container">
      {/* Left Side - Compact Calendar */}
      <div className="calendar-side">
        <div className="calendar-header">
          <div className="header-left">
            <button className="today-btn" onClick={goToToday}>
              Today
            </button>
            <button 
              className="add-event-btn"
              onClick={() => {
                setNewEvent({
                  title: '',
                  date: moment(),
                  duration: 60,
                  color: '#007aff',
                  description: ''
                });
                setShowEventForm(true);
              }}
            >
              + Add Event
            </button>
            <button 
              className="add-class-btn"
              onClick={() => setShowClassForm(true)}
            >
              + Add Class
            </button>
          </div>
          
          <div className="week-navigation">
            <button className="nav-btn" onClick={goToPreviousWeek}>
              ‹
            </button>
            <h2 className="current-week">
              {currentWeek.format('MMM YYYY')}
            </h2>
            <button className="nav-btn" onClick={goToNextWeek}>
              ›
            </button>
          </div>
        </div>

        {/* Week Days Header */}
        <div className="week-days-header">
          <div className="time-column">
            <div className="time-header"></div>
          </div>
          {weekDays.map(day => (
            <div key={day.fullDate} className={`day-header ${day.isToday ? 'today' : ''}`}>
              <div className="day-name">{day.dayName}</div>
              <div className="day-number">{day.dayNumber}</div>
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="calendar-grid">
          <div className="time-labels">
            {timeSlots.map(timeSlot => (
              <div key={timeSlot.hour} className="time-label">
                {timeSlot.display}
              </div>
            ))}
          </div>

          {weekDays.map(day => (
            <div key={day.fullDate} className="day-column">
              {timeSlots.map((timeSlot) => (
                <div 
                  key={`${day.fullDate}-${timeSlot.hour}`}
                  className="time-slot"
                  onClick={() => quickAddEvent(day, timeSlot.hour)}
                  onDoubleClick={() => openEventForm(day, timeSlot.hour)}
                  title="Click to quick add, double-click for details"
                >
                  {getEventsForDay(day)
                    .filter(event => {
                      const eventHour = moment(event.date).hour();
                      return eventHour >= timeSlot.hour && eventHour < timeSlot.hour + 1;
                    })
                    .map(event => (
                      <div 
                        key={event.id}
                        className="calendar-event"
                        style={calculateEventStyle(event)}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          editEvent(event);
                        }}
                      >
                        <div className="event-title">{event.title}</div>
                        <div className="event-time">
                          {moment(event.date).format('h:mm A')}
                        </div>
                      </div>
                    ))
                  }
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Right Side - Upcoming Events */}
      <div className="events-side">
        <div className="events-header">
          <h3>Upcoming Events</h3>
          <span className="events-count">{upcomingEvents.length} events</span>
        </div>

        <div className="events-list">
          {Object.entries(eventsByDay).map(([date, dayEvents]) => {
            const dayMoment = moment(date);
            let dayLabel = '';
            
            if (dayMoment.isSame(moment(), 'day')) {
              dayLabel = 'Today';
            } else if (dayMoment.isSame(moment().add(1, 'day'), 'day')) {
              dayLabel = 'Tomorrow';
            } else {
              dayLabel = dayMoment.format('dddd');
            }

            return (
              <div key={date} className="day-events">
                <div className="day-label">
                  {dayLabel}
                  <span className="date-label">{dayMoment.format('MMM D')}</span>
                </div>
                {dayEvents.map(event => (
                  <div 
                    key={event.id} 
                    className="upcoming-event"
                    onClick={() => editEvent(event)}
                    style={{cursor: 'pointer'}}
                  >
                    <div 
                      className="event-color" 
                      style={{ backgroundColor: event.color }}
                    ></div>
                    <div className="event-details">
                      <div className="event-title">{event.title}</div>
                      <div className="event-time">
                        {moment(event.date).format('h:mm A')} • {event.duration}min
                      </div>
                      {event.description && (
                        <div className="event-description">{event.description}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}

          {upcomingEvents.length === 0 && (
            <div className="no-events">
              <p>No upcoming events</p>
              <span>Click "Add Event" to create one</span>
            </div>
          )}
        </div>
      </div>

      {/* Event Form Modal */}
      {showEventForm && (
        <div className="modal-overlay" onClick={() => setShowEventForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{newEvent.id ? 'Edit Event' : 'Add New Event'}</h3>
              <button 
                className="close-btn"
                onClick={() => setShowEventForm(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={addManualEvent} className="event-form">
              <div className="form-group">
                <label>Event Title *</label>
                <input
                  type="text"
                  name="title"
                  value={newEvent.title}
                  onChange={handleInputChange}
                  placeholder="Enter event title"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Date</label>
                  <input
                    type="date"
                    value={newEvent.date.format('YYYY-MM-DD')}
                    onChange={handleDateChange}
                  />
                </div>

                <div className="form-group">
                  <label>Time</label>
                  <input
                    type="time"
                    value={newEvent.date.format('HH:mm')}
                    onChange={handleTimeChange}
                  />
                </div>

                <div className="form-group">
                  <label>Duration (minutes)</label>
                  <select
                    name="duration"
                    value={newEvent.duration}
                    onChange={handleInputChange}
                  >
                    <option value={15}>15 min</option>
                    <option value={30}>30 min</option>
                    <option value={60}>1 hour</option>
                    <option value={90}>1.5 hours</option>
                    <option value={120}>2 hours</option>
                    <option value={180}>3 hours</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Color</label>
                <div className="color-options">
                  {colorOptions.map(color => (
                    <label key={color.value} className="color-option">
                      <input
                        type="radio"
                        name="color"
                        value={color.value}
                        checked={newEvent.color === color.value}
                        onChange={handleInputChange}
                      />
                      <span 
                        className="color-swatch" 
                        style={{ backgroundColor: color.value }}
                      ></span>
                      {color.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Description (optional)</label>
                <textarea
                  name="description"
                  value={newEvent.description}
                  onChange={handleInputChange}
                  placeholder="Add notes about this event..."
                  rows="3"
                />
              </div>

              <div className="form-actions">
                <button 
                  type="button" 
                  className="cancel-btn"
                  onClick={() => setShowEventForm(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="save-btn">
                  {newEvent.id ? 'Update Event' : 'Add Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Class Modal */}
      {showClassForm && (
        <div className="modal-overlay" onClick={() => setShowClassForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Class Schedule</h3>
              <button 
                className="close-btn"
                onClick={() => setShowClassForm(false)}
              >
                ×
              </button>
            </div>

            {showSyllabusParser && (
        <SyllabusParser 
          onEventsParsed={handleEventsParsed}
          onClose={() => setShowSyllabusParser(false)}
        />
      )}

            <form onSubmit={handleClassFileUpload} className="event-form">
              <div className="form-group">
                <label>Upload Class Schedule File</label>
                <div className="file-upload-area">
                  <div className="file-upload-icon">📁</div>
                  <p>Drop your class schedule file here or click to browse</p>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.pdf,.txt"
                    className="file-input"
                    onChange={(e) => {
                      // File would be processed here
                      console.log('File selected:', e.target.files[0]);
                    }}
                  />
                  <small>Supported formats: CSV, Excel, PDF, Text</small>
                </div>
              </div>

              <div className="form-group">
                <label>File Type</label>
                <select className="file-type-select">
                  <option value="csv">CSV File</option>
                  <option value="excel">Excel Spreadsheet</option>
                  <option value="pdf">PDF Document</option>
                  <option value="text">Text File</option>
                  <option value="auto">Auto-detect</option>
                </select>
              </div>

              <div className="form-group">
                <label>Semester/Quarter</label>
                <select className="semester-select">
                  <option value="fall2024">Fall 2024</option>
                  <option value="spring2024">Spring 2024</option>
                  <option value="summer2024">Summer 2024</option>
                  <option value="fall2023">Fall 2023</option>
                  <option value="custom">Custom Date Range</option>
                </select>
              </div>

              <div className="form-info">
                <h4>How it works:</h4>
                <ul>
                  <li>Upload your class schedule file</li>
                  <li>We'll extract class times and dates automatically</li>
                  <li>Classes will be added to your calendar</li>
                  <li>You can edit or remove classes anytime</li>
                </ul>
              </div>

              <div className="form-actions">
                <button 
                  type="button" 
                  className="cancel-btn"
                  onClick={() => setShowClassForm(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="save-btn">
                  Process Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
