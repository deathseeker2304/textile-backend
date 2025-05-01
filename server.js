require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const cors = require('cors');
const db = require('./db'); // Your database connection module

const app = express();
const port = process.env.PORT || 3001; // Use environment variable or default

// --- Middleware ---
// WARNING: Allow all origins for development. Restrict in production!
// Example: app.use(cors({ origin: 'YOUR_FRONTEND_DEPLOYED_URL' }));
// --- Middleware ---

const allowedOrigins = [
    // You can add your local testing URL here too if needed later
    // e.g., 'http://127.0.0.1:5500' if using VS Code Live Server default
    'https://textile-frontend.onrender.com' // <<< PASTE YOUR FRONTEND URL HERE!
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin OR if the origin is in our list
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
       callback(null, true);
    } else {
      console.warn(`CORS blocked for origin: ${origin}`); // Log blocked attempts
      callback(new Error(`Origin ${origin} Not allowed by CORS`)); // More specific error
    }
  },
  optionsSuccessStatus: 200
}));

app.use(express.json()); // Parse incoming JSON request bodies
// --- END OF CORS CHANGE ---

// --- Helper Function for ID Validation ---
const validateId = (req, res, next) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid ID parameter' });
    }
    // Attach the validated ID to the request object if needed
    req.validatedId = id;
    next(); // Proceed to the next middleware or route handler
};


// --- API Routes ---
// Add these inside the --- API Routes --- section of server.js

// ====== Category Fetching API ======
// ====== Category Management API ======

// --- GET Endpoints (Query NEW Tables) ---

// GET /api/classes?semester=X - Fetch classes for a semester from classes table
app.get('/api/classes', async (req, res) => {
    const { semester } = req.query;
    if (!semester) {
        return res.status(400).json({ error: 'Semester query parameter is required' });
    }
    try {
        const result = await db.query(
            'SELECT class_name FROM classes WHERE semester = $1 ORDER BY class_name',
            [parseInt(semester, 10)]
        );

        // <<< --- ADD THIS LINE FOR DEBUGGING --- >>>
        console.log(`GET /api/classes?semester=${semester} - DB Result Rows:`, JSON.stringify(result.rows));
        // <<< --- END OF ADDED LINE --- >>>

        res.status(200).json(result.rows.map(row => row.class_name)); // Send mapped results

    } catch (err) {
        console.error('Error fetching classes:', err);
        res.status(500).json({ error: 'Internal server error while fetching classes' });
    }
});
// GET /api/teachers - Fetch ALL distinct teachers from teachers table
// Note: No longer filtering by semester/class here, adjust if needed
app.get('/api/teachers', async (req, res) => {
    try {
        const result = await db.query('SELECT teacher_name FROM teachers ORDER BY teacher_name'); // Query teachers table
        res.status(200).json(result.rows.map(row => row.teacher_name));
    } catch (err) {
        console.error('Error fetching teachers:', err);
        res.status(500).json({ error: 'Internal server error while fetching teachers' });
    }
});

// GET /api/chapters - Fetch ALL distinct chapters from chapters table
// Note: No longer filtering by sem/class/teacher here, adjust if needed
app.get('/api/chapters', async (req, res) => {
     try {
        const result = await db.query('SELECT chapter_name FROM chapters ORDER BY chapter_name'); // Query chapters table
         res.status(200).json(result.rows.map(row => row.chapter_name));
    } catch (err) {
        console.error('Error fetching chapters:', err);
        res.status(500).json({ error: 'Internal server error while fetching chapters' });
    }
});

// --- POST Endpoints (Add to NEW Tables) ---

// POST /api/classes - Add a new class
app.post('/api/classes', async (req, res) => {
    const { semester, className } = req.body;
    if (!semester || !className || typeof className !== 'string' || className.trim() === '') {
        return res.status(400).json({ error: 'Semester and non-empty className are required' });
    }
    const semesterNum = parseInt(semester, 10);
     if (isNaN(semesterNum) || semesterNum < 1 || semesterNum > 8) {
         return res.status(400).json({ error: 'Invalid semester number' });
     }

    try {
        // Insert, ignore if duplicate for that semester (due to UNIQUE constraint)
        const result = await db.query(
            `INSERT INTO classes (semester, class_name) VALUES ($1, $2)
             ON CONFLICT (semester, class_name) DO NOTHING
             RETURNING *`, // Returns inserted row OR empty if conflict occurred
            [semesterNum, className.trim()]
        );
        if (result.rows.length > 0) {
             res.status(201).json(result.rows[0]); // Return newly created class
        } else {
             res.status(200).json({ message: 'Class already exists for this semester' }); // Or 409 Conflict? 200 might be simpler for frontend
        }
    } catch (err) {
        console.error('Error adding class:', err);
        res.status(500).json({ error: 'Internal server error while adding class' });
    }
});

