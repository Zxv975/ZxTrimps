function findPositionInFunction(f, searchTerms, offset = 1, stringPos = 0) { // Search a function f for the first instance of searchTerms[0], then find (relative to the first index) the position of searchTerms[1], and so on until searchTerms[n-1]. searchTerms[0] should be the most specific term (to get the search as close as possible), and searchTerms[1] onwards should get successively more broad, but be ordered such that all unwanted matchings for searchTerms[i] will be passed over by searchTerms[0] through searchTerms[i-1]. For example, searchTerms[0] could be an if statement conditional, and searchTerms[1] would be the next closing brace. The result would then be the position of the first closing brace after a specific if statement.
	if(searchTerms.length == 0) 
		return stringPos + offset;
	var tempTerm = searchTerms[0];
	searchTerms.shift();
	return findPositionInFunction(f, searchTerms, offset, f.toString().indexOf(tempTerm, stringPos+1))
}

function insertCode(f, position, codeString, offset = 0) {
	return Function(`return ${f.toString().slice(0, position)}${codeString}${f.toString().slice(position + offset)}`)()
}