const http = require('http');

const hostname = '127.0.0.1';
const port = 666;

class Card{
    constructor(color, value, visibility="None", id = undefined){
        this.color = color;
        this.value = value;
        this.id = id;
        this.visibility = visibility;
        this.isHead = (this.value === 'J' || this.value === 'Q' || this.value === 'K')? true : false;
        this.owner = -1;
    }
    getRawValue(){
        switch (this.value) {
            case 'J':
                return 1;
            case 'Q':
                return 2;
            case 'K':
                return 3;
            default:
                return this.value
        }
    }
}

function makeSource(){
    const notShuffled = [];
    ['heart','weapon', 'spirit', 'power'].forEach((color)=>{
        for (let value = 1; value <= 10; value++) {
            notShuffled.push(new Card(color,value));
        }
        notShuffled.push(new Card(color, 'J'));
        notShuffled.push(new Card(color, 'Q'));
        notShuffled.push(new Card(color, 'K'));
    })
    notShuffled.push(new Card('sang', 'J'));
    notShuffled.push(new Card('cendre', 'J'));
    const shuffled = notShuffled.map((a) => ({sort: Math.random(), value: a})).sort((a, b) => a.sort - b.sort).map((a) => a.value);
    let id=0;
    shuffled.forEach(card => {
        card.id = id;
        id +=1;
    });
    return shuffled;
}

class Creature{
    constructor(owner, game, head, heart, weapon, spirit, power){
        this.owner = owner;
        this.game = game;
        this.head = head;
        this.heart = heart;
        this.weapon = weapon;
        this.spirit = spirit;
        this.power = power;
        this.type = this.computeType();
        this.resting = false;
        this.usedAspect = undefined;
        this.damage = {heart:0, power:0};
        if(this.head === undefined){
            this.id = -1
            console.log("error, creating creature with undefined head")
        } else {
            this.id = this.head.id;
        }
    }
    useAspect(aspect){
        if(this[aspect]===undefined){
            console.error(`tried using undefined aspect of creature ${this.id}`);
            return;
        }
        this.resting = true;
    }
    rest(){
        this.resting = false;
        this.damage = {heart:0, power:0};
    }
    revealCard(color){
        const card = this[color];
        card.visibility = 'Active';
        if (card.value === 'J') {
            if(card.color !== "sang" && card.color !== "cendre"){//check Jokers
                if (card.color !== color || this.head.color !== color) {//check Homme Liges
                    this.handleInvalidCardReveal(color);//if none, bad card
                }
            }
        }
        else if(card.value === 'Q'){
            if(this.head.value !== 'K' || this.head.color !== card.color || color !== "heart"){//check lovers
                this.handleInvalidCardReveal(color);
            }
            else{
                this.ripCard(color);
                this.type = "spectre royal";
                this.owner.ray-= 5;
            }
        }
        else if(card.value === 'K'){
            if(this.head.value !== 'Q' || this.head.color !== card.color || color !== "heart"){// check lovers
                this.handleInvalidCardReveal(color);
            }
            else{
                this.ripCard(color);
                this.type = "dame noire";
                this.owner.ray-= 5;
            }
            
        }
        else if(card.color != color){
            this.handleInvalidCardReveal(color);
        }
    }
    unRevealAspects(){
        ['heart','weapon','power','spirit'].forEach(aspect => {
            if (this[aspect] !== undefined){
                this[aspect].visibility = "None";
            }
        }, this);
    }
    handleInvalidCardReveal(color){
        if (this.owner ==="Mercure") {
            this.owner.ray -= 5;
        }
        else{
            console.log("What the fuck, that card should nto be here!")
        }
        this.ripCard(color);
    }
    damageColor(color,value){
        this.revealCard(color);

        if (this[color] !=undefined){
            this.damage[color] += value;
            if (this.damage[color] > this.computeValue(color)){
                this.ripCard(color);
            }
        }
    }
    ripCard(color){
        const previousType = this.type;
        this.buryCard(color);
        this.type = this.computeType();
        if(this.type === undefined){
            if(previousType === "spectre" || previousType === "spectre royal"|| previousType === "dame noire"|| previousType === "damne"){
                this.owner.ray += 5;
            }
            if(!this.endOfBurial()){
                this.game.setGameStateToKillingCreature(this);
            }
        }
    }
    buryCard(aspect){
        this[aspect].owner = 'River';
        this.game.river.push(this[aspect]);
        this[aspect] = undefined;
    }
    endOfBurial(){
        let cardsStillHere = [];
        ['head','heart','weapon','power','spirit'].forEach(aspect => {
            if (this[aspect] === undefined){
                cardsStillHere.push(aspect);
            }
        }, this);
        if (cardsStillHere.length > 1) {
            return false;
        } else {
            if (cardsStillHere.length == 1) {
                this.buryCard(cardsStillHere[0]);
            }
            return true;
        }
    }
    computeValue(color){
        const card = this[color];
        if(card===undefined) return 0;
        let baseValue = card.value;
        if(card.isHead()){
            if (baseValue === "J") {
                const colorIsRed = color==="heart" || color==="spirit";
                if (card.color === "sang") {
                    baseValue = colorIsRed?6:1;
                } else if (card.color === "cendre"){
                    baseValue = colorIsRed?1:6;
                } else if (this.head.color === card.color && color === card.color){
                    baseValue = 7;
                }
            } else {
                return 0;
            }
        }
        if(this.nedemoneTokens !== undefined){
            baseValue+= this.nedemoneTokens[color];
        }
        switch (color) {
            case "heart":
                if(this.type === "enfant"){
                    return baseValue+1;
                }
                break;
            case "weapon":
                if(this.type === "chevalier" || this.type === "spectre royal"){
                    return baseValue+1;
                }
                break;
            case "spirit":
                if(this.type === "magicien" || this.type === "spectre royal"){
                    return baseValue+1;
                }
                break;
            case "power":
                if(this.type === "fou"){
                    return baseValue+1;
                }
                if(this.type === "dame noire"){
                    return baseValue+2;
                }
                if(this.type === "spectre royal"){
                    return baseValue+3;
                }
                break;
            default:
                console.error(`unrecognised color : ${color}`);
                break;
        }
        return baseValue;
    }
    computeType(){
        if (this.heart == undefined){
            if(this.weapon == undefined){
                if(this.power != undefined){
                    if(this.spirit != undefined){
                        return `damne`;
                    } else {
                        return 'ombre';
                    }
                } else {
                    return undefined;
                }
            } else {
                if(this.power != undefined && this.spirit != undefined){
                    return `spectre`;
                } else {
                    return undefined;
                }
            }
        } else {
            if(this.weapon == undefined && this.power == undefined && this.spirit == undefined){
                return 'enfant';
            }
            else if (this.weapon != undefined && this.power != undefined && this.spirit != undefined) {
                return 'accompli';
            }
            else if (this.weapon != undefined && this.power != undefined && this.spirit == undefined) {
                return 'fou';
            }
            else if (this.weapon != undefined && this.power == undefined && this.spirit != undefined) {
                return 'chevalier';
            }
            else if (this.weapon == undefined && this.power != undefined && this.spirit != undefined) {
                return 'magicien';
            } else {
                return undefined;
            }
        }
    }
}

