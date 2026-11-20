import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './theme';
import './i18n';
import App from './App.tsx';
import { BrowserRouter } from 'react-router';
import { restoreSession } from './store/useSessionStore';

// Resume a signed-in session from the refresh cookie; protected routes wait until this answers.
void restoreSession();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
