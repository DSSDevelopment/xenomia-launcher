var hostIncomingPacket = undefined
var guestIncomingPacket = undefined

function resolveHostIPs(callback)
{
  getRecord('filter=GameID%3D' + matchID, '/match', function(response){
    var ipSet = [];
      var players = response[0].playersonline_by_Match;
      if (players.length > 0)
      {
        console.log("testing player IPs:");
        console.log(players);
        $.each(players, function(idx, player){
          var playername = player.gamertag
          var playerishost = player.ishost
          var ip = player.IPAddr
          var port = player.externalport
          console.log("Found IPAddr: ")
            if (ip != internetIP)
            {
              console.log("pushing IP.")
              ipSet.push({
                  gamertag: playername,
                  address: ip,
                  port: port,
                  attached: false,
                  isHost: playerishost
              })
            }
        });
      }
      callback(ipSet)
    });
}

function puncherSend(addresses, message) {
  function timeoutPuncher() {
    var localAddr = addresses
    var buf = new Buffer(message)
    $.each(localAddr, function(idx, address){
      if (address.address != undefined && address.port != undefined)
      {
        //server.send(message, 0, message.length, 8000, 'xenomia.com');
        server.send(buf, 0, buf.length, address.port, address.address, function(err, bytes) {
          if (err){
            throw err
          }
          console.log('UDP message sent to ' + address.address +':'+ address.port)
        });
      }
    })
    if (matchState == matchStates.LAUNCH_SEQUENCE)
    {
      setTimeout(timeoutPuncher, 500)
    }
  }
  timeoutPuncher()
}

function holepunchIPs(addresses, callback)
{
  console.log("HOLEPUNCHING THESE PLAYERS:");
  console.log(addresses);
  var readyThreshold = addresses.length;
  var readyCount = 0;
  var PORT = 5029;
  var listeners = [];
  var failure = false;
    console.log("socket:");
    console.log(server);
      //var testMessage = new Buffer('testing')
      //server.send(testMessage, 0, testMessage.length, 8000, 'xenomia.com')

      /* Data structure for launch sequence
        [{
          gamertag: String
          address: String
          port: Int
          attached: Bool
          isHost: Bool
        }]
      */

      // Start the launch sequence. All clients send to all other clients.
      matchState = matchStates.LAUNCH_SEQUENCE
      //var message = new Buffer(gamertag);
      puncherSend(addresses, gamertag)

      var readyPlayers = [];

      function readyPlayer(gamertag) {
        if(readyPlayers.indexOf(gamertag) <= -1) {
          readyPlayers.push(gamertag)
          console.log(gamertag + " IS READY!")
        }
      }

      function allAttached() {
        $.each(addresses, function(idx, player) {
          if (player.attached == false)
          console.log(player.gamertag + " is NOT READY")
            return false;
        })
        return true;
      }

      if (hosting == true)
      {
      // The host listens for incoming packets.
        hostIncomingPacket = function(message) {
          console.log("Incoming packet: " + message)
          readyPlayer(message);
          // Whenever it has heard from everyone, we are go for launch: set attached.
          console.log("readyPlayers: " + readyPlayers.length + " addresses:" + addresses.length + " matchState: " + matchState)
          $.each(addresses, function(idx, addr){
            console.log("address: " + addr)
          })
          if (readyPlayers.length >= addresses.length && matchState == matchStates.LAUNCH_SEQUENCE) {
            matchState = matchStates.LAUNCHING
            var filter = "?filter=gamertag%3D" + localGamertag;
            updateRecord({'attached' : true}, '/playersonline', filter, function(response){
              // set the match's "started" field to true.
              var filter = '?ids%3D' + matchID + '&filter=GameID%3D' + matchID;
              updateRecord({'started' : true}, '/match', filter, function(response){
                // If all clients are not already attached, start a timeout.
                if (allAttached() == false) {
                  function overrideLaunch(){
                    callback(true);
                  }
                  console.log("launching in two seconds.")
                  setTimeout(overrideLaunch, 2000)
                } else {
                  callback(true)
                }
              })
            });
          }
          // If all clients are attached, launch.
          if (allAttached() == true && matchState != matchStates.LAUNCHING)
          {
            matchState = matchStates.LAUNCHING
            callback(true)
          }
        }
      }
      else
      {
        // If the host has marked the game as started, launch.
        function checkHostStatus() {
          if (matchState == matchStates.LAUNCH_SEQUENCE)
          {
            getRecord('filter=GameID%3D' + matchID, '/match', function(response){
              if (response != undefined && response[0].started == true)
              {
                matchState = matchStates.LAUNCHING
                callback(true);
              } else {
                setTimeout(checkHostStatus, 1000)
              }
            });
          }
        }
      checkHostStatus()

      // Each client listens for incoming packets.
        guestIncomingPacket = function(message) {
          console.log("Incoming packet: " + message)
          readyPlayer(message);
          // If we have heard from everyone, set attached.
          if (readyPlayers.length >= addresses.length) {
            var filter = "?filter=gamertag%3D" + localGamertag;
            updateRecord({'attached' : true}, '/playersonline', filter, function(response){})
          }
          // If all clients are attached, launch.
          if (allAttached() == true) {
            matchState = matchStates.LAUNCHING
            callback(true)
          }
        }
      }

      function failout() {
        if (matchState == matchStates.LAUNCH_SEQUENCE)
        {
          alert("Failed to connect!")
          resetServer()
          callback(false)
        }
      }
      setTimeout(failout, 15000)
}

