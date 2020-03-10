// Helper functions
function findPositionInFunction(f, searchTerms, stringPos = 0) { // Search a function f for the first instance of searchTerms[0], then find (relative to the first index) the position of searchTerms[1], and so on until searchTerms[n-1]. searchTerms[0] should be the most specific term (to get the search as close as possible), and searchTerms[1] onwards should get successively more broad, but be ordered such that all unwanted matchings for searchTerms[i] will be passed over by searchTerms[0] through searchTerms[i-1]. For example, searchTerms[0] could be an if statement conditional, and searchTerms[1] would be the next closing brace. The result would then be the position of the first closing brace after a specific if statement.
	if(searchTerms.length == 0) 
		return stringPos+1;
	var tempTerm = searchTerms[0];
	searchTerms.shift();
	return findPositionInFunction(f, searchTerms, f.toString().indexOf(tempTerm, stringPos+1))
}

function insertCode(f, position, codeString) {
	return Function(`return ${f.toString().slice(0, position)} 
		${codeString}
	${f.toString().slice(position)}`)()
}

// Overloaded / rewritten game functions

tooltip = insertCode(tooltip, findPositionInFunction(tooltip, ["Switch Daily", "costText", "}"]), `
	if(what == "Toggle Weekly") {
		tooltipText = "Click to toggle combining compatible daily challenges to run them all at once."
		costText = "";
	}
	if(what == "Add Daily") {
		tooltipText = "Click to add this daily to the running weekly."
		costText = "";
	}
	if(what == "Incompatible Daily") {
		tooltipText = "This daily is incompatible with your currently chosen dailies."
		costText = "";
	}`
) // Add weekly tooltip

getDailyTopText = insertCode(getDailyTopText, findPositionInFunction(getDailyTopText, ["colorSuccess", "}", "}", "returnText", ";"]), `
	returnText += "<div id='weeklyDiv' onmouseover='tooltip(\\"Toggle Weekly\\", null, event)' onmouseout='cancelTooltip()' onclick='toggleWeekly(\"+add+\")' class='noselect lowPad pointer dailyTop colorSuccess'> Weekly! </div>";
	mods.weeklyFlag = false;`
) // Add weekly button

resetGame = insertCode(resetGame, findPositionInFunction(resetGame, ["challenge ==", "false", ";"]), `
		else if(challenge == "Weekly" && Object.keys(mods.weekly).length > 0) {
			game.global.dailyChallenge = mods.weekly;
			game.global.challengeActive = "Daily";
			challenge = "Daily";
	}`
) // Upgrade portalling to handle weeklies, then treat them like normal dailies.

function getDailyHeliumValue(weight){ // Increased cap to 7 * 500%. Also extended the +20 and +100 weights to include weeklies.
	//min 2, max 6
	var value = 75 * weight + 20 * Math.max(mods.dailiesAdded.length, 1);
	if (value < 100) value = 100;
	else if (value > 7*500) value = 7*500; 
	if (Fluffy.isRewardActive("dailies")) {
		value += 100 * Math.max(mods.dailiesAdded.length, 1);
	}
	return value;
}

function startDaily(){ // Added some cleanup for weeklies, and added selected dailies to the recently completed daily list, which is responsible for greying out completed dailies.
	for (var item in game.global.dailyChallenge){
		if (item == "seed") continue;
		if (typeof dailyModifiers[item].start !== 'undefined') dailyModifiers[item].start(game.global.dailyChallenge[item].strength, game.global.dailyChallenge[item].stacks);
	}
	game.global.recentDailies.push(game.global.dailyChallenge.seed);
	for(var x = 0; x < mods.seeds.length; x++)
		game.global.recentDailies.push(mods.seeds[x])
	resetWeeklyObject();
	if (game.global.recentDailies.length == 7) giveSingleAchieve("Now What");
	handleFinishDailyBtn();
	dailyReduceEnlightenmentCost();
}

// Custom weekly functions

mods = {
	weekly: {},
	seeds: [],
	weeklyFlag: false,
	dailiesAdded: []
};

function resetWeeklyObject() {
	mods.weekly = {};
	mods.seeds = [];
	mods.dailiesAdded = [];
}

