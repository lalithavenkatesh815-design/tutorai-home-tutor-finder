# TutorAI – AI-Powered Home Tutor Finder

> **Tagline:** "Find Your Perfect Tutor. Learn Smarter With AI."

TutorAI is a modern, full-stack educational web application designed to solve the academic problem statement: **"Parents struggle to find a trusted home tutor nearby. Build a website to list tutors with subjects, fees, and area, and allow parents to send contact requests with advanced AI-powered features."**

---

## 🌟 Key Features

1. **Comprehensive Demonstration Tutor Directory:**
   - 14 realistic demonstration Indian tutor profiles across Bengaluru, Mumbai, Delhi-NCR, Chennai, Hyderabad, and Kolkata.
   - Subjects including Mathematics, Physics, Chemistry, Biology, Python/Computer Science, Accountancy, Economics, Hindi, French, and Vedic Math.
   - Verified fee structures in INR, teaching modes (Home Visit, Online, Hybrid), and weekly availability.
   - Distinct **"Demonstration Profile – Not Independently Verified"** notice on all cards.

2. **Advanced Multi-Dimensional Search & Filtering:**
   - Multi-field text search (Subject, Locality, Name, Qualification).
   - Filters for Grade/Class, Teaching Mode, Maximum Monthly Fee slider, and Experience.
   - Sort by Lowest Fee, Highest Fee, Experience, Rating, or Alphabetical.
   - Browser Speech Recognition API for voice search with graceful fallback.

3. **TutorChat – Floating AI Assistant:**
   - Interactive advisor powered by **Google Gemini 3.8 Flash** via secure server-side Netlify/Express functions.
   - Contextual understanding of the 14 tutor profiles, budgeting questions, interview questions for tutors, and study techniques.
   - Speech Synthesis (Web Speech API) read-aloud functionality for voice responses.
   - Intelligent local rule-based fallback when Gemini API key is absent or offline.

4. **AI Smart Matcher:**
   - 7-variable questionnaire (Class, Subject, Locality, Monthly Budget, Teaching Mode, Goals, Schedule).
   - Generates ranked match scores with personalized suitability reasons.

5. **Tutor Comparison System:**
   - Compare up to 3 tutors side-by-side in a detailed feature matrix.
   - Highlights lowest fee and highest experience.
   - Persisted across reloads using `localStorage`.

6. **Interactive OpenStreetMap Locality Explorer:**
   - Leaflet map with custom tutor pins and popup cards.
   - Direct OpenStreetMap search links.
   - Fallback neighborhood cards if map tiles cannot load.

7. **AI Study Routine & Timetable Planner:**
   - Generates personalized daily study schedules, Pomodoro rest intervals, and weekly milestones.
   - One-click Copy to Clipboard and Print features.

8. **Smart Tuition Fee Calculator:**
   - Interactive calculator based on formula: `Weekly sessions × fee/session × 4.33`.
   - Includes sibling discount options and preset study scenarios.

9. **Contact & Schedule Request System:**
   - Pre-populated tutor enquiry form with day/time slot selection.
   - Netlify Forms static detection configured (`tutor-enquiry`).
   - Demonstration-mode confirmation with unique reference IDs.

10. **Become a Tutor Application:**
    - Onboarding form for aspiring home tutors with Netlify form integration.

11. **Demonstration-Only Payment & Booking Voucher:**
    - Clear demo checkout simulation. Never charges money or collects sensitive card/bank data.

---

## 🚀 Technology Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React, Leaflet
- **AI Integration:** Google Gemini API (`gemini-3.8-flash` via `@google/genai`)
- **Backend / Deployment:** Express server for local dev + Netlify Serverless Functions (`netlify/functions/gemini.ts`)
- **Persistence:** Safe browser `localStorage` (No external database, No Supabase, No Firebase, No SQL)
- **Forms:** Netlify Forms static configuration

---

## 📦 Netlify Deployment Instructions

1. **Connect Repository to Netlify:**
   - Build Command: `npm run build`
   - Publish Directory: `dist`
   - Functions Directory: `netlify/functions`

2. **Configure Server-Side Environment Variable:**
   In Netlify Site Settings > **Environment variables**:
   ```
   GEMINI_API_KEY = your_gemini_api_key_here
   ```
   *(Note: If `GEMINI_API_KEY` is not provided, TutorAI automatically operates with its built-in rule-based AI engine seamlessly).*

3. **Netlify Forms & Redirects:**
   The included `netlify.toml` automatically handles SPA routing and API function proxying:
   ```toml
   [build]
     command = "npm run build"
     publish = "dist"
     functions = "netlify/functions"

   [[redirects]]
     from = "/api/*"
     to = "/.netlify/functions/:splat"
     status = 200

   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```
