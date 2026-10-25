import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AppClerkProvider } from './lib/clerkProvider.tsx';

createRoot(document.getElementById('root')!).render(
  <AppClerkProvider>
    <App />
  </AppClerkProvider>
);