function launchSinglePlayer()
{

  startGame([]);
  /*
  const xenomia = spawn(path.resolve(__dirname + '/../../../xenomia.exe'));
  xenomia.stdout.on('data', (data) => {
    console.log('stdout: $data');
    if (auth == true) {
      server.close();
    }
  });
  xenomia.on('close', (code) => {
    console.log(`child process exited with code ${code}`);
    //getHostStatus();
  });
  */

  if (auth == true) {
    leaveGame(function(response){
      if (response != false) {
        var params = {
          "ishost" : false,
          "isready" : false,
          "Match" : null
        };
        var filter = "?filter=gamertag%3D" + localGamertag;
        updateRecord(params, '/playersonline', filter, function(response){
          refreshMatch();
          $('#main-tabs a[href="#lobby"]').tab('show');
        });
      }
    });
  }
}

function launchAsGuest()
{
  console.log("launching.");

    getRecord('filter=GameID%3D' + matchID, '/match', function(response){
      console.log("got match record.");
      resolveHostIPs(function(ips){
        console.log("FINAL IP SET: ");
        console.log(ips);
        if (ips.length > 0) //Need to holepunch
        {
          holepunchIPs(ips, function(success){
            if (success == true)
            {
              matchState = matchStates.IN_PROGRESS
              console.log("holepunching successful.");
              var ip = response[0].hostIP;
              console.log(internetIP);
              if (ip == internetIP)
              {
                ip = response[0].hostlanip;
              }
                var guestCargs = ["-join", ip, "+team", team, "+set", "name", gamertag];
                console.log(guestCargs);

                function launch() {
                  startGame(guestCargs)
                }

                server.close(function(){
                  guestIncomingPacket = undefined
                  setTimeout(launch, 101);
                });
            }
            else
            {
              matchState = matchStates.IN_LOBBY
              resetServer()
              resetMatch()
              alert("failed to connect!")
            }
          });
        }
        else
        {
          //local game. just join the host.
          console.log("Local host.");
          server.close(function(){
              ip = response[0].hostlanip;
                console.log("local game.");
                var guestCargs = ["-join", ip, "+team", team, "+set", "name", gamertag];
                console.log(guestCargs);

                function launch () {
                  startGame(guestCargs);
              }
              setTimeout(launch, 101);
          });
        }
      });
    });
}

function resolveCargs() {
  cargs = Array.from(defCargs);
  if (timelimit > -1)
  {
    cargs.push("+set", "timelimit", timelimit);
  }
  if ($('#allow-team-switching').is(':checked'))
  {
    cargs.push("+set", "sv_noteamswitch", "0");
  } else {
    cargs.push("+set", "sv_noteamswitch", "1");
  }
  cargs.push("+team", team);
  cargs.push("+set", "name", gamertag);
};

function resolveGuestCargs(ip) {
  cargs = ["-join ", ip, " +team", team, " +set", "name", gamertag];
}

