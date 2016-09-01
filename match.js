// need to initialize API
var apiHost = "http://dramatech.net/api/v2";
const APP_API_KEY = '76c6e95ade3a42438d0eb8b0b2816dcbeb7c3c1ed658ffce9ed0a9093c0dc9eb';

var localGamertag;
var localIP;
var internetIP;
var localTeamcolor;
var ready;
var matchID = -1;
var matchPlayers = [];
var matchPlayerInfo = [];
const matchRemote = require('electron').remote;



// need to connect to API server and register a player.
function registerPlayer(gamertag, teamcolor, ipAddr, lanIPAddr)
{
  var callback = function(response) {
    console.log("REGISTERPLAYER()");
    console.log(response);
    localGamertag = gamertag;
    localIP = lanIPAddr;
    internetIP = ipAddr;
    localTeamcolor = teamcolor;
    ready = false;
    if (response.length > 0 && response[0].PID >= 0)
    {
      // we are already registered
      var callback = function(response)
      {
        //console.log(response);
        console.log(response[0].PID);
      }
      // update with our new information
      var params = {
        "faction" : 0,
        "teamcolor" : teamcolor,
        "IPAddr" : ipAddr,
        "lanIP" : lanIPAddr,
        "ready" : false,
        "host" : false,
        "match" : null,
        "locked" : false,
        "attached" : false
      };
      var filter = '?filter=gamertag%3D' + gamertag;
      updateRecord(params, '/playersonline', filter, callback);
    }
    else
    {
      // need to add our account to the server.
      var params = {
        "faction" : 0,
        "gamertag" : gamertag,
        "IPAddr" : ipAddr,
        "lanIP" : lanIPAddr,
        "teamcolor" : teamcolor
      };
      setRecord(params, '/playersonline', function(response){
        console.log(response);
      });
    }

  };

  checkPlayer(gamertag, callback);
}

function checkPlayer(gamertag, callback)
{
  console.log(gamertag);
  getRecord('filter=gamertag%3D' + gamertag, '/playersonline', callback);
}

function createGame(gamename, lobbysize)
{
  if (gamename.indexOf('\'') >= 0 && str.indexOf('"') >= 0) {
    alert("Game names cannot contain quotes.");
      return;
  }
  var params = {
    "gamename" : gamename,
    "lobbysize" : lobbysize,
    "hostIP" : internetIP
  };

  setRecord(params, '/match', function(response){
    console.log(response["resource"][0].GameID);
    var newGameID = response["resource"][0].GameID;
    if (newGameID != null)
    {
      matchID = newGameID;
      isHost = true;
      var params = {
        "ishost" : true,
        "Match" : newGameID
      };
      var filter = '?filter=gamertag%3D' + localGamertag;
      updateRecord(params, '/playersonline', filter, function(response){
        console.log(response);
        refreshMatch();
        $('#main-tabs a[href="#match"]').tab('show');
        $('#new-game-modal').modal('hide');
      });
    }
    else {
      alert("Failed to create match! Make sure your game name is unique.");
    }
  });
}

function joinOpenGame(gamename)
{
  // retrieve the game and see if there are still slots.
  getRecord('filter=gamename%3D' + gamename, '/match', function(response){
    console.log("JOINING GAME");
    var game = response[0];
    console.log(game);
    var players = game.playersonline_by_Match
    var gameID = game.GameID;
    matchID = gameID;
    var filled = game.length;
    var slots = game.lobbysize;
    if (filled >= slots)
    {
      alert("Unable to join: game is full.");
    }
    else if (gameID > -1)
    {
      params = {
        "ishost" : false,
        "isready" : false,
        "Match" : gameID
      };
      var filter = "?filter=gamertag%3D" + localGamertag;
      updateRecord(params, '/playersonline', filter, function(response){
        refreshMatch();
        $('#main-tabs a[href="#match"]').tab('show');
      });
    }
  });
  // set our match to the games' MatchID.
  // set ready, locked, host to false.
  matchPlayers = [];
}