// POST /api/teachers - Add a new teacher
app.post('/api/teachers', async (req, res) => {
    const { teacherName } = req.body;
    if (!teacherName || typeof teacherName !== 'string' || teacherName.trim() === '') {
        return res.status(400).json({ error: 'Non-empty teacherName is required' });
    }
    try {
        // Insert, ignore if duplicate name (due to UNIQUE constraint)
        const result = await db.query(
            `INSERT INTO teachers (teacher_name) VALUES ($1)
             ON CONFLICT (teacher_name) DO NOTHING
             RETURNING *`,
            [teacherName.trim()]
        );
         if (result.rows.length > 0) {
             res.status(201).json(result.rows[0]); // Return newly created teacher
        } else {
             res.status(200).json({ message: 'Teacher already exists' });
        }
    } catch (err) {
        console.error('Error adding teacher:', err);
        res.status(500).json({ error: 'Internal server error while adding teacher' });
    }
});

// POST /api/chapters - Add a new chapter
app.post('/api/chapters', async (req, res) => {
    const { chapterName } = req.body;
     if (!chapterName || typeof chapterName !== 'string' || chapterName.trim() === '') {
        return res.status(400).json({ error: 'Non-empty chapterName is required' });
    }
     try {
        // Insert, ignore if duplicate name (due to UNIQUE constraint)
        const result = await db.query(
            `INSERT INTO chapters (chapter_name) VALUES ($1)
             ON CONFLICT (chapter_name) DO NOTHING
             RETURNING *`,
            [chapterName.trim()]
        );
         if (result.rows.length > 0) {
             res.status(201).json(result.rows[0]); // Return newly created chapter
        } else {
             res.status(200).json({ message: 'Chapter already exists' });
        }
    } catch (err) {
        console.error('Error adding chapter:', err);
        res.status(500).json({ error: 'Internal server error while adding chapter' });
    }
});

// ====== End of Category Management API ======

// ====== End of Category Fetching API ======


// ====== Existing PDFs API starts here ======
// GET /api/pdfs - Fetch PDFs based on filters (Keep this as is)
// ... rest of your existing PDF, Task, Video, etc. API endpoints ...
// ====== Tasks API ======

// GET /api/tasks - Fetch all tasks
app.get('/api/tasks', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM tasks ORDER BY created_at DESC');
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error fetching tasks:', err);
        res.status(500).json({ error: 'Internal server error while fetching tasks' });
    }
});

