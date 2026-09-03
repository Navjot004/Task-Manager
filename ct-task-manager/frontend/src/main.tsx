import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Suppress third-party browser extension / performance observer errors (e.g., reportAllChanges / reading 'startTime')
window.addEventListener('error', (event) => {
  if (
    event.message?.includes('startTime') ||
    event.error?.stack?.includes('reportAllChanges') ||
    (event.filename && event.filename.includes('anonymous'))
  ) {
    event.preventDefault();
    event.stopPropagation();
    return true;
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

