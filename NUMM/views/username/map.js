function (doc){
	var parts = doc._id.split(".");
	if(parts[0] == "pkv"){
		if(parts[1] == "signup")
			emit(doc.username, doc);
	}
}