// POST /api/tasks - Add a new task
app.post('/api/tasks', async (req, res) => {
    const { text } = req.body;
    if (!text || typeof text !== 'string' || text.trim() === '') {
        return res.status(400).json({ error: 'Task text is required and must be a non-empty string' });
    }
    try {
        const result = await db.query(
            'INSERT INTO tasks (text, completed) VALUES ($1, $2) RETURNING *',
            [text.trim(), false]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error adding task:', err);
        res.status(500).json({ error: 'Internal server error while adding task' });
    }
});

// PUT /api/tasks/:id - Update a task
app.put('/api/tasks/:id', validateId, async (req, res) => { // Use validation middleware
    const taskId = req.validatedId;
    const { text, completed } = req.body;

    if (text === undefined && completed === undefined) {
      return res.status(400).json({ error: 'No update data provided (text or completed)' });
    }
    if (text !== undefined && (typeof text !== 'string' || text.trim() === '')) {
        return res.status(400).json({ error: 'Task text must be a non-empty string if provided' });
    }
     if (completed !== undefined && typeof completed !== 'boolean') {
        return res.status(400).json({ error: 'Completed status must be a boolean (true or false) if provided' });
    }

    try {
        const currentTaskResult = await db.query('SELECT * FROM tasks WHERE id = $1', [taskId]);
        if (currentTaskResult.rows.length === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }
        const currentTask = currentTaskResult.rows[0];
        const newText = text !== undefined ? text.trim() : currentTask.text;
        const newCompleted = completed !== undefined ? completed : currentTask.completed;

        const result = await db.query(
            'UPDATE tasks SET text = $1, completed = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
            [newText, newCompleted, taskId]
        );
        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error(`Error updating task ${taskId}:`, err);
        res.status(500).json({ error: 'Internal server error while updating task' });
    }
});

// DELETE /api/tasks/:id - Delete a task
app.delete('/api/tasks/:id', validateId, async (req, res) => { // Use validation middleware
    const taskId = req.validatedId;
    try {
        const result = await db.query('DELETE FROM tasks WHERE id = $1', [taskId]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.sendStatus(204); // No Content
    } catch (err) {
        console.error(`Error deleting task ${taskId}:`, err);
        res.status(500).json({ error: 'Internal server error while deleting task' });
    }
});


// ====== PDFs API ======

// GET /api/pdfs - Fetch PDFs based on filters
app.get('/api/pdfs', async (req, res) => {
    const { semester, class: className, teacher: teacherName, chapter: chapterName } = req.query;
    let query = 'SELECT * FROM pdfs';
    const conditions = [];
    const values = [];
    let paramIndex = 1;

    if (semester) { conditions.push(`semester = $${paramIndex++}`); values.push(parseInt(semester, 10)); }
    if (className) { conditions.push(`class_name = $${paramIndex++}`); values.push(className); }
    if (teacherName) { conditions.push(`teacher_name = $${paramIndex++}`); values.push(teacherName); }
    if (chapterName) { conditions.push(`chapter_name = $${paramIndex++}`); values.push(chapterName); }

    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY uploaded_at DESC';

    try {
        // console.log('Executing PDF Query:', query, values); // Optional debug log
        const result = await db.query(query, values);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error fetching PDFs:', err);
        res.status(500).json({ error: 'Internal server error while fetching PDFs' });
    }
});

// POST /api/pdfs - Add a new PDF entry
app.post('/api/pdfs', async (req, res) => {
    const { fileName, url, semester, className, teacherName, chapterName } = req.body;
    if (!fileName || !url || !semester || !className || !teacherName || !chapterName) {
        return res.status(400).json({ error: 'Missing required PDF fields' });
    }
    try {
        const result = await db.query(
            `INSERT INTO pdfs (file_name, url, semester, class_name, teacher_name, chapter_name)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [fileName, url, parseInt(semester, 10), className, teacherName, chapterName]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error adding PDF:', err);
        res.status(500).json({ error: 'Internal server error while adding PDF' });
    }
});

// PUT /api/pdfs/:id - Rename a PDF
app.put('/api/pdfs/:id', validateId, async (req, res) => { // Use validation middleware
    const pdfId = req.validatedId;
    const { fileName } = req.body;
    if (!fileName || typeof fileName !== 'string' || fileName.trim() === '') {
        return res.status(400).json({ error: 'New file name is required and must be non-empty' });
    }
    try {
        const result = await db.query(
            'UPDATE pdfs SET file_name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
            [fileName.trim(), pdfId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'PDF not found' });
        }
        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error(`Error updating PDF ${pdfId}:`, err);
        res.status(500).json({ error: 'Internal server error while updating PDF' });
    }
});

// DELETE /api/pdfs/:id - Delete a PDF entry
app.delete('/api/pdfs/:id', validateId, async (req, res) => { // Use validation middleware
    const pdfId = req.validatedId;
    try {
        const result = await db.query('DELETE FROM pdfs WHERE id = $1', [pdfId]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'PDF not found' });
        }
        res.sendStatus(204);
    } catch (err) {
        console.error(`Error deleting PDF ${pdfId}:`, err);
        res.status(500).json({ error: 'Internal server error while deleting PDF' });
    }
});


// ====== Videos API ======

// GET /api/videos - Fetch Videos based on filters
app.get('/api/videos', async (req, res) => {
    const { semester, class: className, teacher: teacherName, chapter: chapterName } = req.query;
    let query = 'SELECT * FROM videos';
    const conditions = [];
    const values = [];
    let paramIndex = 1;

    if (semester) { conditions.push(`semester = $${paramIndex++}`); values.push(parseInt(semester, 10)); }
    if (className) { conditions.push(`class_name = $${paramIndex++}`); values.push(className); }
    if (teacherName) { conditions.push(`teacher_name = $${paramIndex++}`); values.push(teacherName); }
    if (chapterName) { conditions.push(`chapter_name = $${paramIndex++}`); values.push(chapterName); }

    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY created_at DESC';

    try {
        const result = await db.query(query, values);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error fetching videos:', err);
        res.status(500).json({ error: 'Internal server error while fetching videos' });
    }
});

// POST /api/videos - Add a new video entry
app.post('/api/videos', async (req, res) => {
    const { videoId, semester, className, teacherName, chapterName } = req.body;
    if (!videoId || !semester || !className || !teacherName || !chapterName) {
        return res.status(400).json({ error: 'Missing required video fields (videoId, semester, class, teacher, chapter)' });
    }
    try {
        const result = await db.query(
            `INSERT INTO videos (video_id, semester, class_name, teacher_name, chapter_name)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [videoId, parseInt(semester, 10), className, teacherName, chapterName]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error adding video:', err);
        res.status(500).json({ error: 'Internal server error while adding video' });
    }
});

// DELETE /api/videos/:id - Delete a video entry
app.delete('/api/videos/:id', validateId, async (req, res) => { // Use validation middleware
    const videoId = req.validatedId;
    try {
        const result = await db.query('DELETE FROM videos WHERE id = $1', [videoId]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Video not found' });
        }
        res.sendStatus(204);
    } catch (err) {
        console.error(`Error deleting video ${videoId}:`, err);
        res.status(500).json({ error: 'Internal server error while deleting video' });
    }
});

// ====== Notes API ======

// GET /api/notes - Fetch notes based on filters
app.get('/api/notes', async (req, res) => {
    const { semester, class: className, teacher: teacherName, chapter: chapterName, student: studentName, roll: rollNumber } = req.query;
    let query = 'SELECT * FROM notes';
    const conditions = [];
    const values = [];
    let paramIndex = 1;

    if (semester) { conditions.push(`semester = $${paramIndex++}`); values.push(parseInt(semester, 10)); }
    if (className) { conditions.push(`class_name = $${paramIndex++}`); values.push(className); }
    if (teacherName) { conditions.push(`teacher_name = $${paramIndex++}`); values.push(teacherName); }
    if (chapterName) { conditions.push(`chapter_name = $${paramIndex++}`); values.push(chapterName); }
    if (studentName) { conditions.push(`student_name = $${paramIndex++}`); values.push(studentName); }
    if (rollNumber) { conditions.push(`roll_number = $${paramIndex++}`); values.push(rollNumber); } // Assuming roll_number is stored as text/varchar

    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY created_at DESC';

    try {
        const result = await db.query(query, values);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error fetching notes:', err);
        res.status(500).json({ error: 'Internal server error while fetching notes' });
    }
});

// POST /api/notes - Add a new note entry
app.post('/api/notes', async (req, res) => {
    const { content, semester, className, teacherName, chapterName, studentName, rollNumber } = req.body;
     if (!content || !semester || !className || !teacherName || !chapterName || !studentName || !rollNumber) {
        return res.status(400).json({ error: 'Missing required note fields' });
    }
    try {
        const result = await db.query(
            `INSERT INTO notes (content, semester, class_name, teacher_name, chapter_name, student_name, roll_number)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [content, parseInt(semester, 10), className, teacherName, chapterName, studentName, rollNumber]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error adding note:', err);
        res.status(500).json({ error: 'Internal server error while adding note' });
    }
});

// DELETE /api/notes/:id - Delete a note entry
app.delete('/api/notes/:id', validateId, async (req, res) => { // Use validation middleware
    const noteId = req.validatedId;
    try {
        const result = await db.query('DELETE FROM notes WHERE id = $1', [noteId]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Note not found' });
        }
        res.sendStatus(204);
    } catch (err) {
        console.error(`Error deleting note ${noteId}:`, err);
        res.status(500).json({ error: 'Internal server error while deleting note' });
    }
});


// ====== Events API ======

// GET /api/events - Fetch all events
app.get('/api/events', async (req, res) => {
    try {
        // Order by event date perhaps?
        const result = await db.query('SELECT * FROM events ORDER BY event_date DESC, created_at DESC');
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error fetching events:', err);
        res.status(500).json({ error: 'Internal server error while fetching events' });
    }
});

// POST /api/events - Add a new event
app.post('/api/events', async (req, res) => {
    const { title, date: event_date, description } = req.body;
    if (!title || !event_date || !description) {
         return res.status(400).json({ error: 'Missing required event fields (title, date, description)' });
    }
    // Add date validation if needed
    try {
        const result = await db.query(
            'INSERT INTO events (title, event_date, description) VALUES ($1, $2, $3) RETURNING *',
            [title, event_date, description]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error adding event:', err);
        res.status(500).json({ error: 'Internal server error while adding event' });
    }
});

// DELETE /api/events/:id - Delete an event
app.delete('/api/events/:id', validateId, async (req, res) => { // Use validation middleware
    const eventId = req.validatedId;
     try {
        const result = await db.query('DELETE FROM events WHERE id = $1', [eventId]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }
        res.sendStatus(204);
    } catch (err) {
        console.error(`Error deleting event ${eventId}:`, err);
        res.status(500).json({ error: 'Internal server error while deleting event' });
    }
});

// ====== Exams API ======

// GET /api/exams - Fetch all exams
app.get('/api/exams', async (req, res) => {
    try {
        // Order by exam date
        const result = await db.query('SELECT * FROM exams ORDER BY exam_date DESC, exam_time ASC');
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error fetching exams:', err);
        res.status(500).json({ error: 'Internal server error while fetching exams' });
    }
});

// POST /api/exams - Add a new exam
app.post('/api/exams', async (req, res) => {
    const { date: exam_date, subject, time: exam_time, room } = req.body;
     if (!exam_date || !subject || !exam_time || !room) {
         return res.status(400).json({ error: 'Missing required exam fields (date, subject, time, room)' });
    }
    // Add date/time validation if needed
    try {
        const result = await db.query(
            'INSERT INTO exams (exam_date, subject, exam_time, room) VALUES ($1, $2, $3, $4) RETURNING *',
            [exam_date, subject, exam_time, room]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error adding exam:', err);
        res.status(500).json({ error: 'Internal server error while adding exam' });
    }
});

// DELETE /api/exams/:id - Delete an exam
app.delete('/api/exams/:id', validateId, async (req, res) => { // Use validation middleware
    const examId = req.validatedId;
     try {
        const result = await db.query('DELETE FROM exams WHERE id = $1', [examId]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Exam not found' });
        }
        res.sendStatus(204);
    } catch (err) {
        console.error(`Error deleting exam ${examId}:`, err);
        res.status(500).json({ error: 'Internal server error while deleting exam' });
    }
});

// ====== Calendar Events API ======

// GET /api/calendarEvents - Fetch calendar events (maybe filter by date range later)
app.get('/api/calendarEvents', async (req, res) => {
    // Optional: Add date range filtering based on query params (e.g., ?start=...&end=...)
    try {
        const result = await db.query('SELECT * FROM calendar_events ORDER BY start_time ASC');
        // Convert start/end times to format expected by FullCalendar if necessary
        // For now, assume DB format is compatible or frontend handles it
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error fetching calendar events:', err);
        res.status(500).json({ error: 'Internal server error while fetching calendar events' });
    }
});

// POST /api/calendarEvents - Add a new calendar event
app.post('/api/calendarEvents', async (req, res) => {
    // FullCalendar typically sends start, end, allDay, title
    const { title, start, end, allDay, completed = false } = req.body;
     if (!title || !start) { // 'end' might be optional if allDay=true or for point events
         return res.status(400).json({ error: 'Missing required calendar event fields (title, start)' });
    }
    // Add more validation for date formats and boolean types
    try {
        const result = await db.query(
            `INSERT INTO calendar_events (title, start_time, end_time, all_day, completed)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [title, start, end, allDay, completed] // Ensure data types match DB columns
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error adding calendar event:', err);
        res.status(500).json({ error: 'Internal server error while adding calendar event' });
    }
});

// PUT /api/calendarEvents/:id - Update a calendar event (title, dates, completed status)
app.put('/api/calendarEvents/:id', validateId, async (req, res) => { // Use validation middleware
    const eventId = req.validatedId;
    // Allow updating title, start, end, allDay, completed
    const { title, start, end, allDay, completed } = req.body;

     // Need validation: at least one field must be provided for update
     if (title === undefined && start === undefined && end === undefined && allDay === undefined && completed === undefined) {
        return res.status(400).json({ error: 'No update data provided for calendar event' });
     }

    try {
        // Fetch current event to only update provided fields (optional, can also use COALESCE in SQL)
        const currentEventResult = await db.query('SELECT * FROM calendar_events WHERE id = $1', [eventId]);
        if (currentEventResult.rows.length === 0) {
            return res.status(404).json({ error: 'Calendar event not found' });
        }
        const currentEvent = currentEventResult.rows[0];

        const newTitle = title !== undefined ? title : currentEvent.title;
        const newStart = start !== undefined ? start : currentEvent.start_time;
        const newEnd = end !== undefined ? end : currentEvent.end_time; // Handle nulls appropriately
        const newAllDay = allDay !== undefined ? allDay : currentEvent.all_day;
        const newCompleted = completed !== undefined ? completed : currentEvent.completed;


        const result = await db.query(
            `UPDATE calendar_events
             SET title = $1, start_time = $2, end_time = $3, all_day = $4, completed = $5, updated_at = CURRENT_TIMESTAMP
             WHERE id = $6 RETURNING *`,
            [newTitle, newStart, newEnd, newAllDay, newCompleted, eventId]
        );

        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error(`Error updating calendar event ${eventId}:`, err);
        res.status(500).json({ error: 'Internal server error while updating calendar event' });
    }
});

// DELETE /api/calendarEvents/:id - Delete a calendar event
app.delete('/api/calendarEvents/:id', validateId, async (req, res) => { // Use validation middleware
    const eventId = req.validatedId;
    try {
        const result = await db.query('DELETE FROM calendar_events WHERE id = $1', [eventId]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Calendar event not found' });
        }
        res.sendStatus(204);
    } catch (err) {
        console.error(`Error deleting calendar event ${eventId}:`, err);
        res.status(500).json({ error: 'Internal server error while deleting calendar event' });
    }
});


// ====== Chat Messages API (Basic) ======

// GET /api/chatMessages - Fetch recent messages
app.get('/api/chatMessages', async (req, res) => {
    const limit = parseInt(req.query.limit, 10) || 100; // Default to last 100 messages
    try {
        const result = await db.query('SELECT * FROM chat_messages ORDER BY created_at DESC LIMIT $1', [limit]);
        // Return messages in chronological order for display
        res.status(200).json(result.rows.reverse());
    } catch (err) {
        console.error('Error fetching chat messages:', err);
        res.status(500).json({ error: 'Internal server error while fetching chat messages' });
    }
});

// POST /api/chatMessages - Add a new message
app.post('/api/chatMessages', async (req, res) => {
    const { text } = req.body;
     if (!text || typeof text !== 'string' || text.trim() === '') {
         return res.status(400).json({ error: 'Chat message text cannot be empty' });
    }
    try {
        const result = await db.query(
            'INSERT INTO chat_messages (text) VALUES ($1) RETURNING *',
            [text.trim()]
        );
        // Optional: Broadcast message via WebSockets here for real-time chat
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error adding chat message:', err);
        res.status(500).json({ error: 'Internal server error while adding chat message' });
    }
});


// --- Health Check Route (Good practice) ---
app.get('/api/health', (req, res) => {
    // Optional: Add a quick database check `db.query('SELECT 1')`
    res.json({ status: 'UP', timestamp: new Date().toISOString() });
});


// --- Catch-all for undefined routes (Place AFTER all other routes) ---
app.use((req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});


// --- Global Error Handler (Place very last) ---
// Optional but recommended for catching unhandled errors
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err.stack || err);
  res.status(500).json({ error: 'An unexpected internal server error occurred.' });
});


// --- Start the server ---
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});