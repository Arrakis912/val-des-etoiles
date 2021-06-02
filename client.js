import { QueryManager } from "./clientQueryManager.js"

const CARDHEIGHT = 50;
const CARDWIDTH = 50;
const CARDBORDER = 2;
const CARDHEIGHTWITHBORDER = CARDHEIGHT + (2*CARDBORDER);
const CARDWIDTHWITHBORDER = CARDWIDTH + (2*CARDBORDER);
let SOURCEPOSITION = [5*CARDHEIGHTWITHBORDER,5]

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

function sendMove(move){
    QueryManager.playRequest(move);
    window.skipUpdateRequest = false;
}

function updateUI(){
    const oldStatus = window.PREVIOUSGAMESTATUS;
    const gameStatus = window.GAMESTATUS;
    const activePlayerName = gameStatus.players[gameStatus.activePlayer].name;
    const playerIndex = gameStatus.players.findIndex((elem)=>elem.name===window.STARNAME);
    const playerIsActive = (window.STARNAME === activePlayerName);
    let opIndex = playerIndex + 1;
    if (opIndex >= gameStatus.players.length) {
        opIndex = 0;
    }
    let gameBoard = document.getElementById("gameBoard");
    gameBoard.innerHTML='';
    gameBoard.appendChild(makeInfoLine(gameStatus,activePlayerName,playerIsActive));
    gameBoard.appendChild(makeButtons(gameStatus, playerIndex, playerIsActive));
    gameBoard.appendChild(makeField(gameStatus, opIndex, true));
    gameBoard.appendChild(makeSource(gameStatus.source.length));
    gameBoard.appendChild(makeRiver(gameStatus));
    gameBoard.appendChild(makeField(gameStatus, playerIndex, false));
    // let gameBoard = `${drawInfoLine(gameStatus,activePlayerName,playerIsActive)}${drawButtons(gameStatus, playerIndex, playerIsActive)}${drawField(gameStatus, opIndex, true)}${drawSource(gameStatus.source.length)}${drawRiver(gameStatus)}${drawField(gameStatus, playerIndex, false)}`;
    // document.getElementById("gameBoard").innerHTML = gameBoard;
    window.PREVIOUSGAMESTATUS = gameStatus;
    if(playerIsActive){
        //Stop requesting update as we are the one the game is waiting
        window.skipUpdateRequest = true;
    }
}

function makeInfoLine(gameStatus,activePlayerName,playerIsActive){
    let line = document.createElement('label');
    line.setAttribute('id','GameInfo');
    line.style = `height: ${CARDHEIGHT/2}px; width: 100%; position: absolute; top: 0px; left: 0px`;
    line.innerHTML = `active player : ${activePlayerName} / phase : ${gameStatus.phase} / ${playerIsActive?textInstruction(gameStatus):"Waiting for other player's action"}`;
    return line;
    // return `<label id="GameInfo" style="height: ${CARDHEIGHT/2}px; width: 100%; position: absolute; top: 0px; left: 0px">active player : ${activePlayerName} / phase : ${gameStatus.phase} / ${playerIsActive?textInstruction(gameStatus):"Waiting for other player's action"}</label>`
}

function makeButtons(gameStatus, playerIndex, playerIsActive){
    let line = document.createElement('div');
    line.setAttribute('id','GameButtons');
    line.style = `height: ${CARDHEIGHT/2}px; width: 100%; position: absolute; top: ${CARDHEIGHT/2}px; left: 0px`
    let skipPhaseButton = document.createElement('button');
    skipPhaseButton.setAttribute('id','skipPhaseButton');
    skipPhaseButton.innerHTML = 'Finir Phase';
    skipPhaseButton.addEventListener('click', clickGameButtonSkip);
    line.appendChild(skipPhaseButton);
    return line;
    // let buttons = "";
    // buttons += `<button id="skipPhaseButton" onclick="clickGameButtonSkip()">Finir Phase</button>`;
    // return `<div id="GameButtons" style="height: ${CARDHEIGHT/2}px; width: 100%; position: absolute; top: ${CARDHEIGHT/2}px; left: 0px">${buttons}</div>`
}

function clickGameButtonSkip(){
    sendMove({type:"endPhase"});
}