class PlayerStatus{
    constructor(name){
        this.name = name;
        this.game = undefined;
        this.ray = 0;
        this.hand = [];
        this.creatures = [];
    }
    obtainCard(card){
        this.hand.push(card);
        card.visibility = 'Owner';
        card.owner = this.name;
    }
    unRevealAll(){
        this.creatures.forEach((creature)=>{
            creature.unRevealAspects();
        })
    }
}

class GameStatus{
    constructor(name, ruleset = "default"){
        this.name = name;
        this.ruleSet = ruleset;
        this.started = false;
        this.players = [];
        this.river = [];
        this.source = [];
        this.activePlayer = -1;
        this.phase = -1;
        this.summary = [];
        this.interruptFlow = undefined;
    }

    setGameStateToKillingCreature(creature){
        this.interruptFlow = {"activePlayer" : this.activePlayer, "phase" : phase, "type" : "bury", "creature" : creature};
        this.phase = -2;
    }

    getStateVisibleFor(playerName){
        return this;
    }

    addPlayer(player){
        if(!this.started){ // able to join game if game not started...
            this.players.push(player)
            if (this.players.length == 2) {
                this.startGame();
            }
        }
        else{ // or if rejoining a game exited during play, in which case, kill timeout.
            if (this.players.findIndex((elem)=>elem.name === player.name) != -1) {
                clearTimeout(this.timeout);
                this.timeout = undefined;
            }
        }
    }

    removePlayer(player){
        player.game = undefined;
        if(!this.started){
            this.players.splice(this.players.findIndex((elem)=>elem.name===player.name),1);
        }
        else {
            if(this.timeout == undefined){ // wait for reconnection of missing player.
                this.timeout = setTimeout(removeGame(this.name),300000)
            } else { // if more than one player absent, kill game right now.
                clearTimeout(this.timeout);
                removeGame(this.name);
            }
        }
    }

