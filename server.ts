import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

// In AI Studio preview environment, HMR WebSocket is unsupported across the reverse proxy.
if (process.env.DISABLE_HMR === undefined) {
  process.env.DISABLE_HMR = 'true';
}

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json());

// Initialize GoogleGenAI if key is present
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;

if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
  try {
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  } catch (err) {
    console.warn('Failed to initialize GoogleGenAI:', err);
  }
}

// 1. Chat endpoint
app.post('/api/gemini/chat', async (req: Request, res: Response): Promise<void> => {
  const { message, history, tutorContext } = req.body;

  if (!aiClient) {
    res.json({ fallback: true, message: 'Gemini API key not configured. Using rule-based fallback.' });
    return;
  }

  try {
    const formattedHistory = Array.isArray(history)
      ? history.slice(-6).map((h: any) => `${h.sender === 'user' ? 'Parent' : 'TutorAI'}: ${h.text}`).join('\n')
      : '';

    const tutorSummary = Array.isArray(tutorContext)
      ? tutorContext.map((t: any) => `• ${t.name}: ${t.qualification}, Subjects: [${t.subjects.join(', ')}], Classes: [${t.classes.join(', ')}], Area: ${t.locality} (${t.city}), Mode: ${t.teachingMode}, Fee: ₹${t.monthlyFee}/month, Exp: ${t.experienceYears} yrs, Availability: ${t.availability}`).join('\n')
      : '';

    const prompt = `You are "TutorChat", the friendly, knowledgeable AI educational consultant for TutorAI (an Indian home tutor finder).
Your mission is to help Indian parents and students find the ideal home or online tutor, understand subject requirements, prepare questions to ask tutors, and plan study routines.

Available Demonstration Tutor Dataset (Strictly recommend only from this list; never invent tutors or false contact details):
${tutorSummary}

Recent conversation:
${formattedHistory}

Parent/User message: "${message}"

Instructions:
- Provide clear, empathetic, practical advice formatted with clean Markdown bullet points.
- Highlight specific tutor names, their monthly fees in INR, their locality, and reasons for suitability.
- If asking about budgeting, point out fee ranges and suggest checking the Smart Fee Calculator.
- If asking about what to ask before hiring, give concrete diagnostic and progress-tracking questions.
- Keep the tone encouraging, professional, and trustworthy.`;

    const geminiPromise = aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Gemini API timeout')), 6000)
    );

    const response = await Promise.race([geminiPromise, timeoutPromise]);
    const reply = response.text;
    res.json({ reply, fallback: false });
  } catch (error: any) {
    console.warn('Gemini chat fallback triggered:', error?.message || error);
    res.json({ fallback: true, error: 'Gemini service temporarily unavailable. Fallback active.' });
  }
});