function makeSource(cardsLeft){
    let source = document.createElement('label');
    source.setAttribute('id', 'Source');
    source.innerHTML = `${cardsLeft}`;
    source.style=`height: ${CARDHEIGHT}px; width: ${CARDWIDTH}px; border: ${CARDBORDER}px solid black; position: absolute; top: ${SOURCEPOSITION[0]}px; left: ${SOURCEPOSITION[1]}px`;
    return source;
    // return `<label id="Source" style="height: ${CARDHEIGHT}px; width: ${CARDWIDTH}px; border: ${CARDBORDER}px solid black; position: absolute; top: ${SOURCEPOSITION[0]}px; left: ${SOURCEPOSITION[1]}px">${cardsLeft}</label>`
}

function makeRiver(gameStatus){
    let river = document.createElement('div');
    river.setAttribute('id','River');
    river.style=`position: absolute; top: ${SOURCEPOSITION[0]}px; left: ${SOURCEPOSITION[1] + CARDWIDTH}px`;
    let offset = 0;
    gameStatus.river.forEach(card=>{
        river.appendChild(makeCardFront(card,offset,0));
        offset += CARDWIDTH;
    });
    return river;
    // let river = "";
    // let riverFlow = 0;
    // gameStatus.river.forEach(card => {
    //     river += makeCardFront(card, riverFlow, 0);
    //     riverFlow += CARDWIDTH;
    // });
    // return `<div id="River" style="position: absolute; top: ${SOURCEPOSITION[0]}px; left: ${SOURCEPOSITION[1] + CARDWIDTH}px">${river}</div>`
}

function makeField(gameStatus, playerId, isOpponent){
    let field = document.createElement('div');
    field.setAttribute('id', `${isOpponent?"Opponent":"Player"}`);
    field.style = `height:${4*CARDHEIGHTWITHBORDER}px; position: absolute; top: ${(isOpponent?0:SOURCEPOSITION[0]) + CARDHEIGHTWITHBORDER}px; left: ${0}px`;
    field.appendChild(makePlayerHand(gameStatus, playerId,isOpponent));
    field.appendChild(makePlayerCreatures(gameStatus, playerId,isOpponent));
    return field;
    // return `<div id="${isOpponent?"Opponent":"Player"}" style = "height:${4*CARDHEIGHTWITHBORDER}px; position: absolute; top: ${(isOpponent?0:SOURCEPOSITION[0]) + CARDHEIGHTWITHBORDER}px; left: ${0}px">${drawPlayerHand(gameStatus, playerId,isOpponent)}${drawPlayerCreatures(gameStatus, playerId,isOpponent)}</div>`
}

function makePlayerHand(gameStatus, playerId, isOp){
    let hand = document.createElement('div');
    hand.setAttribute('id', `${isOp?"Op":""}Hand`);
    hand.style = `position: absolute; ${isOp?"top":"bottom"}: ${0}px; left: ${0}px`;
    let offset = 0;
    gameStatus.players[playerId].hand.forEach(card => {
        hand.appendChild(isOp?makeCardBack(card, offset, 0):makeCardFront(card, offset, 0));
        offset += CARDWIDTH;
    });
    return hand;
    // let hand = "";
    // let offset = 0;
    // gameStatus.players[playerId].hand.forEach(card => {
    //     hand += isOp?(makeCardBack(card, offset, 0)):(makeCardFront(card, offset, 0));
    //     offset += CARDWIDTH;
    // });
    // return `<div id="${isOp?"Op":""}Hand" style="position: absolute; ${isOp?"top":"bottom"}: ${0}px; left: ${0}px">${hand}</div>`
}

function makePlayerCreatures(gameStatus, playerId, isOp){
    let terrain = document.createElement('div');
    terrain.setAttribute('id', `${isOp?"Op":""}Creatures`);
    terrain.style = `position: absolute; ${isOp?"top":"bottom"}: ${CARDHEIGHTWITHBORDER}px; left: ${0}px`
    let offset = 0;
    gameStatus.players[playerId].creatures.forEach(creature => {
        terrain.appendChild(makeCreature(creature, offset, 0));
        offset += 3*CARDWIDTHWITHBORDER;
    });
    return terrain;
    // let terrain = "";
    // let offset = 0;
    // gameStatus.players[playerId].creatures.forEach(creature => {
    //     terrain += drawCreature(creature, offset, 0);
    //     offset += 3*CARDWIDTHWITHBORDER;
    // });
    // return `<div id="${isOp?"Op":""}Creatures" style="position: absolute; ${isOp?"top":"bottom"}: ${CARDHEIGHTWITHBORDER}px; left: ${0}px">${terrain}</div>`
}

