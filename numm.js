var util = require("util");
var child_process = require("child_process");
var fs = require("fs");
var crypto = require("crypto");
var couchdb = require("couchdb-api");
var nodemailer = require("nodemailer");

var NUMM = function(conf){
	this._conf = conf;

	this._client =
		couchdb.srv("http://"+ this._conf.couch.host +":"+ this._conf.couch.port);
	this._client.auth = this._conf.couch.user +":"+ this._conf.couch.password;
	this._cdb = this._client.db(this._conf.couch.dbName);
	return this;
}

exports.Errors = {
	"UserExists":{
		"message":"Username not available."
	}
	,"CryptoError":{
		"message":"Failed crypto generation."
	}
	,"FailedOp":{
		"message":"Failed internal operation."
	}
	,"FailedToSend":{
		"message":"Failed to send email."
	}
	,"StaleID":{
		"message":"Stale information."
	}
	,"UnknownEmail":{
		"message":"Unknown email address."
	}
	,"BadCredentials":{
		"message":"Bad Credentials."
	}
	,"UnknownSolicitation":{
		"message":"Bad Solicitation."
	}
	,"AlreadySignedUp":{
		"message":"Already signed up."
	}
};

NUMM.prototype._sendEmail = function(email, cb){
	var numm = this;

	var smtpTransport = nodemailer.createTransport("SMTP", numm._conf.nodemailer);
	smtpTransport.sendMail(email, function(error, response){
		smtpTransport.close();
		if(error){
			console.error("NUMM " + JSON.stringify(err));
			cb(exports.Errors.FailedToSend);
			return;
		}
		cb(null);
	});
}

NUMM.prototype._sendSolicitation = function(regData, cb){
	var numm = this;

	/* Get a UUID for the link ID. */
	crypto.randomBytes(32, function(err, bytes){
		if(err){
			console.error("NUMM " + JSON.stringify(err));
			cb(exports.Errors.CryptoError);
			return;
		}

		regData.link = bytes.toString("hex");

		var regDoc = numm._cdb.doc("numm.solicit."+ regData.email);
		regDoc.body = regData;
		regDoc.save(function(err){
			if(err){
				console.error("NUMM " + JSON.stringify(err));
				cb(exports.Errors.FailedOp);
				return;
			}

			var template = numm._conf.templates.solicit;
			var email = {
				"to" : regData.email
				,"from" : template.fromFullName + "<" + template.fromEmail + ">"
				,"subject" : template.subject
				,"text" : template.message.replace(/SOLICIT_LINK/g, regData.link)
			};

			numm._sendEmail(email, cb);
		});

	});

}

NUMM.prototype.solicit = function(emailAddress, auxData, cb){
	var numm = this;

	/* Check to see if email has already been solicited. */
	/* Check for username collision. */
	var ddoc = numm._cdb.ddoc("NUMM");
	var v = ddoc.view("solicitStatus");
	v.query(
		{
			"startkey" : emailAddress
			,"endkey" : emailAddress + "\u9999"
			,"include_docs" : true
			,"reduce" : false
		},
		function(err, solicitations){
			if(err){
				console.error("NUMM " + JSON.stringify(err));
				cb(exports.Errors.FailedOp);
				return;
			}

			if(solicitations.rows.length){
				/* Just send the email again to the user,
				 * but update the link. */
				var solicitDoc = solicitations.rows[0].doc;
				numm._sendSolicitation(solicitDoc, cb);
			}
			else{
				/* Insert a solicit record. */
				var solicitDoc = {
					 "email" : emailAddress,
					 "aux" : auxData
				};
				numm._sendSolicitation(solicitDoc, cb);
			}
		}
	);
}

NUMM.prototype.getSolicit = function(solicitID, cb){
	var numm = this;

	/* Check to see if email has already been solicited. */
	/* Check for username collision. */
	var ddoc = numm._cdb.ddoc("NUMM");
	var v = ddoc.view("solicits");
	v.query(
		{
			"startkey" : solicitID
			,"endkey" : solicitID + "\u9999"
			,"include_docs" : true
			,"reduce" : false
		},
		function(err, solicitations){
			if(err){
				console.error("NUMM " + JSON.stringify(err));
				cb(exports.Errors.FailedOp);
				return;
			}

			if(solicitations.rows.length){
				/* Just send the email again to the user,
				 * but update the link. */
				cb(null, solicitations.rows[0].doc);
			}
			else{
				cb(exports.Errors.UnknownSolicitation);
			}
		}
	);
}

/* Initiate a password reset.
 * @param emailAddress Address associated with user. */