function leaveGame(callback)
{
  console.log("leaving game");
  var params = {
    "ready" : false,
    "host" : false,
    "match" : null,
    "locked" : false,
    "attached" : false
  };
  var filter = '?filter=gamertag%3D' + localGamertag;
  updateRecord(params, '/playersonline', filter, callback);
}

function toggleReady()
{
  var lockCallback = function(response)
  {
    if (response[0].locked == false)
    {
      var callback = function(response)
      {
        //console.log(response);
      };
      if (ready == false)
      {
        // update with our new information
        var params = {
          "ready" : true,
        };
        var filter = '?filter=gamertag%3D' + localGamertag;
        updateRecord(params, '/playersonline', filter, callback);
      }
      else
      {
        // update with our new information
        var params = {
          "ready" : false,
        };
        var filter = '?filter=gamertag%3D' + localGamertag;
        updateRecord(params, '/playersonline', filter, callback);
      }

    }
  };

  checkLock(lockCallback);
}

function changeTeamcolor(newcolor)
{
  var lockCallback = function(response)
  {
    if (response[0].locked == false)
    {
      var callback = function(response)
      {
        //console.log(response);
      };
      // update with our new information
      var params = {
        "teamcolor" : newcolor,
      };
      var filter = '?filter=gamertag%3D' + localGamertag;
      updateRecord(params, '/playersonline', filter, callback);
    }
  };

  checkLock(lockCallback);

}

function resolveHostIPs(callback)
{
  getRecord('filter=GameID%3D' + matchID, '/match', function(response){
    //console.log(response[0]);
    var ipSet = [];
      var players = response[0].playersonline_by_Match;
      console.log(gamename);
      document.getElementById("game-name-label").textContent = gamename;
      if (players.length > 0)
      {
        $.each(players, function(idx, player){
          if (!player.gamertag == localGamertag)
          {
            if (!(player.IPAddr == internetIP)) //this player is on the same network as us.
            {
              ipSet.push(player.IPAddr);
            }
          }
        });
      }
      callback(ipSet)
    });
}

function launchAsGuest()
{
  getRecord('filter=GameID%3D' + matchID, '/match', function(response){
    var playerCount = response[0].playersonline_by_Match.length;
      console.log("remote game.");
      cargs.length = 0;
      resolveCargs();
      cargs.push('-join ', response[0].hostIP);
      console.log(cargs);
      const xenomia = spawn(path.resolve(__dirname + '/../../../xenomia.exe'), cargs);
      xenomia.stdout.on('data', (data) => {
        console.log('stdout: $data');
      });
    }
}

function launchAsHost()
{
  //check if everyone is ready.
  getRecord('filter=GameID%3D' + matchID, '/match', function(response){
    var players = response[0].playersonline_by_Match;
    $.each(players, function(idx, player){
      if (!player.gamertag == localGamertag && !player.isready)
      {
        return;
      }
    });

    // set the match's "starting" field to true.
    var params = {
      "started" : true
    };
    updateRecord(params, '/match', '?filter=GameID%3D' + matchID, function(response){
      // get everybody's IP address.
      getRecord('filter=GameID%3D' + matchID, '/match', function(response){
      var playerCount = response[0].playersonline_by_Match.length;
      resolveHostIPs(function(ips){
        if (ips.length > 0) //need to punchthrough
        {
          //punchthrough to each IP.

          //when we're 100% on that, launch!

        }
        else if (playerCount > 1) //completely local game. just launch.
        {
          console.log("local game.");
          cargs.length = 0;
          resolveCargs();
          cargs.push('-host', playerCount);


          console.log(cargs);
          const xenomia = spawn(path.resolve(__dirname + '/../../../xenomia.exe'), cargs);
          xenomia.stdout.on('data', (data) => {
            console.log('stdout: $data');
          });
        }
      });
      });
    });
      //after some timeout, give up.
    });

  });

}

