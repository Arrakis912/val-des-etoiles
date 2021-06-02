import { QueryManager } from "./clientQueryManager.js"

const CARDHEIGHT = 200;
const CARDWIDTH = 100;
const CARDBORDER = 3;
const CARDLIST = [];
let SOURCEPOSITION = [45,5]

function updateUIInterval(){
    if (window.UPDATEUI) {
        updateUI();
        window.UPDATEUI = false;
    }
}

function connect(){
    const name = document.getElementById('input_name').value;
    const url = document.getElementById('input_url').value;
    console.log(`client connect function with name ${name} and url ${url}`);
    
    QueryManager.connectRequest(url, name)
    window.updateInterval = setInterval(updateUIInterval, 500);
}

function backToList(){
    QueryManager.exitGameRequest();
    document.getElementById("gameBoard").style.display = 'none';
    document.getElementById("gameListPage").style.display = 'block';
}

function disconnect(){
    QueryManager.disconnectRequest();
    document.getElementById("gameListPage").style.display = 'none';
    document.getElementById("initPage").style.display = 'block';
}

function updateUI(){
    const oldStatus = window.PREVIOUSGAMESTATUS;
    const gameStatus = window.GAMESTATUS;
    const activePlayerName = gameStatus.players[gameStatus.activePlayer];
    const playerIndex = gameState.players.findIndex((elem)=>elem.name===window.STARNAME);
    let opIndex = playerIndex + 1;
    if (opIndex >= gameStatus.players.length) {
        opIndex = 0;
    }
    let gameBoard = `${drawField(gameStatus, opIndex, true)}${drawSource(gameState.source.length)}${drawRiver(gameStatus)}${drawField(gameStatus, playerIndex, false)}`;
    document.getElementById("gameBoard").innerHTML = gameBoard;
    document.getElementById("gameInfo").innerText = `active player : ${activePlayerName} / phase : ${gameStatus.phase} / ${(window.STARNAME !== activePlayerName) ? "Waiting for other player's action" : textInstruction(gameStatus)}`;
    window.PREVIOUSGAMESTATUS = gameStatus;
    if(window.STARNAME === activePlayerName){
        //Stop requesting update as we are the one the game is waiting
        window.skipUpdateRequest = true;
    }
}

function drawSource(cardsLeft){
    return `<label id="Source" style="height: ${CARDHEIGHT}px; width: ${CARDWIDTH}px; border: ${CARDBORDER}px solid black; position: absolute; top: ${SOURCEPOSITION[0]}px; left: ${SOURCEPOSITION[1]}px">${cardsLeft}</label>`
}

function drawRiver(gameState){
    let river = "";
    let riverFlow = 0;
    gameState.river.forEach(card => {
        river += drawCardFront(card, riverFlow, 0);
        riverFlow += CARDWIDTH;
    });
    return `<div id="River" style="border: 2px dotted black; position: absolute; top: ${SOURCEPOSITION[0]}px; left: ${SOURCEPOSITION[1] + CARDWIDTH}px">${river}</div>`
}

function drawField(gameState, playerId, isOpponent){
    const cardHeightWithBorder = CARDHEIGHT+2*CARDBORDER;
    return `<div id="${isOpponent?"Opponent":"Player"}" style = "${isOpponent?"height:"+(SOURCEPOSITION[0]-cardHeightWithBorder)+"px;":""}position: absolute; top: ${(isOpponent?0:SOURCEPOSITION[0]) + cardHeightWithBorder}px; left: ${0}px">${drawPlayerHand(gameState, playerId,isOpponent)}${drawPlayerCreatures(gameState, playerId,isOpponent)}</div>`
}

function drawPlayerHand(gameState, playerId, isOp){
    let hand = "";
    let handFlow = 0;
    gameState.players[playerId].hand.forEach(card => {
        hand += drawCardFront(card, handFlow, 0);
        handFlow += CARDWIDTH;
    });
    return `<div id="${isOp?"Op":""}Hand" style="position: absolute; ${isOp?"top":"bottom"}: ${0}px; left: ${0}px">${hand}</div>`
}

