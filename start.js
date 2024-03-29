var gamertag = "player";
var timelimit = -1;
var team = 0;
var teamChanges = 0;
var hostIP = 0;
var hostPort = 0;
var clientPorts = [];
var numPlayers = 1;
var ip = 0;
var lanIP = 0;
var hostStatus = "(unknown)";
var UDPActive = false;
var open = require("open");
const settings = require('electron-settings');
const teams = ['Mustard Killas', 'Blue Man Group', 'Boogerzerkers', 'Team Formerly Known as Purple',
'Colored Pencil Monopolists', 'Cupcake Dynamos', 'Louis Armstrong Memorial Team', 'Ketchup Mongers'];
const teamColors = ['#FBF235', '#5A6EE1', '#6BBE30', '#76428A', '#DF7126', '#D77BBA', '#5FCDE4', '#D95763'];
const maps = [{ name: 'Unjust Deserts',
                filename: 'XENMAP01'},
              {
                name: 'Bridge Under Troubled Water',
                filename: 'XENMAP03'}
              ];
const launcherVersion = 24;
var dgram = require('dgram');
var server = dgram.createSocket({type:'udp4', reuseAddr: true });
const defCargs = ['-deathmatch', '+teamplay', '1', '+set', 'sv_samelevel', '1', '-extratic'];
var cargs = [];

var turn = require('turn-js')
const turnAddr = 'dramatech.net'
const turnPort = 3478
const turnUser = 'xenomia-turn'
const turnPwd = 'rackergamers'
var relayAddress = ''
var relayPort = ''
var realIP = ''
var client = turn(turnAddr, turnPort, turnUser, turnPwd)


// LAN autodiscovery
var polo = require('polo');
var http = require('http');
var zeroconf = polo({multicast: false, monitor: true, heartbeat: 2*60*1000});
const DISCOVERY_PORT = 5030;

(function () {

  const remote = require('electron').remote;
  const storage = require('electron-json-storage');



  function init() {
    document.getElementById("btn-close").addEventListener("click", function (e) {
      if (typeof leaveChat === "function") {
        console.log("Leaving chat and match.")
        leaveChat(function() {
          const window = remote.getCurrentWindow();
          window.close();
        })
      } else {
        const window = remote.getCurrentWindow();
        window.close();
      }
    });
    document.getElementById("btn-maximize").addEventListener("click", function (e) {
      const window = remote.getCurrentWindow();
      if (!window.isMaximized())
        {
          window.maximize();
        }
        else
        {
          window.unmaximize();
        }
    });
    document.getElementById("btn-minimize").addEventListener("click", function (e) {
      const window = remote.getCurrentWindow();
      window.minimize();
    });
    $('#match-settings').css('visibility','hidden');
  };

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
    cargs.push("+team", team, "+set", "name", gamertag);
  };

  const path = require('path');
  const spawn = require('child_process').spawn;

  function initMatch() {

    settings.defaults({
      gamertag: 'player',
      username: '',
      teamcolor: 0
    });

    settings.get('gamertag').then(val => {
        document.getElementById('player-name').textContent = val;
        gamertag = val;
    });

    settings.get('teamcolor').then(val => {
        team = val;
        setPrefTeam("team-" + team, teamColors[team]);
        setTeam("team-" + team, teamColors[team]);
    });

    $.get("https://xenomia.com/news.php", function(data, status){
         //alert("Data: " + data + "\nStatus: " + status);
         if (data)
         {
           $("#latest-news").html(data);
         }
     });

     $.get("https://xenomia.com/version.php", function(data, status){
          //alert("Data: " + data + "\nStatus: " + status);
          if (data)
          {
            //document.getElementById('latest-news').textContent = data;
            var latest = Number(data);
            if (launcherVersion < latest)
            {
              if (confirm("There is a newer version of Xenomia available. Go to xenomia.com now?") )
              {
                open("https://xenomia.com");
              }
            }
          }
      });

    $('#player-name-entry').keypress(function(event){
        var keycode = (event.keyCode ? event.keyCode : event.which);
        if(keycode == '13'){
           saveProfile();
        }
    });
    document.getElementById("btn-passwordsave").addEventListener("click", function (e) {
      changePassword();
    });

    document.getElementById("btn-profilesave").addEventListener("click", function (e) {
      saveProfile();
    });

  };

  document.onreadystatechange = function () {
    if (document.readyState == "complete") {
      init();
      initMatch();
      $(this).delay(10000).queue(function() {
        //server.close();
        $(this).dequeue();

  });
    }
  };

})();

function setTimelimit(limit) {
    timelimit = limit;
    var span = document.getElementById("timelimitDisplay");
    span.textContent = document.getElementById(limit).textContent;
};

function setTeam(newTeam, newColor) {
  splitTeam = newTeam.split("-");
  team = splitTeam[splitTeam.length-1];
  settings.set('teamcolor', team);
  $("#game-team-color").css('background', newColor);
}

function setPrefTeam(newTeam, newColor) {
  splitTeam = newTeam.split("-");
  team = splitTeam[splitTeam.length-1];
  var span = document.getElementById("selectedTeam");
  span.textContent = teams[team];
  settings.set('teamcolor', team);
  $("#pref-team-color").css('background', newColor);
  $("#match-team-color").css('background', newColor);
  if (typeof matchID != 'undefined')
  {
    updateTeamColor(team);
  }
}

