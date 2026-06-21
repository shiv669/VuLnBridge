import React from 'react';
import ReactDOM from 'react-dom/client';
// import './index.css'; // Temporarily disabled to bypass Tailwind build issue
import App from './App';
import reportWebVitals from './reportWebVitals';
import axios from 'axios';

// Routes API calls to production backend if defined, otherwise falls back to local proxy in dev
axios.defaults.baseURL = process.env.REACT_APP_API_URL || '';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
