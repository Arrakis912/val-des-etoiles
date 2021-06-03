import { QueryManager } from "./clientQueryManager.js"

const CARDHEIGHT = 40;
const CARDWIDTH = 40;
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
    
    QueryManager.connectRequest(url, name);
    window.updateInterval = setInterval(updateUIInterval, 500);
}

function makeNewGame(){
    QueryManager.makeGameRequest();
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

function clickSource(){
    console.log('clicked source')
}

function clickRiver(){
    console.log('clicked river')
}

function clickCard(cardId){
    const cardElem = document.getElementById(`Card_${cardId}`);
    const root = cardElem.parentElement;
    const rootName = root.getAttribute('id')
    if(rootName.startsWith('Op')){
        console.log(`clicked card ${cardId} in ${rootName} : no effect`);
    } else if(rootName === "Hand"){
        console.log(`clicked on card ${cardId} in Hand`);
    } else if(rootName.startsWith('Creature_')){
        if (root.parentElement.getAttribute('id').startsWith('Op')) {
            console.log(`clicked on card ${cardId} in opposing creature ${rootName}`);
        } else {
            console.log(`clicked on card ${cardId} in player creature ${rootName}`)
        }
    } else if(rootName === 'River'){
        clickRiver();
    } else {
        console.error(`unknown root ${rootName} for clicked card ${cardId}`)
    }
}

function clickGameButtonSkip(){
    sendMove({type:"endPhase"});
}

function sendMove(move){
    QueryManager.playRequest(move);
    window.playerIsActive = false;
}

function updateUI(){
    const oldStatus = window.PREVIOUSGAMESTATUS;
    const gameStatus = window.GAMESTATUS;
    const activePlayerName = gameStatus.players[gameStatus.activePlayer].name;
    const playerIndex = gameStatus.players.findIndex((elem)=>elem.name===window.STARNAME);
    window.playerIsActive = (window.STARNAME === activePlayerName);
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
    window.PREVIOUSGAMESTATUS = gameStatus;
}

function makeInfoLine(gameStatus,activePlayerName,playerIsActive){
    let line = document.createElement('label');
    line.setAttribute('id','GameInfo');
    line.style = `height: ${CARDHEIGHT/2}px; width: 100%; position: absolute; top: 0px; left: 0px`;
    line.innerHTML = `active player : ${activePlayerName} / phase : ${gameStatus.phase} / ${playerIsActive?textInstruction(gameStatus):"Waiting for other player's action"}`;
    return line;
}

function makeButtons(gameStatus, playerIndex, playerIsActive){
    let line = document.createElement('div');
    line.setAttribute('id','GameButtons');
    line.style = `height: ${CARDHEIGHT/2}px; width: 100%; position: absolute; top: ${CARDHEIGHT/2}px; left: 0px`;
    if(playerIsActive){
        if(gameStatus.phase === 0 || gameStatus.phase === 1){
            let skipPhaseButton = document.createElement('button');
            skipPhaseButton.setAttribute('id','skipPhaseButton');
            skipPhaseButton.innerHTML = 'Finir Phase';
            skipPhaseButton.addEventListener('click', clickGameButtonSkip);
            line.appendChild(skipPhaseButton);
        }
    }
    return line;
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
            } else if (type === "victory") {
                return `${(gameStatus.interruptFlow.winner === window.STARNAME)?"VICTOIRE!":("Défaite, "+gameStatus.interruptFlow.winner+" a gagné")}`
            } else if (type === "multiAction") {
                return "Action Multiple : clicker sur la rivière ou la source pour y piocher, ou sur la prochaine carte ciblée pour révéler/attacker (le joker de cendre révèle PUIS attaque)"
            }
            return `Tour interrompu : type d'interruption non reconnue ${type}`;
        }
        case -1:
            return "Ce message n'est pas sensé être vu !";
        case 0:
            return "Action de l'étoile : créer un être (click : bouton), utiliser une arcane (click : carte)";
        case 1:
            return "Actions des êtres : utiliser un être (click : carte utilisée)";
        default:
            return "Situation Imprévue, uh oh..."
    }
}

