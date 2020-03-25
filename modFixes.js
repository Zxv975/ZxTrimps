viewPortalUpgrades = insertCode(viewPortalUpgrades, findPositionInFunction(viewPortalUpgrades, ["parseInt"], 0), `totalAvailable`, 28) // Dunno why this fucntion uses parseInt, but removing it gets rid of a long-standing display bug.

/*function prettifySub(number){
	number = parseFloat(number);
	var floor = Math.floor(number);
	if (number === floor) // number is an integer, just show it as-is
		return number;
	var precision = 3 - floor.toString().length; // use the right number of digits
	if(game.options.menu.standardNotation.enabled == 5) precision = 1;
	return number.toFixed(precision);
}*/ // Will add this one later. Forces logarithmic notation to have 1 decimal of precision, which is important for that notation only.