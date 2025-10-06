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

// Protected example route
app.get('/dashboard', auth(true), (req, res) => {
  const { username, role } = req.user || {};
  res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <title>Dashboard - ClassMate</title>
            <link rel="stylesheet" href="/css/style.css">
        </head>
        <body>
            <div class="container">
                <div class="form-container">
                    <h1>Dashboard</h1>
                    <p>Hola <strong>${username}</strong>! Tu rol es <strong>${role}</strong>.</p>
                    ${role === 'monitor' ? '<p>Tienes acceso a herramientas de monitor.</p>' : '<p>Bienvenido estudiante.</p>'}
                    <a href="/logout" class="link">Logout</a>
                </div>
            </div>
        </body>
        </html>
    `);
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

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