function drawPlayerCreatures(gameState, playerId, isOp){
    let terrain = "";
    let terrainFlow = 0;
    const cardWidthWithBorder = CARDWIDTH+2*CARDBORDER;
    const cardHeightWithBorder = CARDHEIGHT+2*CARDBORDER;
    gameState.players[playerId].creatures.forEach(creature => {
        terrain += drawCreature(creature, terrainFlow, 0);
        terrainFlow += 3*cardWidthWithBorder;
    });
    return `<div id="${isOp?"Op":""}Creatures" style="position: absolute; ${isOp?"top":"bottom"}: ${cardHeightWithBorder}px; left: ${0}px">${terrain}</div>`
}

function textInstruction(gameStatus){
    switch (gameStatus.phase) {
        case -2:
            return "Enterrement : Selectionner la prochaine carte à enterrer";
        case -1:
            return "starting game phase : should not be accessible here !";
        case 0:
            return "Action de l'étoile : créer un être (click : bouton), utiliser une arcane (click : carte), ou sauter la phase (click : bouton)";
        case 1:
            return "Actions des êtres : utiliser un être (click : carte utilisée), ou finir le tour (click : bouton)";
        default:
            return "Unrecognised Situation, uh oh..."
    }
}

drawCard(card,left,top){
    //TODO : check visibility and handle hiding cards
    return drawCardFront(card,left,top);
}

function drawCardFront(card,left,top){
    return `<label id="Card_${card.id}" style="height: ${CARDHEIGHT}px; width: ${CARDWIDTH}px; border: ${CARDBORDER}px solid black; position: absolute; top: ${top}px; left: ${left}px">${card.value} of ${card.color}</label>`
}

function drawCardBack(card,left,top){
    return `<label id="Card_${card.id}" style="height: ${CARDHEIGHT}px; width: ${CARDWIDTH}px; border: ${CARDBORDER}px solid black; position: absolute; top: ${top}px; left: ${left}px">Back</label>`
}

function drawCreature(creature, left, top){
    let creatureContent = '';
    const cardWidthWithBorder = CARDWIDTH+2*CARDBORDER;
    const cardHeightWithBorder = CARDHEIGHT+2*CARDBORDER;
    if (creature.spirit !== undefined) {
        creatureContent += drawCardBack(creature.spirit,cardWidthWithBorder,0);
    }
    if (creature.heart !== undefined) {
        creatureContent += drawCardBack(creature.heart,0,cardHeightWithBorder);
    }
    if (creature.head !== undefined) {
        creatureContent += drawCardFront(creature.head,cardWidthWithBorder,cardHeightWithBorder);
    }
    if (creature.weapon !== undefined) {
        creatureContent += drawCardBack(creature.weapon,2*cardWidthWithBorder,cardHeightWithBorder);
    }
    if (creature.power !== undefined) {
        creatureContent += drawCardBack(creature.power,cardWidthWithBorder,2*cardHeightWithBorder);
    }
    return `<div id="Creature_${creature.id}" style="height: ${3*(cardHeightWithBorder)}px; width: ${3*(cardWidthWithBorder)}px; position: absolute; top: ${top}px; left: ${left}px">${creatureContent}</div>`
}

// function moveCard(id,left,top){
//     card = document.getElementById(`Card_${id}`);
//     card.style.left = left;
//     card.style.top = top;
// }
// function revealCard(id){
//     card = document.getElementById(`Card_${id}`);
//     card.textContent = `${CARDLIST[id].value} of ${CARDLIST[id].color}`;
// }
// function hideCard(id){
//     card = document.getElementById(`Card_${id}`);
//     card.textContent = `Back`;
// }

document.getElementById('connectButton').addEventListener('click', connect);
document.getElementById('backToListButton').addEventListener('click', backToList);
document.getElementById('DisconnectButton').addEventListener('click', disconnect);