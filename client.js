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
    console.log('clicked source');
    switch(window.UIState){
        case "endingTurn":{
            sendMove({type:"endPhase", drawFrom : "source"});
            break;
        }
        case "searchTarget":{
            window.selectedFunction({type:"source"});
            break;
        }
        default:{
            console.log(`no action for this state ${window.UIState} on source`);
        }
    }
}

function clickRiver(){
    console.log('clicked river');
    switch(window.UIState){
        case "endingTurn":{
            sendMove({type:"endPhase", drawFrom : "river"});
            break;
        }
        case "searchTarget":{
            window.selectedFunction({type:"river"});
            break;
        }
        default:{
            console.log(`no action for this state ${window.UIState} on river`);
        }
    }
}

function clickRay(isOp){
    console.log(`clicked ${isOp?"rival":"player"}`);
    if(window.UIState === "searchTarget"){
        window.selectedFunction({type:"star", isOp});
    }
}

function clickCard(cardId, value, color){
    const cardElem = document.getElementById(`Card_${cardId}`);
    if(window.selectedCard === cardId){//unselect selected card if clicked
        cardElem.classList.remove('selected');
        window.selectedCard = undefined;
        window.selectedFunction = undefined;
        window.UIState = window.savedUIState;
    }
    const root = cardElem.parentElement;
    const rootName = root.getAttribute('id');
    const phase = window.GAMESTATUS.phase;
    if(rootName.startsWith('Op')){
        console.log(`clicked card ${cardId} in OpHand : no effect`);
    } else if(rootName === "Hand"){
        console.log(`clicked on card ${cardId} in Hand`);
        if(phase != 0){
            console.log('cant play card from hand outside of star phase')
        } else {//Star Phase
            selectCard(cardElem, cardId);
            if(window.UIState === "educating"){
                window.selectedFunction = (target)=>{
                    sendMove({type:"educate",card : window.selectedCard, target});
                }
            } else {// Play Card : must select target
                window.selectedFunction = (target)=>{
                    sendMove({type:"useCard",card : window.selectedCard, target});
                }
            }
        }
    } else if(rootName.startsWith('Creature_')){
        const creatureId = parseInt(rootName.substring(9));
        const aspect = cardElem.getAttribute('aspect');
        const isOp = root.parentElement.getAttribute('id').startsWith('Op');
        console.log(`clicked on card ${cardId}, ${aspect} in ${isOp?'opposing':'player'} creature ${rootName}`);
        if(window.UIState === "searchTarget"){
            window.selectedFunction({type : "creature", isOp, creatureId, aspect})
        } else if (phase === 1 && !isOp){// Play Creature Aspect : must select target
            selectCard(cardElem, cardId);
            window.selectedFunction = (target)=>{
                sendMove({type:"CreatureAction", aspect, creature : creatureId, target});
            }
        } else if(phase === -2){
            switch (window.GAMESTATUS.interuptionObject.type) {
                case "bury":{
                    if (creatureId === window.GAMESTATUS.interuptionObject.creature.id) {
                        sendMove({type:"buryCard", aspect});
                    } else {
                        console.log(`clicked on creature which isn't the one we are burying`)
                    }
                    break;
                }
                case "multiAction":{
                    //TODO
                    break;
                }
                default:
                    console.error(`unrecognised interruption type for click on card`);
                    break;
            }
        } else {
            console.error(`no action defined for card in present phase and state`);
        }
    } else if(rootName === 'River'){
        clickRiver();
    } else {
        console.error(`unknown root ${rootName} for clicked card ${cardId}`)
    }
}

function selectCard(cardElem, cardId){
    if(window.selectedCard !== undefined){
        document.getElementById(`CARD_${window.selectedCard}`).classList.remove('selected');
    } else if(window.UIState !== "searchTarget" && window.UIState !== "createCreature") {
        window.savedUIState = window.UIState;
        window.UIState = "searchTarget";
    }
    cardElem.classList.add('selected');
    window.selectedCard = cardId;
}

function clickGameButtonSkip(){
    const game = window.GAMESTATUS;
    if (game.phase===1){
        if(game.players[game.activePlayer].hasSpectre){
            window.UIState = "endingTurn";
            console.log(`ending turn... where to draw?`);
        } else {
            sendMove({type:"endPhase"});
        }
    } else {
        sendMove({type:"endPhase"});
    }
}

