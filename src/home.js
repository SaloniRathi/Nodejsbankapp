require('dotenv').config();

const express = require('express');
const app = express();
const path = require('path');
const bodyParser = require('body-parser');

// Use Passport with OpenId Connect strategy to
// Authenticate users with IBM Cloud Identity Connect
const passport = require('passport')
const OpenIDStrategy = require('passport-openidconnect').Strategy

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

    console.log('issuer:', issuer);
    console.log('userId:', userId);
    console.log('accessToken:', accessToken);
    console.log('refreshToken:', refreshToken);
    console.log('params:', params);

    //req.session.accessToken = accessToken;
    //req.session.userId = userId;
    //req.session.loggedIn = true;
    //return cb(null, profile);
  }));
  





//console.log(path.join(__dirname,"../public/views/bank/home.html"));

const file_path = path.join(__dirname,"../public/views/bank/");

const staticPath = path.join(__dirname,"../public");

app.use(express.static(staticPath));
app.use(bodyParser());

// to set the view engine
app.set('view engine', 'hbs');
app.set('views',file_path);


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
/*app.get("/login", (req,res) => {
	res.render("login");
});*/


app.get("/open-new-account", (req,res) => {
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




app.listen(5000, function(){
	console.log('Listening on port 5000');
});