function (doc){
	var parts = doc._id.split(".");
	if(parts[0] == "numm" && parts[1] == "solicit")
			emit(doc.link, null);
}