function clickCreateCreatureButton(){
    if(!(window.UIState === "createCreature")){
        let versant = document.getElementById('Versant');
        versant.appendChild(makeCreatureSlot());
        window.UIState = "createCreature";
    }
}

function clickEducateButton(){
    window.UIState = "educating";
}

function clickCancelMoveButton(){
    updateUI();
}

function sendMove(move){
    QueryManager.playRequest(move);
    window.playerIsActive = false;
    window.PREVIOUSGAMESTATUS = undefined;
}

function resetMoveVariables(){
    window.UIState = "none";
    window.selectedCard = undefined;
    window.selectedCreature = undefined;
    window.selectedFunction = undefined;
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
    gameBoard.appendChild(makeButtonLine(gameStatus, playerIndex, playerIsActive));
    gameBoard.appendChild(makeField(gameStatus, opIndex, true));
    gameBoard.appendChild(makeSource(gameStatus.source.length));
    gameBoard.appendChild(makeRiver(gameStatus));
    gameBoard.appendChild(makeField(gameStatus, playerIndex, false));
    window.PREVIOUSGAMESTATUS = gameStatus;
    resetMoveVariables()
}

function makeInfoLine(gameStatus,activePlayerName,playerIsActive){
    let line = document.createElement('label');
    line.setAttribute('id','GameInfo');
    line.style = `height: ${CARDHEIGHT/2}px; width: 100%; position: absolute; top: 0px; left: 0px`;
    line.innerHTML = `active player : ${activePlayerName} / phase : ${gameStatus.phase} / ${playerIsActive?textInstruction(gameStatus):"Waiting for other player's action"}`;
    return line;
}

function makeButtonLine(gameStatus, playerIndex, playerIsActive){
    let line = document.createElement('div');
    line.setAttribute('id','GameButtons');
    line.style = `height: ${CARDHEIGHT/2}px; width: 100%; position: absolute; top: ${CARDHEIGHT/2}px; left: 0px; display:flex;`;
    if(playerIsActive){
        line.appendChild(makeButton("cancelMoveButton", "Annuler", clickCancelMoveButton));
        if(gameStatus.phase === 0 || gameStatus.phase === 1){
            line.appendChild(makeButton("skipPhaseButton", "Finir Phase", clickGameButtonSkip));
            if(gameStatus.phase === 0){
                line.appendChild(makeButton("createCreatureButton", "Engendrer", clickCreateCreatureButton));
                line.appendChild(makeButton("educateButton", "Eduquer", clickEducateButton));
            }
        } else if (gameStatus.phase === -2 && ) {

        }
    }
    return line;
}

