mods = {
	weeklies: {
		weekly: {},
		seeds: [],
		weeklyFlag: false,
		dailiesAdded: [],
		weeklyLength: 0
	}
};

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
	mods.weeklies.weeklyFlag = false;`
) // Add weekly button

resetGame = insertCode(resetGame, findPositionInFunction(resetGame, ["challenge ==", "false", ";"]), `
		else if(challenge == "Weekly" && Object.keys(mods.weeklies.weekly).length > 0) {
			game.global.dailyChallenge = mods.weeklies.weekly;
			game.global.challengeActive = "Daily";
			challenge = "Daily";
	}`
) // Upgrade portalling to handle weeklies, then treat them like normal dailies.

save = insertCode(save, findPositionInFunction(save, ["stringify", "("]), `{... game, ...mods}`, 4) // Overload save function to save mod stats

load = insertCode(load, findPositionInFunction(load, ["midGame[c] = botSave", "}", "}"]), `if(savegame.hasOwnProperty("weeklies")) mods.weeklies.weeklyLength = savegame.weeklies.weeklyLength;
		`
) // Overload loading function to load mod stats

game.challenges.Daily.getCurrentReward = insertCode(game.challenges.Daily.getCurrentReward, findPositionInFunction(game.challenges.Daily.getCurrentReward, ["getDailyHeliumValue", ")"]), `, 1`);

Fluffy.getCurrentExp = insertCode(Fluffy.getCurrentExp, findPositionInFunction(Fluffy.getCurrentExp, ["game.global.universe"], 0), `portalUniverse`, 20);

getCurrentDailyDescription = insertCode(getCurrentDailyDescription, findPositionInFunction(getCurrentDailyDescription, ["getDailyHeliumValue", ")"]), `, 1`);

selectChallenge = insertCode(selectChallenge, findPositionInFunction(selectChallenge, [";"]), `resetWeeklyObject();`);

function getDailyHeliumValue(weight, useWkLen = 1){ // Increased cap to 7 * 500%. Also extended the +20 and +100 weights to include weeklies.
	//min 2, max 6
	var weeklyLength = 0;
	if(useWkLen == 0) 
		weeklyLength = mods.weeklies.weeklyLength;
	else if(useWkLen == 1)
		weeklyLength = mods.weeklies.dailiesAdded.length;
	else if(useWkLen == 2)
		weeklyLength = 0;
	var value = 75 * weight + 20 * Math.max(weeklyLength, 1);
	console.log(weeklyLength)
	if (value < 100) value = 100;
	else if (value > 7*500) value = 7*500;
	if (Fluffy.isRewardActive("dailies")) {
		value += 100 * Math.max(weeklyLength, 1);
	}
	return value;
}

function startDaily(){ // Added some cleanup for weeklies, and added selected dailies to the recently completed daily list, which is responsible for greying out completed dailies.
	for (var item in game.global.dailyChallenge){
		if (item == "seed") continue;
		if (typeof dailyModifiers[item].start !== 'undefined') dailyModifiers[item].start(game.global.dailyChallenge[item].strength, game.global.dailyChallenge[item].stacks);
	}
	game.global.recentDailies.push(game.global.dailyChallenge.seed);
	for(var x = 0; x < mods.weeklies.seeds.length; x++)
		game.global.recentDailies.push(mods.weeklies.seeds[x]);
	if (game.global.recentDailies.length == 7) giveSingleAchieve("Now What");
	mods.weeklies.weeklyLength = mods.weeklies.dailiesAdded.length;
	resetWeeklyObject();
	handleFinishDailyBtn();
	dailyReduceEnlightenmentCost();
}

// Custom weekly functions

function resetWeeklyObject() {
	mods.weeklies.weekly = {};
	mods.weeklies.seeds = [];
	mods.weeklies.dailiesAdded = [];
}

function toggleWeekly(add) {
	resetWeeklyObject();
	clearDailyNodes();
	setWeeklyDescription();
	updateWeeklyBuffs();
	updateWeeklyHeliumReward();
	mods.weeklies.weeklyFlag = !mods.weeklies.weeklyFlag; // Toggle the weekly flag
	if(mods.weeklies.weeklyFlag) {		
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
	if(mods.weeklies.seeds.includes(getDailyTimeString(dailyIndex))) {
		removeFromWeekly(dailyIndex);
		document.getElementsByClassName("dailyTopRow")[0].childNodes[nodeIndex].classList.remove("addedDaily");
		document.getElementsByClassName("dailyTopRow")[0].childNodes[nodeIndex].classList.add("colorSuccess");
		mods.weeklies.dailiesAdded.splice(mods.weeklies.dailiesAdded.indexOf(nodeIndex), 1);
	}
	else {
		addToWeekly(dailyIndex);
		document.getElementsByClassName("dailyTopRow")[0].childNodes[nodeIndex].classList.remove("colorSuccess");
		document.getElementsByClassName("dailyTopRow")[0].childNodes[nodeIndex].classList.add("addedDaily");
		mods.weeklies.dailiesAdded.push(nodeIndex);
	}
	updateWeeklyHeliumReward();
	updateWeeklyBuffs();
	
	for(var i = 0; i < 7; i++) {
		if(mods.weeklies.dailiesAdded.includes(i))
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
	if(mods.weeklies.dailiesAdded.length > 0)
		document.getElementById('activatePortalBtn').style.display = 'inline-block';
	else
		document.getElementById('activatePortalBtn').style.display = 'none';
}

function addToWeekly(dailyIndex) {
	var dailyToAdd = getDailyChallenge(dailyIndex, true);
	for(x in dailyToAdd) {
		if(x == "seed")
			mods.weeklies.seeds.push(dailyToAdd[x]);
		else if(mods.weeklies.weekly[x] == null)
			mods.weeklies.weekly[x] = dailyToAdd[x];
		else 
			mods.weeklies.weekly[x].strength += dailyToAdd[x].strength;
	}
}

function removeFromWeekly(dailyIndex) {
	var dailyToRemove = getDailyChallenge(dailyIndex, true);
	for(x in dailyToRemove) {
		if(x == "seed") 
			mods.weeklies.seeds.splice(mods.weeklies.seeds.indexOf(dailyToRemove[x]), 1);
		else {
			mods.weeklies.weekly[x].strength -= dailyToRemove[x].strength;
			if(mods.weeklies.weekly[x].strength == 0)
				delete mods.weeklies.weekly[x];
		}
	}
}

function checkIfDailyCompatible(dayIndex, ) {
	dayToCheck = getDailyChallenge(dayIndex, true);
	compatibleFlag = true;
	for(x in dayToCheck) {
		if(x == "seed")
			continue;
		else if(mods.weeklies.weekly[x] == null) 
			continue;
		else if(mods.weeklies.weekly[x].strength + dayToCheck[x].strength <= dailyModifiers[x].minMaxStep[1])
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
	for(x in mods.weeklies.weekly)
		buffList.innerHTML += `<li> ${dailyModifiers[x].description(mods.weeklies.weekly[x].strength)} </li>`;
	document.getElementById("specificChallengeDescription").replaceChild(buffList, document.getElementById("specificChallengeDescription").childNodes[3]);
}

function updateWeeklyHeliumReward() {
	var value = getDailyHeliumValue(countDailyWeight(mods.weeklies.weekly), 0);
	var regularHelium = 0;
	for(i of mods.weeklies.dailiesAdded) 
		regularHelium += getDailyHeliumValue(countDailyWeight(getDailyChallenge(nodeToDayIndex(i), true)), 2);
	if(value == 100 || (Fluffy.isRewardActive("dailies") && value == 200)) {
		value = 0;
		regularHelium = 0;
	}
	document.getElementById("specificChallengeDescription").childNodes[2].childNodes[0].innerHTML = `${prettify(value)}% ${heliumOrRadon(false, true)} (${prettify(regularHelium)}% normally)`;
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

load(); // This load is important because we overloaded the load function. It has already loaded the version of the game that doesn't have any mods active, so this load includes the mods.

// Extra CSS colours to handle additions

var moddedDailyColours = document.createElement('style');
moddedDailyColours.type = 'text/css';
moddedDailyColours.innerHTML = '.colourSelectedWeekly { background-color:#5bc0de; } .colourIncompatible { background-color: #cc2e25; } .addedDaily {background-color: #f2c627; } .colourIncompatible:hover {background-color: #7a0707; } .addedDaily:hover { background-color: #c49410; }';
document.getElementsByTagName('head')[0].appendChild(moddedDailyColours);