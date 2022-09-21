const bcrypt = require('bcryptjs');

const crypto = require("crypto")
const User = require('../models/user');

const nodemailer = require("nodemailer");

const {validationResult} = require("express-validator")

var mg = require('nodemailer-mailgun-transport');

// This is your API key that you retrieve from www.mailgun.com/cp (free up to 10K monthly emails)
var auth = {
  auth: {
    api_key: '366ef077f43a6783345495ce1e0fea51-78651cec-5d30b4de',
    domain: 'sandbox397d04e4617143e395494f355618ca59.mailgun.org'
  }
}
//public-key:pubkey-acac83dc8a8e20622f031bfc047b51ba
var nodemailerMailgun = nodemailer.createTransport(mg(auth));




exports.getLogin = (req, res, next) => {
  let message = req.flash('error');
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render('auth/login', {
    path: '/login',
    pageTitle: 'Login',
    errorMessage: message
  });
};

exports.getSignup = (req, res, next) => {
  let message = req.flash('error');
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render('auth/signup', {
    pageTitle: 'Signup',
    errorMessage: message,
    path:'/sign up'
  });
};

exports.postLogin = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  User.findOne({ email: email })
    .then(user => {
      if (!user) {
        req.flash('error', 'Invalid email or password.');
        return res.redirect('/login');
      }
      bcrypt
        .compare(password, user.password)
        .then(doMatch => {
          if (doMatch) {
            req.session.isLoggedIn = true;
            req.session.user = user;
            return req.session.save(err => {
              console.log(err);
              res.redirect('/');
            });
          }
          req.flash('error', 'Invalid email or password.');
          res.redirect('/login');
        })
        .catch(err => {
          console.log(err);
          res.redirect('/login');
        });
    })
    .catch(err => console.log(err));
};

exports.postSignup = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const confirmPassword = req.body.confirmPassword;
    const errors = validationResult(req);
  if(!errors.isEmpty()){
    return res.status(422).render('auth/signup', {
      pageTitle: 'Signup',
      errorMessage: errors.array()[0].msg,
      path:'/sign up'
    })
  }
  let mailOptions = {
    from:"aremujap@gmail.com",
    to: email,
    subject: 'Sign up to metron shop',
    html: `<h1>Happy Shopping</h1>
    <p>Sucessfully sign up to Great Shopping experience</p>
    <p>Thanks for your patronage</p>
    `
  }; 
  User.findOne({ email: email })
    .then(userDoc => {
      if (userDoc) {
        req.flash('error', 'E-Mail exists already, please pick a different one.');
        return res.redirect('/signup');
      }
      return bcrypt
        .hash(password, 12)
        .then(hashedPassword => {
          const user = new User({
            email: email,
            password: hashedPassword,
            cart: { items: [] }
          });
          return user.save();
        })
        .then(result => {
          nodemailerMailgun.sendMail(mailOptions, function(err, data) {
            if (err) {
              console.log("Error " + err);
            } else {
              console.log("Email sent successfully");
            }
          });
          res.redirect('/login');
        });
    })
    .catch(err => {
      console.log(err);
    });
};

exports.postLogout = (req, res, next) => {
  req.session.destroy(err => {
    console.log(err);
    res.redirect('/');
  });
};
exports.getReset=(req,res, next)=>{
  let message = req.flash('error');
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  
  
  res.render('auth/reset', {
    pageTitle: 'Reset Password',
    errorMessage: message,
    path:'/reset'
  });
}
exports.postReset = (req,res,next)=>{
  
  crypto.randomBytes(32,(err,buffer)=>{
    const email = req.body.email;
    if(err){
     console.log(err)
     return res.redirect("/reset")
}
const token = buffer.toString('hex');
 console.log(token) 
let mailOptions = {
  from: 'aremujap@gmail.com',
  to: req.body.email, // An array if you have multiple recipients.
  subject: 'Password Update',
  html:`
  <h2>Reset Password</h2>
  <p>Update your password through the link<a href ="localhost:3000/reset/${token}"</p>
  `,
}
 

 User.findOne({email:email})
 .then((user)=>{
  if(!user){
    req.flash('error',"User email you are requesting doesn't exist ")
    return res.redirect('/reset');
  }
  user.resetToken = token;
  user.resetTokenExpiration= Date.now() + 3600000;
  return user.save();
 })
 .then((result)=>{
  
  nodemailerMailgun.sendMail(mailOptions,function(err, data) {
    if (err) {
      console.log(err);
    } else {
      console.log("Email sent successfully");
    }
  })

 
 
})
 .catch((err)=>{
  console.log(err)
 })
  })
}


exports.getNewPassword = (req,res,next)=>{
  const token = req.params.token
 User.findOne( {resetToken:token,resetTokenExpiration:{$gt:Date.now()}})
 .then(user=>{
  let message = req.flash('error');
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render('auth/new-password', {
    pageTitle: 'New Password',
    errorMessage: message,
    path:'/new-password',
    userId: user._id.toString(),
    passwordToken: token
  });
 })
 .catch((err)=>{
console.log(err);
 })
}

exports.postNewPassword = (req,res,next)=>{
  const newPassword = req.body.password;
  const passwordToken = req.body.passwordToken;
  const userId = req.body.userId;
   let  resetUser;
  User.findOne( {resetToken:passwordToken,resetTokenExpiration:{$gt:Date.now(),_id:userId}})
  .then(user=>{
    resetUser = user
    return bcrypt.hash(newPassword,12)
  })
  .then(hashPassword=>{
    resetUser.resetToken= undefined;
    resetUser.resetTokenExpiration = undefined;
    resetUser.password = newPassword
    return resetUser.save()
  })
  .then(result=>{
    res.redirect('/login');
  })
  .catch(err=>{
console.log(err)
  })
}



/**let mailOptions = {
    from:"aremujap@gmail.com",
    to: email,
    subject: 'Sign up to metron shop',
    html: `<h1>Happy Shopping</h1>
    <p>Sucessfully sign up to Great Shopping experience</p>
    <p>Thanks for your patronage</p>
    `
  }; 
  
  
   transporter.sendMail(mailOptions, (err, data) =>{
    if (err) {
      console.log("Error " + err);
    } else {
      console.log("Password reset is sent sucessfully");
    }
  });
  
  
  */