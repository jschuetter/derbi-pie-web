const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const con = require("./mysqlConnection");
const User = require('./user');


// routers
const indexRouter = require('./routes');
const dictionaryRouter = require('./routes/dictionary');
const searchRoutes = require('./routes/search');
const constructionRoutes = require('./routes/construction');
// const {downloadRouter} = require('./routes/download');
const {resultsRoutes} = require('./routes/results');
const instructionsRouter = express.Router().get('/', (req, res) => {res.render('instructions.pug')});
const aboutRoutes = express.Router().get('/', (req, res) => {res.render('about')});
// const adminRoutes = require('./routes/admin');

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Set up sessions
app.use(session({
  secret: 'your-secret-key-here',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));


// **************************************************************
//  * removing the entire user authentication model for now
//  * gonna rebuild it from the ground up
//  * this is gonna suck

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Configure Passport LocalStrategy
passport.use(new LocalStrategy(
  async (username, password, done) => {
    try {
      const user = await User.getUser(username);
      if (!user) return done(null, false, { message: 'Incorrect username or password' });

      const isMatch = await User.comparePassword(user, password);
      if (!isMatch) return done(null, false, { message: 'Incorrect username or password' });

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));

// Serialize and deserialize user
passport.serializeUser((user, done) => {
  done(null, user.userid);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.getUserByID(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

app.use((req, res, next) => {
  res.locals.user = req.user || null;
  next();
});

// Define a middleware to check authentication
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  // if (req.ip === '::ffff:127.0.0.1'){
  //   return next();
  // }
  res.redirect('/login');
};
//************************************************************

//public routes
app.use('/', indexRouter);
app.use('/construction', constructionRoutes);
app.use('/about', aboutRoutes);
app.use('/login', require('./routes/auth'));

//protected routes
// todo: some of these SHOULD be protected, but are not for convenience
// app.use('/dictionary', isAuthenticated, dictionaryRouter);
app.use('/dictionary', dictionaryRouter);
app.use('/search', isAuthenticated, searchRoutes);
app.use('/results', isAuthenticated, resultsRoutes);
app.use('/instructions', isAuthenticated, instructionsRouter);
// app.use('/download', isAuthenticated, downloadRouter);

// Admin routes (protected)
// app.use('/admin', adminRoutes);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

// initialize plugins
// const loadPlugins = require('./pluginLoader');
// const PluginInterface = require('./pluginInterface');
// const plugins = loadPlugins(PluginInterface);

module.exports = app;
