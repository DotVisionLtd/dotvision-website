# dotvision.io

Single-page website for Dot Vision Ltd (Malta). Static HTML/CSS/JS in `public/`, one Vercel function for the contact form in `api/contact.js`. The build step only copies the self-hosted Bai Jamjuree font from npm.

Environment variables (set in Vercel, never in this repo): `RESEND_API_KEY`, `CONTACT_TO`, `CONTACT_FROM`, `TURNSTILE_SECRET`. The Turnstile site key and the GA4 measurement ID go in the two `<meta>` tags at the top of `public/index.html`.
