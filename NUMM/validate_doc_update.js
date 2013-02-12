function (newDoc, savedDoc, userCtx){
	/* Just let deletions go through */
	if(newDoc._deleted)
		return;

	function require(obj, fields){
		for(field in fields){
			if(!(field in obj))
				throw({"forbidden":"Missing field: "+ field +"!"});

			/* Verify type. */
			var f = fields[field];
			if(typeof obj[field] != f){
				throw({"forbidden":"Bad field type in "+ field
					+", expected " + f + "!"});
			}
		}
	}


	var parts = newDoc._id.split(".");
	if(parts[0] == "numm"){
		var TYPES = {
			"solicit" : {
				"fields" : {
					"email" : "string"
					,"link" : "string"
				}
			}
		};

		/* Make sure this is a valid type. */
		if((parts[1] in TYPES)){
			/* Verify required fields in type.. */
			require(newDoc, TYPES[parts[1]].fields);

			if(parts[1] == "solicit"){
				/* Make sure that the same link is not committed. */
				if(savedDoc && newDoc.link == savedDoc.link) 
					throw({"forbidden":"Link must update on change!"});
			}
		}
	}
	else{
		/* This could have embedded attributes. */
		if("numm.signup" in newDoc){
			var signup = newDoc["numm.signup"];
			var fields = {
				"email" : "string"
				,"secretWord" : "string"
				,"secretWordSalt" : "string"
				,"password" : "string"
				,"passwordSalt" : "string"
			};

			require(signup, fields);

			/* password must be 64 characters or null. */
			if(!(null === signup.password || signup.password.length != 64))
				throw({"forbidden":"Invalid password length!"});

			if(signup.password && signup.passwordSalt.length != 64)
				throw({"forbidden":"Invalid password salt length!"});

			if(signup.secretWordSalt.length != 64)
				throw({"forbidden":"Invalid secret word salt length!"});
		}
	}
}
