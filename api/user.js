var express = require('express');
var router = express.Router();
var errorCode = require('../constants/errorcode');
var Contact = require('../models/contact');
var md5 = require('md5');
var Twilio = require('twilio');
var twilioConfig = require('../constants/twilio');
var twilio = Twilio(twilioConfig.acccountSId, twilioConfig.authToken);
var Sms = require('../models/sms');
var ContactInterest = require('../models/contactinterest');
var Credit = require('../models/credit');
var mongoose = require('mongoose');

router.get('/profile', function (req, res) {
    var token = req.query.token;

    if (token == null) {
        res.status(401).json({ code: errorCode.common.EMPTYTOKEN });
    } else {
        Contact.findOne({ token: token }, function (err, user) {
            if (!user) {
                res.status(401).json({ code: errorCode.common.INVALIDTOKEN });
            } else {
                                
                Credit.find({ contact_id: mongoose.Types.ObjectId(user._id) }, function (err, credits) {
                    if (user.interests) {
                        ContactInterest.find({ contact_id: user._id }).populate('interest_id').exec(function (err, interests) {
                            var ret = JSON.parse(JSON.stringify(user));
                            ret["interests"] = interests;
                            ret["creditcards"] = credits;
                            res.status(200).json(ret);
                        });
                    } else {
                        var ret = JSON.parse(JSON.stringify(user));
                        ret["creditcards"] = credits;
                        res.status(200).json(ret);
                    }
                });                               
            }
        });
    }
});

router.post('/login', function (req, res) {
    var email = req.body.email;
    var password = req.body.password;

    if (email == null || email == "") {
        res.status(401).json({ code: errorCode.login.EMPTYEMAIL });
    } else if (password == null || password == "") {
        res.status(401).json({ code: errorCode.login.EMPTYPASSWORD });
    } else {
        Contact.findOne({ email: email, password: md5(password) }, function (err, user) {
            if (!user) {
                res.status(402).json({ code: errorCode.login.NOTMATCH });
            } else {
                res.status(200).json({ token: user.token });
            }
        });
    }
});

