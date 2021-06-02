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
                        this.config[m].xhttp.setRequestHeader("Content-Type", "text/plain");
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
            this.config[method].xhttp.setRequestHeader("Content-Type", "text/plain");
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
            this.makeGameList(res);
            document.getElementById("welcome").textContent = `bienvenue ${starName}`;
            document.getElementById("gameListPage").style.display = 'block';
            console.log('afterPageChange')
        })
    }

    static makeGameList(jsonList){
        const actualList = JSON.parse(jsonList);
        let htmlList = '';
        actualList.forEach(game => {
            htmlList += `<label id='${game}'>${game}</label><button id="buttonJoinGame_${game}">Rejoindre ce val</button></br>`
        });
        document.getElementById("GameList").innerHTML = htmlList;
        actualList.forEach(game => {
            document.getElementById(`buttonJoinGame_${game}`).addEventListener('click', ()=>{this.joinGameRequest(game)});
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
            document.getElementById("gameBoard").style.display = 'block';
            console.log('joinedGame!');
            window.GAMENAME = game;
            window.GAMEUPDATEINTERVAL = setInterval(this.requestUpdate.bind(this), 1000);
            window.skipUpdateRequest = false;
        });
    }

    static exitGameRequest(){
        this.makeRequest('POST', window.SERVERURL, JSON.stringify({cmd: 'exitGame', name: window.STARNAME, game:window.GAMENAME}),(res)=>{
            clearInterval(window.GAMEUPDATEINTERVAL);
            window.GAMENAME = undefined;
        });
    }

    static disconnectRequest(){
        this.makeRequest('POST', window.SERVERURL, JSON.stringify({cmd: 'disconnect', name: window.STARNAME}),(res)=>{
            console.log('disconnected!');
            window.STARNAME = undefined;
        });
    }

    static playRequest(move){
        this.makeRequest('POST', window.SERVERURL, JSON.stringify({cmd: 'play', name: window.STARNAME, move}),(res)=>{
            if(res.status !== "OK"){
                console.error(`server-side play error : ${res.error}`)
            }
        });
    }

    static requestUpdate(){
        if(!window.skipUpdateRequest){
            this.makeRequest('POST', window.SERVERURL, JSON.stringify({cmd: 'update', name: window.STARNAME, game: window.GAMENAME}),(res)=>{
                console.log(`got update : ${res}`);
                if (JSON.stringify(window.GAMESTATUS) !== res) {
                    window.GAMESTATUS = JSON.parse(res);
                    if(window.GAMESTATUS.started){
                        window.UPDATEUI = true;
                    }
                }
            });
        }
    }

}

QueryManager.init()