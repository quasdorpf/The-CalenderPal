import React, { useState, useEffect } from 'react';
import moment from 'moment';

const GoogleCalendarIntegration = ({ events, onEventsSynced }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');
  const [gapiLoaded, setGapiLoaded] = useState(false);

  // Load Google API - only once
  useEffect(() => {
    // Check if already loaded
    if (window.gapi) {
      setGapiLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      console.log('Google API script loaded successfully');
      setGapiLoaded(true);
    };
    
    script.onerror = () => {
      console.error('Failed to load Google API script');
      setSyncStatus('Failed to load Google API. Check your internet connection.');
    };
    
    document.head.appendChild(script);
  }, []);

  // Check if user is already signed in when gapi loads
  useEffect(() => {
    if (!gapiLoaded) return;

    const checkAuthStatus = () => {
      try {
        const authInstance = window.gapi.auth2.getAuthInstance();
        if (authInstance && authInstance.isSignedIn.get()) {
          setIsAuthenticated(true);
          setSyncStatus('Already connected to Google Calendar');
        }
      } catch (error) {
        // Not initialized yet, that's fine
        console.log('Google Auth not initialized yet');
      }
    };

    checkAuthStatus();
  }, [gapiLoaded]);

  const handleGoogleLogin = async () => {
    if (!gapiLoaded) {
      setSyncStatus('Google API still loading, please wait...');
      return;
    }

    try {
      console.log('Starting Google login...');

      // First, try to get existing auth instance
      let authInstance;
      try {
        authInstance = window.gapi.auth2.getAuthInstance();
        console.log('Found existing auth instance');
      } catch (error) {
        console.log('No existing auth instance, initializing...');
        
        // Load the client library
        await new Promise((resolve, reject) => {
          window.gapi.load('client:auth2', {
            callback: resolve,
            onerror: reject
          });
        });

        // Initialize with YOUR ACTUAL CLIENT ID
        await window.gapi.client.init({
          clientId: '744275661819-c29orbria2mcb1i9fje6b3ua3kghnmsl.apps.googleusercontent.com', // ← REPLACE THIS WITH YOUR REAL CLIENT ID
          discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
          scope: 'https://www.googleapis.com/auth/calendar.events'
        });

        authInstance = window.gapi.auth2.getAuthInstance();
        console.log('Auth initialized successfully');
      }

      // Sign in
      console.log('Signing in...');
      const googleUser = await authInstance.signIn();
      console.log('Signed in successfully:', googleUser.getBasicProfile().getName());
      
      setIsAuthenticated(true);
      setSyncStatus('✅ Successfully connected to Google Calendar!');

    } catch (error) {
      console.error('Google login error details:', error);
      
      let errorMessage = 'Login failed: ';
      
      if (error.error === 'idpiframe_initialization_failed') {
        errorMessage = '❌ Invalid Client ID or origins. Please check: 1) Your Client ID is correct, 2) http://localhost:3007 is in Authorized JavaScript origins';
      } else if (error.message && error.message.includes('different options')) {
        errorMessage = '❌ Auth conflict. Please refresh the page and try again.';
      } else if (error.result && error.result.error) {
        errorMessage += error.result.error.message || error.result.error;
      } else {
        errorMessage += error.message || 'Unknown error - check console for details';
      }
      
      setSyncStatus(errorMessage);
    }
  };

  const handleGoogleLogout = async () => {
    try {
      const authInstance = window.gapi.auth2.getAuthInstance();
      await authInstance.signOut();
      setIsAuthenticated(false);
      setSyncStatus('Disconnected from Google Calendar');
    } catch (error) {
      console.error('Google logout failed:', error);
      setSyncStatus('Logout failed: ' + error.message);
    }
  };

  // Convert events to Google Calendar format
  const convertToGoogleEvent = (event) => {
    const startTime = moment(event.date);
    const endTime = startTime.clone().add(event.duration, 'minutes');

    return {
      summary: event.title,
      description: event.description || '',
      start: {
        dateTime: startTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    };
  };

  const syncToGoogleCalendar = async () => {
    if (!isAuthenticated) {
      setSyncStatus('Please connect to Google Calendar first');
      return;
    }

    setSyncStatus('🔄 Syncing events to Google Calendar...');

    try {
      let successCount = 0;

      for (const event of events) {
        if (event.source === 'google') continue;

        const googleEvent = convertToGoogleEvent(event);
        
        await window.gapi.client.calendar.events.insert({
          calendarId: 'primary',
          resource: googleEvent,
        });
        
        successCount++;
      }

      setSyncStatus(`✅ Successfully synced ${successCount} events to Google Calendar!`);
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncStatus('❌ Sync failed: ' + (error.result?.error?.message || error.message));
    }
  };

  const importFromGoogleCalendar = async () => {
    if (!isAuthenticated) {
      setSyncStatus('Please connect to Google Calendar first');
      return;
    }

    setSyncStatus('🔄 Importing events from Google Calendar...');

    try {
      const response = await window.gapi.client.calendar.events.list({
        calendarId: 'primary',
        timeMin: new Date().toISOString(),
        timeMax: moment().add(1, 'month').toISOString(), // Only next month
        maxResults: 20,
        singleEvents: true,
        orderBy: 'startTime',
      });

      const googleEvents = response.result.items;
      const importedEvents = googleEvents.map((gevent, index) => {
        const startMoment = moment(gevent.start.dateTime || gevent.start.date);
        const endMoment = moment(gevent.end.dateTime || gevent.end.date);
        const duration = moment.duration(endMoment.diff(startMoment)).asMinutes();

        return {
          id: `google-${Date.now()}-${index}`,
          title: gevent.summary || 'Google Event',
          description: gevent.description || '',
          date: startMoment,
          duration: duration,
          color: '#4285f4',
          source: 'google',
        };
      });

      setSyncStatus(`✅ Imported ${importedEvents.length} events from Google Calendar!`);
      
      if (onEventsSynced) {
        onEventsSynced(importedEvents);
      }
    } catch (error) {
      console.error('Import failed:', error);
      setSyncStatus('❌ Import failed: ' + (error.result?.error?.message || error.message));
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h3>Google Calendar Integration</h3>
      
      {!gapiLoaded && (
        <div style={{ padding: '10px', background: '#e3f2fd', borderRadius: '6px', marginBottom: '15px' }}>
          <p style={{ margin: 0, color: '#1565c0' }}>🔄 Loading Google API...</p>
        </div>
      )}
      
      {gapiLoaded && !isAuthenticated && (
        <div>
          <button 
            onClick={handleGoogleLogin}
            style={{
              background: '#4285f4',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              marginBottom: '15px'
            }}
          >
            Connect Google Calendar
          </button>
          
          <div style={{ 
            background: '#fff3cd', 
            padding: '15px', 
            borderRadius: '6px',
            border: '1px solid #ffeaa7',
            marginBottom: '15px'
          }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#856404' }}>⚠️ Setup Required:</h4>
            <div style={{ fontSize: '14px', color: '#856404' }}>
              <p style={{ margin: '0 0 10px 0' }}>
                <strong>Replace in code:</strong> <code>YOUR_ACTUAL_CLIENT_ID_HERE</code>
              </p>
              <p style={{ margin: '0' }}>
                <strong>With your Client ID from:</strong> 
                <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" style={{ marginLeft: '5px' }}>
                  Google Cloud Console
                </a>
              </p>
            </div>
          </div>
        </div>
      )}
      
      {isAuthenticated && (
        <div>
          <div style={{ 
            background: '#e8f5e8',
            padding: '15px',
            borderRadius: '6px',
            marginBottom: '15px',
            border: '1px solid #c8e6c9'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#2e7d32', fontWeight: 'bold' }}>✅ Connected to Google Calendar</span>
              <button 
                onClick={handleGoogleLogout}
                style={{
                  background: '#ff6b6b',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Disconnect
              </button>
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button 
              onClick={syncToGoogleCalendar}
              disabled={events.length === 0}
              style={{
                padding: '12px',
                border: 'none',
                borderRadius: '6px',
                cursor: events.length > 0 ? 'pointer' : 'not-allowed',
                background: events.length > 0 ? '#007aff' : '#ccc',
                color: 'white',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Export {events.length} Events to Google
            </button>
            
            <button 
              onClick={importFromGoogleCalendar}
              style={{
                padding: '12px',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                background: '#34c759',
                color: 'white',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Import from Google Calendar
            </button>
          </div>
        </div>
      )}
      
      {syncStatus && (
        <div style={{ 
          marginTop: '15px', 
          padding: '12px', 
          borderRadius: '6px',
          background: syncStatus.includes('❌') ? '#ffebee' : 
                     syncStatus.includes('✅') ? '#e8f5e8' : '#e3f2fd',
          color: syncStatus.includes('❌') ? '#c62828' : 
                syncStatus.includes('✅') ? '#2e7d32' : '#1565c0',
          fontSize: '14px',
          border: syncStatus.includes('❌') ? '1px solid #ffcdd2' : 
                 syncStatus.includes('✅') ? '1px solid #c8e6c9' : '1px solid #bbdefb'
        }}>
          {syncStatus}
        </div>
      )}
    </div>
  );
};

export default GoogleCalendarIntegration;
