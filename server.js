const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/classmate';

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB connection
mongoose
  .connect(MONGO_URI, { autoIndex: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
  });

// User schema/model
const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['monitor', 'estudiante'],
      required: true,
      default: 'estudiante',
    },
  },
  { timestamps: true }
);

userSchema.methods.toSafeJSON = function () {
  return { id: this._id, username: this.username, role: this.role };
};

const User = mongoose.model('User', userSchema);

// Monitoring Session schema/model
const monitoringSessionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    monitorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    scheduledDate: { type: Date, required: true },
    duration: { type: Number, required: true, default: 60 }, // duration in minutes
    status: {
      type: String,
      enum: ['scheduled', 'active', 'completed', 'cancelled'],
      default: 'scheduled'
    },
    sessionType: {
      type: String,
      enum: ['personal', 'group'],
      default: 'group'
    },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    maxParticipants: { type: Number, default: 30 },
    room: { type: String, trim: true },
    subject: { type: String, trim: true },
    notes: { type: String, trim: true }
  },
  { timestamps: true }
);

monitoringSessionSchema.methods.toSafeJSON = function () {
  return {
    id: this._id,
    title: this.title,
    description: this.description,
    monitorId: this.monitorId,
    scheduledDate: this.scheduledDate,
    duration: this.duration,
    status: this.status,
    sessionType: this.sessionType,
    participants: this.participants,
    maxParticipants: this.maxParticipants,
    room: this.room,
    subject: this.subject,
    notes: this.notes,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

const MonitoringSession = mongoose.model('MonitoringSession', monitoringSessionSchema);

// Auth middleware
function auth(required = true) {
  return (req, res, next) => {
    const token = (req.cookies && req.cookies.token) || (req.headers.authorization ? req.headers.authorization.replace('Bearer ', '') : null);
    if (!token) {
      if (required) return res.status(401).send('No autenticado');
      return next();
    }
    try {
      req.user = jwt.verify(token, JWT_SECRET); // { id, username, role }
      next();
    } catch (err) {
      if (required) return res.status(401).send('Token inválido o expirado');
      next();
    }
  };
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/sessions', auth(true), (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'sessions.html'));
});

app.get('/offer-sessions', auth(true), (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'offer-sessions.html'));
});

app.get('/book-sessions', auth(true), (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'book-sessions.html'));
});

// API: Register
app.post('/register', async (req, res) => {
  try {
    const { username, password, confirmPassword, role } = req.body;

    if (!username || !password) {
      return res.status(400).send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <title>Registration Failed - ClassMate</title>
                <link rel="stylesheet" href="/css/style.css">
            </head>
            <body>
                <div class="container">
                    <div class="form-container">
                        <h1>Registration Failed</h1>
                        <p class="error-message">Username and password are required.</p>
                        <a href="/register" class="link">Try again</a>
                    </div>
                </div>
            </body>
            </html>
        `);
    }

    if (password !== confirmPassword) {
      return res.status(400).send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <title>Registration Failed - ClassMate</title>
                <link rel="stylesheet" href="/css/style.css">
            </head>
            <body>
                <div class="container">
                    <div class="form-container">
                        <h1>Registration Failed</h1>
                        <p class="error-message">Passwords do not match.</p>
                        <a href="/register" class="link">Try again</a>
                    </div>
                </div>
            </body>
            </html>
        `);
    }

    const validRoles = ['monitor', 'estudiante'];
    const selectedRole = validRoles.includes((role || '').toLowerCase()) ? role.toLowerCase() : 'estudiante';

    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(409).send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <title>Registration Failed - ClassMate</title>
                <link rel="stylesheet" href="/css/style.css">
            </head>
            <body>
                <div class="container">
                    <div class="form-container">
                        <h1>Registration Failed</h1>
                        <p class="error-message">Username already exists.</p>
                        <a href="/register" class="link">Try again</a>
                    </div>
                </div>
            </body>
            </html>
        `);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, passwordHash, role: selectedRole });

    return res.status(201).send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <title>Registration Successful - ClassMate</title>
                <link rel="stylesheet" href="/css/style.css">
            </head>
            <body>
                <div class="container">
                    <div class="form-container">
                        <h1>Registration Successful!</h1>
                        <p class="success-message">Your account has been created successfully as <strong>${user.role}</strong>.</p>
                        <a href="/" class="link">Go to login</a>
                    </div>
                </div>
            </body>
            </html>
        `);
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).send('Username already exists');
    }
    console.error('Register error:', err);
    return res.status(500).send('Server error');
  }
});

