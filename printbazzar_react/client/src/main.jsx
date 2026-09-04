import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter as Router } from "react-router-dom";

// Disable right-click globally (moved from index.html inline script for CSP hardening)
if (typeof document !== 'undefined') {
  document.addEventListener('contextmenu', (event) => {
    event.preventDefault();
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Router>
      <App />
    </Router>
  </StrictMode>,
);
