function (doc){
	var parts = doc._id.split(".");
	if(parts[0] == "numm"){
		if(parts[1] == "signup" && doc.passwordReset)
			emit(doc.passwordReset, doc);
	}
}
