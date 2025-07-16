const express = require('express');
const User = require('../user');
const con = require("../mysqlConnection");
const passport = require('passport');

const router = express.Router();

// Login form
router.get('/', (req, res) => {
  // Check for failure flag in query parameters
  const loginFailed = req.query.failed === 'true';
  res.render('login', {
    title: 'Login',
    error: loginFailed ? 'Incorrect username or password' : null
  });
});

// Process login
router.post('/', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) { return next(err); }
    if (!user) {
      // Redirect back to login with failure flag
      return res.redirect('/login?failed=true');
    }
    req.logIn(user, (err) => {
      if (err) { return next(err); }
      return res.redirect('/');
    });
  })(req, res, next);
});

// Logout
router.get('/logout', (req, res) => {
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
});

// Registration form
router.get('/register', (req, res) => {
  res.render('register', { title: 'Register' });
});

// Process registration
router.post('/register', async (req, res) => {
  try {
    const { username, password, inviteCode } = req.body;

    // Check if invite code exists and is not used
    if(!await User.getInviteCode(inviteCode)) {
      return res.render('register', {
        title: 'Register',
        error: 'Invalid or already used invite code.'
      });
    }

    await User.createUser(username, password);
    await User.deleteInviteCode(inviteCode);

    res.redirect('/login');
  } catch (error) {
    console.error('Registration error:', error);
    res.render('register', {
      title: 'Register',
      error: error
    });
  }

});

module.exports = router;