function refreshAllGames()
{
  getRecord('', '/match', function(response){
    $("#open-games").empty();
    $.each(response, function(idx, match) {
      console.log(match);
      var name = match.gamename;
      var players = match.playersonline_by_Match;
      if (players.length > 0 && players.length < match.lobbysize)
      {
        $("#open-games").append('<a href="#" class="list-group-item" id="join-' + name + '" onclick="joinOpenGame(\'' + name + '\')">' + name + '</a>');
      }
      else if (players.length <= 0)
      {
        deleteRecord('', '/match', '?filter=GameID%3D' + match.GameID, function(response){
          console.log(response);
        });
      }
    });
    setTimeout(refreshAllGames, 5000);
  });
}

function refreshMatch()
{
  if (matchID != null && matchID >= 0)
  {
    getRecord('filter=GameID%3D' + matchID, '/match', function(response){
      console.log(response[0]);
        var players = response[0].playersonline_by_Match;
        var gamename = response[0].gamename;
        var starting = response[0].starting;
        if (starting == true)
        {
          console.log("LAUNCHING GAME");
          launchAsGuest();
        }

        console.log(gamename);
        document.getElementById("game-name-label").textContent = gamename;
        if (players.length > 0)
        {
          matchPlayerInfo = [];
          $("#match-players").empty();
          $.each(players, function(idx, player){
            if(player.gamertag == localGamertag)
            {
              //It's us; update the top div
              document.getElementById("local-player-name").textContent = player.gamertag;
              $("#ready-checkbox").checked = player.isready;
              if (player.ishost) {
                $('#match-settings').css('visibility','visible');
              }
              else {
                $('#match-settings').css('visibility','hidden');
              }
            }
            else {
              // is this player currently in matchPlayers?
              var idx = $.inArray(player.gamertag, matchPlayers);
              if (idx > -1)
              {
                matchPlayerInfo[idx] = [player.gamertag, player.teamcolor, player.isready];
              }
              else
              {
                matchPlayers.push(player.gamertag);
                var array = [player.gamertag, player.teamcolor, player.isready];
                matchPlayerInfo.push(array);
              }
            }
          });
          console.log("PLAYERS:");
          console.log(matchPlayerInfo);
          //sort the array by teams, starting with the player's own team.
          matchPlayerInfo.sort(function(a, b){
            if (a[1] == localTeamcolor)
            {
              return 1;
            }
            return a[1] - b[1];
          });
          console.log("SORTED:");
          console.log(matchPlayerInfo);

          var lastTeam = team;
          $.each(matchPlayerInfo, function(idx, player){
            var tag = player[0];
            var color = player[1];
            var ready = player[2];
            console.log("PLAYER:");
            console.log(player);
            //display the players grouped by team.
            if (tag != localGamertag)
            {
              console.log(tag);
              var well = makePlayerInfoWell(tag, color, ready);
              // if this player's team is not the same as the last one, put a little versus indicator in there
              if (color != lastTeam)
              {
                $("#match-players").append("<h3 class='text-center'>VS.</h3>");
              }
              lastTeam = color;
              console.log("WELL:")
              console.log(well);
              $("#match-players").append(well);
            }
          });
          setTimeout(refreshMatch, 5000);

        }
    });
  }
}

function makePlayerInfoWell(gamertag, teamcolor, readystatus)
{
  console.log(gamertag);
  var openTag = '<div id="remote-player" class="remotePlayer-well" style="width:100%; height:56px;"> <p class="player-name" style="display:inline-block; margin-right:14px; margin-left:24px;">';
  var colorWellOpen= '</p><div class="color-well" id="match-team-color" style="position:relative; top:6px; margin-left:12px;';
  var colorWellClose = '</div> <p style="display:inline-block; margin-left:18px;">';
  var closeTag = '</p> </div>';
  var readyString = "";
  if(readystatus == true)
  {
    readyString = "Ready"
  }
  var wellMarkup = openTag + gamertag + colorWellOpen + "background-color:" + teamColors[teamcolor] + ";" + colorWellClose + readyString + closeTag;
  return wellMarkup;
}

function checkLock(callback)
{
  getRecord('?fields=locked&filter=gamertag%3D' + localGamertag, '/playersonline', callback);
}

