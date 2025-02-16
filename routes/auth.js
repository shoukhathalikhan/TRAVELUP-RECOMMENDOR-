// routes/auth.js

const express = require('express');
const User = require('../models/user'); // Make sure User model is correctly imported
const router = express.Router();

// Sign up route
router.post('/signup', async (req, res) => {
    const { email, username, password, pwdconfirm } = req.body;

    // Simple validation
    if (!email || !username || !password || password !== pwdconfirm) {
        return res.redirect('/signup?error=invalidinput');
    }

    // Check if user exists
    try {
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            return res.redirect('/signup?error=userexists');
        }

        // Create and save the user
        const newUser = new User({ email, username, password });
        await newUser.save();

        // Redirect to the login page after successful signup
        req.session.success = 'Signup successful! Please log in.';
        res.redirect('/login');
    } catch (error) {
        console.error("Error during signup:", error);
        res.redirect('/signup?error=servererror');
    }
});

// Login route
router.post('/login', async (req, res) => {
    const { uid, password } = req.body;

    // Simple validation
    if (!uid || !password) {
        return res.redirect('/login?error=emptyinput');
    }

    // Check if user exists
    try {
        const user = await User.findOne({ $or: [{ username: uid }, { email: uid }] });
        if (!user || user.password !== password) {
            return res.redirect('/login?error=invalidcredentials');
        }

        // Set session after successful login
        req.session.userId = user._id;
        res.redirect('/loggedinhome');
    } catch (error) {
        console.error("Error during login:", error);
        res.redirect('/login?error=servererror');
    }
});

module.exports = router;
