const http = require('http');

const hostname = '0.0.0.0';
const port = 8081;

class Card{
    constructor(color, value, visibility="None", id = undefined){
        this.color = color;
        this.value = value;
        this.id = id;
        this.visibility = visibility;
        this.isHead = (this.value === 'J' || this.value === 'V' || this.value === 'Q' || this.value === 'K')? true : false;
        this.attachedTo = 'Source';
    }
    getRawValue(){
        switch (this.value) {
            case 'J':
                return 1;
            case 'V':
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
        notShuffled.push(new Card(color, 'V'));
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
    constructor(owner, game, cards){
        this.owner = owner;
        this.game = game;
        this.head = cards.head;
        this.heart = cards.heart;
        this.weapon = cards.weapon;
        this.spirit = cards.spirit;
        this['power'] = cards['power'];
        this.type = this.computeType();
        this.resting = false;
        this.damage = {heart:0, power:0};
        this.magicienMarks = 0;
        this.butcherMark = false;
        if(this.head === undefined){
            this.id = -1;
            console.log("error, creating creature with undefined head")
        } else {
            this.id = this.head.id;
        }
        if(this.type === undefined){
            this.id = -1;
            console.log("error, creating creature with undefined type")
        }
    }
    getOwner(){
        return playerList.find((player)=>player.name===this.owner);
    }
    getGame(){
        return gameList.find((game)=>game.name===this.game);
    }
    useAspect(aspect, target){
        if(this.resting){
            return `tried acting with a creature that already did this turn`;
        }
        let initialyHadCard = (this[aspect] !== undefined);
        const owner = this.getOwner();
        if(initialyHadCard){
            this.resting = true;
        } else {
            console.log(`tried using undefined aspect of creature ${this.id}`);
            return `tried using undefined aspect of creature ${this.id}`;
        }
        this.revealCard(aspect);
        if(this[aspect]===undefined){
            console.log(`aspect was ripped by reveal, stopped trying to use it`);
            return 'ok';
        }
        let errorState = 'ok';
        switch (aspect) {
            case "heart":{
                owner.heal(this.computeValue(aspect));
                if(this.owner === "Venus" || this.owner === "Mercure" || this.owner === "Selene"){
                    owner.heal(1);
                }
                break;
            }
            case "weapon":{
                if(target.type === "creature"){
                    let creature = undefined;
                    if(!target.isOp){
                        creature = owner.creatures.find((elem)=> elem.id === target.creatureId);
                    } else {
                        creature = owner.getOpponent().creatures.find((elem)=> elem.id === target.creatureId);
                    }
                    if(creature === undefined){
                        return 'unable to find target creature'
                    }
                    if(this[aspect].value === "V"){
                        creature.butcherMark = true;
                    }
                    errorState = creature.damageColor("heart",this.computeValue(aspect));
                } else if(target.type === "star"){
                    if(!target.isOp){
                        return `cannot use weapon on own star`;
                    }
                    let opponent = owner.getOpponent();
                    if(opponent.hasHeartAtPosition() !== -1){
                        return 'cannot attack opponent directly with weapon, creature with heart on field';
                    }
                    opponent.damage(this.computeValue(aspect));
                }else{
                    return `unable to use weapon on target type ${target.type}`;
                }
                break;
            }
            case "spirit":{
                if(!target.isOp){
                    return `cannot use spirit on own star or creatures`;
                }
                if(target.type === "creature"){
                    let creature = owner.getOpponent().creatures.find((elem)=> elem.id === target.creatureId);
                    if(creature === undefined){
                        return 'unable to find target creature'
                    }
                    if(this.type === "magicien"){
                        creature.magicienMarks += 1;
                    }
                    if(this[aspect].value === "V"){
                        creature.magicienMarks += 1;
                    }
                    errorState = creature.damageColor("power",this.computeValue(aspect));
                } else if(target.type === "star"){
                    let opponent = owner.getOpponent();
                    if(opponent.hasSpectre){
                        return 'cannot attack opponent directly with spirit : spectre on field';
                    }
                    opponent.damage(this.computeValue(aspect));
                }else{
                    return `unable to use spirit on target type ${target.type}`;
                }
                break;
            }
            case "power":{
                const game = this.getGame();
                const owner = this.getOwner();
                let revealCount = 1;
                let drawCount = 1;
                if(this.type === "fou"){
                    drawCount+=1;
                    if(game.ruleSet.includes("Helios")){
                        drawCount+=1;
                    }
                }
                if(this.type === "dame noire" && target.type === "river"){
                    drawCount+=1;
                    if(game.ruleSet.includes("Helios")){
                        drawCount+=1;
                    }
                }
                if(this['power'].value === 'V'){
                    drawCount+=1;
                    revealCount = drawCount;
                }
                if(target.type === "river" && !owner.hasSpectre){
                    return 'impossible to draw at river without a spectre!'
                }
                if(target.type === "source" || target.type === "river"){
                    game.activePlayerDraw(target.type, drawCount);
                    game.interrupt({type:"multiAction", drawCount : 0, revealCount});
                } else if(target.type = "creature"){
                    let creature = undefined;
                    if(!target.isOp){
                        creature = owner.creatures.find((elem)=> elem.id === target.creatureId);
                    } else {
                        creature = owner.getOpponent().creatures.find((elem)=> elem.id === target.creatureId);
                    }
                    if(creature === undefined){
                        return 'unable to find target creature'
                    }
                    errorState = creature.revealCard(target.aspect, this.owner);
                    revealCount-=1;
                    if(revealCount > 0 || owner.hasSpectre){
                        game.interrupt({type:"multiAction", drawCount, revealCount, isDN:(this.type === "dame noire")});
                    } else {
                        game.activePlayerDraw("source", drawCount);
                    }
                } else {
                    return `unrecognised target type ${target.type}`
                }
                break;
            }
            default:
                return `aspect ${aspect} unrecognised`;
        }
        return errorState;
    }

    rest(){
        this.resting = false;
        this.damage = {heart:0, power:0};
        this.magicienMarks = 0;
        this.butcherMark = false;
        this.unRevealAspects();
    }

    revealCard(color, forWho="Active"){
        const card = this[color];
        let errorState = 'ok';
        if(card===undefined){
            return 'tried revealing absent card'
        }
        if(card.visibility === 'Active' || card.visibility === forWho){
            console.log('revealing already revealed card : do nothing');
            return 'ok'
        }
        card.visibility = forWho;
        if(forWho !== this.owner){
            if (card.value === 'V') {
                if (card.color !== color || this.head.color !== color) {//check if not Homme Liges
                    errorState = this.handleInvalidCardReveal(color);//if none, bad card
                }
            }else if(card.value === 'Q'){
                if(this.head.value !== 'K' || this.head.color !== card.color || color !== "heart"){//check lovers
                    errorState = this.handleInvalidCardReveal(color);
                }
                else{
                    errorState = this.ripCard(color);
                    this.type = "spectre royal";
                }
            }else if(card.value === 'K'){
                if(this.head.value !== 'Q' || this.head.color !== card.color || color !== "heart"){// check lovers
                    errorState = this.handleInvalidCardReveal(color);
                }
                else{
                    errorState = this.ripCard(color);
                    this.type = "dame noire";
                }
            }else if(card.color !== color && card.value !== 'J'){
                errorState = this.handleInvalidCardReveal(color);
            }
        }
        return errorState;
    }

    unRevealAspects(){
        ['heart','weapon','power','spirit'].forEach(aspect => {
            if (this[aspect] !== undefined){
                this[aspect].visibility = "None";
            }
        }, this);
    }
    revealAspects(){
        ['heart','weapon','power','spirit'].forEach(aspect => {
            if (this[aspect] !== undefined){
                this[aspect].visibility = "Active";
            }
        }, this);
    }

    handleInvalidCardReveal(color){
        const owner = this.getOwner()
        if (owner.name === "Mercure") {
            owner.damage(5);
        }
        else{
            console.error("What the fuck, that card should not be here, cheater!");
        }
        return this.ripCard(color);
    }
    damageColor(color,value){
        let errorState = 'ok';
        errorState = this.revealCard(color);

        if (this[color] !== undefined && errorState === 'ok'){
            this.damage[color] += value;
            if (this.damage[color] >= this.computeValue(color)){
                errorState = this.ripCard(color);
            }
        }
        return errorState;
    }
    ripCard(color){
        if(this[color] === undefined){
            console.error('cant rip undefined card');
            return 'cant rip undefined card';
        }
        const previouslySpectralOrDamne = (this.isSpectral() || this.type === "damne");
        const owner = this.getOwner();
        if(color === "heart"){
            if (this.type === "enfant") {
                owner.getOpponent().damage(5);
            }
            if (this.head.color === "heart" && this.heart.value === "V" && this.heart.color === "heart"){
                owner.getOpponent().damage(5);
            }
        }
        const game = this.getGame();
        this.buryCard(color);
        this.type = this.computeType();
        if(this.type === "spectre"){
            owner.damage(5);
            owner.hasSpectre = true;
        }
        let activePlayerBeforeBurial = game.activePlayer;
        if(this.type === undefined){
            if(previouslySpectralOrDamne){
                owner.heal(5);
                owner.hasSpectre = (owner.hasSpectreAtPosition() !== -1);//Update static hasSpectre because we just lost one, so we might have none, now
            }
            if(this.butcherMark){
                game.players[game.activePlayer].obtainCard(this.head);
                this.head = undefined;
            }
            if(!this.endOfBurial(color === "power" && this.magicienMarks!=0)){
                this.revealAspects();
                game.setGameStateToKillingCreature(this);
            }
        }
        if(color === "power" && this.magicienMarks!=0){
            if(owner.getOpponent().hasSpectre){
                let drawCount = (game.ruleSet.includes("Helios")?2:1);
                for (let index = 0; index < this.magicienMarks; index++) {
                    game.interrupt({type:"multiAction", drawCount, revealCount :0});
                }
                game.activePlayer = activePlayerBeforeBurial;
            } else {
                let drawCount = this.magicienMarks * (game.ruleSet.includes("Helios")?2:1);
                game.activePlayerDraw("source", drawCount);
            }
        }
        return 'ok';
    }
    buryCard(aspect){
        let game = this.getGame();
        let card = this[aspect];
        if(card.isHead && card.color === "spirit"){
            let mars = game.players.find((elem)=>elem.name === "Mars");
            card.attachedTo = 'Mars';
            if(mars !== undefined){
                mars.obtainCard(card);
            }
        } else {
            card.attachedTo = 'River';
            game.river.push(card);
        }
        this[aspect] = undefined;
    }

    endOfBurial(boolDontAutoTrashLastCard){
        let cardsStillHere = [];
        ['head','heart','weapon','power','spirit'].forEach(aspect => {
            if (this[aspect] !== undefined){
                cardsStillHere.push(aspect);
            }
        }, this);
        if (cardsStillHere.length > 1) {
            return false;
        } else {
            if (cardsStillHere.length == 1) {
                if(boolDontAutoTrashLastCard){
                    return false
                } else {
                    this.buryCard(cardsStillHere[0]);
                }
            }
            let owner = this.getOwner();
            owner.creatures = owner.creatures.filter((elem)=>(elem.id !== this.id), this)
            return true;
        }
    }
    computeValue(color){
        const card = this[color];
        if(card===undefined) return 0;
        let baseValue = card.value;
        if(card.isHead){
            if (baseValue === "J") {
                const colorIsRed = color==="heart" || color==="spirit";
                if (card.color === "sang") {
                    baseValue = colorIsRed?6:1;
                } else if (card.color === "cendre"){
                    baseValue = colorIsRed?1:6;
                } else {
                    console.error(`invalid joker color : ${card.color}`);
                    return 0;
                }
            } else if(baseValue === "V"){
                    baseValue = 5;
            } else {
                return 0;
            }
        }
        if(this.head.value === 'J'){
            baseValue += 1;
        } else if(this.head.color === color){
            switch (this.head.value) {
                case 'V':
                    baseValue += 1;
                    break;
                case 'Q':
                    baseValue += 2;
                    break;
                case 'K':
                    baseValue += 3;
                    break;
                default:
                    console.error(`invalid head value : ${this.head.value}`)
                    break;
            }
        }
        if(this.nedemoneTokens !== undefined && this.nedemoneTokens[color]!== undefined){
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
    isSpectral(){
        return (this.type === "spectre" || this.type === "spectre royal" || this.type === "dame noire");
    }
    computeType(){
        if (this.heart == undefined){
            if(this.weapon == undefined){
                if(this['power'] != undefined){
                    if(this.spirit != undefined){
                        if(this.owner === 'Vulcain' || this.owner === 'Pluton' || this.owner === 'Neptune' || this.owner === 'Uranus' || this.owner === 'Saturne' || this.owner === 'Jupiter' || this.owner === 'Mars' || this.owner === 'Venus' || this.owner === 'Mercure' || this.owner === 'Selene'){
                            return `damne`;
                        } else {
                            return undefined;
                        }
                    } else {
                        if(this.getGame().ruleSet.includes("Helios")){
                            return 'ombre';
                        } else {
                            return undefined;
                        }
                    }
                } else {
                    return undefined;
                }
            } else {
                if(this['power'] != undefined && this.spirit != undefined){
                    return `spectre`;
                } else {
                    return undefined;
                }
            }
        } else {
            if(this.weapon == undefined && this['power'] == undefined && this.spirit == undefined){
                return 'enfant';
            }
            else if (this.weapon != undefined && this['power'] != undefined && this.spirit != undefined) {
                return 'accompli';
            }
            else if (this.weapon != undefined && this['power'] != undefined && this.spirit == undefined) {
                return 'fou';
            }
            else if (this.weapon != undefined && this['power'] == undefined && this.spirit != undefined) {
                return 'chevalier';
            }
            else if (this.weapon == undefined && this['power'] != undefined && this.spirit != undefined) {
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
        this.hasSpectre = false;
    }
    obtainCard(card){
        this.hand.push(card);
        card.visibility = 'Owner';
        card.attachedTo = this.name;
    }
    restAll(){
        this.creatures.forEach(creature=>{
            creature.rest()
        });
    }
    hasSpectreAtPosition(){
        return this.creatures.findIndex((creature)=>{
            return creature.isSpectral();
        })
    }
    hasHeartAtPosition(){
        return this.creatures.findIndex((creature)=>{
            return creature.heart !== undefined;
        })
    }
    makeCreature(pattern){
        let cardIndexes = {};
        let cards = {};
        ['head', 'heart', 'weapon', 'spirit', 'power'].forEach(elem => {
            cardIndexes[elem] = (pattern[elem] === null)?-2:this.hand.findIndex((card)=>card.id === pattern[elem]);
            if (cardIndexes[elem] === -1) {
                console.error(`card ${pattern[elem]} for aspect ${elem} not in hand to create creature`)
                return "error, missing card in hand for creature"
            }
            cards[elem] = this.hand[cardIndexes[elem]]
        }, this);
        let creature = new Creature(this.name, this.game, cards);
        if(creature.id === -1){
            console.error(`Creating invalid creature`);
            return "invalid creature";
        }
        let identicalTypeFlag = false;
        this.creatures.forEach((prevCreature)=>{
            if(prevCreature.type === creature.type){
                identicalTypeFlag = true;
            };
        });
        if(identicalTypeFlag){
            return 'creature of same type as previous creature';
        }
        if(creature.type === "damne"){
            console.error(`Can't directly create : damne`);
            return "Can't directly create : damne";
        }
        this.creatures.push(creature);
        if(creature.type === "spectre"){
            this.damage(5);
            this.hasSpectre = true;
        }
        ['head', 'heart', 'weapon', 'spirit', 'power'].forEach((aspect)=>{
            if(creature[aspect]!==undefined){
                creature[aspect].attachedTo = creature.id;
            }
        })
        creature.unRevealAspects();
        creature.head.visibility = "Active";
        this.removeCardsFromHand(Object.keys(cardIndexes).map((elem)=>cardIndexes[elem]));
        return "ok"
    }

    playArcane(cardId, target){
        let card = this.hand.find((elem) => elem.id === cardId)
        if(card === undefined){
            return `card ${cardId} not found in hand : ${JSON.stringify(this.hand)}`
        }
        let errorState = 'ok';
        switch (card.color) {
            case "heart":{
                this.heal(card.getRawValue());
                break;
            }
            case "weapon":{
                if(target.type === "creature"){
                    let creature = undefined;
                    if(!target.isOp){
                        creature = this.creatures.find((elem)=> elem.id === target.creatureId);
                    } else {
                        creature = this.getOpponent().creatures.find((elem)=> elem.id === target.creatureId);
                    }
                    if(creature === undefined){
                        return 'unable to find target creature'
                    }
                    errorState = creature.damageColor("heart",card.getRawValue());
                } else if(target.type === "star"){
                    if(!target.isOp){
                        return `cannot use weapon on own star`;
                    }
                    let opponent = this.getOpponent();
                    if(opponent.hasHeartAtPosition() !== -1){
                        return 'cannot attack opponent directly with weapon, creature with heart on field';
                    }
                    opponent.damage(card.getRawValue());
                }else{
                    return `unable to use weapon on target type ${target.type}`;
                }
                break;
            }
            case "spirit":{
                if(!target.isOp){
                    return `cannot use spirit on own star or creatures`;
                }
                if(target.type === "creature"){
                    let opponent = this.getOpponent();
                    let creature = opponent.creatures.find((elem)=> elem.id === target.creatureId);
                    if(creature === undefined){
                        return 'unable to find target creature'
                    }
                    if(opponent.hasSpectre && creature.type !== "spectre"){
                        return 'cannot attack opponent creature other than spectre while spectre on field';
                    }
                    errorState = creature.damageColor("power",card.getRawValue());
                } else if(target.type === "star"){
                    let opponent = this.getOpponent();
                    if(opponent.hasSpectre){
                        return 'cannot attack opponent directly with spirit : spectre on field';
                    }
                    opponent.damage(card.getRawValue(card.getRawValue()));
                }else{
                    return `unable to use spirit on target type ${target.type}`;
                }
                break;
            }
            case "power":{
                const game = this.getGame();
                let drawCount = 1;
                let revealCount = 1;
                if (card.value == 'Q') {
                    revealCount = 2;
                } else if (card.value == 'K') {
                    revealCount = 3;
                }
                if(target.type ==="river" && !this.hasSpectre){
                    return 'impossible to draw at river without a spectre!'
                }
                if(target.type === "river" || target.type === "source"){
                    game.activePlayerDraw(target.type, drawCount);
                    game.interrupt({type:"multiAction", drawCount : 0, revealCount});
                } else if (target.type === "creature"){
                    let creature = undefined;
                    if(!target.isOp){
                        creature = this.creatures.find((elem)=> elem.id === target.creatureId);
                    } else {
                        creature = this.getOpponent().creatures.find((elem)=> elem.id === target.creatureId);
                    }
                    if(creature === undefined){
                        return 'unable to find target creature';
                    }
                    errorState = creature.revealCard(target.aspect, this.name);
                    revealCount -= 1;
                    if(this.hasSpectre || revealCount !== 0){
                        game.interrupt({type:"multiAction", drawCount, revealCount});
                    } else {
                        game.activePlayerDraw("source", drawCount);
                    }
                } else {
                        return `unrecognised target type ${target.type}`;
                }
                break;
            }
            case "sang":{
                this.heal(1);
                if(!target.isOp){
                    return `cannot use spirit on own star or creatures`;
                }
                if(target.type === "creature"){
                    let creature = this.getOpponent().creatures.find((elem)=> elem.id === target.creatureId);
                    if(creature === undefined){
                        return 'unable to find target creature'
                    }
                    errorState = creature.damageColor("power",card.getRawValue());
                } else if(target.type === "star"){
                    let opponent = this.getOpponent();
                    if(opponent.hasSpectre){
                        return 'cannot attack opponent directly with spirit, spectre on field';
                    }
                    opponent.damage(card.getRawValue(card.getRawValue()));
                }else{
                    return `unable to use spirit on target type ${target.type}`;
                }
                break;
            }
            case "cendre":{
                const game = this.getGame();
                let drawCount = 1;
                let revealCount = 1;
                if(target.type ==="river" && !this.hasSpectre){
                    return 'impossible to draw at river without a spectre!'
                }
                if(target.type === "river" || target.type === "source"){
                    game.activePlayerDraw(target.type, drawCount);
                    game.interrupt({type:"multiAction", drawCount:0, revealCount, attack:true});
                } else if (target.type === "creature"){
                    let creature = undefined;
                    if(!target.isOp){
                        creature = this.creatures.find((elem)=> elem.id === target.creatureId);
                    } else {
                        creature = this.getOpponent().creatures.find((elem)=> elem.id === target.creatureId);
                    }
                    if(creature === undefined){
                        return 'unable to find target creature';
                    }
                    errorState = creature.revealCard(target.aspect, this.name);
                    game.interrupt({type:"multiAction", drawCount, revealCount:0, attack:true});
                } else {
                        return `unrecognised target type ${target.type}`;
                }
                break;
            }
            default:
                return `card color ${card.color} unrecognised`;
        }
        if(errorState === "ok"){
            let game = this.getGame();
            if(card.isHead && card.color === "spirit"){
                let mars = game.players.find((elem)=>elem.name === "Mars");
                card.attachedTo = 'Mars';
                if(mars !== undefined){
                    mars.obtainCard(card);
                }
            } else {
                card.attachedTo = 'River';
                game.river.push(card);
            }
            this.removeCardsFromHand([this.hand.findIndex(elem=> elem.id === card.id)]);
        }
        return errorState;
    }

    educateCreature(cardId, target){
        let card = this.hand.find((elem) => elem.id === cardId)
        if(card === undefined){
            return `card ${cardId} not found in hand : ${JSON.stringify(this.hand)}`
        }
        let creature = undefined;
        if(target.isOp){
            return "non mirror can't educate opponent. Mirror educating capacities not implemented."
            //TODO
            creature = this.getOpponent().creatures.find((elem)=> elem.id === target.creatureId);
        } else {
            creature = this.creatures.find((elem)=> elem.id === target.creatureId);
        }
        if(creature === undefined){
            return 'unable to find target creature'
        }
        if(target.aspect === "head"){
            return 'cant educate the head except for mirrors. Mirror education capacities not implemented'
            //TODO
        }
        if(card.isHead){

        }
        this.obtainCard(creature[target.aspect]);
        creature[target.aspect] = card;
        this.hand = this.hand.filter((elem)=>(elem.id !== card.id));
        //TODO : validity checks
        return 'ok'
    }

    addToCreature(pattern, target){
        let cardIndexes = {};
        let cards = {};
        ['head', 'heart', 'weapon', 'spirit', 'power'].forEach(elem => {
            cardIndexes[elem] = (pattern[elem] === null)?-2:this.hand.findIndex((card)=>card.id === pattern[elem]);
            if (cardIndexes[elem] === -1) {
                console.error(`card ${pattern[elem]} for aspect ${elem} not in hand to create creature`)
                return "error, missing card in hand for education"
            }
            if(cardIndexes[elem]>=0){
                cards[elem] = this.hand[cardIndexes[elem]]
            }
        }, this);
        let creature = this.creatures.find(elem=>(elem.id === target.creatureId));
        if(creature.id === undefined){
            return "unable to find targetted creature";
        } 
        if(creature.isSpectral() && (pattern.heart !== null)){
            return "Can't add heart to a specter";
        }
        let elemsToAdd = Object.keys(cards);
        let aspectAlreadyInCreatureFlag = false;
        elemsToAdd.forEach(elem=>{
            if(creature[elem] !== undefined){
                aspectAlreadyInCreatureFlag=true;
            }
        })
        if(aspectAlreadyInCreatureFlag){
            return 'trying to add aspect already present in creature'
        }
        elemsToAdd.forEach(elem=>{
            creature[elem] = cards[elem];
        })
        creature.type = creature.computeType();
        if(creature.type === undefined){
            elemsToAdd.forEach(elem=>{
                creature[elem] = undefined;
            })
            return 'invalid education'
        }
        if(creature.isSpectral()){
            this.damage(5);
            this.hasSpectre = true;
        }
        elemsToAdd.forEach((aspect)=>{
            creature[aspect].attachedTo = creature.id;
        })
        creature.unRevealAspects();
        creature.head.visibility = "Active";
        this.removeCardsFromHand(Object.keys(cardIndexes).map((elem)=>cardIndexes[elem]));
        return "ok"
    }

    removeCardsFromHand(indexList){
        let filteredIndexList = indexList.filter((index)=>{
            return index>=0;
        });
        filteredIndexList.sort((a,b)=>b-a);
        filteredIndexList.forEach(biggestIndexToRemove => {
            this.hand.splice(biggestIndexToRemove,1);
        });
    }
    getGame(){
        return gameList.find((gameItem)=>gameItem.name === this.game);
    }
    getOpponent(){
        const game = this.getGame();
        const index = game.players.findIndex((player)=>player.name === this.name);
        const opIndex = (index+1)%(game.players.length)
        return game.players[opIndex];
    }

    damage(hitValue){
        this.ray -= hitValue;
        if (this.ray<=0){
            this.getGame().interrupt({type:"victory", winner:this.getOpponent().name});
        }
    }
    heal(value){
        this.ray += value;
        if(this.ray>=100){
            this.getGame().interrupt({type:"victory", winner:this.name});
        }
    }

}

class GameStatus{
    constructor(name, ruleSet = "default"){
        this.name = name;
        this.ruleSet = ruleSet;
        this.started = false;
        this.players = [];
        this.river = [];
        this.source = [];
        this.activePlayer = -1;
        this.phase = -1;
        this.summary = [];
        this.interuptionObject = undefined;
    }

    setGameStateToKillingCreature(creature){
        this.interrupt({type : "bury", creature});
        this.activePlayer = this.players.findIndex((player)=>player.name === creature.owner);
    }

    getStateVisibleFor(playerName){
        let timeout = this.timeout;
        this.timeout = null;//Remove timeout of game during stringification, as it has a circular reference
        let visibleState = JSON.parse(JSON.stringify(this));
        this.timeout = timeout;
        //TODO : mask Hidden info for player
        return visibleState;
    }

    getGameListItem(){
        let listItem = {"name": this.name, 
            "rule": this.ruleSet,
            "started": this.started
        }
        if (this.started){
            listItem.players = this.players.map((player)=>{return player.name});
        }
        return listItem;
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
        if(this.players.findIndex((elem)=>elem.name===player.name)==-1){
            console.error("trying to remove star "+player+" from game "+this.name+" but it isn't a player of that game...")
            return;
        }
        if(!this.started){
            this.players.splice(this.players.findIndex((elem)=>elem.name===player.name),1);
        }
        else {
            if(this.timeout == undefined){ // wait for reconnection of missing player.
                this.timeout = setTimeout((()=>removeGame(this.name)).bind(this),300000);
            } else { // if more than one player absent, kill game right now.
                clearTimeout(this.timeout);
                removeGame(this.name);
            }
        }
    }

    startGame(){
        this.started = true;
        this.players.forEach(player => {
            player.ray = this.ruleSet.includes("Helios") ? 36 : 25;
            player.hand = [];
            player.creatures = [];
        }, this);
        let bothPlayersHaveHead = false;
        while(!bothPlayersHaveHead){
            this.source = makeSource();
            this.players.forEach(player => {
                player.hand = [];
            });
            this.drawStartingHandsAndDefineActivePlayer();
            bothPlayersHaveHead = this.checkStartingHandsValidity();
            if(!bothPlayersHaveHead){
                console.log("Redoing Sunset as no head in a")
            }
        }
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
                if(this.source.length == 0){
                    this.sunRise();
                    return;
                }
                drawnCard.visibility = 'Active';
                player.hand.push(drawnCard);
                cardGroup.push(drawnCard);
            }
            let cardValues = cardGroup.map((card)=>card.getRawValue());
            let sorted = [...cardValues].sort((a,b)=>b-a);
            foundFirstPlayer = (sorted[0] != sorted[1]);
            if (foundFirstPlayer) {
                this.activePlayer = cardValues.findIndex((value) => value === sorted[0]);
            }
            else{
                cardGroup = [];
            }
        }
    }

    checkStartingHandsValidity(){
        let bothHaveHead = true;
        this.players.forEach((player)=>{
            let playerHasHead = false;
            player.hand.forEach(card => {
                if(card.isHead){
                    playerHasHead = true;
                }
            });
            if(!playerHasHead){
                bothHaveHead = false;
            }
        }, this)
        return bothHaveHead;
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
                const returnMessage = this.players[playerId].playArcane(moveDescription.card, moveDescription.target);
                if(returnMessage !== "ok"){
                    this.phase = 0;
                    return {status: "KO", error : returnMessage}
                }
                break;
            }
            case "educate":{
                if (this.phase != 0) {
                    return {status : "KO", error : `move type : ${moveDescription.type} impossible in phase number ${this.phase}`};
                }
                this.phase = 1;
                const returnMessage = this.players[playerId].educateCreature(moveDescription.card, moveDescription.target);
                if(returnMessage !== "ok"){
                    this.phase = 0;
                    return {status: "KO", error : returnMessage}
                }
                break;
            }
            case "addToCreature":{
                if (this.phase != 0) {
                    return {status : "KO", error : `move type : ${moveDescription.type} impossible in phase number ${this.phase}`};
                }
                this.phase = 1;
                const returnMessage = this.players[playerId].addToCreature(moveDescription.pattern, moveDescription.target);
                if(returnMessage !== "ok"){
                    this.phase = 0;
                    return {status: "KO", error : returnMessage}
                }
                return {status:"KO", error : "not implemented"}
            }
            case "makeCreature":{
                if (this.phase != 0) {
                    return {status : "KO", error : `move type : ${moveDescription.type} impossible in phase number ${this.phase}`};
                }
                this.phase = 1;
                const returnMessage = this.players[playerId].makeCreature(moveDescription.pattern);
                if(returnMessage !== "ok"){
                    this.phase = 0;
                    return {status: "KO", error : returnMessage}
                }
                break;
            }
            case "creatureAction":{
                if (this.phase != 1) {
                    return {status : "KO", error : `move type : ${moveDescription.type} impossible in phase number ${this.phase}`};
                }
                const aspect = moveDescription.aspect;
                const creatureId = moveDescription.creature;
                const target = moveDescription.target;
                const creature = this.players[playerId].creatures.find((item)=>item.id === creatureId);
                if(creature === undefined){
                    return {status: "KO", error : `unable to find creature with id ${creatureId}`}
                }
                const returnMessage = creature.useAspect(aspect, target);
                if (returnMessage !== 'ok') {
                    return {status: "KO", error : returnMessage}
                }
                break;
            }
            case "buryCard":{
                if (this.phase != -2 || this.interuptionObject === undefined || this.interuptionObject.type !=="bury") {
                    return {status : "KO", error : `move type : ${moveDescription.type} impossible in phase number ${this.phase} with interruption : ${this.interuptionObject}`};
                }
                this.interuptionObject.creature.buryCard(moveDescription.aspect);
                if (this.interuptionObject.creature.endOfBurial(false)) {
                    this.unInteruptFlow();
                }
                break;
            }
            case "endPhase":{
                if (this.phase === 0) {
                    this.phase = 1;
                } else if (this.phase === 1){//end Turn
                    //draw card
                    this.activePlayerDraw(moveDescription.drawFrom);
                    // unreveal all revealed cards of all players and rest creatures of active player, then switch active player
                    this.players.forEach(player=>{
                        player.creatures.forEach(creature=>{
                            creature.unRevealAspects()
                        })
                    })
                    this.players[this.activePlayer].restAll();
                    this.activePlayer = (this.activePlayer + 1)%this.players.length;
                    this.phase = 0;
                } else {
                    return {status : "KO", error : `move type : ${moveDescription.type} impossible in phase number ${this.phase}`};
                }
                break;
            }
            case "resolveMultiAction":{
                if (this.phase !== -2) {
                    return {status : "KO", error : `move type : ${moveDescription.type} impossible in phase number ${this.phase}`};
                }
                let actionType = moveDescription.action;
                let target = moveDescription.target;
                switch (actionType) {
                    case "skip":{
                        this.interuptionObject.revealCount = 0;
                        break;
                    }
                    case "draw":{
                        if (this.interuptionObject.drawCount === 0) {
                            return {status : "KO", error : `draw unavailable`};
                        }
                        if (target.type === "river" && !this.players[this.activePlayer].hasSpectre) {
                            return {status : "KO", error : `draw unavailable from river with no spectre`};
                        }
                        if(target.type === "source" || target.type === "river"){
                            let count = this.interuptionObject.drawCount + ((this.interuptionObject.isDN && target.type === "river")?(this.ruleSet.includes("Helios")?2:1):0);
                            this.activePlayerDraw(target.type, count);
                            this.interuptionObject.drawCount = 0;
                        } else {
                            return {status : "KO", error : `draw impossible on target ${target.type}`};
                        }
                        break;
                    }
                    case "reveal":{
                        if (this.interuptionObject.revealCount === 0) {
                            return {status : "KO", error : `reveal unavailable`};
                        }
                        if (target.type !== "creature") {
                            return {status : "KO", error : `cant reveal target of type ${target.type}`};
                        }
                        let owner = target.isOp?this.players[1-this.activePlayer]:this.players[this.activePlayer];
                        let creature = owner.creatures.find(elem=>(elem.id===target.creatureId));
                        let errorState = creature.revealCard(target.aspect, this.players[this.activePlayer].name);
                        if(errorState !== 'ok'){
                            return {status : "KO", error : errorState};
                        }
                        this.interuptionObject.revealCount -=1;
                        break;
                    }
                    case "attack":{//attack in multiaction only with the cendre joker, so its a 1 of weapon
                        if (!this.interuptionObject.attack) {
                            return {status : "KO", error : `attack unavailable`};
                        }
                        if(target.type === "creature"){
                            let owner = target.isOp?this.players[1-this.activePlayer]:this.players[this.activePlayer];
                            let creature = owner.creatures.find(elem=>(elem.id===target.creatureId));
                            let errorState = creature.damageColor("heart", 1);
                            if(errorState !== 'ok'){
                                return {status : "KO", error : errorState};
                            }
                            this.interuptionObject.attack = false;
                        }
                        else if(target.type === "star"){
                            let targetStar = target.isOp?this.players[1-this.activePlayer]:this.players[this.activePlayer];
                            if(targetStar.hasHeartAtPosition()!==-1){
                                return {status : "KO", error : `cant use weapon on ${targetStar.name}, it has a creature with heart`};
                            }
                            targetStar.damage(1);
                            this.interuptionObject.attack = false;
                        } else {
                            return {status : "KO", error : `trying to attack ${target.type}`};
                        }
                        break;
                    }
                    default:
                        return {status : "KO", error : `invalid action : ${actionType}`};
                }
                this.checkMultiActionCompletion();
                break;
            }
            default:
                return {status : "KO", error : `unrecognised move type : ${moveDescription.type}`};
        }
        if(!this.firsTurnDone){
            this.firsTurnDone = true;
            this.players.forEach(player => {
                player.hand.forEach(card => {
                    card.visibility = "Owner";
                })
            });
        }


        return {status: "OK"};
    }

    activePlayerDraw(drawFrom="source", number = 1){
        switch (drawFrom) {
            case "river":{
                let drawCount = Math.min(this.river.length, number)
                for (let index = 0; index < drawCount; index++) {
                    this.players[this.activePlayer].obtainCard(this.river.pop());
                }
                break;
            }
            default:
                console.log(`drawing card from unrecognised ${drawFrom} area, defaulted to source`)
            case "source":{
                for (let index = 0; index < Math.min(this.source.length, number); index++) {
                    if(this.source.length <= 1){
                        this.sunRise();
                        break;
                    } else {
                        this.players[this.activePlayer].obtainCard(this.source.shift());
                    }
                }
                break;
            }
        }
    }

    sunRise(){
        this.interrupt({type:"victory", winner:"Helios"});
    }

    interrupt(interuptionObject){
        interuptionObject.phase = this.phase;
        interuptionObject.activePlayer = this.activePlayer;
        if (this.phase == -2) {
            interuptionObject.previousInterruption = this.interuptionObject;
        } else {
            this.phase = -2;
        }
        this.interuptionObject=interuptionObject;
    }

    unInteruptFlow(){
        const previousInt = this.interuptionObject.previousInterruption;
        this.phase = this.interuptionObject.phase;
        this.activePlayer = this.interuptionObject.activePlayer;
        this.interuptionObject = previousInt;
    }

    checkMultiActionCompletion(){
        let inter = this.interuptionObject;
        if( inter === undefined){
            console.error('should not call this function')
            return true;
        }
        if (inter.type === "multiAction" && inter.drawCount === 0 && inter.revealCount === 0 && !inter.attack) {
            this.unInteruptFlow();
            return true;
        }
        return false;
    }

    log(gameEvent){
        this.summary.push(gameEvent);
    }
}

let playerList = [];
let gameList = [];

const server = http.createServer((req, res) => {
    const { headers, method, url } = req;
    let body = '';
    let bodyParts = [];
    console.log('received!')
    req.on('error', (err) => {
        console.error(err);
    }).on('data', (chunk) => {
        // console.log(`received data : ${chunk}`)
        bodyParts.push(chunk);
    }).on('end', () => {
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Request-Method', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH');
        res.setHeader('Access-Control-Allow-Headers', '*');
        if (req.method === 'OPTIONS') {
            res.statusCode =200;
            res.end(JSON.stringify({}));
            return;
        };
        body = Buffer.concat(bodyParts).toString();
        // At this point, we have the headers, method, url and body, and can now
        // do whatever we need to in order to respond to this request.
        // console.log(`client ${url} connected with method : ${method} and body : ${body}`);
        let inputJSON;
        try {
            inputJSON = JSON.parse(body);
        } catch (error) {
            console.error("Invalid JSON in request")
        }
        if(inputJSON !== undefined){
            [res.statusCode, returnBody] = processQuery(url, method, inputJSON);
            res.end(returnBody);
        }
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
            returnBody = JSON.stringify({"gameList": gameList.map((game)=>{return game.getGameListItem()})});
            break;
        }
        case "getGameList":{
            returnBody = JSON.stringify({"gameList": gameList.map((game)=>{return game.getGameListItem()})});
            break;
        }
        case "disconnect":{
            const starName = body.name;
            removePlayer(starName);
            break;
        }
        case "createGame":{
            const starName = body.name;
            const gameName = body.game;
            const ruleSet = body.ruleSet;
            if(gameList.findIndex((elem)=>elem.name===gameName) === -1){
                game = addGame(gameName, ruleSet);
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
            returnBody = JSON.stringify(gameList.map((game)=>{return game.getGameListItem()}));
            break;
        }
        case "update":{
            const starName = body.name;
            const gameName = body.game;
            returnBody = JSON.stringify({"gameState":getGameVisibleStatus(gameName, starName)});
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
            returnBody = JSON.stringify(game.playMove(starName, body.moveDesc));
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

function addGame(name, ruleSet){
    game = new GameStatus(name, ruleSet);
    gameList.push(game);
    console.log(`creating game : ${name}`)
}

function joinGame(gameName, starName){
    console.log(`star ${starName} joining game : ${gameName}`);
    const player = playerList.find((elem)=>elem.name===starName);
    if(player !== undefined){
        const game = gameList.find((elem)=>elem.name===gameName);
        if (game !== undefined) {
            if(player.game !== undefined){
                exitGame(player.game, starName);
            }
            player.game = gameName;
            game.addPlayer(player);
        }
    }
}

function exitGame(gameName, starName){
    console.log(`star ${starName} exits game : ${gameName}`);
    const player = playerList.find((elem)=>elem.name===starName);
    if(player !== undefined){
        const game = gameList.find((elem)=>elem.name===player.game);
        if (game !== undefined) {
            player.game = undefined;
            game.removePlayer(player);
        }
    }
}

function removeGame(name){
    console.log(`removing game : ${name}`)
    let gameIndex = gameList.findIndex((elem)=>elem.name===name);
    if(gameIndex !== -1){
        let game = gameList[gameIndex];
        gameList.splice(gameIndex,1);
        game.players.forEach(player => {
            if(player.game === name){
                player.game = undefined;
            }
        });
    }
}

function getGameVisibleStatus(gameName, starName){
    console.log(`${starName} requested update status on ${gameName}`);
    const game = gameList.find((elem)=>elem.name === gameName);
    if(game !== undefined){
        return game.getStateVisibleFor(starName);
    } else {
        return {status : "KO", error:"game not found"};
    }
}