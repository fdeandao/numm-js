function (doc){
	if("numm.signup" in doc)
		emit(doc["numm.signup"].emailAddress, 0x1);
	else{
		var parts = doc._id.split(".");
		if(parts[0] == "numm" && parts[1] == "solicit")
				emit(doc.email, 0x2);
	}
}
