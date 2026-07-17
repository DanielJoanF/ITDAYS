import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

// ─── Inject reCAPTCHA v3 script secara dinamis ────────────────────────────────
// Cara ini memastikan VITE_RECAPTCHA_SITE_KEY ter-substitusi dengan benar
// oleh Vite saat build, tidak bisa dilakukan dari index.html <script src="...">
const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
if (siteKey) {
  const script = document.createElement('script');
  script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
} else {
  console.warn('[reCAPTCHA] VITE_RECAPTCHA_SITE_KEY tidak ditemukan. reCAPTCHA tidak akan dimuat.');
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
