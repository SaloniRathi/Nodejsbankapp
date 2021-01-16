var request = require('request');
var express = require('express');
var _ = require('lodash');
var json2csv = require('json2csv');
var bbfn = require('../functions.js');
var router = express.Router();

function match(a,b){
  if(a === b){
    return a;
  }
  else{
    return false;
  }
}

// GET profile
router.get('/', function(req, res, next) {
    if(req.session.loggedIn){
      bbfn.oidcIdToken(req, function(err,  body){
        if (err) {
          console.log(err);
        } else {
          res.render('open-new-account', {
             action: '/open-new-account/new-account-success',
             loggedIn: true,
             givenName: body.given_name,
             familyName: body.family_name,
             email: body.email
          });
        }
      })
    }
    else {
      res.render('open-new-account', {
         action: '/open-new-account/new-account-success',
         loggedIn: false
      });
    }
});

router.post('/new-account-success', function(req, res, next) {
    var loggedIn = ((req.session.loggedIn) ? true : false);
    //res.render('new-account-success');
    //console.log("Try " ,req.body.email);
    req.session.userEmail = req.body.email
    req.session.familyName = req.body.familyName
    req.session.givenName = req.body.givenName
    console.log("Quote started for:", req.session.userEmail);

    var data = req.body;
    console.log("Car quote submitted for:", req.session.userEmail);
    console.log("Car form submitted:", data)

     bbfn.authorize(process.env.API_CLIENT_ID, process.env.API_SECRET, function(err,  body){
        if (err) {
          console.log(err);
        } else {
          var accessToken = body.access_token;
          console.log("Access +  ", accessToken);
          bbfn.getUserID(req.session.userEmail, accessToken, function(err,  body){
              if(body === false)
              {
                var userInfo = {
                    "schemas": [
                      "urn:ietf:params:scim:schemas:core:2.0:User",
                          "urn:ietf:params:scim:schemas:extension:ibm:2.0:User",
                    ],
                    "userName": req.session.userEmail,
                    "name": {
                      "familyName": req.session.familyName,
                      "givenName": req.session.givenName
                    },
                    "preferredLanguage": "en-US",
                    "active": true,
                    "emails": [
                      {
                        "value": req.session.userEmail,
                        "type": "work"
                      }
                    ],
                    "addresses": [
                      {
                        "postalCode": data.id
                      }
                    ],
                    "urn:ietf:params:scim:schemas:extension:ibm:2.0:User": {
                      "userCategory": "regular",
                      "twoFactorAuthentication": false,
                      /*"customAttributes": [
                        {
                          "name": "username",
                          "values": [data.username]
                        },
                        {
                          "name": "password",
                          "values": [data.password]
                        },
                        {
                          "name": "repeat",
                          "values": [data.repeat]
                        },
                        {
                          "name": "phone",
                          "values": [data.phone]
                        },
                        {
                          "name": "city",
                          "values": [data.city]
                        }
                      ]*/
                    }
                  }

                console.log("User creation information:", userInfo)
                var options = {
                  'headers': {
                    'Content-Type':'application/scim+json',
                    'Authorization': `Bearer ${accessToken}`
                  },
                  'body': JSON.stringify(userInfo)
                }
                request.post(process.env.OIDC_CI_BASE_URI + '/v2.0/Users', options, function(err, response, body){
                  console.log("Create user:", req.session.userEmail)
                  body = JSON.parse(body);
                  console.log("Response code:", response.statusCode);
                  console.log("Create response:", body);
                  if(response.statusCode == 201){
                    //success
                    res.render('new-account-success', {
                       quote: 'car',
                       action:'/login',
                       formSubmission: JSON.stringify(req.body),
                       profileLink: '/app/dashboard',
                       message: `A password has been generated for you and sent to the email you provided us.`,
                       loggedIn: loggedIn
                    });
                  }
                  else{
                    //fail
                    console.log("Failed")
                    res.render('new-account-failed');
                  }
                });
              }
              else{
                var userId = body.id;
                var customAttributes =
                  typeof req.session.userprofile != "undefined" && req.session.userprofile[
                    "urn:ietf:params:scim:schemas:extension:ibm:2.0:User"
                  ]["customAttributes"] != "undefined"
                    ? req.session.userprofile[
                        "urn:ietf:params:scim:schemas:extension:ibm:2.0:User"
                      ]["customAttributes"]
                    : false;
                console.log("Custom attributes?", customAttributes)
                var quoteCount = (!customAttributes) ? 1 : parseInt((_.filter(customAttributes,{ 'name': 'quoteCount' }))[0].values.toString())+1;
                console.log("This is the current quoteCount:", quoteCount)

                res.render('new-account-success', {
                   action:'/login',
                   loggedIn: loggedIn
                });
                            /*var operations = `
                    {
                      "op":"add",
                      "path":"urn:ietf:params:scim:schemas:extension:ibm:2.0:User:customAttributes",
                      "value": [{"name": "birthday","values":["${data.birthday}"]}]
                    },
                    {
                      "op":"add",
                      "path":"urn:ietf:params:scim:schemas:extension:ibm:2.0:User:customAttributes",
                      "value": [{"name": "carYear","values":["${data.carYear}"]}]
                    },
                    {
                      "op":"add",
                      "path":"urn:ietf:params:scim:schemas:extension:ibm:2.0:User:customAttributes",
                      "value": [{"name": "carMake","values":["${data.carMake}"]}]
                    },
                    {
                      "op":"add",
                      "path":"urn:ietf:params:scim:schemas:extension:ibm:2.0:User:customAttributes",
                      "value": [{"name": "carModel","values":["${data.carModel}"]}]
                    },
                    {
                      "op":"add",
                      "path":"addresses",
                      "value": [{"postalCode": "${data.zip}"}]
                    },
                    {
                      "op":"add",
                      "path":"urn:ietf:params:scim:schemas:extension:ibm:2.0:User:customAttributes",
                      "value": [{"name": "quoteCount","values":["${quoteCount}"]}]
                    }`
                    */

                //don't create user but increase quoteCount by 1
                //get quote count first, and then set that variable and increase by 1 once completed
                /*
                bbfn.setCustomAttributes(userId, operations, accessToken, function(err,  body){
                  console.log(body)
                  if(body === true){
                    //success
                    res.render('new-account-success', {
                       quote: 'car',
                       formSubmission: JSON.stringify(req.body),
                       profileLink: '/app/dashboard',
                       loggedIn: loggedIn
                    });
                  }
                  else{
                    //fail
                    res.render('new-account-failed');
                  }
                }); */
              }
            });
        }
      });

    /*res.render('new-account-success', {
       action:'/login',
       loggedIn: loggedIn
    }); 
    */
});



