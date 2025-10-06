# ClassMate

A basic web application built with Express.js featuring user login and registration functionality.

## Features

- User Registration with password confirmation
- User Login with authentication
- Clean and modern UI with gradient backgrounds
- Form validation
- Responsive design

## Screenshots

### Login Page
![Login Page](https://github.com/user-attachments/assets/f210b8bd-069d-40af-848e-9a7cd95c4f2c)

### Register Page
![Register Page](https://github.com/user-attachments/assets/ea7bc3a7-354c-4b1a-8ec2-7ec1c0230d26)

### Successful Registration
![Registration Success](https://github.com/user-attachments/assets/28a0337e-e070-4033-8b07-44784a1f373d)

### Successful Login
![Login Success](https://github.com/user-attachments/assets/475fa34e-b423-4fe1-8510-4d44cf2ca593)

### Failed Login
![Login Failed](https://github.com/user-attachments/assets/dfc15cf9-5612-42b1-9ab1-8923880ed367)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/JohanDanielAguirre/ClassMate.git
cd ClassMate
```

2. Install dependencies:
```bash
npm install
```

## Usage

Start the server:
```bash
npm start
```

The application will be available at `http://localhost:3000`

## Technology Stack

- **Backend**: Express.js
- **Frontend**: HTML5, CSS3
- **Middleware**: body-parser

## Project Structure

```
ClassMate/
├── server.js                 # Express server and routes
├── public/
│   ├── login.html           # Login page
│   ├── register.html        # Registration page
│   └── css/
│       └── style.css        # Styling for all pages
├── package.json             # Project dependencies
└── README.md               # Project documentation
```

## Note

This is a basic demonstration application. User data is stored in memory and will be lost when the server restarts. For production use, you should implement a proper database and security measures such as:
- Password hashing (bcrypt)
- Session management
- HTTPS
- CSRF protection
- Rate limiting