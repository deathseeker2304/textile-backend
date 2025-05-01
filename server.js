// --- Dependencies ---
require('dotenv').config(); // Load .env file first
const express = require('express');
const cors = require('cors');
const db = require('./db'); // Your database connection module

// --- App Initialization ---
const app = express();
const port = process.env.PORT || 3001; // Use port from environment or default

// --- CORS Configuration ---
const allowedOrigins = [
    // Add your local development frontend URL if needed for testing
    // e.g., 'http://127.0.0.1:5500'
    'https://textile-frontend.onrender.com' // <<< YOUR DEPLOYED FRONTEND URL
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl) or from allowed list
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
       callback(null, true);
    } else {
      console.warn(`CORS blocked for origin: ${origin}`);
      callback(new Error(`Origin ${origin} Not allowed by CORS`));
    }
  },
  optionsSuccessStatus: 200 // For legacy browser compatibility
};

// --- Middleware ---
app.use(cors(corsOptions)); // Use configured CORS
app.use(express.json());    // Parse JSON request bodies

// --- Helper Middleware for ID Validation ---
const validateId = (req, res, next) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid ID parameter' });
    }
    req.validatedId = id; // Attach validated ID to request
    next();
};

// --- API Routes ---

// ====== Category Management API ======

// GET /api/classes?semester=X - Fetch classes for a semester
app.get('/api/classes', async (req, res) => {
    const { semester } = req.query;
    if (!semester) return res.status(400).json({ error: 'Semester query parameter is required' });
    try {
        const result = await db.query('SELECT class_name FROM classes WHERE semester = $1 ORDER BY class_name', [parseInt(semester, 10)]);
        res.status(200).json(result.rows.map(row => row.class_name));
    } catch (err) { console.error('Error fetching classes:', err); res.status(500).json({ error: 'Server error fetching classes' }); }
});

// GET /api/teachers - Fetch ALL teachers
app.get('/api/teachers', async (req, res) => {
    try {
        const result = await db.query('SELECT teacher_name FROM teachers ORDER BY teacher_name');
        res.status(200).json(result.rows.map(row => row.teacher_name));
    } catch (err) { console.error('Error fetching teachers:', err); res.status(500).json({ error: 'Server error fetching teachers' }); }
});

// GET /api/chapters - Fetch ALL chapters
app.get('/api/chapters', async (req, res) => {
     try {
        const result = await db.query('SELECT chapter_name FROM chapters ORDER BY chapter_name');
         res.status(200).json(result.rows.map(row => row.chapter_name));
    } catch (err) { console.error('Error fetching chapters:', err); res.status(500).json({ error: 'Server error fetching chapters' }); }
});

// POST /api/classes - Add a new class
app.post('/api/classes', async (req, res) => {
    const { semester, className } = req.body;
    if (!semester || !className?.trim()) return res.status(400).json({ error: 'Semester and className required' });
    const semesterNum = parseInt(semester, 10);
    if (isNaN(semesterNum) || semesterNum < 1 || semesterNum > 8) return res.status(400).json({ error: 'Invalid semester' });
    try {
        const result = await db.query(`INSERT INTO classes (semester, class_name) VALUES ($1, $2) ON CONFLICT (semester, class_name) DO NOTHING RETURNING *`, [semesterNum, className.trim()]);
        res.status(result.rows.length > 0 ? 201 : 200).json(result.rows.length > 0 ? result.rows[0] : { message: 'Class already exists' });
    } catch (err) { console.error('Error adding class:', err); res.status(500).json({ error: 'Server error adding class' }); }
});

// POST /api/teachers - Add a new teacher
app.post('/api/teachers', async (req, res) => {
    const { teacherName } = req.body;
    if (!teacherName?.trim()) return res.status(400).json({ error: 'teacherName required' });
    try {
        const result = await db.query(`INSERT INTO teachers (teacher_name) VALUES ($1) ON CONFLICT (teacher_name) DO NOTHING RETURNING *`, [teacherName.trim()]);
        res.status(result.rows.length > 0 ? 201 : 200).json(result.rows.length > 0 ? result.rows[0] : { message: 'Teacher already exists' });
    } catch (err) { console.error('Error adding teacher:', err); res.status(500).json({ error: 'Server error adding teacher' }); }
});

