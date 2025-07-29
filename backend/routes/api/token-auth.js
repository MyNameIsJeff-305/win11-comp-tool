const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../../db/models');

const router = express.Router();

router.post('/', async (req, res) => {
    const { email, password } = req.body;

    const user = await User.unscoped().findOne({ where: { email } });
    if (!user || !bcrypt.compareSync(password, user.hashedPassword.toString())) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const payload = {
        id: user.id,
        email: user.email
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({ token });
});

module.exports = router;