function setPlayerCount(players) {
  splitPlayers = players.split("-");
  numPlayers = splitPlayers[splitPlayers.length -1];
  //var span = document.getElementById("playerCountDisplay");
  //span.textContent = document.getElementById(players).textContent;
  document.getElementById("playerCountDisplay-newgame").textContent = numPlayers;
}

function setIP() {
  $.get('http://api.ipify.org', function(response){
    ip = response;
    getHostStatus();
  });

  // Start a Polo service advertising the game with its gamename.
  var poloServer = http.createServer(function(req, res) {
  if (req.url !== '/') {
      res.writeHead(404);
      res.end();
      return;
  }

  res.end('hello-http is available at http://'+zeroconf.get('hello-http').address);
  });

  zeroconf.on('up', function(name, service) { // up fires everytime some service joins
    var host = service.host;
    console.log('[up]', name, service.host+':'+service.port);  // check if this is the host
    if ( host != null && host != "0" )
    {
      console.log("service at address: " + service.host);
      poloServer.close(function (){
        lanIP = host;
      });
    }
  });

  poloServer.listen(0, function() {
      var port = poloServer.address().port; // let's find out which port we binded to
      console.log("poloServer bound to port " + port);
      console.log("about to perform service discovery for game " + gamename);
        zeroconf.put({
            name: 'xenomia',
            port: port
        });
  });
}

// Opens a UDP socket on port 5029 and listens.
// /portscan.php tries to send UDP packets to port 5029 on our client.
// if we see the datagrams, we can host.
function getHostStatus() {
  var PORT = 5029;
  var HOST = '127.0.0.1';


  //var server = dgram.createSocket('udp4');
  server = dgram.createSocket({type:'udp4', reuseAddr: true });

  server.on('listening', function () {
      UDPActive = true;
      server.setBroadcast(true);
      var address = server.address();
      console.log('UDP Server listening on ' + address.address + ":" + address.port);

      var message = new Buffer('testing');
      var max = 0
      function pingMatchmaker() {
        server.send(message, 0, message.length, 8000, 'xenomia.com');
        max++
        if (max < 10) {
          setTimeout(pingMatchmaker, 250)
        }
      }

      pingMatchmaker()

      //Test TURN connection
      client.on('relayed-message', function (bytes, peerAddress) {
        var message = bytes.toString()
        //console.log('received message: ' + bytes.toString('hex') + ' from: ' + peerAddress)
        if (typeof hostIncomingPacket === "function")
        {
          hostIncomingPacket(message)
        }
        if (typeof guestIncomingPacket === "function")
        {
          guestIncomingPacket(message)
        }
        server.send(bytes, 0, bytes.length, 5029, '127.0.0.1');
      })

      client.allocateP().then(function (allocateAddress) {
        srflxAddress = allocateAddress.mappedAddress
        relayAddress = allocateAddress.relayedAddress
        console.log("srflx address: " + srflxAddress.address + ':' + srflxAddress.port)
        console.log("relay address: " + relayAddress.address + ':' + relayAddress.port)
        client.createPermissionP('45.79.8.125').then(function () {
          hostIP = relayAddress.address
          hostPort = relayAddress.port
          function keepalive() {
            client.refresh(10000, function() {
              console.log("keepalive.")
              setTimeout(keepalive, 60000);
            }, function(error) {
              console.log("keepalive error.")
              alert("lost connection to game server! Please close the launcher and login again.")
            })
          }
          keepalive()


        })

      })

  });

  server.on('error', function(error)  {
    console.log("SERVER ERROR: " + error);
    server.close();
  });

  server.on('message', function (message, remote) {
      //console.log("FROM GAME:" + remote.address + ':' + remote.port +' - ' + message.toString('hex') + " length:" + message.length);
      if (realIP == '' && matchState != matchStates.IN_PROGRESS) {
        var components = message.toString().split(':')
        if (components.length == 2)
        {
          realIP = components[0];
          //hostPort = components[1];
          console.log("Real external IP: " + components[0]);
        }
      } else {
          //if (client !== undefined && hostPort != '') {
            //console.log("FROM RELAY:" + remote.address + ':' + remote.port +' - ' + message.toString('hex') + " length:" + message.length);
            $.each(clientPorts, function(address, relay){
              //console.log(relay.address)
              //console.log(relay.port)
            client.sendToChannel(
              message,
              relay.port,
              function () {
                //console.log('sent game data.')
              },
              function (error) {
                console.error(error)
              }
            )
          })
        //}
      }

  });

  server.on('close', function(){
    UDPActive = false;
  });

  $.get("https://xenomia.com/portscan.php?ip=" + ip, function(data, status){
       if (data == "failure")
       {
         hostStatus = "Unable to host. Please forward UDP port 5029.";
       }
   });
   server.bind(5030);
}

function resetServer()
{
  if (UDPActive == false) {
    getHostStatus()
  }
}

function changePassword()
{
  open("http://xenomia.com:5281/register/");
}

function saveProfile()
{
  gamertag = document.getElementById("player-name-entry").value;
  if ( /^\w+$/.test(gamertag) == true)
  {
    document.getElementById('player-name-entry').value = "";
    document.getElementById('player-name').textContent = gamertag;
    settings.set('gamertag', gamertag);
  }
  else
  {
    alert("Please use A-Z, 0-9, and underscores only.");
  }
}
