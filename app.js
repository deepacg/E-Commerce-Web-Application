var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var hbs=require('express-handlebars');            // to use handlebars (hbs())
var fileUpload=require('express-fileupload');     // to upload any file (in this case image file)
var db=require('./config/connection')             // to get db details from 'config' folder
var session=require('express-session')            // to create sessions

var userRouter = require('./routes/user');
var adminRouter = require('./routes/admin');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

// set engine to specify hbs, where layouts and partials are kept
app.engine('hbs', hbs({extname: 'hbs', defaultLayout: 'layout', layoutsDir: __dirname+'/views/layouts/', partialsDir: __dirname+'/views/partials/'}))

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));        // declaring 'public' as public static folder
app.use(fileUpload())                                           // to use the middleware for file upload
app.use(session({secret: "Key", cookie:{maxAge: 600000}}))      // setting session expiry date

//db.connect()
db.connect((err)=>{                                             // here we are connecting to db, test db connection
  if(err) console.log("Connection Error"+err)
  else console.log('Database connected successfully')
})

app.use('/', userRouter);             // telling '/' to go to user.js
app.use('/admin', adminRouter);       // telling '/admin' to go admin.js

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

module.exports = app;
