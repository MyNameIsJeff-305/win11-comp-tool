const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const csurf = require('csurf');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
require('express-async-errors');

const { ValidationError } = require('sequelize');
const { environment } = require('./config');

const routes = require('./routes');
const isProduction = environment === 'production';
const app = express();

app.use(morgan('dev'));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

if (!isProduction) {
    app.use(cors());
}

app.use(
    helmet.crossOriginResourcePolicy({
        policy: "cross-origin"
    })
);

// CSRF middleware (defined, not global)
const csrfProtection = csurf({
    cookie: {
        secure: isProduction,
        sameSite: isProduction && "Lax",
        httpOnly: true
    }
});

// Apply CSRF ONLY to non-API routes
app.use((req, res, next) => {
    if (
        req.path.startsWith('/api') ||
        req.path.startsWith('/backup')
    ) {
        return next();
    }
    return csrfProtection(req, res, next);
});

app.use(routes);

/* ---------- Error handling ---------- */

app.use((_req, _res, next) => {
    const err = new Error("The requested resource couldn't be found.");
    err.title = "Resource Not Found";
    err.errors = { message: "The requested resource couldn't be found." };
    err.status = 404;
    next(err);
});

app.use((err, _req, _res, next) => {
    if (err instanceof ValidationError) {
        const errors = {};
        for (let error of err.errors) {
            errors[error.path] = error.message;
        }
        err.title = 'Validation error';
        err.errors = errors;
    }
    next(err);
});

app.use((err, _req, res, _next) => {
    res.status(err.status || 500);
    console.error(err);
    res.json({
        title: err.title || 'Server Error',
        message: err.message,
        errors: err.errors,
        stack: isProduction ? null : err.stack
    });
});

module.exports = app;
