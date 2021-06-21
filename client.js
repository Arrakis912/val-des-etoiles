import { QueryManager } from "./clientQueryManager.js"

const CARDHEIGHT = 40;
const CARDWIDTH = 40;
const CARDBORDER = 4;
const CARDHEIGHTWITHBORDER = CARDHEIGHT + (2*CARDBORDER);
const CARDWIDTHWITHBORDER = CARDWIDTH + (2*CARDBORDER);
let SOURCEPOSITION = [5*CARDHEIGHTWITHBORDER,0]

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
    if(window.GAMESTATUS.phase === -2 && window.GAMESTATUS.interuptionObject.type === "multiAction" && window.GAMESTATUS.interuptionObject.drawCount>0){
        sendMove({type:"resolveMultiAction", action: "draw", target : {type : "source"}});
        return;
    }
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
    if(window.GAMESTATUS.phase === -2 && window.GAMESTATUS.interuptionObject.type === "multiAction" && window.GAMESTATUS.interuptionObject.drawCount>0){
        sendMove({type:"resolveMultiAction", action: "draw", target : {type : "river"}});
        return;
    }
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
        const isOp = root.parentElement.parentElement.getAttribute('id').startsWith('Op');
        console.log(`clicked on card ${cardId}, ${aspect} in ${isOp?'opposing':'player'} creature ${creatureId}`);
        if(window.UIState === "searchTarget"){
            if(window.selectedCard === cardId){
                selectCard(cardElem, cardId);//Actually unselect, but it is the same function
            } else {
                window.selectedFunction({type : "creature", isOp, creatureId, aspect})
            }
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
                    if(window.GAMESTATUS.interuptionObject.revealCount>0){
                        sendMove({type:"resolveMultiAction", action: "reveal", target : {type : "creature", isOp, creatureId, aspect}});
                    }else if(window.GAMESTATUS.interuptionObject.attack){
                        sendMove({type:"resolveMultiAction", action: "attack", target : {type : "creature", isOp, creatureId, aspect}});
                    }
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
    if(window.selectedCard === cardId){
        //unselect selected card if clicked again
        cardElem.classList.remove('selected');
        window.selectedCard = undefined;
        window.selectedFunction = undefined;
        if(window.UIState === "searchTarget"){
            window.UIState = window.savedUIState;
        }
    } else {// or select clicked card if not already selected
        if(window.selectedCard !== undefined){// if a card was clicked before, unselect it
            document.getElementById(`Card_${window.selectedCard}`).classList.remove('selected');
        }
        cardElem.classList.add('selected');
        window.selectedCard = cardId;
        if(window.UIState !== "searchTarget" && window.UIState !== "createCreature") {
            //change UI state to searchtarget if required
            window.savedUIState = window.UIState;
            window.UIState = "searchTarget";
        }
    }
}