// POST /api/chapters - Add a new chapter
app.post('/api/chapters', async (req, res) => {
    const { chapterName } = req.body;
     if (!chapterName?.trim()) return res.status(400).json({ error: 'chapterName required' });
     try {
        const result = await db.query(`INSERT INTO chapters (chapter_name) VALUES ($1) ON CONFLICT (chapter_name) DO NOTHING RETURNING *`, [chapterName.trim()]);
        res.status(result.rows.length > 0 ? 201 : 200).json(result.rows.length > 0 ? result.rows[0] : { message: 'Chapter already exists' });
    } catch (err) { console.error('Error adding chapter:', err); res.status(500).json({ error: 'Server error adding chapter' }); }
});


// ====== Tasks API ======
app.get('/api/tasks', async (req, res) => { /* ... GET logic ... */ try{const r=await db.query('SELECT * FROM tasks ORDER BY created_at DESC');res.status(200).json(r.rows);}catch(e){console.error(e);res.status(500).json({e:'Server error'})}});
app.post('/api/tasks', async (req, res) => { /* ... POST logic ... */ const{text}=req.body;if(!text?.trim())return res.status(400).json({e:'Text required'});try{const r=await db.query('INSERT INTO tasks(text,completed)VALUES($1,$2)RETURNING *',[text.trim(),!1]);res.status(201).json(r.rows[0]);}catch(e){console.error(e);res.status(500).json({e:'Server error'})}});
app.put('/api/tasks/:id', validateId, async (req, res) => { /* ... PUT logic ... */ const t=req.validatedId,{text,completed}=req.body;if(text===void 0&&completed===void 0)return res.status(400).json({e:'No data'});if(text!==void 0&&!text?.trim())return res.status(400).json({e:'Text empty'});if(completed!==void 0&&typeof completed!=='boolean')return res.status(400).json({e:'Completed invalid'});try{const c=await db.query('SELECT * FROM tasks WHERE id=$1',[t]);if(c.rows.length===0)return res.status(404).json({e:'Not found'});const o=c.rows[0],n=text!==void 0?text.trim():o.text,d=completed!==void 0?completed:o.completed;const r=await db.query('UPDATE tasks SET text=$1,completed=$2,updated_at=CURRENT_TIMESTAMP WHERE id=$3 RETURNING *',[n,d,t]);res.status(200).json(r.rows[0]);}catch(e){console.error(e);res.status(500).json({e:'Server error'})}});
app.delete('/api/tasks/:id', validateId, async (req, res) => { /* ... DELETE logic ... */ const t=req.validatedId;try{const r=await db.query('DELETE FROM tasks WHERE id=$1',[t]);if(r.rowCount===0)return res.status(404).json({e:'Not found'});res.sendStatus(204);}catch(e){console.error(e);res.status(500).json({e:'Server error'})}});


