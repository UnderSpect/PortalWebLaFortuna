if (typeof window !== 'undefined') {
  // Prevent websocket and HMR errors from bubble up/showing overlays
  window.addEventListener('error', (event) => {
    const msg = event.message || '';
    if (
      msg.includes('websocket') || 
      msg.includes('WebSocket') || 
      msg.includes('[vite]') || 
      msg.includes('HMR') ||
      msg.includes('web socket')
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = reason && (reason.message || String(reason)) || '';
    if (
      msg.includes('websocket') || 
      msg.includes('WebSocket') || 
      msg.includes('[vite]') || 
      msg.includes('HMR') ||
      msg.includes('web socket')
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);

  const originalError = console.error;
  console.error = (...args) => {
    const msg = args.join(' ');
    if (
      msg.includes('websocket') || 
      msg.includes('WebSocket') || 
      msg.includes('[vite]') || 
      msg.includes('HMR') ||
      msg.includes('web socket')
    ) {
      return;
    }
    originalError(...args);
  };

  const originalWarn = console.warn;
  console.warn = (...args) => {
    const msg = args.join(' ');
    if (
      msg.includes('websocket') || 
      msg.includes('WebSocket') || 
      msg.includes('[vite]') || 
      msg.includes('HMR') ||
      msg.includes('web socket')
    ) {
      return;
    }
    originalWarn(...args);
  };
}

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

