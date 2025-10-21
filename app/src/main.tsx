import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { AppProviders } from './providers/AppProviders';
import './theme/global.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root is missing');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </React.StrictMode>
);
