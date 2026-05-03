import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { enableWhyRender } from 'render-why';
import App from './App';
import './styles.css';
import './eventBus';

enableWhyRender({ enableInProduction: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