function toggleWeekly(add) {
	resetWeeklyObject();
	clearDailyNodes();
	setWeeklyDescription();
	updateWeeklyBuffs();
	updateWeeklyHeliumReward();
	mods.weeklyFlag = !mods.weeklyFlag; // Toggle the weekly flag
	if(mods.weeklyFlag) {		
		document.getElementById('activatePortalBtn').style.display = 'none';
		document.getElementById('weeklyDiv').classList.remove("colorSuccess")
		document.getElementById('weeklyDiv').classList.add("colourSelectedWeekly") // Select weekly
		if(document.getElementsByClassName("colorInfo")[0]) {
			if(game.global.recentDailies.includes(getDailyTimeString(add)))
				document.getElementsByClassName("colorInfo")[0].classList.add("colorGrey")
			else
				document.getElementsByClassName("colorInfo")[0].classList.add("colorSuccess")
			document.getElementsByClassName("colorInfo")[0].classList.remove("colorInfo") // Deselect the current daily.
		}
		
		for(var i = 0; i < 7; i++) {
			dayIndex = nodeToDayIndex(i);
			if(game.global.recentDailies.includes(getDailyTimeString(dayIndex))) { // These are the unavailable dailies, so just remove their onclick.
				document.getElementsByClassName("dailyTopRow")[0].childNodes[i].removeAttribute("onclick");
				document.getElementsByClassName("dailyTopRow")[0].childNodes[i].removeAttribute("onmouseover");
			}
			else {
				document.getElementsByClassName("dailyTopRow")[0].childNodes[i].setAttribute("onclick", `toggleDaily(${dayIndex}, ${i})`); // Replace onclick method for existing dailies and replace with a method which adds them to a combined daily.
				document.getElementsByClassName("dailyTopRow")[0].childNodes[i].setAttribute("onmouseover", `tooltip("Add Daily", null, event)`);
			}
		}
		game.global.selectedChallenge = "Weekly";
	}
	else {
		game.global.selectedChallenge = "Daily";
		document.getElementById('weeklyDiv').classList.remove("colourSelectedWeekly")
		document.getElementById('weeklyDiv').classList.add("colorSuccess")
		getDailyChallenge(add); // Resets and rebuilds daily challenge nodes.
		
	}
}

function toggleDaily(dailyIndex, nodeIndex) {
	if(mods.seeds.includes(getDailyTimeString(dailyIndex))) {
		removeFromWeekly(dailyIndex);
		document.getElementsByClassName("dailyTopRow")[0].childNodes[nodeIndex].classList.remove("addedDaily");
		document.getElementsByClassName("dailyTopRow")[0].childNodes[nodeIndex].classList.add("colorSuccess");
		mods.dailiesAdded.splice(mods.dailiesAdded.indexOf(nodeIndex), 1);
	}
	else {
		addToWeekly(dailyIndex);
		document.getElementsByClassName("dailyTopRow")[0].childNodes[nodeIndex].classList.remove("colorSuccess");
		document.getElementsByClassName("dailyTopRow")[0].childNodes[nodeIndex].classList.add("addedDaily");
		mods.dailiesAdded.push(nodeIndex);
	}
	updateWeeklyHeliumReward();
	updateWeeklyBuffs();
	
	for(var i = 0; i < 7; i++) {
		if(mods.dailiesAdded.includes(i))
			continue;
		dayIndex = nodeToDayIndex(i);
		if(game.global.recentDailies.includes(getDailyTimeString(dayIndex))) // Daily is already greyed out
			continue;
		else if(!checkIfDailyCompatible(dayIndex)) { // Incompatible daily
			document.getElementsByClassName("dailyTopRow")[0].childNodes[i].classList.remove("colorSuccess");
			document.getElementsByClassName("dailyTopRow")[0].childNodes[i].classList.add("colourIncompatible");
			document.getElementsByClassName("dailyTopRow")[0].childNodes[i].removeAttribute("onclick");
			document.getElementsByClassName("dailyTopRow")[0].childNodes[i].setAttribute("onmouseover", `tooltip("Incompatible Daily", null, event)`);
		}
		else {
			document.getElementsByClassName("dailyTopRow")[0].childNodes[i].classList.remove("colourIncompatible");
			document.getElementsByClassName("dailyTopRow")[0].childNodes[i].classList.add("colorSuccess");
			document.getElementsByClassName("dailyTopRow")[0].childNodes[i].setAttribute("onclick", "toggleDaily("+dayIndex+","+i+")");
			document.getElementsByClassName("dailyTopRow")[0].childNodes[i].setAttribute("onmouseover", `tooltip("Add Daily", null, event)`);
		}
	}
	if(mods.dailiesAdded.length > 0)
		document.getElementById('activatePortalBtn').style.display = 'inline-block';
	else
		document.getElementById('activatePortalBtn').style.display = 'none';
}