function launchAsHost()
{
  //check if everyone is ready.
  if (inGame == false)
  {
    inGame = true;
    getRecord('filter=GameID%3D' + matchID, '/match', function(response){
    var players = response[0].playersonline_by_Match;
    /*if (players < response[0].lobbysize)
    {
      return;
    }
    */
    $.each(players, function(idx, player){
      if (!player.gamertag == localGamertag && !player.isready)
      {
        return;
      }
    });
    // set the match's "starting" field to true.
    var params = {
      "starting" : true
    };
    var filter = '?ids%3D' + matchID + '&filter=GameID%3D' + matchID;
    updateRecord(params, '/match', filter, function(response){
      // get everybody's IP address.
      getRecord('filter=GameID%3D' + matchID, '/match', function(response){
      matchPlayers = response[0].playersonline_by_Match;
      var playerCount = response[0].playersonline_by_Match.length;
      resolveHostIPs(function(ips){
        console.log("FINAL IP ARRAY: ");
        console.log(ips);
        if (ips.length > 0) //need to punchthrough
        {
          console.log("Punching through to IP addresses:");
          console.log(ips);
          //punchthrough to each IP.
            holepunchIPs(ips, function(success){
              if (success)
              {
                var filter = "?filter=gamertag%3D" + localGamertag;
                updateRecord(params, '/playersonline', filter, function(response){
                  refreshMatch();
                  $('#main-tabs a[href="#lobby"]').tab('show');
                });

                function launch()
                {
                    console.log("internet game.");
                    cargs.length = 0;
                    resolveCargs();
                    if (mapSelection != 0 && $.trim(mapSelection) != '') {
                      cargs.push("+map", mapSelection);
                    } else {
                      cargs.push("+map", "XENMAP01");
                    }
                    cargs.push('-host', playerCount);
                    cargs.push('-netmode', '1');
                    cargs.push('-extratic');
                    cargs.push('-dup', '2');
                    console.log(cargs);
                    startGame(cargs);
                }
                console.log("about to launch.")
                server.close(function(){
                  hostIncomingPacket = undefined
                  matchState = matchStates.IN_PROGRESS
                  setTimeout(launch, 101);
                });
                }
                else {
                  alert("failed to connect!");
                  resetServer()
                  matchState = matchStates.IN_LOBBY
                  resetMatch()
                  inGame = false;
                  }
              });
        }
        else if (playerCount > 1) //completely local game. start service discovery.
        {
          server.close(function(){
            console.log("local game.");
            cargs.length = 0;
            resolveCargs();
            if (mapSelection != 0 && $.trim(mapSelection) != '') {
              cargs.push("+map", mapSelection);
            } else {
              cargs.push("+map", "XENMAP01");
            }
            cargs.push('-host', playerCount);
            cargs.push('-netmode', '0');
            console.log(cargs);
            function launch() {
              startGame(cargs)
            }
            setTimeout(launch, 200)

          });
        }
        else if (playerCount == 1) //single-player game.
        {
          server.close();
          leaveGame(function(response){
            if (response != false) {
            params = {
              "ishost" : false,
              "isready" : false,
              "Match" : null
            };
            var filter = "?filter=gamertag%3D" + localGamertag;
            updateRecord(params, '/playersonline', filter, function(response){
              refreshMatch();
              $('#main-tabs a[href="#lobby"]').tab('show');
            });
          }

          });
          console.log("single-player game.");
          cargs.length = 0;
          resolveCargs();
          if (mapSelection != 0 && $.trim(mapSelection) != '') {
            cargs.push("+map", mapSelection)
          } else {
            cargs.push("+map", "XENMAP01")
          }
          cargs.push('-host', 1)
          console.log(cargs)
          startGame(cargs)
        }
      });
      });
    });
      //after some timeout, give up.
    });
  }
}

function startGame(cargs) {

  if (process.platform == "darwin") {
    binaryName = "xenomia"
    const xenomia = exec(path.resolve(__dirname + '/../../../' + binaryName + " " + cargs), {async:true})
    xenomia.stdout.on('data', (data) => {
      console.log('stdout: $data');
    });
    xenomia.on('close', (code) => {
      //resetServer()
      if (matchID != null) {
        leaveGame()
        $('#main-tabs a[href="#lobby"]').tab('show');
      }
      console.log(`child process exited with code ${code}`);
    });
  }
  if (process.platform == "win32") {
    var binaryName = "xenomia.exe"
    const xenomia = spawn(path.resolve(__dirname + '/../../../' + binaryName), cargs)
    xenomia.stdout.on('data', (data) => {
      console.log('stdout: $data');
    });
    xenomia.on('close', (code) => {
      //resetServer()
      if (matchID != null && matchID != 0) {
        leaveGame()
        $('#main-tabs a[href="#lobby"]').tab('show');
      }
      matchState = matchStates.OUT_OF_GAME
      console.log(`child process exited with code ${code}`);
    });
  }
}
