document.createElement("style")
var modCellColorFast = document.createElement('style');
modCellColorFast.type = 'text/css';
modCellColorFast.innerHTML = '.modCellColorFast { background-color:#007C7C; color:black; }'
document.getElementsByTagName('head')[0].appendChild(modCellColorFast);

if(typeof(mods) === "undefined") mods = {}

mods.fasties = ["Squimp", "Gorillimp", "Snimp", "Kittimp", "Shrimp", "Chickimp", "Slagimp", "Lavimp", "Kangarimp","Entimp", "Frimp"];

drawGrid = insertCode(drawGrid, findPositionInFunction(drawGrid, ["cellColorNotBeaten", "mapPumpkimp", ";"]), `if (maps && mods.fasties.includes(game.global.mapGridArray[counter].name)) className += " modCellColorFast"`);