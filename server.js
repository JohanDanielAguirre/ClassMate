const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory storage for users (for demonstration purposes)
const users = [];

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Login Successful - ClassMate</title>
                <link rel="stylesheet" href="/css/style.css">
            </head>
            <body>
                <div class="container">
                    <div class="form-container">
                        <h1>Welcome, ${username}!</h1>
                        <p class="success-message">You have successfully logged in to ClassMate.</p>
                        <a href="/" class="link">Go back to login</a>
                    </div>
                </div>
            </body>
            </html>
        `);
    } else {
        res.send(`
            <!DOCTYPE html>
            <html>
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
});

app.post('/register', (req, res) => {
    const { username, password, confirmPassword } = req.body;
    
    if (!username || !password) {
        res.send(`
            <!DOCTYPE html>
            <html>
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
        return;
    }
    
    if (password !== confirmPassword) {
        res.send(`
            <!DOCTYPE html>
            <html>
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
        return;
    }
    
    const existingUser = users.find(u => u.username === username);
    
    if (existingUser) {
        res.send(`
            <!DOCTYPE html>
            <html>
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
    } else {
        users.push({ username, password });
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Registration Successful - ClassMate</title>
                <link rel="stylesheet" href="/css/style.css">
            </head>
            <body>
                <div class="container">
                    <div class="form-container">
                        <h1>Registration Successful!</h1>
                        <p class="success-message">Your account has been created successfully.</p>
                        <a href="/" class="link">Go to login</a>
                    </div>
                </div>
            </body>
            </html>
        `);
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