router.get('/car', function(req, res, next) {
    var loggedIn = ((req.session.loggedIn) ? true : false);
    if(loggedIn){
      var user = req.session.userprofile;
      var customAttributes = (typeof user["urn:ietf:params:scim:schemas:extension:ibm:2.0:User"]["customAttributes"] != 'undefined') ? user["urn:ietf:params:scim:schemas:extension:ibm:2.0:User"]["customAttributes"] : '';
      var zip = (typeof user["addresses"] != 'undefined') ? user["addresses"][0]["postalCode"]:'';
      var birthday = (typeof(_.filter(customAttributes, { 'name': 'birthday'}))[0] !== 'undefined') ? (_.filter(customAttributes, { 'name': 'birthday' }))[0].values.toString() : false
    }
    console.log("User is logged in:", loggedIn);
    console.log("Car quote started for:", req.session.userEmail);
    res.render('insurance/open-account-car', {
       action: '/open-account/car',
       loggedIn: loggedIn,
       zip: zip,
       birthday: birthday
    });
});
router.post('/car', function(req, res, next) {
    var loggedIn = ((req.session.loggedIn) ? true : false);
    var data = req.body;
    console.log("Car quote submitted for:", req.session.userEmail);
    console.log("Car form submitted:", data)

    bbfn.authorize(process.env.API_CLIENT_ID, process.env.API_SECRET, function(err,  body){
        if (err) {
          console.log(err);
        } else {
          var accessToken = body.access_token;
          bbfn.getUserID(req.session.userEmail, accessToken, function(err,  body){
              if(body === false)
              {
                var userInfo = {
                    "schemas": [
                      "urn:ietf:params:scim:schemas:core:2.0:User",
                          "urn:ietf:params:scim:schemas:extension:ibm:2.0:User",
                    ],
                    "userName": req.session.userEmail,
                    "name": {
                      "familyName": req.session.familyName,
                      "givenName": req.session.givenName
                    },
                    "preferredLanguage": "en-US",
                    "active": true,
                    "emails": [
                      {
                        "value": req.session.userEmail,
                        "type": "work"
                      }
                    ],
                    "addresses": [
                      {
                        "postalCode": data.zip
                      }
                    ],
                    "urn:ietf:params:scim:schemas:extension:ibm:2.0:User": {
                      "userCategory": "regular",
                      "twoFactorAuthentication": false,
                      "customAttributes": [
              		      {
              		        "name": "birthday",
              		        "values": [data.birthday]
              		      },
                        {
              		        "name": "carModel",
              		        "values": [data.carModel]
              		      },
                        {
              		        "name": "carYear",
              		        "values": [data.carYear]
              		      },
                        {
              		        "name": "carMake",
              		        "values": [data.carMake]
              		      },
                        {
              		        "name": "quoteCount",
              		        "values": [1]
              		      }
              		    ]
                    }
                  }

                console.log("User creation information:", userInfo)
                var options = {
                  'headers': {
                    'Content-Type':'application/scim+json',
                    'Authorization': `Bearer ${accessToken}`
                  },
                  'body': JSON.stringify(userInfo)
                }
                request.post(process.env.OIDC_CI_BASE_URI + '/v2.0/Users', options, function(err, response, body){
                  console.log("Create user:", req.session.userEmail)
                  pbody = JSON.parse(body);
                  console.log("Response code:", response.statusCode);
                  console.log("Create response:", pbody);
                  if(response.statusCode == 201){
                    //success
                    res.render('insurance/open-account-car-success', {
                       quote: 'car',
                       formSubmission: JSON.stringify(req.body),
                       profileLink: '/app/profile',
                       message: `A password has been generated for you and sent to the email you provided us.`,
                       loggedIn: loggedIn
                    });
                  }
                  else{
                    //fail
                    res.render('new-account-failed');
                  }
                });
              }
              else{
                var userId = body.id;
                var customAttributes =
                  typeof req.session.userprofile != "undefined" && req.session.userprofile[
                    "urn:ietf:params:scim:schemas:extension:ibm:2.0:User"
                  ]["customAttributes"] != "undefined"
                    ? req.session.userprofile[
                        "urn:ietf:params:scim:schemas:extension:ibm:2.0:User"
                      ]["customAttributes"]
                    : false;
                console.log("Custom attributes?", customAttributes)
                var quoteCount = (!customAttributes) ? 1 : parseInt((_.filter(customAttributes,{ 'name': 'quoteCount' }))[0].values.toString())+1;
                console.log("This is the current quoteCount:", quoteCount)

                var operations = `
                    {
                    	"op":"add",
                    	"path":"urn:ietf:params:scim:schemas:extension:ibm:2.0:User:customAttributes",
                    	"value": [{"name": "birthday","values":["${data.birthday}"]}]
                    },
                    {
                    	"op":"add",
                    	"path":"urn:ietf:params:scim:schemas:extension:ibm:2.0:User:customAttributes",
                    	"value": [{"name": "carYear","values":["${data.carYear}"]}]
                    },
                    {
                    	"op":"add",
                    	"path":"urn:ietf:params:scim:schemas:extension:ibm:2.0:User:customAttributes",
                    	"value": [{"name": "carMake","values":["${data.carMake}"]}]
                    },
                    {
                    	"op":"add",
                    	"path":"urn:ietf:params:scim:schemas:extension:ibm:2.0:User:customAttributes",
                    	"value": [{"name": "carModel","values":["${data.carModel}"]}]
                    },
                    {
                    	"op":"add",
                    	"path":"addresses",
                    	"value": [{"postalCode": "${data.zip}"}]
                    },
                    {
                    	"op":"add",
                    	"path":"urn:ietf:params:scim:schemas:extension:ibm:2.0:User:customAttributes",
                    	"value": [{"name": "quoteCount","values":["${quoteCount}"]}]
                    }`

                //don't create user but increase quoteCount by 1
                //get quote count first, and then set that variable and increase by 1 once completed
                bbfn.setCustomAttributes(userId, operations, accessToken, function(err,  body){
                  console.log(body)
                  if(body === true){
                    //success
                    res.render('insurance/open-account-car-success', {
                       quote: 'car',
                       formSubmission: JSON.stringify(req.body),
                       profileLink: '/app/profile',
                       loggedIn: loggedIn
                    });
                  }
                  else{
                    //fail
                    res.render('insurance/open-account-failed');
                  }
                });
              }
            });
        }
      });
});