// API: Login
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (!user) {
      return res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <title>Login Failed - ClassMate</title>
                <link rel="stylesheet" href="/css/style.css">
            </head>
            <body>
                <div class="container">
                    <div class="form-container">
                        <h1>Login Failed</h1>
                        <p class="error-message">Invalid username or password.</p>
                        <a href="/" class="link">Try again</a>
                    </div>
                </div>
            </body>
            </html>
        `);
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <title>Login Failed - ClassMate</title>
                <link rel="stylesheet" href="/css/style.css">
            </head>
            <body>
                <div class="container">
                    <div class="form-container">
                        <h1>Login Failed</h1>
                        <p class="error-message">Invalid username or password.</p>
                        <a href="/" class="link">Try again</a>
                    </div>
                </div>
            </body>
            </html>
        `);
    }

    const payload = { id: user._id.toString(), username: user.username, role: user.role };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <title>Login Successful - ClassMate</title>
                <link rel="stylesheet" href="/css/style.css">
            </head>
            <body>
                <div class="container">
                    <div class="form-container">
                        <h1>Welcome, ${user.username}! </h1>
                        <p class="success-message">You have successfully logged in to ClassMate as <strong>${user.role}</strong>.</p>
                        <a href="/dashboard" class="link">Go to dashboard</a>
                        <br/>
                        <a href="/" class="link">Go back to login</a>
                    </div>
                </div>
            </body>
            </html>
        `);
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).send('Server error');
  }
});

// API: Logout
app.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/');
});

// Protected dashboard route
app.get('/dashboard', auth(true), (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Current user info (JSON)
app.get('/me', auth(true), async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('username role');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Monitoring Session Routes

// Get all monitoring sessions (for monitors) or sessions user is participating in
app.get('/api/sessions', auth(true), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    let sessions;
    if (user.role === 'monitor') {
      // Monitors can see all their sessions
      sessions = await MonitoringSession.find({ monitorId: req.user.id })
        .populate('participants', 'username')
        .sort({ scheduledDate: 1 });
    } else {
      // Students can see sessions they're participating in
      sessions = await MonitoringSession.find({ 
        participants: req.user.id,
        status: { $in: ['scheduled', 'active'] }
      })
        .populate('monitorId', 'username')
        .populate('participants', 'username')
        .sort({ scheduledDate: 1 });
    }

    res.json(sessions.map(session => session.toSafeJSON()));
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a new monitoring session (monitors only)
app.post('/api/sessions', auth(true), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'monitor') {
      return res.status(403).json({ error: 'Only monitors can create sessions' });
    }

    const {
      title,
      description,
      scheduledDate,
      duration,
      maxParticipants,
      room,
      subject,
      notes,
      sessionType
    } = req.body;

    if (!title || !scheduledDate) {
      return res.status(400).json({ error: 'Title and scheduled date are required' });
    }

    // Si es sesión personalizada, maxParticipants debe ser 1
    const finalMaxParticipants = sessionType === 'personal' ? 1 : (maxParticipants || 30);
    const finalSessionType = sessionType || 'group';

    const session = await MonitoringSession.create({
      title,
      description,
      monitorId: req.user.id,
      scheduledDate: new Date(scheduledDate),
      duration: duration || 60,
      maxParticipants: finalMaxParticipants,
      sessionType: finalSessionType,
      room,
      subject,
      notes
    });

    await session.populate('monitorId', 'username');
    res.status(201).json(session.toSafeJSON());
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get a specific monitoring session
app.get('/api/sessions/:id', auth(true), async (req, res) => {
  try {
    const session = await MonitoringSession.findById(req.params.id)
      .populate('monitorId', 'username')
      .populate('participants', 'username');

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const user = await User.findById(req.user.id);
    if (user.role !== 'monitor' && !session.participants.includes(req.user.id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(session.toSafeJSON());
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update a monitoring session (monitors only)
app.put('/api/sessions/:id', auth(true), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'monitor') {
      return res.status(403).json({ error: 'Only monitors can update sessions' });
    }

    const session = await MonitoringSession.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.monitorId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'You can only update your own sessions' });
    }

    const updates = req.body;
    if (updates.scheduledDate) {
      updates.scheduledDate = new Date(updates.scheduledDate);
    }

    // Si se actualiza el tipo de sesión a personal, asegurar que maxParticipants sea 1
    if (updates.sessionType === 'personal') {
      updates.maxParticipants = 1;
    } else if (updates.sessionType === 'group' && !updates.maxParticipants) {
      // Si cambia a grupal y no se especifica maxParticipants, usar el valor por defecto
      updates.maxParticipants = updates.maxParticipants || 30;
    }

    const updatedSession = await MonitoringSession.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate('monitorId', 'username').populate('participants', 'username');

    res.json(updatedSession.toSafeJSON());
  } catch (error) {
    console.error('Error updating session:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Join a monitoring session (students only)
app.post('/api/sessions/:id/join', auth(true), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'estudiante') {
      return res.status(403).json({ error: 'Only students can join sessions' });
    }

    const session = await MonitoringSession.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status !== 'scheduled') {
      return res.status(400).json({ error: 'Cannot join session that is not scheduled' });
    }

    if (session.participants.includes(req.user.id)) {
      return res.status(400).json({ error: 'Already joined this session' });
    }

    if (session.participants.length >= session.maxParticipants) {
      return res.status(400).json({ error: 'Session is full' });
    }

    session.participants.push(req.user.id);
    await session.save();

    await session.populate('monitorId', 'username');
    await session.populate('participants', 'username');

    res.json(session.toSafeJSON());
  } catch (error) {
    console.error('Error joining session:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Leave a monitoring session
app.post('/api/sessions/:id/leave', auth(true), async (req, res) => {
  try {
    const session = await MonitoringSession.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (!session.participants.includes(req.user.id)) {
      return res.status(400).json({ error: 'Not participating in this session' });
    }

    session.participants = session.participants.filter(
      participantId => participantId.toString() !== req.user.id
    );
    await session.save();

    await session.populate('monitorId', 'username');
    await session.populate('participants', 'username');

    res.json(session.toSafeJSON());
  } catch (error) {
    console.error('Error leaving session:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a monitoring session (monitors only)
app.delete('/api/sessions/:id', auth(true), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'monitor') {
      return res.status(403).json({ error: 'Only monitors can delete sessions' });
    }

    const session = await MonitoringSession.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.monitorId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete your own sessions' });
    }

    await MonitoringSession.findByIdAndDelete(req.params.id);
    res.json({ message: 'Session deleted successfully' });
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get available sessions for students to join
app.get('/api/sessions/available', auth(true), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'estudiante') {
      return res.status(403).json({ error: 'Only students can view available sessions' });
    }

    const sessions = await MonitoringSession.find({
      status: 'scheduled',
      scheduledDate: { $gte: new Date() }, // Only future sessions
      $expr: { $lt: [{ $size: '$participants' }, '$maxParticipants'] } // Not full
    })
      .populate('monitorId', 'username')
      .populate('participants', 'username')
      .sort({ scheduledDate: 1 });

    res.json(sessions.map(session => session.toSafeJSON()));
  } catch (error) {
    console.error('Error fetching available sessions:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all monitors (for students to browse)
app.get('/api/monitors', auth(true), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'estudiante') {
      return res.status(403).json({ error: 'Only students can view monitors' });
    }

    const monitors = await User.find({ role: 'monitor' })
      .select('username _id')
      .sort({ username: 1 });

    res.json(monitors);
  } catch (error) {
    console.error('Error fetching monitors:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get sessions by specific monitor
app.get('/api/monitors/:monitorId/sessions', auth(true), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'estudiante') {
      return res.status(403).json({ error: 'Only students can view monitor sessions' });
    }

    const { monitorId } = req.params;
    const monitor = await User.findById(monitorId);
    
    if (!monitor || monitor.role !== 'monitor') {
      return res.status(404).json({ error: 'Monitor not found' });
    }

    const sessions = await MonitoringSession.find({
      monitorId: monitorId,
      status: 'scheduled',
      scheduledDate: { $gte: new Date() }, // Only future sessions
      $expr: { $lt: [{ $size: '$participants' }, '$maxParticipants'] } // Not full
    })
      .populate('monitorId', 'username')
      .populate('participants', 'username')
      .sort({ scheduledDate: 1 });

    res.json({
      monitor: { id: monitor._id, username: monitor.username },
      sessions: sessions.map(session => session.toSafeJSON())
    });
  } catch (error) {
    console.error('Error fetching monitor sessions:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Session status management
async function updateSessionStatuses() {
  try {
    const now = new Date();
    
    // Update sessions that should be active
    await MonitoringSession.updateMany(
      {
        status: 'scheduled',
        scheduledDate: { $lte: now }
      },
      { status: 'active' }
    );
    
    // Update sessions that should be completed
    await MonitoringSession.updateMany(
      {
        status: 'active',
        $expr: {
          $lte: [
            { $add: ['$scheduledDate', { $multiply: ['$duration', 60000] }] },
            now
          ]
        }
      },
      { status: 'completed' }
    );
  } catch (error) {
    console.error('Error updating session statuses:', error);
  }
}

// Update session statuses every minute
setInterval(updateSessionStatuses, 60000);

// Initial status update
updateSessionStatuses();

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
