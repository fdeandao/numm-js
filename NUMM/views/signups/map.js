function (doc){
	if("numm.signup" in doc)
		emit(doc["numm.signup"].emailAddress, doc);
}
