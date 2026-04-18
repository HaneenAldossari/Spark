import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App';
import { StoreInit } from './lib/store';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <StoreInit>
        <App />
      </StoreInit>
    </BrowserRouter>
  </StrictMode>,
);
