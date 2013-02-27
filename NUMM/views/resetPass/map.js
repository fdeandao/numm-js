function (doc){
	var parts = doc._id.split(".");
	if(parts[0] == "pkv" && parts[1] == "signup"){
		if(doc["numm.signup"] && doc["numm.signup"].resetPass)
			emit(doc["numm.signup"].resetPass, doc);
	}
}