function makeSource(cardsLeft){
    let source = document.createElement('label');
    source.setAttribute('id', 'Source');
    source.innerHTML = `${cardsLeft}`;
    source.style=`height: ${CARDHEIGHT}px; width: ${CARDWIDTH}px; border: ${CARDBORDER}px solid black; position: absolute; top: ${SOURCEPOSITION[0]}px; left: ${SOURCEPOSITION[1]}px`;
    source.addEventListener('click', clickSource);
    return source;
}

function makeRiver(gameStatus){
    let river = document.createElement('div');
    river.setAttribute('id','River');
    river.style=`position: absolute; top: ${SOURCEPOSITION[0]}px; left: ${SOURCEPOSITION[1] + CARDWIDTH}px`;
    let offset = 0;
    gameStatus.river.forEach(card=>{
        river.appendChild(makeCard(card,offset,0));
        offset += CARDWIDTH;
    });
    return river;
}

function makeField(gameStatus, playerId, isOpponent){
    let field = document.createElement('div');
    field.setAttribute('id', `${isOpponent?"Opponent":"Player"}`);
    field.style = `height:${4*CARDHEIGHTWITHBORDER}px; position: absolute; top: ${(isOpponent?0:SOURCEPOSITION[0]) + CARDHEIGHTWITHBORDER}px; left: ${0}px`;
    field.appendChild(makePlayerHand(gameStatus, playerId,isOpponent));
    field.appendChild(makePlayerCreatures(gameStatus, playerId,isOpponent));
    return field;
}

function makePlayerHand(gameStatus, playerId, isOp){
    let hand = document.createElement('div');
    hand.setAttribute('id', `${isOp?"Op":""}Hand`);
    hand.style = `position: absolute; ${isOp?"top":"bottom"}: ${0}px; left: ${0}px`;
    let offset = 0;
    gameStatus.players[playerId].hand.forEach(card => {
        hand.appendChild(isOp?makeCard(card, offset, 0, false):makeCard(card, offset, 0));
        offset += CARDWIDTH;
    });
    return hand;
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
}

function makeCard(card,left,top, revealed=true){
    //TODO : check visibility and handle better hiding cards
    let cardElem = document.createElement('label');
    cardElem.setAttribute('id',`Card_${card.id}`);
    cardElem.style = `height: ${CARDHEIGHT}px; width: ${CARDWIDTH}px; border: ${CARDBORDER}px solid black; position: absolute; top: ${top}px; left: ${left}px`;
    cardElem.innerHTML = revealed?`${card.value} of ${card.color}`:'Back';
    cardElem.addEventListener('click',()=>{
        if (window.playerIsActive) {
            clickCard(card.id);
        }
    });
    return cardElem;
}

function makeCreature(creature, left, top){
    let creatureElem = document.createElement('div');
    creatureElem.setAttribute('id', `Creature_${creature.id}`);
    creatureElem.style = `height: ${3*(CARDHEIGHTWITHBORDER)}px; width: ${3*(CARDWIDTHWITHBORDER)}px; position: absolute; top: ${top}px; left: ${left}px`;
    
    if (creature.spirit !== undefined) {
        const spiritCard = makeCard(creature.spirit,CARDWIDTHWITHBORDER,0, false);
        spiritCard.classList.add("spirit");
        creatureElem.appendChild(spiritCard);
    }
    if (creature.heart !== undefined) {
        const heartCard = makeCard(creature.heart,0,CARDHEIGHTWITHBORDER, false);
        heartCard.classList.add("heart");
        creatureElem.appendChild(heartCard);
    }
    if (creature.head !== undefined) {
        const headCard = makeCard(creature.head,CARDWIDTHWITHBORDER,CARDHEIGHTWITHBORDER);
        headCard.classList.add("head");
        creatureElem.appendChild(headCard);
    }
    if (creature.weapon !== undefined) {
        const weaponCard = makeCard(creature.weapon,2*CARDWIDTHWITHBORDER,CARDHEIGHTWITHBORDER, false);
        weaponCard.classList.add("weapon");
        creatureElem.appendChild(weaponCard);
    }
    if (creature.power !== undefined) {
        const powerCard = makeCard(creature.power,CARDWIDTHWITHBORDER,2*CARDHEIGHTWITHBORDER, false);
        powerCard.classList.add("power")
        creatureElem.appendChild(powerCard);
    }
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
document.getElementById('newGameButton').addEventListener('click', makeNewGame);
document.getElementById('backToListButton').addEventListener('click', backToList);
document.getElementById('DisconnectButton').addEventListener('click', disconnect);