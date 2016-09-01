var gamertag = "player";
var timelimit = -1;
var team = 0;
var teamChanges = 0;
var hostIP = 0;
var numPlayers = 1;
var ip = 0;
var lanIP = 0;
var hostStatus = "(unknown)";
var open = require("open");
const settings = require('electron-settings');
const teams = ['Mustard Killas', 'Blue Man Group', 'Boogerzerkers', 'Team Formerly Known as Purple',
'Colored Pencil Monopolists', 'Cupcake Dynamos', 'Louis Armstrong Memorial Team', 'Ketchup Mongers'];
const teamColors = ['#FBF235', '#5A6EE1', '#6BBE30', '#76428A', '#DF7126', '#D77BBA', '#5FCDE4', '#D95763'];
const launcherVersion = 5;
var dgram = require('dgram');
var server = dgram.createSocket({type:'udp4', reuseAddr: true });

(function () {

  const remote = require('electron').remote;
  const storage = require('electron-json-storage');

  const defCargs = ['+map', 'xenmap01', '-deathmatch', '+teamplay', '1', '-netmode', '1', '+set', 'sv_samelevel', '1', '-extratic'];
  var cargs = [];

  function init() {
    document.getElementById("btn-close").addEventListener("click", function (e) {
      const window = remote.getCurrentWindow();
      window.close();
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
    cargs.push("+team", team);
    cargs.push("+set", "name", gamertag);
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

    $.get("http://xenomia.com/news.php", function(data, status){
         //alert("Data: " + data + "\nStatus: " + status);
         if (data)
         {
           $("#latest-news").html(data);
         }
     });

     $.get("http://xenomia.com/version.php", function(data, status){
          //alert("Data: " + data + "\nStatus: " + status);
          if (data)
          {
            //document.getElementById('latest-news').textContent = data;
            var latest = Number(data);
            if (launcherVersion < latest)
            {
              if (confirm("There is a newer version of Xenomia available. Go to xenomia.com now?") )
              {
                open("http://xenomia.com");
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



    /*document.getElementById("btn-startmatch").addEventListener("click", function (e) {
        cargs.length = 0;
        resolveCargs();
        cargs.push('-host', numPlayers);


        console.log(cargs);
        if ( process.platform == "win32")
        {
          const xenomia = spawn(path.resolve(__dirname + '/../../../xenomia.exe'), cargs);
          xenomia.stdout.on('data', (data) => {
            console.log('stdout: $data');
          });
        }
        else if (process.platform == "linux")
        {
          const xenomia = spawn(path.resolve(__dirname + '/../xenomia'), cargs);
          xenomia.stdout.on('data', (data) => {
            console.log('stdout: ' + data);
          });

          xenomia.stdout.on('close', (data) => {
            console.log('stdout: ' + data);
          });
        }
        else
        {
            alert("Xenomia is not yet supported on your system.");
        }

    });
    */

    /*document.getElementById("btn-joinmatch").addEventListener("click", function (e) {
      hostIP = document.getElementById("hostIP").value;
      if (hostIP == 0 || hostIP == "")
      {
        alert("You must enter the host's IP address to join a game.");
      }
      else {
        cargs.length = 0;
        resolveCargs();
        cargs.push("-join", hostIP);
        if ( process.platform == "win32")
        {
          const xenomia = spawn(path.resolve(__dirname + '/../../../xenomia.exe'), cargs);
          xenomia.stdout.on('data', (data) => {
            console.log('stdout: $data');
          });
        }
        else if (process.platform == "linux")
        {
          const xenomia = spawn(path.resolve(__dirname + '/../../../xenomia'), cargs);
          xenomia.stdout.on('data', (data) => {
            console.log('stdout: ' + data);
          });

          xenomia.stdout.on('close', (data) => {
            console.log('stdout: ' + data);
          });
        }
      }
    });
    */

    /*document.getElementById("btn-refreshIP").addEventListener("click", function (e) {
      setIP();
    });*/

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
        server.close();
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
  //var span = document.getElementById("gameSelectedTeam");
  //span.textContent = teams[team];
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
  var span = document.getElementById("playerCountDisplay");
  span.textContent = document.getElementById(players).textContent;
  document.getElementById("playerCountDisplay-newgame").textContent = numPlayers;
}

function setIP() {
  //document.write("My public IP address is: ", json.ip);
  $.get('http://api.ipify.org', function(response){
    //var ipDiv = document.getElementById("client-ip");
    //ipDiv.textContent = response;
    ip = response;
    getHostStatus();
  });

  'use strict';

  var os = require('os');
  var ifaces = os.networkInterfaces();

  Object.keys(ifaces).forEach(function (ifname) {
    var alias = 0;

    ifaces[ifname].forEach(function (iface) {
      if ('IPv4' !== iface.family || iface.internal !== false) {
        // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
        return;
      }

      if (alias >= 1) {
        // this single interface has multiple ipv4 addresses
        console.log(ifname + ':' + alias, iface.address);
        if (lanIP == 0)
        {
          lanIP = iface.address;
          //document.getElementById("lan-ip").textContent = lanIP;
        }
      } else {
        // this interface has only one ipv4 adress
        console.log(ifname, iface.address);
        if (lanIP == 0)
        {
          lanIP = iface.address;
          //document.getElementById("lan-ip").textContent = lanIP;
        }
      }
      ++alias;
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
      var address = server.address();
      console.log('UDP Server listening on ' + address.address + ":" + address.port);
  });

  server.on('error', function(error)  {
    console.log(error);
    server.close();
  });

  server.on('message', function (message, remote) {
      console.log(remote.address + ':' + remote.port +' - ' + message);
      if(message == "Xenomia")
      {
        hostStatus = "Your computer is able to host Xenomia!";
        server.close();
        var status = document.getElementById("host-status");
        status.textContent = hostStatus;
        if(status) {
          status.className = 'center-block alert alert-success';
        }
      }
  });

  $.get("http://xenomia.com/portscan.php?ip=" + ip, function(data, status){
       //alert("Data: " + data + "\nStatus: " + status);
       if (data == "failure")
       {
         hostStatus = "Unable to host. Please forward UDP port 5029.";
         server.close();
         var status = document.getElementById("host-status");
         status.textContent = hostStatus;
         if(status) {
           status.className = 'center-block alert alert-danger';
         }
       }
   });

   server.bind(PORT);
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