// ====== PDFs API ======
app.get('/api/pdfs', async (req, res) => { /* ... GET logic ... */ const{semester,class:className,teacher:teacherName,chapter:chapterName}=req.query;let q='SELECT * FROM pdfs',c=[],v=[],i=1;if(semester){c.push(`semester=$${i++}`);v.push(parseInt(semester,10));}if(className){c.push(`class_name=$${i++}`);v.push(className);}if(teacherName){c.push(`teacher_name=$${i++}`);v.push(teacherName);}if(chapterName){c.push(`chapter_name=$${i++}`);v.push(chapterName);}if(c.length>0)q+=' WHERE '+c.join(' AND ');q+=' ORDER BY uploaded_at DESC';try{const r=await db.query(q,v);res.status(200).json(r.rows);}catch(e){console.error(e);res.status(500).json({e:'Server error'})}});
app.post('/api/pdfs', async (req, res) => { /* ... POST logic ... */ const{fileName,url,semester,className,teacherName,chapterName}=req.body;if(!fileName||!url||!semester||!className||!teacherName||!chapterName)return res.status(400).json({e:'Missing fields'});try{const r=await db.query('INSERT INTO pdfs(file_name,url,semester,class_name,teacher_name,chapter_name)VALUES($1,$2,$3,$4,$5,$6)RETURNING *',[fileName,url,parseInt(semester,10),className,teacherName,chapterName]);res.status(201).json(r.rows[0]);}catch(e){console.error(e);res.status(500).json({e:'Server error'})}});
app.put('/api/pdfs/:id', validateId, async (req, res) => { /* ... PUT logic ... */ const p=req.validatedId,{fileName}=req.body;if(!fileName?.trim())return res.status(400).json({e:'Filename required'});try{const r=await db.query('UPDATE pdfs SET file_name=$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2 RETURNING *',[fileName.trim(),p]);if(r.rows.length===0)return res.status(404).json({e:'Not found'});res.status(200).json(r.rows[0]);}catch(e){console.error(e);res.status(500).json({e:'Server error'})}});
app.delete('/api/pdfs/:id', validateId, async (req, res) => { /* ... DELETE logic ... */ const p=req.validatedId;try{const r=await db.query('DELETE FROM pdfs WHERE id=$1',[p]);if(r.rowCount===0)return res.status(404).json({e:'Not found'});res.sendStatus(204);}catch(e){console.error(e);res.status(500).json({e:'Server error'})}});


// ====== Videos API ======
app.get('/api/videos', async (req, res) => { /* ... GET logic ... */ const{semester,class:className,teacher:teacherName,chapter:chapterName}=req.query;let q='SELECT * FROM videos',c=[],v=[],i=1;if(semester){c.push(`semester=$${i++}`);v.push(parseInt(semester,10));}if(className){c.push(`class_name=$${i++}`);v.push(className);}if(teacherName){c.push(`teacher_name=$${i++}`);v.push(teacherName);}if(chapterName){c.push(`chapter_name=$${i++}`);v.push(chapterName);}if(c.length>0)q+=' WHERE '+c.join(' AND ');q+=' ORDER BY created_at DESC';try{const r=await db.query(q,v);res.status(200).json(r.rows);}catch(e){console.error(e);res.status(500).json({e:'Server error'})}});
app.post('/api/videos', async (req, res) => { /* ... POST logic ... */ const{videoId,semester,className,teacherName,chapterName}=req.body;if(!videoId||!semester||!className||!teacherName||!chapterName)return res.status(400).json({e:'Missing fields'});try{const r=await db.query('INSERT INTO videos(video_id,semester,class_name,teacher_name,chapter_name)VALUES($1,$2,$3,$4,$5)RETURNING *',[videoId,parseInt(semester,10),className,teacherName,chapterName]);res.status(201).json(r.rows[0]);}catch(e){console.error(e);res.status(500).json({e:'Server error'})}});
app.delete('/api/videos/:id', validateId, async (req, res) => { /* ... DELETE logic ... */ const v=req.validatedId;try{const r=await db.query('DELETE FROM videos WHERE id=$1',[v]);if(r.rowCount===0)return res.status(404).json({e:'Not found'});res.sendStatus(204);}catch(e){console.error(e);res.status(500).json({e:'Server error'})}});


