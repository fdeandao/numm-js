function (doc){
	var parts = doc._id.split(".");
	if(parts[0] == "numm"){
		if(parts[1] == "signup")
			emit(doc.username, doc);
	}
}

