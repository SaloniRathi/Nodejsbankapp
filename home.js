require('dotenv').config();

const request = require('request');
const express = require('express');
const app = express();
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const bbfn = require('./functions.js');

// Use Passport with OpenId Connect strategy to
// Authenticate users with IBM Cloud Identity Connect
const passport = require('passport')
const OpenIDStrategy = require('passport-openidconnect').Strategy

const dashboard = require('./routes/dashboard');
const openaccount = require('./routes/open-new-account');

// edit this URL with your base URL for IBM Cloud Identity OIDC default endpoint
var APP = process.env.APP || "Demo Site";


// Configure the OpenId Connect Strategy
// with credentials obtained from env details (.env)
passport.use(new OpenIDStrategy({
    issuer: process.env.OIDC_CI_BASE_URI + '/oidc/endpoint/default',
    clientID: process.env.OIDC_CLIENT_ID, // from .env file
    clientSecret: process.env.OIDC_CLIENT_SECRET, // from .env file
    authorizationURL: process.env.OIDC_CI_BASE_URI + '/oidc/endpoint/default/authorize', // this won't change
    userInfoURL: process.env.OIDC_CI_BASE_URI + '/oidc/endpoint/default/userinfo', // this won't change
    tokenURL: process.env.OIDC_CI_BASE_URI + '/oidc/endpoint/default/token', // this won't change
    callbackURL: process.env.OIDC_REDIRECT_URI, // from .env file
    passReqToCallback: true
  },
  function(req, issuer, userId, profile, accessToken, refreshToken, params, cb) {

    console.log('profile:',profile);
    console.log('issuer:', issuer);
    console.log('userId:', userId);
    console.log('accessToken:', accessToken);
    console.log('refreshToken:', refreshToken);
    console.log('params:', params);

    req.session.accessToken = accessToken;
    req.session.userId = userId;
    req.session.loggedIn = true;
    return cb(null, profile);

  }));


passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});
  
// Passport requires session to persist the authentication
// so were using express-session for this example
app.use(session({
  secret: 'secret sause',
  resave: false,
  saveUninitialized: true
}))

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Middleware for checking if a user has been authenticated
// via Passport and IBM OpenId Connect
function checkAuthentication(req, res, next) {
  if (req.isAuthenticated()) {
    next();
  } else {
    req.session.returnTo = req.url
    res.redirect("/");
  }
}




//console.log(path.join(__dirname,"../public/views/bank/home.html"));

const file_path = path.join(__dirname,"/public/views/bank/");

const staticPath = path.join(__dirname,"/public");

app.use(express.static(staticPath));
app.use(bodyParser());

// to set the view engine
app.set('view engine', 'hbs');
app.set('views',file_path);

app.use('/app/dashboard', checkAuthentication, dashboard);
//app.use('/app/dashboard',dashboard)

app.use('/open-new-account',openaccount);

// routes

app.get("/", (req,res) => {
	res.render("home");
});

app.get('/login', passport.authenticate('openidconnect',{
  successReturnToOrRedirect: "/",
  scope: 'email profile'
}));

// Callback handler that IBM will redirect back to
// after successfully authenticating the user
app.get('/oauth/callback', passport.authenticate('openidconnect', {
  callback: true,
  successReturnToOrRedirect: '/app/dashboard',
  failureRedirect: '/'
})); 

/*app.get('/oauth/callback', passport.authenticate('openidconnect'),(req,res)=> {
    //res.send('reached callback');
    //res.send(req.user);
    res.redirect('/app/dashboard/');
});*/

/*
app.get("/login", (req,res) => {
	res.render("login");
});
*/

// Destroy both the local session and
// revoke the access_token at IBM
app.get('/logout', function(req, res) {
  request.post(process.env.OIDC_CI_BASE_URI + '/oidc/endpoint/default/revoke', {
    'form': {
      'client_id': process.env.OIDC_CLIENT_ID,
      'client_secret': process.env.OIDC_CLIENT_SECRET,
      'token': req.session.accessToken,
      'token_type_hint': 'access_token'
    }
  }, function(err, respose, body) {

    console.log('Session Revoked at IBM');
    req.session.loggedIn = false;
    res.redirect(process.env.OIDC_CI_BASE_URI + '/idaas/mtfim/sps/idaas/logout');
  });
});

/*app.get("/logout", (req,res)=>{
  //res.send("Logout");
  req.logout();
})*/


/*app.get("/open-new-account", (req,res) => {
	res.render("open-new-account");
});


app.get("/dashboard", (req,res) => {
	res.render("dashboard");
});

app.post("/dashboard", (req,res) => {
	res.render("dashboard");
});

app.get("/new-account-failed", (req,res) => {
	res.render("new-account-failed");
});

app.post("/new-account-failed", (req,res) => {
	res.render("new-account-failed");
});

app.get("/new-account-success", (req,res) => {
	res.render("new-account-success");
});

app.post("/new-account-success", (req,res) => {
	res.render("new-account-success");
});
*/




app.listen(5000, function(){
	console.log('Listening on port 5000');
});