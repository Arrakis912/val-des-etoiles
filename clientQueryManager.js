export class QueryManager{
    static init() {
        this.config = {
            PUT:{
                xhttp: new window.XMLHttpRequest(),
                requestList: [],
            },
            POST:{
                xhttp: new window.XMLHttpRequest(),
                requestList: [],
            },
            GET:{
                xhttp: new window.XMLHttpRequest(),
                requestList: [],
            },
            DELETE:{
                xhttp: new window.XMLHttpRequest(),
                requestList: [],
            },
        }
        window.queryManager = this;
        Object.keys(this.config).forEach(m => {
            this.config[m].xhttp.onreadystatechange = (() => {
                if (this.config[m].xhttp.readyState === this.config[m].xhttp.DONE) {
                    const request = this.config[m].requestList.shift();
                    if (this.config[m].xhttp.readyState === this.config[m].xhttp.DONE) {
                        if (this.config[m].xhttp.status < 200 || this.config[m].xhttp.status >= 400){
                            console.error(this.config[m].xhttp.status, this.config[m].xhttp.responseText, request.destURL, request.method);
                        }
                        else{
                            request.onload(this.config[m].xhttp.responseText);
                        }
                    }
                    if (this.config[m].requestList.length > 0) {
                        const nextRequest = this.config[m].requestList[0];
                        this.config[m].xhttp.open(nextRequest.method, `http://${nextRequest.destURL}`);
                        this.config[m].xhttp.setRequestHeader("Content-Type", "application/json");
                        this.config[m].xhttp.send(nextRequest.body);
                    }
                }
            });    
        })
    }

    static makeRequest(method, destURL, body = '', onload = () => {}) {
        const prev = this.config[method].requestList.slice(1).findIndex(r => r.method === method && r.destURL === destURL)
        if (prev !== -1) this.config[method].requestList.splice(prev + 1, 1);
        const requestNum = this.config[method].requestList.push({method,destURL,body,onload});
        if (requestNum === 1) {
            this.config[method].xhttp.open(method, `http://${destURL}`);
            this.config[method].xhttp.setRequestHeader("Content-Type", "application/json");
            console.log(`sending request with body : ${body}`)
            this.config[method].xhttp.send(body);
        }
    }

    static connectRequest(url, starName){
        this.makeRequest('POST', url, JSON.stringify({cmd: 'connect', name: starName}),(res)=>{
            console.log(`got Game List ${res}`)
            document.getElementById("initPage").style.display = 'none';
            window.STARNAME = starName;
            window.SERVERURL = url;
            window.GAMELISTUPDATEINTERVAL = setInterval((()=>{this.listUpdate(url)}).bind(this), 5000);
            this.makeGameList(res);
            document.getElementById("welcome").textContent = `bienvenue ${starName}`;
            document.getElementById("input_gameName").value = `Val de ${starName}`;
            document.getElementById("gameListPage").style.display = 'block';
            console.log('afterPageChange')
        })
    }

    static listUpdate(url){
        this.makeRequest('POST', url, JSON.stringify({cmd: 'getGameList'}),(res)=>{
            console.log(`got Game List ${res}`)
            this.makeGameList(res);
        })
    }

    static makeGameList(jsonListInObj){
        const gameList = JSON.parse(jsonListInObj)["gameList"];
        let listElem = document.getElementById("GameList");
        let htmlList = '';
        gameList.forEach(game => {
            htmlList += `<label id='${game.name}'>${game.name} (${game.rule}) [${game.started?`occupée (${game.players[0]} vs ${game.players[1]})`:"disponible"}]</label><button id="buttonJoinGame_${game.name}">Rejoindre ce val</button></br>`
        });
        listElem.innerHTML = htmlList;
        gameList.forEach(game => {
            document.getElementById(`buttonJoinGame_${game.name}`).addEventListener('click', ()=>{this.joinGameRequest(game.name)});
        });
    }

    static joinGameRequest(game){
        if(window.STARNAME === undefined){
            console.error(`star undefined, can't join game ${game}`)
            return;
        }
        this.makeRequest('POST', window.SERVERURL, JSON.stringify({cmd: 'joinGame', name: window.STARNAME, game}),(res)=>{
            document.getElementById("gameListPage").style.display = 'none';
            document.getElementById("gameInfo").textContent = `Bienvenu sur le Val, ${window.STARNAME}. Nous attendons votre adversaire.`;
            document.getElementById("gameBoard").style.display = 'flex';
            document.getElementById("gameBoard").style.flexDirection = 'column';
            console.log('joinedGame!');
            window.GAMENAME = game;
            clearInterval(window.GAMELISTUPDATEINTERVAL);
            window.GAMEUPDATEINTERVAL = setInterval(this.requestUpdate.bind(this), 1000);
            window.playerIsActive = false;
        });
    }

    static makeGameRequest(name, ruleSet){
        if(window.STARNAME === undefined){
            console.error(`star undefined, can't make game`)
            return;
        }
        const gameName = name?name:`val de ${window.STARNAME}`;
        this.makeRequest('POST', window.SERVERURL, JSON.stringify({cmd: 'createGame', name: window.STARNAME, game:gameName, ruleSet}),(res)=>{
            document.getElementById("gameListPage").style.display = 'none';
            document.getElementById("gameInfo").textContent = `Bienvenu sur le Val, ${window.STARNAME}. Nous attendons votre adversaire.`;
            document.getElementById("gameBoard").style.display = 'flex';
            document.getElementById("gameBoard").style.flexDirection = 'column';
            console.log('madeGame!');
            window.GAMENAME = gameName;
            window.playerIsActive = false;
            clearInterval(window.GAMELISTUPDATEINTERVAL);
            window.GAMEUPDATEINTERVAL = setInterval(this.requestUpdate.bind(this), 1000);
        });
    }

    static exitGameRequest(){
        this.makeRequest('POST', window.SERVERURL, JSON.stringify({cmd: 'exitGame', name: window.STARNAME, game:window.GAMENAME}),(res)=>{
            clearInterval(window.GAMEUPDATEINTERVAL);
            window.GAMENAME = undefined;
            this.listUpdate(window.SERVERURL);
            window.GAMELISTUPDATEINTERVAL = setInterval((()=>{this.listUpdate(window.SERVERURL)}).bind(this), 5000);
        });
    }

    static getScoresRequest(url){
        this.makeRequest('POST', url, JSON.stringify({cmd: 'getRanking'}),(res)=>{
            let grid = document.getElementById("RankingGrid");
            const body = JSON.parse(res);
            body.ranking.forEach(rankedStar => {
                let rankedStarElem = document.createElement('div');
                rankedStarElem.classList.add('starEntry');
                rankedStarElem.innerHTML = `${this.translateMirrorRanksToNames(rankedStar.rank)} - ${rankedStar.name} - ${rankedStar.score}`;
                grid.appendChild(rankedStarElem);
            });
        });
    }

    static translateMirrorRanksToNames(rank){
        switch (rank) {
        case 1:
            return "Séléné";
        case 2:
            return "Mercure";
        case 3:
            return "Venus";
        case 4:
            return "Mars";
        case 5:
            return "Jupiter";
        case 6:
            return "Saturne";
        case 7:
            return "Uranus";
        case 8:
            return "Neptune";
        }
        return rank;
    }

    static disconnectRequest(){
        this.makeRequest('POST', window.SERVERURL, JSON.stringify({cmd: 'disconnect', name: window.STARNAME}),(res)=>{
            console.log('disconnected!');
            clearInterval(window.GAMELISTUPDATEINTERVAL);
            window.STARNAME = undefined;
        });
    }

    static playRequest(moveDesc){
        this.makeRequest('POST', window.SERVERURL, JSON.stringify({cmd: 'play', name: window.STARNAME, moveDesc}),(res)=>{
            const body = JSON.parse(res);
            if(body.status !== "OK"){
                console.error(`server-side play error : ${body.error}`)
            }
        });
    }

    static requestUpdate(){
        if(!window.playerIsActive){
            this.makeRequest('POST', window.SERVERURL, JSON.stringify({cmd: 'update', name: window.STARNAME, game: window.GAMENAME}),(res)=>{
                // console.log(`got update : ${res}`);
                if (JSON.stringify(window.GAMESTATUS) !== res) {
                    window.GAMESTATUS = JSON.parse(res)["gameState"];
                    if(window.GAMESTATUS.started){
                        window.UPDATEUI = true;
                    }
                }
            });
        }
    }

    static sortHandRequest(){
        this.makeRequest('POST', window.SERVERURL, JSON.stringify({cmd: 'sortHand', name: window.STARNAME, game: window.GAMENAME}),(res)=>{
            // console.log(`got update : ${res}`);
            if (JSON.stringify(window.GAMESTATUS) !== res) {
                window.GAMESTATUS = JSON.parse(res)["gameState"];
                if(window.GAMESTATUS.started){
                    window.UPDATEUI = true;
                }
            }
        });
    }
}

QueryManager.init()