function makeButton(id, text, callback){
    let button = document.createElement('button');
    button.setAttribute('id',id);
    button.innerHTML = text;
    button.addEventListener('click', callback);
    button.style = `height:${CARDHEIGHTWITHBORDER/2}px;width:${CARDWIDTH*3}px;`;
    return button;
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
    river.style=`position: absolute; top: ${SOURCEPOSITION[0]}px; left: ${SOURCEPOSITION[1] + CARDWIDTH}px; display: flex;`;
    gameStatus.river.forEach(card=>{
        river.appendChild(makeCard(card));
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
    hand.style = `position: absolute; ${isOp?"top":"bottom"}: 0px; left: 0px; display: flex;`;
    hand.appendChild(makeRayLabel(gameStatus, playerId, isOp));
    gameStatus.players[playerId].hand.forEach(card => {
        hand.appendChild(makeCard(card, !isOp));
    });
    return hand;
}

function makeRayLabel(gameStatus, playerId, isOp){
    let rayLabel = document.createElement('label');
    rayLabel.setAttribute('id', `${isOp?"Op":""}RayLabel`);
    rayLabel.style = `height:${CARDHEIGHTWITHBORDER}px; width:${CARDWIDTHWITHBORDER}px; font-size:large`;
    rayLabel.innerHTML = `${gameStatus.players[playerId].ray}`;
    rayLabel.addEventListener('click',()=>{
        if (window.playerIsActive) {
            clickRay(isOp);
        }
    });
    return rayLabel;
}

function makePlayerCreatures(gameStatus, playerId, isOp){
    let versant = document.createElement('div');
    versant.setAttribute('id', `${isOp?"Op":""}Versant`);
    versant.style = `position: absolute; height:${3*CARDHEIGHTWITHBORDER}px; ${isOp?"top":"bottom"}: ${CARDHEIGHTWITHBORDER}px; left: 0px; display: flex;`
    gameStatus.players[playerId].creatures.forEach(creature => {
        versant.appendChild(makeCreature(creature, isOp));
    });
    return versant;
}

function makeCard(card,base_revealed=true){
    //TODO : check visibility and handle better hiding cards
    let revealed = base_revealed;
    switch(card.visibility){
        case "Active":
            revealed = true;
            break;
        case "None":
            revealed = false;
            break;
        case "Owner":
            break;
        case window.STARNAME:
            revealed = true;
        default:
            console.error(`unrecognised visibility value ${card.visibility} in card ${card.id}`);
    }
    let cardElem = document.createElement('label');
    cardElem.setAttribute('id',`Card_${card.id}`);
    cardElem.style = `height: ${CARDHEIGHT}px; width: ${CARDWIDTH}px; border: ${CARDBORDER}px solid black;`;
    cardElem.innerHTML = revealed?`${card.value} of ${card.color}`:'Back';
    cardElem.addEventListener('click',()=>{
        if (window.playerIsActive) {
            clickCard(card.id, card.value, card.color);
        }
    });
    return cardElem;
}

function makeCreature(creature, isOp){
    let creatureElem = document.createElement('div');
    creatureElem.setAttribute('id', `Creature_${creature.id}`);
    creatureElem.style = `height: ${3*(CARDHEIGHTWITHBORDER)}px; width: ${3*(CARDWIDTHWITHBORDER)}px; position: relative; top: 0px; left: 0px`;
    
    if (creature.spirit !== undefined) {
        const spiritCard = makeCard(creature.spirit, false);
        spiritCard.style.position = 'absolute';
        if(isOp){
            spiritCard.style.left = `${CARDWIDTHWITHBORDER}px`;
            spiritCard.style.top = `${2*CARDHEIGHTWITHBORDER}px`;
        } else {
            spiritCard.style.left = `${CARDWIDTHWITHBORDER}px`;
            spiritCard.style.top = `${0}px`;
        }
        spiritCard.setAttribute('aspect',"spirit");
        creatureElem.appendChild(spiritCard);
    }
    if (creature.heart !== undefined) {
        const heartCard = makeCard(creature.heart, false);
        heartCard.style.position = 'absolute';
        if(isOp){
            heartCard.style.left = `${2*CARDWIDTHWITHBORDER}px`;
            heartCard.style.top = `${CARDHEIGHTWITHBORDER}px`;
        } else {
            heartCard.style.left = `${0}px`;
            heartCard.style.top = `${CARDHEIGHTWITHBORDER}px`;
        }
        heartCard.setAttribute('aspect',"heart");
        creatureElem.appendChild(heartCard);
    }
    if (creature.head !== undefined) {
        const headCard = makeCard(creature.head);
        headCard.style.position = 'absolute';
        headCard.style.left = `${CARDWIDTHWITHBORDER}px`;
        headCard.style.top = `${CARDHEIGHTWITHBORDER}px`;
        headCard.setAttribute('aspect',"head");
        creatureElem.appendChild(headCard);
    }
    if (creature.weapon !== undefined) {
        const weaponCard = makeCard(creature.weapon, false);
        weaponCard.style.position = 'absolute';
        if(isOp){
            weaponCard.style.left = `${0}px`;
            weaponCard.style.top = `${CARDHEIGHTWITHBORDER}px`;
        } else {
            weaponCard.style.left = `${2*CARDWIDTHWITHBORDER}px`;
            weaponCard.style.top = `${CARDHEIGHTWITHBORDER}px`;
        }
        weaponCard.setAttribute('aspect',"weapon");
        creatureElem.appendChild(weaponCard);
    }
    if (creature.power !== undefined) {
        const powerCard = makeCard(creature.power, false);
        powerCard.style.position = 'absolute';
        if(isOp){
            powerCard.style.left = `${CARDWIDTHWITHBORDER}px`;
            powerCard.style.top = `${0}px`;
        } else {
            powerCard.style.left = `${CARDWIDTHWITHBORDER}px`;
            powerCard.style.top = `${2*CARDHEIGHTWITHBORDER}px`;
        }
        powerCard.setAttribute('aspect',"power");
        creatureElem.appendChild(powerCard);
    }
    return creatureElem;
}

function makeCreatureSlot(){
    let creatureElem = document.createElement('div');
    creatureElem.setAttribute('id','CreatureCreator');
    creatureElem.style = `height: ${3*(CARDHEIGHTWITHBORDER)}px; width: ${3*(CARDWIDTHWITHBORDER)}px; position: relative; top: 0px; left: 0px`;
    
    const spiritSlot = makeSlot(CARDWIDTHWITHBORDER,0, false);
    creatureElem.appendChild(spiritSlot);
    const heartSlot = makeSlot(0,CARDHEIGHTWITHBORDER, false);
    creatureElem.appendChild(heartSlot);
    const headSlot = makeSlot(CARDWIDTHWITHBORDER,CARDHEIGHTWITHBORDER);
    creatureElem.appendChild(headSlot);
    const weaponSlot = makeSlot(2*CARDWIDTHWITHBORDER,CARDHEIGHTWITHBORDER, false);
    creatureElem.appendChild(weaponSlot);
    const powerSlot = makeSlot(CARDWIDTHWITHBORDER,2*CARDHEIGHTWITHBORDER, false);
    creatureElem.appendChild(powerSlot);

    let validateCreatureButton = document.createElement('button');
    validateCreatureButton.setAttribute('id','validateCreatureButton');
    validateCreatureButton.innerHTML = 'Engendrer';
    validateCreatureButton.addEventListener('click', ()=>{
        window.UIState = "none";
        sendMove({
            type: "makeCreature",
            cardPositions:{
                "head":parseInt(headSlot.hasAttribute('card')?headSlot.getAttribute('card'):undefined),
                "heart":parseInt(heartSlot.hasAttribute('card')?heartSlot.getAttribute('card'):undefined),
                "weapon":parseInt(weaponSlot.hasAttribute('card')?weaponSlot.getAttribute('card'):undefined),
                "spirit":parseInt(spiritSlot.hasAttribute('card')?spiritSlot.getAttribute('card'):undefined),
                "power":parseInt(powerSlot.hasAttribute('card')?powerSlot.getAttribute('card'):undefined)
            }
        });
    });
    validateCreatureButton.style = `height:${CARDHEIGHT}px;width:${CARDWIDTH}px; position: absolute; top: 0px; left: ${2*CARDWIDTHWITHBORDER}px`;
    creatureElem.appendChild(validateCreatureButton);

    let cancelCreatureButton = document.createElement('button');
    cancelCreatureButton.setAttribute('id','cancelCreatureButton');
    cancelCreatureButton.innerHTML = 'Annuler';
    cancelCreatureButton.addEventListener('click', ()=>{
        window.UIState = "none";
        creatureElem.remove();
    });
    cancelCreatureButton.style = `height:${CARDHEIGHT}px;width:${CARDWIDTH}px; position: absolute; top: 0px; left: 0px`;
    creatureElem.appendChild(cancelCreatureButton);

    return creatureElem;
}

function makeSlot(left,top){
    //TODO : check visibility and handle better hiding cards
    let slotElem = document.createElement('label');
    slotElem.style = `height: ${CARDHEIGHT}px; width: ${CARDWIDTH}px; border: ${CARDBORDER}px solid black; position: absolute; top: ${top}px; left: ${left}px`;
    slotElem.innerHTML = 'Slot';
    slotElem.addEventListener('click',()=>{
        console.log(`clicked slot ${slotElem.getAttribute('aspect')}`);
        if(window.selectedCard !== undefined){
            const cardElem = document.getElementById(`Card_${window.selectedCard}`);
            slotElem.innerHTML = cardElem.innerHTML;
            slotElem.setAttribute('card',`${window.selectedCard}`);
            cardElem.classList.remove('selected');
            window.selectedCard = undefined;
        }
    });
    return slotElem;
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