NUMM.prototype.requestReset = function(emailAddress, cb){
	var numm = this;

	/* Check to see if email has already been solicited. */
	/* Check for username collision. */
	var ddoc = numm._cdb.ddoc("NUMM");
	var v = ddoc.view("signup");
	v.query(
		{
			"startkey" : emailAddress
			,"endkey" : emailAddress + "\u9999"
			,"include_docs" : true
		},
		function(err, entries){
			if(err){
				console.error("NUMM " + JSON.stringify(err));
				cb(exports.Errors.FailedOp);
				return;
			}

			if(entries.rows.length){
				var r = entries.rows[0];

				/* Generate reset ID. */

				/* Get a UUID for the link ID. */
				crypto.randomBytes(32, function(err, bytes){
					if(err){
						console.error("NUMM " + JSON.stringify(err));
						cb(exports.Errors.CryptoError);
						return;
					}

					var signup = r["numm.signup"];
					signup.resetPass = bytes.toString("hex");
					var signupDoc = numm._cdb.doc(r._id);
					signupDoc.body = r;
					signupDoc.save(function(err){
						if(err){
							console.error("NUMM " + JSON.stringify(err));
							cb(exports.Errors.FailedOp);
							return;
						}

						var template = numm._conf.templates.resetPass;
						var email = {
							"to" : regData.email
							,"from" : template.fromFullName + "<" + template.fromEmail + ">"
							,"subject" : template.subject
							,"text" : template.message.replace(/RESETPASS_LINK/g, regData.link)
						};
						numm._sendEmail(emailAddress, emailStr, cb);
					});
				});
			}
			else{
				cb({"message" : "Email address not found"});
			}
		}
	);
}

/* Add user signup to the database.
 * @param solicitDoc Solicit associated with signup request
 * @param signupDoc Document containing
 *
 * "_id" 
 * "numm.signup" : {
 * 	"email" : "somthing@email.com"
 * 	,"password" : "CLEARTEXT"
 * 	,"secretWord" : "CLEARTEXT"
 * }
 *
 * It can contain other user defined fields outside the "numm.signup" field.
 * @param cb called when updated
 * */
NUMM.prototype.submitSignup = function(solicitDoc, signupDoc, cb){
	var numm = this;

	/* Check to see if email has already been solicited. */
	/* Check for username collision. */
	var ddoc = numm._cdb.ddoc("NUMM");
	var v = ddoc.view("solicitStatus");
	v.query(
		{
			"startkey" : solicitDoc.email
			,"endkey" : solicitDoc.email + "\u9999"
			,"reduce" : true
		},
		function(err, solicitations){
			if(err){
				console.error("NUMM " + JSON.stringify(err));
				cb(exports.Errors.FailedOp);
				return;
			}

			/* If the reduce value is greater than 1 then a signup
			 * has already been submitted. */
			if(solicitations.rows.length && solicitations.rows[0].value == 0x1){
				var d = numm._cdb.doc(signupDoc._id);
				d.body = signupDoc;
				d.save(cb);
			}
			else{
				cb(exports.Errors.AlreadySignedUp);
				return;
			}
		}
	);

}

/* Initiate a password reset.
 * @param linkID null if normal password change; set if reseting password
 * @param emailAddress Address associated with user.
 * @param secret If linkID is null, current user password; secret otherwise.
 * @param newPassword new password for user. */
NUMM.prototype.updatePassword = function(linkID, emailAddress, secret, newPassword, cb){
	var numm = this;

	/* Look for user sign up. */
	var ddoc = numm._cdb.ddoc("NUMM");
	var v = ddoc.view("signup");
	v.query(
		{
			"startkey" : emailAddress
			,"endkey" : emailAddress + "\u9999"
			,"include_docs" : true
		},
		function(err, entries){
			if(err){
				console.error("NUMM " + JSON.stringify(err));
				cb(exports.Errors.FailedOp);
				return;
			}

			if(0 == entries.rows.length){
				cb({"message" : "Email address not found"});
				return;
			}

			var r = entries.rows[0];
			var signup = r["numm.signup"];

			var hash = crypto.createHash("sha512");
			if(linkID){
				if(linkID != signup.resetPass){
					cb({"message" : "Invalid reset code!"});
					return;
				}

				/* Verify secret. */
				var enc = hash.update(emailAddress + secret + signup.secretWordSalt);
				if(signup.secret != enc.digest("hex")){
					cb(exports.Errors.BadCredentials);
					return;
				}

				/* Remove reset pass field. */
				delete signup.resetPass;
			}
			else{
				/* Verify password. */
				var enc = hash.update(emailAddress + secret + signup.passwordSalt);
				if(signup.password != enc.digest("hex")){
					cb(exports.Errors.BadCredentials);
					return;
				}
			}

			/* Generate new salts and new hashes. */
			crypto.randomBytes(32, function(err, bytes){
				if(err){
					console.error("NUMM " + JSON.stringify(err));
					cb(exports.Errors.FailedOp);
					return;
				}

				/* Encrypt password. */
				signup.passwordSalt = bytes.toString("hex");
				signup.password =
					hash.update(emailAddress + newPassword + signup.passwordSalt).digest("hex");

				/* Update record. */
				var signupDoc = numm._cdb.doc(r._id);
				signupDoc.body = r;
				signupDoc.save(cb);

			});
		}
	);
}

NUMM.prototype.authenticate = function(userDoc, password, cb){
	var signup = userDoc["numm.signup"];
	var hash = crypto.createHash("sha512");
	var enc = hash.update(signup.emailAddress + password + signup.passwordSalt);
	return signup.password == enc.digest("hex");
}

exports.NUMM = NUMM;