// 2. Smart Match endpoint
app.post('/api/gemini/match', async (req: Request, res: Response): Promise<void> => {
  const { criteria, tutors } = req.body;

  if (!aiClient) {
    res.json({ fallback: true, message: 'Gemini API key not configured.' });
    return;
  }

  try {
    const tutorSummary = Array.isArray(tutors)
      ? tutors.map((t: any) => `ID: ${t.id} | Name: ${t.name} | Subjects: ${t.subjects.join(', ')} | Classes: ${t.classes.join(', ')} | Locality: ${t.locality} | Mode: ${t.teachingMode} | Monthly Fee: ₹${t.monthlyFee} | Exp: ${t.experienceYears} yrs`).join('\n')
      : '';

    const prompt = `Match the best 3 tutors from the list below based on this parent's criteria:
Parent Criteria:
- Class: ${criteria.studentClass || 'Not specified'}
- Subject: ${criteria.subject || 'Not specified'}
- Locality: ${criteria.locality || 'Any'}
- Monthly Budget: ₹${criteria.budget || 5000} INR
- Preferred Mode: ${criteria.teachingMode || 'Any'}
- Specific Learning Goals: ${criteria.learningGoals || 'General improvement'}
- Schedule Preference: ${criteria.schedulePreference || 'Flexible'}

Tutors Available:
${tutorSummary}

Return a valid JSON array of top 3 matches with this exact structure:
[
  {
    "tutorId": "tutor-1",
    "tutorName": "Priya Sharma",
    "matchScore": 95,
    "reasons": ["Direct subject expertise in Math", "Within ₹4500 budget", "Covers Koramangala"],
    "feeFit": "Well within budget",
    "experienceFit": "9 years board exam mentor",
    "modeFit": "Supports Hybrid"
  }
]`;

    const geminiPromise = aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              tutorId: { type: Type.STRING },
              tutorName: { type: Type.STRING },
              matchScore: { type: Type.NUMBER },
              reasons: { type: Type.ARRAY, items: { type: Type.STRING } },
              feeFit: { type: Type.STRING },
              experienceFit: { type: Type.STRING },
              modeFit: { type: Type.STRING }
            },
            required: ['tutorId', 'matchScore', 'reasons', 'feeFit', 'experienceFit', 'modeFit']
          }
        }
      }
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Gemini API timeout')), 6000)
    );

    const response = await Promise.race([geminiPromise, timeoutPromise]);
    const parsed = JSON.parse(response.text ?? '[]');
    res.json({ results: parsed, fallback: false });
  } catch (error: any) {
    console.warn('Gemini match fallback triggered:', error?.message || error);
    res.json({ fallback: true, error: 'Gemini match error.' });
  }
});

// 3. Study Plan endpoint
app.post('/api/gemini/study-plan', async (req: Request, res: Response): Promise<void> => {
  const { studentClass, subjects, examDate, dailyHours, weakTopics, learningGoals } = req.body;

  if (!aiClient) {
    res.json({ fallback: true, message: 'Gemini API key not configured.' });
    return;
  }

  try {
    const prompt = `Generate a realistic daily study timetable and revision roadmap for:
Student Level: ${studentClass || 'Class 10'}
Subjects: ${Array.isArray(subjects) ? subjects.join(', ') : 'Mathematics, Science'}
Target Exam Date: ${examDate || 'Within 2 months'}
Daily Available Study Hours: ${dailyHours || 3} hours
Challenging / Weak Areas: ${weakTopics || 'None specified'}
Learning Goals: ${learningGoals || 'Score above 90% in exams'}

Return a structured JSON with:
- overview (string)
- dailySchedule (array of objects with timeSlot, activity, subject, focus)
- weeklyGoals (array of strings)
- revisionStrategy (array of strings)
- pomodoroAdvice (string)
- examTips (array of strings)`;

    const geminiPromise = aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overview: { type: Type.STRING },
            dailySchedule: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  timeSlot: { type: Type.STRING },
                  activity: { type: Type.STRING },
                  subject: { type: Type.STRING },
                  focus: { type: Type.STRING }
                },
                required: ['timeSlot', 'activity', 'subject', 'focus']
              }
            },
            weeklyGoals: { type: Type.ARRAY, items: { type: Type.STRING } },
            revisionStrategy: { type: Type.ARRAY, items: { type: Type.STRING } },
            pomodoroAdvice: { type: Type.STRING },
            examTips: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ['overview', 'dailySchedule', 'weeklyGoals', 'revisionStrategy', 'pomodoroAdvice', 'examTips']
        }
      }
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Gemini API timeout')), 6000)
    );

    const response = await Promise.race([geminiPromise, timeoutPromise]);
    const parsed = JSON.parse(response.text ?? '{}');
    res.json({ ...parsed, fallback: false });
  } catch (error: any) {
    console.warn('Gemini study-plan fallback triggered:', error?.message || error);
    res.json({ fallback: true, error: 'Gemini study-plan error.' });
  }
});

// Setup Vite or static serving
async function startServer() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TutorAI server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
