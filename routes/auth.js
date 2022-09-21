const express = require('express');
const {check,body} = require("express-validator")

const authController = require('../controllers/auth');

const router = express.Router();

router.get('/login', authController.getLogin);

router.post('/login', authController.postLogin);

router.get("/signup",authController.getSignup)
router.post("/signup",[
check('email')
.isEmail()
.withMessage("OOPS! enter valid email "),
body("password","Enter a password that contain Alphabet and Number")
.isLength({min:7})
.isAlphanumeric(),
body("confirmPassword").custom((value,{req})=>{
    if (value !== req.body.password){
        throw new Error("Password has to match")
    }
    return true
})
],authController.postSignup)

router.post('/logout', authController.postLogout);

router.get('/reset',authController.getReset);
router.post('/reset',authController.postReset);
router.post('/reset/:token',authController.getNewPassword);

router.post('/new-passwrod',authController.postNewPassword);
module.exports = router;