function addToWeekly(dailyIndex) {
	var dailyToAdd = getDailyChallenge(dailyIndex, true);
	for(x in dailyToAdd) {
		if(x == "seed")
			mods.seeds.push(dailyToAdd[x]);
		else if(mods.weekly[x] == null)
			mods.weekly[x] = dailyToAdd[x];
		else 
			mods.weekly[x].strength += dailyToAdd[x].strength;
	}
}

function removeFromWeekly(dailyIndex) {
	var dailyToRemove = getDailyChallenge(dailyIndex, true);
	for(x in dailyToRemove) {
		if(x == "seed") 
			mods.seeds.splice(mods.seeds.indexOf(dailyToRemove[x]), 1);
		else {
			mods.weekly[x].strength -= dailyToRemove[x].strength;
			if(mods.weekly[x].strength == 0)
				delete mods.weekly[x];
		}
	}
}

function checkIfDailyCompatible(dayIndex) {
	dayToCheck = getDailyChallenge(dayIndex, true);
	compatibleFlag = true;
	for(x in dayToCheck) {
		if(x == "seed")
			continue;
		else if(mods.weekly[x] == null) 
			continue;
		else if(mods.weekly[x].strength + dayToCheck[x].strength <= dailyModifiers[x].minMaxStep[1])
			continue;
		else {
			compatibleFlag = false;
		}
	}
	return compatibleFlag;
}

function availableDailies() { // Dailies that haven't been run yet
	var currentCompleteObj = game.global.recentDailies;
	var availableDailies = [];
	for (var x = 0; x > -7; x--){
		var timeString = getDailyTimeString(x);
		if (currentCompleteObj.indexOf(timeString) == -1)
			availableDailies.push(x);
	}
	return availableDailies;
}

function nodeToDayIndex(i) { // Converts a node position (Sunday = 0, ... Saturday = 6) to an index relative to today (today = 0, yesterday = -1, tomorrow = 1)
	var todayOfWeek = getDailyTimeString(0, false, true);
	var dayIndex = (todayOfWeek * -1) + i;
	if (dayIndex > 0)
		dayIndex = (i - todayOfWeek) - 7;	
	return dayIndex;
}

// Cleanup functions to handle the HTML elements displaying weeklies in the portal screen

function updateWeeklyBuffs() { // Generate unordered list for all the weekly buffs.
	buffList = document.createElement("ul");
	buffList.style.textAlign = "left";
	for(x in mods.weekly)
		buffList.innerHTML += `<li> ${dailyModifiers[x].description(mods.weekly[x].strength)} </li>`;
	document.getElementById("specificChallengeDescription").replaceChild(buffList, document.getElementById("specificChallengeDescription").childNodes[3]);
}

function updateWeeklyHeliumReward() {
	var value = getDailyHeliumValue(countDailyWeight(mods.weekly));
	if(value == 100 || (Fluffy.isRewardActive("dailies") && value == 200)) value = 0;
	document.getElementById("specificChallengeDescription").childNodes[2].childNodes[0].innerHTML = `${prettify(value)}% ${heliumOrRadon(false, true)}`;
}

function setWeeklyDescription() {
	weeklyDescription = document.createElement("p");
	weeklyDescription.id = "weeklyDescription";
	weeklyDescription.innerHTML = `Weeklies are combinations of selected, compatible daily challenges. Dailies are compatible if their modifiers can be combined without any modifier exceeding the built-in cap. Dailies that are incompatible with those already selected are shown in ${"red".fontcolor("#cc2e25")}. Because the relationship between modifier strength and ${heliumOrRadon(false, true)} reward is not linear, the reward value won't always correspond to the sum of the individual dailies.`
	document.getElementById("specificChallengeDescription").replaceChild(weeklyDescription, document.getElementById("specificChallengeDescription").childNodes[4]);
}

function clearDailyNodes() {
	for(var x = 5; x < document.getElementById("specificChallengeDescription").childNodes.length; x++) {
		document.getElementById("specificChallengeDescription").childNodes[x].innerHTML = "";
		document.getElementById("specificChallengeDescription").childNodes[x].nodeValue = "";
	}
}

// Extra CSS colours to handle additions

var moddedDailyColours = document.createElement('style');
moddedDailyColours.type = 'text/css';
moddedDailyColours.innerHTML = '.colourSelectedWeekly { background-color:#5bc0de; } .colourIncompatible { background-color: #cc2e25; } .addedDaily {background-color: #f2c627; } .colourIncompatible:hover {background-color: #7a0707; } .addedDaily:hover { background-color: #c49410; }';
document.getElementsByTagName('head')[0].appendChild(moddedDailyColours);