router.post('/signup', function (req, res) {
    console.log(req.body);
    var name = req.body.name;
    var email = req.body.email;
    var birthday = req.body.birthday;
    var zipcode = req.body.zipcode;
    var gender = req.body.gender;
    var marital = req.body.marital;
    var kids = req.body.kids;
    var password = req.body.password;
    var phone = req.body.phone;
    var interests = req.body.interests;
    var source = req.body.source;
    var type = req.body.type;

    //null validate
    
    if (name == null || name == '') {
        res.status(401).json({ code: errorCode.signup.EMPTYNAME });
    } else if (email == null) {
        res.status(401).json({ code: errorCode.signup.EMPTYEMAIL });
    } else if (birthday == null) {
        res.status(401).json({ code: errorCode.signup.EMPTYBIRTHDAY });
    } else if (zipcode == null) {
        res.status(401).json({ code: errorCode.signup.EMPTYZIPCODE });
    } else if (gender == null) {
        res.status(401).json({ code: errorCode.signup.EMPTYGENDER });
    } else if (marital == null) {
        res.status(401).json({ code: errorCode.signup.EMPTYMARITAL });
    } else if (kids == null) {
        res.status(401).json({ code: errorCode.signup.EMPTYKIDS });
    } else if (password == null) {
        res.status(401).json({ code: errorCode.signup.EMPTYPASS });
    } else if (source == null) {
        res.status(401).json({ code: errorCode.signup.EMPTYSOURCE });
    } else if (type  == null) { 
        res.status(401).json({ code: errorCode.signup.EMPTYTYPE });
    }
    else{
        //remove trim
        name = name.trim();
        email = email.trim();
        birthday = birthday.trim();
        zipcode = zipcode.trim();
        if (phone) {
            phone = phone.trim();
        }
        
        //email, birthday, phone number, zipcode, gender, kids, marital, interest, type validate
        var reg = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        var regZip = /^[0-9]{1,5}$/;
        var regPhone = /^(?:(?:\+?1\s*(?:[.-]\s*)?)?(?:\(\s*([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9])\s*\)|([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9]))\s*(?:[.-]\s*)?)?([2-9]1[02-9]|[2-9][02-9]1|[2-9][02-9]{2})\s*(?:[.-]\s*)?([0-9]{4})(?:\s*(?:#|x\.?|ext\.?|extension)\s*(\d+))?$/;

        if (!reg.test(email)) {
            res.status(401).json({ code: errorCode.signup.INVALIDEMAIL });
        } else if(isNaN((new Date(birthday)).getTime())) {
            res.status(401).json({ code: errorCode.signup.INVALIDBIRTHDAY });
        } else if (!regZip.test(zipcode)) {
            res.status(401).json({ code: errorCode.signup.INVALIDZIPCODE });
        } else if (gender != '0' && gender != '1') { 
            res.status(401).json({ code: errorCode.signup.INVALIDGENDER });
        } else if (marital != '0' && marital != '1') { 
            res.status(401).json({ code: errorCode.signup.INVALIDMARITAL });
        } else if (kids != '0' && kids != '1') {
            res.status(401).json({ code: errorCode.signup.INVALIDKIDS });
        } else if (source != '0' && source != '1' && source != '2' && source != '3') { 
            res.status(401).json({ code: errorCode.signup.INVALIDSOURCE });
        } else if (type != '0' && type != '1') { 
            res.status(401).json({ code: errorCode.signup.INVALIDTYPE });
        } else if (phone != null && !regPhone.test(phone)) {
            res.status(401).json({ code: errorCode.signup.INVALIDPHONE });
        } else if (interests != null && interests != '0' && interests != '1') {
            res.status(401).json({ code: errorCode.signup.INVALIDINTERESTS });
        } else {
            //existing email or phone validate
            var contact = new Contact;
            Contact.findOne({ $or: [{email: email}, {phone: phone}] }, function (err, user) {
                if (user && user.email == email && email) {
                    res.status(402).json({ code: errorCode.signup.DUPLICATEEMAIL });
                } else if (user && user.phone == phone && phone) { 
                    res.status(402).json({ code: errorCode.signup.DUPLICATEPHONE });
                }
                else{
                    contact.name = name;
                    contact.email = email;
                    contact.birthday = birthday;
                    contact.zipcode = zipcode;
                    contact.gender = gender;
                    contact.marital = marital;
                    contact.kids = kids;
                    contact.password = md5(password);
                    contact.created_at = new Date();
                    contact.updated_at = new Date();
                    contact.contact_source = source;
                    contact.type = type;
                    if (phone) {
                        contact.phone = phone;
                    }
                    if (interests) {
                        contact.interests = interests;
                    }
                    contact.token = md5((contact.email | contact.phone) + contact.created_at);
                    contact.save();
                    res.status(200).json({ token: contact.token });
                }
            });            
        }    
    }   
});

router.post('/sendcode', function (req, res) {
    var phone = req.body.phone;
    
    var regPhone = /^(?:(?:\+?1\s*(?:[.-]\s*)?)?(?:\(\s*([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9])\s*\)|([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9]))\s*(?:[.-]\s*)?)?([2-9]1[02-9]|[2-9][02-9]1|[2-9][02-9]{2})\s*(?:[.-]\s*)?([0-9]{4})(?:\s*(?:#|x\.?|ext\.?|extension)\s*(\d+))?$/;
    
    var code = Math.floor(Math.random() * 899999) + 100000;

    if (phone == null) {
        res.status(401).json({ code: errorCode.sendcode.EMPTYPHONE });
    } 
    
    /*
    else if (!regPhone.test(phone)) {
        res.status(402).json({ code: errorCode.sendcode.INVALIDPHONE });
    }*/    
    else {
        twilio.messages.create({
            from: twilioConfig.from,
            to: phone,
            body: 'Here is verify code. ' + code
        }, function (err, result) {
            if (err) {
                res.status(402).json({ code: errorCode.sendcode.INVALIDPHONE });
            } else {
                //create code for sms verification
                var sms = new Sms();
                sms.phone = phone;
                sms.code = code;
                sms.created_at = new Date();
                sms.token = md5(sms.created_at);
                sms.save();
                res.status(200).json({ token: sms.token });
            }
        });
    }    
});

router.post('/logincode', function(req, res) {
    var token = req.body.token;
    var code = req.body.code;

    console.log(token);
    console.log(code);

    if (token == null) {
        res.status(401).json({ code: errorCode.common.EMPTYTOKEN });
    } else if (code == null) {
        res.status(401).json({ code: errorCode.verifycode.EMPTYCODE });
    } else {
        Sms.findOne({ token: token, code: code }, function (err, item) {
            if (!item) {
                res.status(402).json({ code: errorCode.verifycode.INVALIDCODE });
            } else {
                Contact.findOne({phone: item.phone}, function(err, user){
                    if(!user){
                        res.status(402).json({ code: errorCode.verifycode.INVALIDCODE });
                    }else{
                        res.status(200).json({ token: user.token });
                    }
                });
            }
        });
    }
});

router.post('/verifycode', function (req, res) {
    var token = req.body.token;
    var code = req.body.code;

    if (token == null) {
        res.status(401).json({ code: errorCode.common.EMPTYTOKEN });
    } else if (code == null) {
        res.status(401).json({ code: errorCode.verifycode.EMPTYCODE });
    } else {
        Sms.findOne({ token: token, code: code }, function (err, item) {
            if (!item) {
                res.status(402).json({ code: errorCode.verifycode.INVALIDCODE });
            } else {
                res.status(200).json({ phone: item.phone });
            }
        });
    }
});

router.put('/update', function (req, res) {
    var token = req.body.token;
    var name = req.body.name;
    var email = req.body.email;
    var birthday = req.body.birthday;
    var zipcode = req.body.zipcode;
    var gender = req.body.gender;
    var marital = req.body.marital;
    var kids = req.body.kids;
    var phone = req.body.phone;
    var interests = req.body.interests;
    var password = req.body.password;
    
    //validate
    var reg = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    var regZip = /^[0-9]{1,5}$/;
    var regPhone = /^(?:(?:\+?1\s*(?:[.-]\s*)?)?(?:\(\s*([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9])\s*\)|([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9]))\s*(?:[.-]\s*)?)?([2-9]1[02-9]|[2-9][02-9]1|[2-9][02-9]{2})\s*(?:[.-]\s*)?([0-9]{4})(?:\s*(?:#|x\.?|ext\.?|extension)\s*(\d+))?$/;
    
    if (token == null) {
        res.status(401).json({ code: errorCode.common.EMPTYTOKEN });
    } else if (name && name == '') {
        res.status(401).json({ code: errorCode.signup.EMPTYNAME });
    }else if (email && !reg.test(email)) {
        res.status(401).json({ code: errorCode.signup.INVALIDEMAIL });
    } else if (birthday && isNaN((new Date(birthday)).getTime())){
        res.status(401).json({ code: errorCode.signup.INVALIDBIRTHDAY });
    } else if (zipcode && !regZip.test(zipcode)) {
        res.status(401).json({ code: errorCode.signup.INVALIDZIPCODE });
    } else if (gender && gender != '0' && gender != '1') {
        res.status(401).json({ code: errorCode.signup.INVALIDGENDER });
    } else if (marital && marital != '0' && marital != '1') {
        res.status(401).json({ code: errorCode.signup.INVALIDMARITAL });
    } else if (kids && kids != '0' && kids != '1') {
        res.status(401).json({ code: errorCode.signup.INVALIDKIDS });
    } else if (interests && interests != '0' && interests != '1') {
        res.status(401).json({ code: errorCode.signup.INVALIDINTERESTS });
    } else if (phone && !regPhone.test(phone)) {
        res.status(401).json({ code: errorCode.signup.INVALIDPHONE });
    } else {
        Contact.findOne({ token: token }, function (err, user) {
            if (!user) {
                res.status(401).json({ code: errorCode.common.INVALIDTOKEN });
            } else {
                //update data
                if (name) {
                    user.name = name;
                }
                if (email) {
                    user.email = email;
                }
                if (birthday) {
                    user.birthday = birthday;
                }
                if (zipcode) {
                    user.zipcode = zipcode;
                }
                if (gender) {
                    user.gender = gender;
                }
                if (marital) {
                    user.marital = marital;
                }
                if (kids) {
                    user.kids = kids;
                }
                if (interests) {
                    user.interests = interests;
                }
                if (phone) {
                    user.phone = phone;
                }
                
                if (password) {
                    user.password = md5(password);
                }
                
                user.updated_at = new Date();
                user.save();
                res.status(200).json({});
            }
        });
    }
});

module.exports = router;