    startGame(){
        this.started = true;
        this.players.forEach(player => {
            player.ray = this.ruleSet === "Helios" ? 36 : 25;
        }, this);
        this.source = makeSource();
        this.drawStartingHandsAndDefineActivePlayer();
        this.phase = 0;
    }

    drawStartingHandsAndDefineActivePlayer(){
        for (let i = 0; i < 9; i++) {
            this.players.forEach((player)=>{
                const drawnCard = this.source.shift();
                player.obtainCard(drawnCard);
            }, this)
        }
        let cardGroup = [];
        let foundFirstPlayer = false;
        while(!foundFirstPlayer){
            for (let playerIndex = 0; playerIndex < this.players.length; playerIndex++) {
                const player = this.players[playerIndex];
                const drawnCard = this.source.shift();
                drawnCard.visibility = 'Active';
                player.hand.push(drawnCard);
                cardGroup.push(drawnCard);
            }
            let cardValues = cardGroup.map((card)=>card.getRawValue());
            let sorted = [...cardValues].sort((a,b)=>a-b);
            foundFirstPlayer = (sorted[0] != sorted[1]);
            if (foundFirstPlayer) {
                this.activePlayer = cardValues.findIndex((value) => value === sorted[0]);
            }
            else{
                cardGroup = [];
            }
        }
    }

    playMove(starName, moveDescription){
        if(undefined === moveDescription){
            return {status : "KO", error:"undefined move"};
        }
        const playerId = this.players.findIndex((elem)=>elem.name === starName);
        if (playerId === -1){
            return {status : "KO", error : "player not in its own game... weird. GLHF debugging!"};
        }
        if (playerId !== this.activePlayer){
            return {status : "KO", error : "player not active"};
        }
        switch (moveDescription.type) {
            case "useCard":{
                if (this.phase != 0) {
                    return {status : "KO", error : `move type : ${moveDescription.type} impossible in phase number ${this.phase}`};
                }
                this.phase = 1;
                break;
            }
            case "makeCreature":{
                if (this.phase != 0) {
                    return {status : "KO", error : `move type : ${moveDescription.type} impossible in phase number ${this.phase}`};
                }
                this.phase = 1;
                break;
            }
            case "CreatureAction":{
                if (this.phase != 1) {
                    return {status : "KO", error : `move type : ${moveDescription.type} impossible in phase number ${this.phase}`};
                }
                const aspect = moveDescription.aspect;
                const creatureId = moveDescription.creature;
                const targetId = moveDescription.creature;
                const creature = this.players[playerId].creatures.find((item)=>item.id === creatureId);
                creature.useAspect(aspect);
                break;
            }
            case "buryCreature":{
                if (this.phase != -2 || this.interruptFlow === undefined || this.interruptFlow.type !=="bury") {
                    return {status : "KO", error : `move type : ${moveDescription.type} impossible in phase number ${this.phase} with interruption : ${this.interruptFlow}`};
                }
                const aspectToBury = moveDescription.card;
                this.interruptFlow.creature.buryCard(aspectToBury);
                if (this.interruptFlow.creature.endOfBurial()) {
                    this.phase = this.interruptFlow.phase;
                    this.activePlayer = this.interruptFlow.activePlayer;
                }
                break;
            }
            case "endPhase":{
                if (this.phase === 0) {
                    this.phase = 1;
                } else if (this.phase === 1){//end Turn
                    //draw card
                    this.activePlayerDrawCard(moveDescription.drawFrom);
                    //set active player to next player and restart turn, and unreveal all revealed cards of both
                    this.players[this.activePlayer].unRevealAll();
                    this.activePlayer += 1;
                    if (this.activePlayer >= this.players.length) {
                        this.activePlayer = 0;
                    }
                    this.players[this.activePlayer].unRevealAll();
                    this.phase = 0;
                } else {
                    return {status : "KO", error : `move type : ${moveDescription.type} impossible in phase number ${this.phase}`};
                }
                break;
            }
            default:
                return {status : "KO", error : `unrecognised move type : ${moveDescription.type}`};
        }


        return {status: "OK"};
    }

    activePlayerDrawCard(drawFrom){
        switch (drawFrom) {
            case "river":
                this.players[this.activePlayer].obtainCard(this.river.pop());
                break;
            default:
                console.log(`drawing card from unrecognised ${drawFrom} area, defaulted to source`)
            case "source":
                this.players[this.activePlayer].obtainCard(this.source.shift());
                break;
        }
    }