function clickGameButtonSkip(){
    const game = window.GAMESTATUS;
    if (game.phase===1){
        if(game.players[game.activePlayer].hasSpectre){
            window.UIState = "endingTurn";
            console.log(`ending turn... where to draw?`);
            replaceInfoLine("Ending Turn, click river or source to choose where to draw")
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
    let opIndex = (playerIndex + 1)%gameStatus.players.length;
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

function replaceInfoLine(message){
    let line = document.getElementById('GameInfo');
    line.innerHTML = message;
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
        } else if (gameStatus.phase === -2 && window.GAMESTATUS.interuptionObject.type === "multiAction") {
            line.appendChild(makeButton("skipRevealButton", "Skip Reveal", ()=>{
                sendMove({type:"resolveMultiAction", action: "skip"});
            }));
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
            if(gameStatus.interuptionObject === undefined){
                return "ERROR! NO INTERUPTFLOW ELEMENT IN A PHASE -2 GAME STATE !"
            }
            const type = gameStatus.interuptionObject.type;
            if(type === "bury"){
                return "Enterrement : clicker sur la prochaine carte à envoyer à la rivière."
            } else if (type === "victory") {
                return `${(gameStatus.interuptionObject.winner === window.STARNAME)?"VICTOIRE!":("Défaite, "+gameStatus.interuptionObject.winner+" a gagné")}`
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
    source.innerHTML = `${cardsLeft} cards`;
    source.style=`position: absolute; top: ${SOURCEPOSITION[0]}px; left: ${SOURCEPOSITION[1]}px`;
    source.addEventListener('click', clickSource);
    return source;
}

function makeRiver(gameStatus){
    let river = document.createElement('div');
    river.setAttribute('id','River');
    river.style=`position: absolute; top: ${SOURCEPOSITION[0]}px; left: ${SOURCEPOSITION[1] + CARDHEIGHTWITHBORDER}px; display: flex;`;
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
    rayLabel.classList.add('rayCount');
    rayLabel.innerHTML = `Ray : ${gameStatus.players[playerId].ray}`;
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

function makeCreatureVoidFiller(){
    let voidElem = document.createElement('label');
    voidElem.classList.add('creatureVoidFiller');
    return voidElem;
}

function makeCard(card,base_revealed=true){
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
            break;
        default:
            console.log(`unrecognised visibility value ${card.visibility} in card ${card.id}, must be an opponent peaking at card`);
    }
    let cardElem = document.createElement('label');
    cardElem.setAttribute('id',`Card_${card.id}`);
    cardElem.classList.add('card');
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
    creatureElem.style = `display: flex; flex-direction: column${isOp?"-reverse":""};`;
    if(creature.type === undefined){
        creatureElem.classList.add('dying');
    }
    
    let spiritRow = document.createElement('div');
    spiritRow.style = `display: flex; flex-direction: row${isOp?"-reverse":""};`;
    spiritRow.setAttribute('id', `Creature_${creature.id}_spiritRow`);
    let mainRow = document.createElement('div');
    mainRow.style = `display: flex; flex-direction: row${isOp?"-reverse":""};`;
    mainRow.setAttribute('id', `Creature_${creature.id}_mainRow`);
    let powerRow = document.createElement('div');
    powerRow.style = `display: flex; flex-direction: row${isOp?"-reverse":""};`;
    powerRow.setAttribute('id', `Creature_${creature.id}_powerRow`);
    
    if (creature.heart !== undefined) {
        const heartCard = makeCard(creature.heart, false);
        heartCard.setAttribute('aspect',"heart");
        mainRow.appendChild(heartCard);
        if (creature.spirit !== undefined) {
            spiritRow.appendChild(makeCreatureVoidFiller());
        }
        if (creature.power !== undefined) {
            powerRow.appendChild(makeCreatureVoidFiller());
        }
    }
    if (creature.spirit !== undefined) {
        const spiritCard = makeCard(creature.spirit, false);
        spiritCard.setAttribute('aspect',"spirit");
        spiritRow.appendChild(spiritCard);
    }
    if (creature.head !== undefined) {
        const headCard = makeCard(creature.head);
        headCard.setAttribute('aspect',"head");
        mainRow.appendChild(headCard);
    }
    if (creature.power !== undefined) {
        const powerCard = makeCard(creature.power, false);
        powerCard.setAttribute('aspect',"power");
        powerRow.appendChild(powerCard);
    }
    if (creature.weapon !== undefined) {
        const weaponCard = makeCard(creature.weapon, false);
        weaponCard.setAttribute('aspect',"weapon");
        mainRow.appendChild(weaponCard);
        if (creature.spirit !== undefined) {
            spiritRow.appendChild(makeCreatureVoidFiller());
        }
        if (creature.power !== undefined) {
            powerRow.appendChild(makeCreatureVoidFiller());
        }
    }
    creatureElem.appendChild(spiritRow);
    creatureElem.appendChild(mainRow);
    creatureElem.appendChild(powerRow);

    return creatureElem;
}

function makeCreatureSlot(){
    let creatureElem = document.createElement('div');
    creatureElem.setAttribute('id','CreatureCreator');
    creatureElem.style = `height: ${3*(CARDHEIGHTWITHBORDER)}px; width: ${3*(CARDWIDTHWITHBORDER)}px; position: relative;`;
    
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
    
    let validateCreatureButton = makeButton("validateCreatureButton", "OK", ()=>{
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
    })
    validateCreatureButton.style = `height:${CARDHEIGHT}px;width:${CARDWIDTH}px; position: absolute; top: 0px; left: ${2*CARDWIDTHWITHBORDER}px`;
    creatureElem.appendChild(validateCreatureButton);

    let cancelCreatureButton = makeButton("cancelCreatureButton", "KO", ()=>{
        window.UIState = "none";
        creatureElem.remove();
    })
    cancelCreatureButton.style = `height:${CARDHEIGHT}px;width:${CARDWIDTH}px; position: absolute; top: 0px; left: 0px`;
    creatureElem.appendChild(cancelCreatureButton);

    return creatureElem;
}

function makeSlot(left,top){
    let slotElem = document.createElement('label');
    slotElem.classList.add('card');
    slotElem.style = `height: ${CARDHEIGHT}px; width: ${CARDWIDTH}px; position: absolute; top: ${top}px; left: ${left}px`;
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