router.get('/home', function(req, res, next) {
    var loggedIn = ((req.session.loggedIn) ? true : false);
    if(loggedIn){
      var user = req.session.userprofile;
      var customAttributes = (typeof user["urn:ietf:params:scim:schemas:extension:ibm:2.0:User"]["customAttributes"] != 'undefined') ? user["urn:ietf:params:scim:schemas:extension:ibm:2.0:User"]["customAttributes"] : '';
      var zip = (typeof user["addresses"] != 'undefined') ? user["addresses"][0]["postalCode"]:'';
      var birthday = (typeof(_.filter(customAttributes, { 'name': 'birthday'}))[0] !== 'undefined') ? (_.filter(customAttributes, { 'name': 'birthday' }))[0].values.toString() : false
    }

    console.log("User is logged in:", loggedIn);
    console.log("Home quote started for:", req.session.userEmail);
    res.render('insurance/open-account-home', {
       action: '/open-account/home',
       zip: zip,
       birthday: birthday,
       loggedIn: loggedIn
    });
});
router.post('/home', function(req, res, next) {
    var user = req.session.userprofile;
    console.log(req.body)
    var loggedIn = ((req.session.loggedIn) ? true : false);
    var data = req.body;
    console.log("Home quote submitted for:", req.session.userEmail);
    console.log("Home form submitted:", data)
    bbfn.authorize(process.env.API_CLIENT_ID, process.env.API_SECRET, function(err,  body){
        if (err) {
          console.log(err);
        } else {
          var accessToken = body.access_token;
          bbfn.getUserID(req.session.userEmail, accessToken, function(err,  body){
              if(body === false)
              {
                var userInfo = {
                    "schemas": [
                      "urn:ietf:params:scim:schemas:core:2.0:User",
                          "urn:ietf:params:scim:schemas:extension:ibm:2.0:User",
                    ],
                    "userName": req.session.userEmail,
                    "name": {
                      "familyName": req.session.familyName,
                      "givenName": req.session.givenName
                    },
                    "preferredLanguage": "en-US",
                    "active": true,
                    "emails": [
                      {
                        "value": req.session.userEmail,
                        "type": "work"
                      }
                    ],
                    "addresses": [
                      {
                        "postalCode": data.zip,
                        "streetAddress": data.streetAddress,
                        "locality": data.city,
                        "region": data.state
                      }
                    ],
                    "urn:ietf:params:scim:schemas:extension:ibm:2.0:User": {
                      "userCategory": "regular",
                      "twoFactorAuthentication": false,
                      "customAttributes": [
              		      {
              		        "name": "birthday",
              		        "values": [data.birthday]
              		      },
                        {
              		        "name": "ageHome",
              		        "values": [data.ageHome]
              		      },
                        {
              		        "name": "homeType",
              		        "values": [data.homeType]
              		      },
                        {
              		        "name": "quoteCount",
              		        "values": [1]
              		      }
              		    ]
                    }
                  }

                console.log("User creation information:", userInfo)
                var options = {
                  'headers': {
                    'Content-Type':'application/scim+json',
                    'Authorization': `Bearer ${accessToken}`
                  },
                  'body': JSON.stringify(userInfo)
                }
                request.post(process.env.OIDC_CI_BASE_URI + '/v2.0/Users', options, function(err, response, body){
                  console.log("Create user:", req.session.userEmail)
                  pbody = JSON.parse(body);
                  console.log("Response code:", response.statusCode);
                  console.log("Create response:", body);
                  if(response.statusCode == 201){
                    //success
                    res.render('insurance/open-account-home-success', {
                       quote: 'home',
                       formSubmission: JSON.stringify(req.body),
                       profileLink: '/app/profile',
                       message: `A password has been generated for you and sent to the email you provided us.`,
                       loggedIn: loggedIn
                    });
                  }
                  else{
                    //fail
                    res.render('insurance/open-account-failed');
                  }
                });
              }
              else{
                var userId = body.id;
                var hasCustomAttributes = (typeof user["urn:ietf:params:scim:schemas:extension:ibm:2.0:User"]["customAttributes"] != 'undefined') ? true : false;
                var customAttributes = (hasCustomAttributes) ? req.session.userprofile["urn:ietf:params:scim:schemas:extension:ibm:2.0:User"]["customAttributes"]:false
                var quoteCount = (hasCustomAttributes) ? parseInt((_.filter(customAttributes,{ 'name': 'quoteCount' }))[0].values.toString())+1 : 0;
                console.log("This is the current quoteCount:", quoteCount)

                var operations = `
                    {
                    	"op":"add",
                    	"path":"urn:ietf:params:scim:schemas:extension:ibm:2.0:User:customAttributes",
                    	"value": [{"name": "birthday","values":["${data.birthday}"]}]
                    },
                    {
                    	"op":"add",
                    	"path":"urn:ietf:params:scim:schemas:extension:ibm:2.0:User:customAttributes",
                    	"value": [{"name": "ageHome","values":["${data.ageHome}"]}]
                    },
                    {
                    	"op":"add",
                    	"path":"urn:ietf:params:scim:schemas:extension:ibm:2.0:User:customAttributes",
                    	"value": [{"name": "homeType","values":["${data.homeType}"]}]
                    },
                    {
                    	"op":"add",
                    	"path":"addresses",
                    	"value": [{"postalCode": "${data.zip}","streetAddress": "${data.streetAddress}","locality": "${data.city}","region": "${data.state}"}]
                    },
                    {
                    	"op":"add",
                    	"path":"urn:ietf:params:scim:schemas:extension:ibm:2.0:User:customAttributes",
                    	"value": [{"name": "quoteCount","values":["${quoteCount}"]}]
                    }`

                //don't create user but increase quoteCount by 1
                //get quote count first, and then set that variable and increase by 1 once completed
                bbfn.setCustomAttributes(userId, operations, accessToken, function(err,  body){
                  console.log(body)
                  if(body === true){
                    //success
                    res.render('insurance/open-account-home-success', {
                       quote: 'car',
                       formSubmission: JSON.stringify(req.body),
                       profileLink: '/app/profile',
                       message: `Your new quote will be ready shortly in your profile`,
                       loggedIn: loggedIn
                    });
                  }
                  else{
                    //fail
                    res.render('insurance/open-account-failed');
                  }
                });
              }
            });
        }
      });

});
router.get('/test', function(req, res, next) {
  var email = "jake.johnson@yopmail.com";
    bbfn.authorize(process.env.API_CLIENT_ID, process.env.API_SECRET, function(err,  body){
        if (err) {
          console.log(err);
        } else {
          var accessToken = body.access_token;
          var userId = "6500053FDA";
          var operations = `
              {
              	"op":"add",
              	"path":"urn:ietf:params:scim:schemas:extension:ibm:2.0:User:customAttributes",
              	"value": [{"name": "carModel","values":["test1"]}]
              },
              {
              	"op":"add",
              	"path":"urn:ietf:params:scim:schemas:extension:ibm:2.0:User:customAttributes",
              	"value": [{"name": "carYear","values":["test2"]}]
              }`

          //don't create user but increase quoteCount by 1
          //get quote count first, and then set that variable and increase by 1 once completed
          bbfn.setCustomAttributes(userId, operations, accessToken, function(err,  body){
            console.log(body)
          });
        }
      });
});

module.exports = router;