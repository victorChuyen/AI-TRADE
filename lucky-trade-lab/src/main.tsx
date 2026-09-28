import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Ensure window.fetch has both getter and setter across all host execution contexts
if (typeof window !== 'undefined') {
  try {
    let currentFetch = typeof window.fetch === 'function' ? window.fetch.bind(window) : window.fetch;
    const fetchGetter = () => currentFetch;
    const fetchSetter = (val: typeof window.fetch) => {
      currentFetch = typeof val === 'function' ? val.bind(window) : val;
    };

    if (typeof Window !== 'undefined' && Window.prototype) {
      try {
        Object.defineProperty(Window.prototype, 'fetch', {
          get: fetchGetter,
          set: fetchSetter,
          configurable: true,
          enumerable: true,
        });
      } catch {
        // Prototype might be sealed in strict sandbox
      }
    }

    try {
      Object.defineProperty(window, 'fetch', {
        get: fetchGetter,
        set: fetchSetter,
        configurable: true,
        enumerable: true,
      });
    } catch {
      try {
        Object.defineProperty(window, 'fetch', {
          value: currentFetch,
          writable: true,
          configurable: true,
          enumerable: true,
        });
      } catch {
        // Window object protected
      }
    }
  } catch {
    // Ignore non-configurable host wrappers
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
