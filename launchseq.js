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
          var realExternalIP = player.realIP
          var port = player.externalport
          console.log("Found IPAddr: ")
            if (realExternalIP != realIP)
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
    clientPorts = [];
    $.each(localAddr, function(idx, address){
      if (address.address != undefined && address.port != undefined)
      {
        var channel = client.bindChannelP(address.address, address.port)
        .then(function (newChan) {
          console.log("newChan: " + newChan)
          hostPort = newChan
          clientPorts.push({port : newChan,
                            address : address.address,
                            originalPort: address.port})
          // get a TURN relay going
          function send() {
            console.log("CHANNEL: " + newChan)
          client.sendToChannel(
            buf,
            newChan,
            function () {
              console.log('sent message.')
            },
            function (error) {
              console.error(error)
            }
          )

          if (matchState == matchStates.LAUNCH_SEQUENCE)
          {
            setTimeout(send, 200)
          } else {
            console.log("closing channel.")
            //client.closeP()
          }
        }

          send()

        }).catch(function (error){
          //var errorstr = error.split(':')[1]
          console.log("ERROR OPENING CHANNEL: " + error)
          //if (error == "Error: bind error: You cannot use the same peer with different channel number") {
            console.log("channel already open. launching on open channel.")
            // get a TURN relay going
            function send() {
              var sendPort = ''
              $.each(clientPorts, function(idx, relay){
                console.log(relay)
                console.log("ADDRESS: " + address.address)
                if (relay.address == address.address) {
                  sendPort = relay.port
                }
              })
              console.log("CHANNEL: " + sendPort)
            client.sendToChannel(
              buf,
              sendPort,
              function () {
                console.log('sent message.')
              },
              function (error) {
                console.error(error)
              }
            )

            if (matchState == matchStates.LAUNCH_SEQUENCE)
            {
              setTimeout(send, 200)
            } else {
              console.log("closing channel.")
              //client.closeP()
            }
          }

            send()
          //}
        })


        //server.send(message, 0, message.length, 8000, 'xenomia.com');
        /*server.send(buf, 0, buf.length, address.port, address.address, function(err, bytes) {
          if (err){
            throw err
          }
          console.log('UDP message sent to ' + address.address +':'+ address.port)
        });*/
      }
    })
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

      // Start the launch sequence. All clients send to all other clients.
      matchState = matchStates.LAUNCH_SEQUENCE
      launchTransition(true)

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
          launchTransition(false)
          resetServer()
          callback(false)
        }
      }
      setTimeout(failout, 20000)
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
  $('#launcher-lock-panel').css('visibility', 'visible')
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
              var ip = response[0].hostIP
              var realExternal = response[0].realIP
              var port = response[0].hostport
              console.log(internetIP);
              if (realExternal == realIP)
              {
                ip = response[0].hostlanip;
              }
                //var guestCargs = ["-join", ip+":"+port, "+team", team, "+set", "name", gamertag];
                var guestCargs = ["-join", "127.0.0.1:5030", "+team", team, "+set", "name", gamertag];
                console.log(guestCargs);

                function launch() {
                  startGame(guestCargs)
                }

                //server.close(function(){
                  guestIncomingPacket = undefined
                  setTimeout(launch, 101);
                //});
            }
            else
            {
              $('#launcher-lock-panel').css('visibility', 'hidden')
              matchState = matchStates.IN_LOBBY
              resetServer()
              resetMatch()
              alert("failed to connect!")
              launchTransition(false)
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
    $('#launcher-lock-panel').css('visibility', 'visible')
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
                    cargs.push('-netmode', '0');
                    cargs.push('-extratic');
                    cargs.push('-dup', '2');
                    //cargs.push('-debugfile')
                    console.log(cargs);
                    startGame(cargs);
                }
                console.log("about to launch.")
                //server.close(function(){
                  hostIncomingPacket = undefined
                  matchState = matchStates.IN_PROGRESS
                  setTimeout(launch, 101);
                //});
                }
                else {
                  alert("failed to connect!")
                  $('#launcher-lock-panel').css('visibility', 'hidden')
                  launchTransition(false)
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
          $('#launcher-lock-panel').css('visibility', 'hidden')
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
  matchState = matchStates.IN_PROGRESS

  // According to RFC 5766 TURN channels will expire after ten minutes
  // if not refreshed by issuing another channelBind
  function refreshChannels() {
    console.log("REFRESHING CHANNELS")
    $.each(clientPorts, function(address, relay){
    client.bindChannelP(relay.address, relay.originalPort, relay.port).then (function(newChan) {
      console.log("reopened channel to " + newChan)
    })
  })
  if (matchState == matchStates.IN_PROGRESS) {
    setTimeout(refreshChannels, 60000)
  }
  }

  setTimeout(refreshChannels, 60000)

  if (process.platform == "darwin") {
    //macexec = require("child_process").exec
    binaryName = "xenomia"
    //var terminalTab = require('terminal-tab');
    cargs.push("-config", path.resolve(__dirname + '/../game/xenomia.ini'))

    //terminalTab.open(path.resolve(__dirname + '/../xenomia.app/Contents/MacOS/') + "&& ./gloome -host 2" + cargs)
    //const xenomia = spawn("osascript",  ["-e 'tell application \"Terminal\" to do script \"cd" + path.resolve(__dirname + '/../xenomia.app/Contents/MacOS/') + "&& ./gloome -host 2" + cargs + "\"'"])
    //const xenomia = spawn('#!/bin/sh osascript <<END tell application "Terminal" do script .' + path.resolve(__dirname + '/../' + binaryName  + ";$1;exit end tell END"), cargs)
    const xenomia = spawn(path.resolve(__dirname + '/../game/' + binaryName), cargs)
    xenomia.stdout.on('data', (data) => {
      console.log('stdout: ' + data);
    });
    xenomia.on('close', (code) => {
      $('#launcher-lock-panel').css('visibility', 'hidden')
      //resetServer()
      if (matchID != null) {
        leaveGame()
        $('#main-tabs a[href="#lobby"]').tab('show');
      }
      matchState = matchStates.OUT_OF_GAME
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
      $('#launcher-lock-panel').css('visibility', 'hidden')
      //resetServer()
      if (matchID != null && matchID != 0) {
        leaveGame()
        //client.closeP()
        $('#main-tabs a[href="#lobby"]').tab('show');
      }
      matchState = matchStates.OUT_OF_GAME
      console.log(`child process exited with code ${code}`);
    });
  }
}
