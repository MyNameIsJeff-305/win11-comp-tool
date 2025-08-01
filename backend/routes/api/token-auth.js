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

    //Get the _csrf token from the browser's cookies
    const csrfToken = req.csrfToken();

    // console.log("CSRF Token:", csrfToken);

    res.status(200).json({csrfToken})

});

module.exports = router;