// ====== Notes API ======
app.get('/api/notes', async (req, res) => { /* ... GET logic ... */ const{semester,class:className,teacher:teacherName,chapter:chapterName,student:studentName,roll:rollNumber}=req.query;let q='SELECT * FROM notes',c=[],v=[],i=1;if(semester){c.push(`semester=$${i++}`);v.push(parseInt(semester,10));}if(className){c.push(`class_name=$${i++}`);v.push(className);}if(teacherName){c.push(`teacher_name=$${i++}`);v.push(teacherName);}if(chapterName){c.push(`chapter_name=$${i++}`);v.push(chapterName);}if(studentName){c.push(`student_name=$${i++}`);v.push(studentName);}if(rollNumber){c.push(`roll_number=$${i++}`);v.push(rollNumber);}if(c.length>0)q+=' WHERE '+c.join(' AND ');q+=' ORDER BY created_at DESC';try{const r=await db.query(q,v);res.status(200).json(r.rows);}catch(e){console.error(e);res.status(500).json({e:'Server error'})}});
app.post('/api/notes', async (req, res) => { /* ... POST logic ... */ const{content,semester,className,teacherName,chapterName,studentName,rollNumber}=req.body;if(!content||!semester||!className||!teacherName||!chapterName||!studentName||!rollNumber)return res.status(400).json({e:'Missing fields'});try{const r=await db.query('INSERT INTO notes(content,semester,class_name,teacher_name,chapter_name,student_name,roll_number)VALUES($1,$2,$3,$4,$5,$6,$7)RETURNING *',[content,parseInt(semester,10),className,teacherName,chapterName,studentName,rollNumber]);res.status(201).json(r.rows[0]);}catch(e){console.error(e);res.status(500).json({e:'Server error'})}});
app.delete('/api/notes/:id', validateId, async (req, res) => { /* ... DELETE logic ... */ const n=req.validatedId;try{const r=await db.query('DELETE FROM notes WHERE id=$1',[n]);if(r.rowCount===0)return res.status(404).json({e:'Not found'});res.sendStatus(204);}catch(e){console.error(e);res.status(500).json({e:'Server error'})}});


// ====== Events API ======
app.get('/api/events', async (req, res) => { /* ... GET logic ... */ try{const r=await db.query('SELECT * FROM events ORDER BY event_date DESC,created_at DESC');res.status(200).json(r.rows);}catch(e){console.error(e);res.status(500).json({e:'Server error'})}});
app.post('/api/events', async (req, res) => { /* ... POST logic ... */ const{title,date:event_date,description}=req.body;if(!title||!event_date||!description)return res.status(400).json({e:'Missing fields'});try{const r=await db.query('INSERT INTO events(title,event_date,description)VALUES($1,$2,$3)RETURNING *',[title,event_date,description]);res.status(201).json(r.rows[0]);}catch(e){console.error(e);res.status(500).json({e:'Server error'})}});
app.delete('/api/events/:id', validateId, async (req, res) => { /* ... DELETE logic ... */ const e=req.validatedId;try{const r=await db.query('DELETE FROM events WHERE id=$1',[e]);if(r.rowCount===0)return res.status(404).json({e:'Not found'});res.sendStatus(204);}catch(e){console.error(e);res.status(500).json({e:'Server error'})}});


// ====== Exams API ======
app.get('/api/exams', async (req, res) => { /* ... GET logic ... */ try{const r=await db.query('SELECT * FROM exams ORDER BY exam_date DESC,exam_time ASC');res.status(200).json(r.rows);}catch(e){console.error(e);res.status(500).json({e:'Server error'})}});
app.post('/api/exams', async (req, res) => { /* ... POST logic ... */ const{date:exam_date,subject,time:exam_time,room}=req.body;if(!exam_date||!subject||!exam_time||!room)return res.status(400).json({e:'Missing fields'});try{const r=await db.query('INSERT INTO exams(exam_date,subject,exam_time,room)VALUES($1,$2,$3,$4)RETURNING *',[exam_date,subject,exam_time,room]);res.status(201).json(r.rows[0]);}catch(e){console.error(e);res.status(500).json({e:'Server error'})}});
app.delete('/api/exams/:id', validateId, async (req, res) => { /* ... DELETE logic ... */ const e=req.validatedId;try{const r=await db.query('DELETE FROM exams WHERE id=$1',[e]);if(r.rowCount===0)return res.status(404).json({e:'Not found'});res.sendStatus(204);}catch(e){console.error(e);res.status(500).json({e:'Server error'})}});