    log(gameEvent){
        this.summary.push(gameEvent);
    }
}

let playerList = [];
let gameList = [new GameStatus('defaultGameTest')];

const server = http.createServer((req, res) => {
    const { headers, method, url } = req;
    let body = '';
    let bodyParts = [];
    req.on('error', (err) => {
        console.error(err);
    }).on('data', (chunk) => {
        console.log(`received data : ${chunk}`)
        bodyParts.push(chunk);
    }).on('end', () => {
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Request-Method', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH');
        res.setHeader('Access-Control-Allow-Headers', '*');
        // if (req.method === 'OPTIONS') {
        //     res.statusCode =200;
        //     res.end(JSON.stringify({}));
        //     return;
        // };
        body = Buffer.concat(bodyParts).toString();
        // At this point, we have the headers, method, url and body, and can now
        // do whatever we need to in order to respond to this request.
        console.log(`client ${url} connected with method : ${method} and body : ${body}`);
        [res.statusCode, returnBody] = processQuery(url, method, JSON.parse(body));
        res.end(returnBody);
    });
});

server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}`);
});

function processQuery(url, method, body){
    let statusCode = 200;
    let returnBody = '{"response":"default"}';
    switch (body.cmd) {
        case "connect":{
            const starName = body.name;
            connectPlayer(starName);
            returnBody = JSON.stringify(gameList.map((game)=>game.name));
            break;
        }
        case "disconnect":{
            const starName = body.name;
            removePlayer(starName);
            break;
        }
        case "createGame":{
            const starName = body.name;
            const gameName = body.game || `val de ${starName}`;
            if(gameList.findIndex((elem)=>elem.name===gameName) === -1){
                game = addGame(gameName);
            }
            joinGame(gameName, starName);
            break;
        }
        case "joinGame":{
            const starName = body.name;
            const gameName = body.game;
            joinGame(gameName, starName);
            break;
        }
        case "exitGame":{
            const starName = body.name;
            const gameName = body.game;
            exitGame(gameName, starName);
            returnBody = JSON.stringify(gameList.map((game)=>game.name));
            break;
        }
        case "update":{
            const starName = body.name;
            const gameName = body.game;
            returnBody = JSON.stringify(getGameVisibleStatus(gameName, starName));
            break;
        }
        case "play": {
            const starName = body.name;
            const star = playerList.find((elem)=>elem.name === starName);
            const game = gameList.find((elem)=>elem.name === star.game)
            if(undefined === star){
                returnBody = JSON.stringify({status : "KO", error:"unknown player"});
                break;
            }
            if(undefined === star.game){
                returnBody = JSON.stringify({status : "KO", error:"player not in game"});
                break;
            }
            returnBody = JSON.stringify(game.playMove(starName, body.move));
            break;
        }
        case undefined:
        default:{
            statusCode = 300;
            console.log(`unrecognised command type : ${body.cmd}`);
            break;
        }
    }

    return [statusCode, returnBody];
}

function connectPlayer(starName){
    let star = playerList.find((elem)=>elem.name === starName);
    if (star === undefined){
        addPlayer(starName);
    } else {
        reloadPlayer(starName);
    }
}

function addPlayer(name){
    playerList.push(new PlayerStatus(name));
    console.log(`adding player : ${name}`)
}

function reloadPlayer(name){
    console.log(`reloading player : ${name}`)
}

function removePlayer(name){
    playerList.splice(playerList.findIndex((elem)=>elem.name===name),1);
    console.log(`removing player : ${name}`)
}

function addGame(name){
    game = new GameStatus(name);
    gameList.push(game);
    console.log(`creating game : ${name}`)
}

function joinGame(gameName, starName){
    console.log(`star ${starName} joining game : ${gameName}`);
    const game = gameList.find((elem)=>elem.name===gameName);
    const player = playerList.find((elem)=>elem.name===starName);
    game.addPlayer(player);
    player.game = gameName;
}

function exitGame(gameName, starName){
    console.log(`star ${starName} exits game : ${gameName}`);
    const game = gameList.find((elem)=>elem.name===gameName);
    const player = playerList.find((elem)=>elem.name===starName);
    game.removePlayer(player);
}

function removeGame(name){
    gameList.splice(gameList.findIndex((elem)=>elem.name===name),1);
    gameStatus[game] = undefined;
    console.log(`removing game : ${name}`)
}
function getGameVisibleStatus(gameName, starName){
    console.log(`${starName} requested update status on ${gameName}`);
    return gameList.find((elem)=>elem.name === gameName).getStateVisibleFor(starName);
}