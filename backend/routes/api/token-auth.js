const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../../db/models');

const router = express.Router();

router.post('/', async (req, res, next) => {
    const { id } = req.body;

    const foundUser = await User.findByPk(id);
    if (!foundUser) {
        return res.status(404).json({ message: 'User not found' });
    }

    const token = jwt.sign(
        { id: foundUser.id, email: foundUser.email },
        process.env.JWT_SECRET || 'default_secret',
        { expiresIn: '30d' }
    );

    res.status(200).json({ token });
});

module.exports = router;