// ====== Calendar Events API ======
app.get('/api/calendarEvents', async (req, res) => { /* ... GET logic ... */ try{const r=await db.query('SELECT * FROM calendar_events ORDER BY start_time ASC');res.status(200).json(r.rows);}catch(e){console.error(e);res.status(500).json({e:'Server error'})}});
app.post('/api/calendarEvents', async (req, res) => { /* ... POST logic ... */ const{title,start,end,allDay,completed=!1}=req.body;if(!title||!start)return res.status(400).json({e:'Missing title/start'});try{const r=await db.query('INSERT INTO calendar_events(title,start_time,end_time,all_day,completed)VALUES($1,$2,$3,$4,$5)RETURNING *',[title,start,end,allDay,completed]);res.status(201).json(r.rows[0]);}catch(e){console.error(e);res.status(500).json({e:'Server error'})}});
app.put('/api/calendarEvents/:id', validateId, async (req, res) => { /* ... PUT logic ... */ const e=req.validatedId,{title,start,end,allDay,completed}=req.body;if(title===void 0&&start===void 0&&end===void 0&&allDay===void 0&&completed===void 0)return res.status(400).json({e:'No data'});try{const c=await db.query('SELECT * FROM calendar_events WHERE id=$1',[e]);if(c.rows.length===0)return res.status(404).json({e:'Not found'});const o=c.rows[0],nT=title!==void 0?title:o.title,nS=start!==void 0?start:o.start_time,nE=end!==void 0?end:o.end_time,nA=allDay!==void 0?allDay:o.all_day,nC=completed!==void 0?completed:o.completed;const r=await db.query('UPDATE calendar_events SET title=$1,start_time=$2,end_time=$3,all_day=$4,completed=$5,updated_at=CURRENT_TIMESTAMP WHERE id=$6 RETURNING *',[nT,nS,nE,nA,nC,e]);res.status(200).json(r.rows[0]);}catch(err){console.error(err);res.status(500).json({e:'Server error'})}});
app.delete('/api/calendarEvents/:id', validateId, async (req, res) => { /* ... DELETE logic ... */ const e=req.validatedId;try{const r=await db.query('DELETE FROM calendar_events WHERE id=$1',[e]);if(r.rowCount===0)return res.status(404).json({e:'Not found'});res.sendStatus(204);}catch(err){console.error(err);res.status(500).json({e:'Server error'})}});


// ====== Chat Messages API (Basic) ======
app.get('/api/chatMessages', async (req, res) => { /* ... GET logic ... */ const l=parseInt(req.query.limit,10)||100;try{const r=await db.query('SELECT * FROM chat_messages ORDER BY created_at DESC LIMIT $1',[l]);res.status(200).json(r.rows.reverse());}catch(e){console.error(e);res.status(500).json({e:'Server error'})}});
app.post('/api/chatMessages', async (req, res) => { /* ... POST logic ... */ const{text}=req.body;if(!text?.trim())return res.status(400).json({e:'Text required'});try{const r=await db.query('INSERT INTO chat_messages(text)VALUES($1)RETURNING *',[text.trim()]);res.status(201).json(r.rows[0]);}catch(e){console.error(e);res.status(500).json({e:'Server error'})}});


// --- Health Check Route ---
app.get('/api/health', (req, res) => {
    res.json({ status: 'UP', timestamp: new Date().toISOString() });
});


// --- Catch-all for undefined API routes ---
app.use('/api/*', (req, res) => { // Be more specific to /api
  res.status(404).json({ error: `API endpoint not found: ${req.method} ${req.originalUrl}` });
});


// --- Global Error Handler ---
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err.stack || err); // Log the full error stack
  // Avoid sending stack trace to client in production
  const statusCode = err.status || 500;
  const message = statusCode === 500 && process.env.NODE_ENV === 'production'
                  ? 'An unexpected internal server error occurred.'
                  : err.message || 'Internal Server Error';
  res.status(statusCode).json({ error: message });
});


// --- Start the server ---
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});