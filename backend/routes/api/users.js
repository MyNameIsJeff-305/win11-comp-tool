const express = require('express');
const bcrypt = require('bcryptjs');

const { setTokenCookie, requireAuth } = require('../../utils/auth');
const { User } = require('../../db/models');

const { check } = require('express-validator');
const { handleValidationErrors } = require('../../utils/validation');

const router = express.Router();

const validateSignup = [
    check('email')
        .exists({ checkFalsy: true })
        .isEmail()
        .withMessage('Please provide a valid email.'),
    check('password')
        .exists({ checkFalsy: true })
        .isLength({ min: 6 })
        .withMessage('Password must be 6 characters or more.'),
    handleValidationErrors
];

// Sign up  
router.post(
    '/',
    async (req, res) => {
        const { email, stationName, clientName, password } = req.body;
        const hashedPassword = bcrypt.hashSync(password);
        const user = await User.create({ email, stationName, clientName, hashedPassword });

        const safeUser = {
            id: user.id,
            email: user.email,
            stationName: user.stationName,
            clientName: user.clientName,
        };

        await setTokenCookie(res, safeUser);

        return res.json({
            user: safeUser
        });
    }
);

module.exports = router;