function checkGameStart()
{
  var callback = function(response)
  {
    //console.log(response);
  }
  getRecord('filter=gamertag%3D' + gamertag, '/playersonline', callback);

}

function updateTeamColor(newColor)
{
  var params = {
    "teamcolor" : newColor
  };
  var filter = '?filter=gamertag%3D' + gamertag;
  updateRecord(params, '/playersonline', filter, function(response){

  });
}


function setRecord(params, endpoint, callback)
{
  /*var params = {"faction" : 0,
  "gamertag" : "Leonan",
  "IPAddr" : "192.168.1.72",
  "lanIP" : "192.168.1.72",
  "teamcolor" : 1};
  */

  $.ajax({
    dataType: 'json',
     contentType: 'application/json; charset=utf-8',
     url: apiHost + '/mysql/_table' + endpoint,
     headers: {
                        "X-DreamFactory-API-Key": APP_API_KEY
                      },
     data: JSON.stringify({resource : [params]}),
     method: 'POST',
     success: function (response) {
          // Handle success
          //console.log(response);
          callback(response);
          return true;
     },
     error: function (response) {
          // Handle error
          //console.log(response);
          callback(response);
          return false;
     }
  });

}

function getRecord(params, endpoint, callback)
{
  console.log(params);
  $.ajax({
     dataType: 'json',
     contentType: 'application/json; charset=utf-8',
     url: apiHost + '/mysql/_table' + endpoint,
     data: params,
     cache:false,
     method:'GET',
     headers: {
         "X-DreamFactory-API-Key": APP_API_KEY,
     },
     success:function (response) {
         if(typeof callback !== 'undefined') {
             if (response.hasOwnProperty('resource'))
             {
                 callback(response.resource);
                 //console.log(response);
               }
             else
             {
                 callback(response);
                 //console.log(response);
               }
         }
     },
     error:function (response) {
         callback(response);
         return false;
     }
 });
}

function updateRecord(params, endpoint, filter, callback)
{
  $.ajax({
    dataType: 'json',
    contentType: 'application/json; charset=utf-8',
    url: apiHost + '/mysql/_table' + endpoint + filter,
    data: JSON.stringify({resource : [params]}),
    cache:false,
    method:'PATCH',
    headers: {
        "X-DreamFactory-API-Key": APP_API_KEY,
    },
    success:function (response) {
        if(typeof callback !== 'undefined') {
            if (response.hasOwnProperty('resource'))
                callback(response.resource);
            else
                callback(response);
        }
    },
    error:function (response) {
        callback(response);
        return false;
    }
});
}

function deleteRecord(params, endpoint, filter, callback)
{
  $.ajax({
    dataType: 'json',
    contentType: 'application/json; charset=utf-8',
    url: apiHost + '/mysql/_table' + endpoint + filter,
    data: JSON.stringify({resource : [params]}),
    cache:false,
    method:'DELETE',
    headers: {
        "X-DreamFactory-API-Key": APP_API_KEY,
    },
    success:function (response) {
        if(typeof callback !== 'undefined') {
            if (response.hasOwnProperty('resource'))
                callback(response.resource);
            else
                callback(response);
        }
    },
    error:function (response) {
        callback(response);
        return false;
    }
  });
}



// need to keep track of our current match.
var matchID = 0;
var isHost = false;

function initMatchmaker(){
  matchRemote.getCurrentWindow().onbeforeunload = (e) => {
    console.log("calling leaveGame.");
      leaveGame(function(response){
        e.returnValue = true
      });
  };

  document.getElementById("leave-match-button").addEventListener("click", function (e) {
    leaveGame(function(response){
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
    });
  });

  document.getElementById("match-start-button").addEventListener("click", function (e) {
    launchAsHost();
  });



  document.getElementById("open-game-button").addEventListener("click", function (e) {
    var gameName = document.getElementById("new-game-name").value;
    if (gameName.length > 0 &&  $.trim( gameName ) != '' && gameName.length <= 64)
    {
      createGame(gameName, numPlayers);
    }
    else {
      alert("Game name must not be blank, and must be no longer than 64 characters.");
    }

  });

};
