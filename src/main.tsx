import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';
import { takeRedirectSignIn } from './sync/sync';

/**
 * iPhone/iPad Safari zooms into any text field whose font is under 16px when you tap it (the code editor, search
 * boxes), and stays zoomed. maximum-scale=1 stops that auto-zoom; Safari still lets people pinch-zoom (it ignores the
 * limit for pinching since iOS 10). Apple devices only: Android Chrome would honour the limit and block pinch-zoom.
 */
const appleTouch = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const viewport = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
if (appleTouch && viewport && !viewport.content.includes('maximum-scale')) viewport.content += ', maximum-scale=1';

// Back from Google's same-tab sign-in (phones): store the token and restore the address before routing.
const leaving = takeRedirectSignIn();

if (!leaving)
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
