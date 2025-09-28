import { useGoogleLogin } from '@react-oauth/google';
import React, { useState } from 'react';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { GoogleOAuthProvider } from '@react-oauth/google';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <GoogleOAuthProvider clientId="YOUR_CLIENT_ID_FROM_GOOGLE_CLOUD">
    <App />
  </GoogleOAuthProvider>
);
function LoginComponent({ onAuthSuccess }) {
  const login = useGoogleLogin({
    // Request an access token and user profile data
    scope: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email',
    onSuccess: (tokenResponse) => {
      // The tokenResponse contains the access_token
      onAuthSuccess(tokenResponse.access_token);
    },
    onError: (error) => console.log('Login Failed:', error),
  });

  return (
    <button onClick={login}>
      Sign in with Google Calendar
    </button>
  );
}
const listEvents = async (accessToken) => {
  if (!accessToken) return;

  const response = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=10&orderBy=startTime&singleEvents=true',
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (response.ok) {
    const data = await response.json();
    console.log('Upcoming events:', data.items);
    return data.items;
  } else {
    console.error('Failed to fetch events:', response.status);
    // Handle token expiration (e.g., prompt user to re-authenticate)
  }
};