function textInstruction(gameStatus){
    switch (gameStatus.phase) {
        case -2:{
            if(gameStatus.interruptFlow === undefined){
                return "ERROR! NO INTERUPTFLOW ELEMENT IN A PHASE -2 GAME STATE !"
            }
            const type = gameStatus.interruptFlow.type;
            if(type === "bury"){
                return "Enterrement : clicker sur la prochaine carte à envoyer à la rivière."
            } else if (type === "multiAction") {
                return "Action Multiple : clicker sur la rivière ou la source pour y piocher, ou sur la prochaine carte ciblée pour révéler/attacker (le joker de cendre révèle PUIS attaque)"
            }
            return `Tour interrompu : type d'interruption non reconnue ${type}`;
        }
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

function makeCard(card,left,top){
    //TODO : check visibility and handle hiding cards
    return makeCardFront(card,left,top);
}

function makeCardFront(card,left,top){
    let cardElem = document.createElement('label');
    cardElem.setAttribute('id',`Card_${card.id}`);
    cardElem.style = `height: ${CARDHEIGHT}px; width: ${CARDWIDTH}px; border: ${CARDBORDER}px solid black; position: absolute; top: ${top}px; left: ${left}px`;
    cardElem.innerHTML = `${card.value} of ${card.color}`;
    return cardElem;
    // return `<label id="Card_${card.id}" style="height: ${CARDHEIGHT}px; width: ${CARDWIDTH}px; border: ${CARDBORDER}px solid black; position: absolute; top: ${top}px; left: ${left}px">${card.value} of ${card.color}</label>`
}

function makeCardBack(card,left,top){
    let cardElem = document.createElement('label');
    cardElem.setAttribute('id',`Card_${card.id}`);
    cardElem.style = `height: ${CARDHEIGHT}px; width: ${CARDWIDTH}px; border: ${CARDBORDER}px solid black; position: absolute; top: ${top}px; left: ${left}px`;
    cardElem.innerHTML = `Back`;
    return cardElem;
    // return `<label id="Card_${card.id}" style="height: ${CARDHEIGHT}px; width: ${CARDWIDTH}px; border: ${CARDBORDER}px solid black; position: absolute; top: ${top}px; left: ${left}px">Back</label>`
}

function makeCreature(creature, left, top){
    let creatureElem = document.createElement('div');
    creatureElem.setAttribute('id', `Creature_${creature.id}`);
    creatureElem.style = `height: ${3*(CARDHEIGHTWITHBORDER)}px; width: ${3*(CARDWIDTHWITHBORDER)}px; position: absolute; top: ${top}px; left: ${left}px`;
    
    if (creature.spirit !== undefined) {
        creatureElem.appendChild(makeCardBack(creature.spirit,CARDWIDTHWITHBORDER,0));
    }
    if (creature.heart !== undefined) {
        creatureElem.appendChild(makeCardBack(creature.heart,0,CARDHEIGHTWITHBORDER));
    }
    if (creature.head !== undefined) {
        creatureElem.appendChild(makeCardFront(creature.head,CARDWIDTHWITHBORDER,CARDHEIGHTWITHBORDER));
    }
    if (creature.weapon !== undefined) {
        creatureElem.appendChild(makeCardBack(creature.weapon,2*CARDWIDTHWITHBORDER,CARDHEIGHTWITHBORDER));
    }
    if (creature.power !== undefined) {
        creatureElem.appendChild(makeCardBack(creature.power,CARDWIDTHWITHBORDER,2*CARDHEIGHTWITHBORDER));
    }

    // let creatureContent = '';
    // if (creature.spirit !== undefined) {
    //     creatureContent += makeCardBack(creature.spirit,CARDWIDTHWITHBORDER,0);
    // }
    // if (creature.heart !== undefined) {
    //     creatureContent += makeCardBack(creature.heart,0,CARDHEIGHTWITHBORDER);
    // }
    // if (creature.head !== undefined) {
    //     creatureContent += makeCardFront(creature.head,CARDWIDTHWITHBORDER,CARDHEIGHTWITHBORDER);
    // }
    // if (creature.weapon !== undefined) {
    //     creatureContent += makeCardBack(creature.weapon,2*CARDWIDTHWITHBORDER,CARDHEIGHTWITHBORDER);
    // }
    // if (creature.power !== undefined) {
    //     creatureContent += makeCardBack(creature.power,CARDWIDTHWITHBORDER,2*CARDHEIGHTWITHBORDER);
    // }
    // return `<div id="Creature_${creature.id}" style="height: ${3*(CARDHEIGHTWITHBORDER)}px; width: ${3*(CARDWIDTHWITHBORDER)}px; position: absolute; top: ${top}px; left: ${left}px">${creatureContent}</div>`
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