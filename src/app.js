import express from 'express';
import cors from 'cors';
import logger from 'morgan';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import createHttpError from 'http-errors';

import { router as indexRouter }  from './router/index.js';
import { router as authRouter } from './router/auth.js';
import { router as userRouter } from './router/user.js';

export const app = express();
const port = process.env.PORT || 3000;

/**
 * Using express-session middleware for persistent user session. Be sure to
 * familiarize yourself with available options. Visit: https://www.npmjs.com/package/express-session
 */

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false, // set this to true on production
  },
}));

// set __dirname in ES6
const __dirname = dirname(fileURLToPath(import.meta.url));
console.log(__dirname);

// view engine setup
app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'hbs');

app.use(logger('dev'));
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, '../public')));

app.use('/', indexRouter);
app.use('/auth', authRouter);
app.use('/user', userRouter);

// catch 404 dan teruskan ke error handler
app.use((req, res, next) => {
  next(createHttpError(404));
});

// error handler
app.use((req, res, next) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? error : {};

  res.status(err.status || 500);
  res.render('error');
});

// app.listen(port, () => {
//   console.log(`Application listening on port ${port}`);
// });