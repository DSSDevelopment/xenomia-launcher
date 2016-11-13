// need to initialize API
var apiHost = "http://dramatech.net/api/v2";
const APP_API_KEY = '76c6e95ade3a42438d0eb8b0b2816dcbeb7c3c1ed658ffce9ed0a9093c0dc9eb';

var localGamertag;
var localIP;
var internetIP;
var internetPort;

var matchID = null;
var localTeamcolor;
var ready;
var gamename;
var hosting = false;
var inGame = false;
var mapSelection = 0

var matchPlayers = [];
var matchPlayerInfo = [];

const matchStates = {
  OUT_OF_GAME: 0,
  IN_LOBBY: 1,
  LAUNCH_SEQUENCE: 2,
  LAUNCHING: 3,
  IN_PROGRESS: 4
};

var matchState = matchStates.OUT_OF_GAME

// NAT traversal and application launch
var UdpHolePuncher = require('udp-hole-puncher');
const matchRemote = require('electron').remote;
const path = require('path');
const spawn = require('child_process').spawn;


function refreshAllGames()
{
  getRecord('', '/match', function(response){
    $("#open-games").empty();
    var sortedGames = response.sort(function(a,b){
      var players = a.playersonline_by_Match;
      if(a.started == false && players.length > 0 && players.length  < a.lobbysize)
      {
        return a;
      }
      if (a.started == false)
      {
        return a;
      }
      return b;
    });

    $.each(sortedGames, function(idx, match) {
      //console.log(match);
      var name = match.gamename;
      var players = match.playersonline_by_Match;
      var started = match.starting;
      if (players.length > 0 && players.length < match.lobbysize)
      {
        if (match.starting == false)
        {
          $("#open-games").append('<a href="#" class="list-group-item game-item" id="join-' + name + '" onclick="joinOpenGame(\'' + name + '\')"><span class="open-game-item">' + name + '</span></a>');
        } else {
          $("#open-games").append('<a href="#" class="list-group-item game-item"><span class="closed-game-item"> (IN PROGRESS) ' + name + '</span></a>');
        }
      }
      else if (players.length >= match.lobbysize)
      {
        $("#open-games").append('<a href="#" class="list-group-item game-item"><span class="closed-game-item"> (FULL) ' + name + '</span></a>');
      }
      /*else if (players.length <= 0)
      {
        deleteRecord('', '/match', '?filter=GameID%3D' + match.GameID, function(response){
          //console.log(response);
        });
      }*/
    });
    setTimeout(refreshAllGames, 5000);
  });
}

function launchTransition(show)
{
  if (show == true) {

  } else {

  }
}

function resetMatch()
{
  var filter = '?ids%3D' + matchID + '&filter=GameID%3D' + matchID;
  updateRecord({'starting' : false}, '/match', filter, function(response){
    inGame = false;
  })
}

function refreshMatch()
{
  if (matchID != null && matchID >= 0)
  {
    getRecord('filter=GameID%3D' + matchID, '/match', function(response){
        var players = response[0].playersonline_by_Match;
        gamename = response[0].gamename;
        var starting = response[0].starting;
        var lobbysize = response[0].lobbysize;
        if (starting == true && hosting == false && inGame == false)
        {
          starting = false;
          inGame = true;
          console.log("LAUNCHING GAME: " + gamename);
          launchAsGuest();
          matchState = matchStates.LAUNCH_SEQUENCE
        }
        document.getElementById("game-name-label").textContent = gamename;
        if (players.length > 0)
        {
          matchPlayerInfo = [];
          matchPlayers = [];
          $("#match-players").empty();
          gameReady = true;
          $.each(players, function(idx, player){
            if ((player.ishost == false && player.isready == false) || players.length < lobbysize)
            {
              gameReady = false;
            }
            var gamertag = player.gamertag;
            if(gamertag.toUpperCase() == localGamertag.toUpperCase())
            {
              //It's us; update the top div
              updateLocalPlayerUI(player)
            } else {
              // is this player currently in matchPlayerInfo?
              var idx = $.inArray(player.gamertag, matchPlayers.map(function(pl){return pl.gamertag;}));
              if (idx > -1)
              {
                matchPlayerInfo[idx] = [player.gamertag, player.teamcolor, player.isready];
              }
              else
              {
                matchPlayers.push(player)
                var array = [player.gamertag, player.teamcolor, player.isready]
                if (array != undefined) {
                  matchPlayerInfo.push(array)
                }
              }
            }
          });
          updateRemotePlayerUI(lobbysize)

          if (starting == false && inGame == false)
          {
            if (gameReady == true)
            {
              $('#match-start-button').prop('disabled', false);
              $("#match-start-button").removeClass("btn-warning");
              $("#match-start-button").addClass("btn-success");
              document.getElementById("match-start-button").textContent = "LAUNCH GAME";
            }
            else {
              $('#match-start-button').prop('disabled', true);
              $("#match-start-button").removeClass("btn-success");
              $("#match-start-button").addClass("btn-warning");
              document.getElementById("match-start-button").textContent = "WAITING";
            }
            setTimeout(refreshMatch, 1000);
          } else {
            console.log("cancelling refreshMatch because game is starting.");
          }

        }
    });
  } else {
    document.getElementById("game-name-label").textContent = "Join or Create a game in the Lobby";
  }
}

function updateLocalPlayerUI(player) {
  $("#local-player").css('visibility', 'visible');
  document.getElementById("local-player-name").textContent = player.gamertag;
  $("#ready-checkbox").checked = player.isready;
  if (player.ishost) {
    hosting = true;
    $('#ready-checkbox').css('visibility', 'hidden');
    $('#ready-indicator').css('visibility', 'hidden');
    $('#match-settings').css('visibility','visible');
  }
  else {
    hosting = false;
    $('#match-settings').css('visibility','hidden');
    $('#ready-checkbox').css('visibility', 'visible');
    $('#ready-indicator').css('visibility', 'visible');
  }
}

function updateRemotePlayerUI(lobbysize) {
    console.log("MATCHPLAYERS: " + matchPlayerInfo)
    matchPlayerInfo.sort(function(a, b){
      if (a[1] == localTeamcolor)
      {
        return 1;
      }
      return a[1] - b[1];
    });

    var lastTeam = team;
    $.each(matchPlayerInfo, function(idx, player){
      if (player != undefined) {
        var tag = player[0];
        var color = player[1];
        var ready = player[2];
        //display the players grouped by team.
        if (tag != localGamertag)
        {
          //console.log(tag);
          var well = makePlayerInfoWell(tag, color, ready);
          // if this player's team is not the same as the last one, put a little versus indicator in there
          if (color != lastTeam)
          {
            $("#match-players").append("<h3 class='text-center'>VS.</h3>");
          }
          lastTeam = color;
          $("#match-players").append(well);
        }
      }
    });

    var emptySlots = lobbysize - matchPlayers.length - 1;
    if (emptySlots > 0)
    {
      for (i = 0; i < emptySlots; i++)
      {
        $("#match-players").append("<div class='waiting-well' style='width:100%; height:36px;'><h4 class='text-center'>OPEN</h4></div>");
      }
    }
}

function makePlayerInfoWell(gamertag, teamcolor, readystatus)
{
  var openTag = '<div id="remote-player" class="remotePlayer-well" style="width:100%; height:36px;"> <p class="player-name" style="display:inline-block; margin-right:14px; margin-left:24px;">';
  var colorWellOpen= '</p><div class="color-well" id="match-team-color" style="position:relative; top:4px; margin-left:12px;';
  var colorWellClose = '></div> <div style="display:inline-block; margin-left:18px; color:#99E54F; font-weight:bold;">';
  var closeTag = '</div> </div>';
  var readyString = "";
  if(readystatus == true)
  {
    readyString = "READY"
  }
  var wellMarkup = openTag + gamertag + colorWellOpen + "background-color:" + teamColors[teamcolor] + ';"' + colorWellClose + readyString + closeTag;
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

/*
function updateMatchPlayers(newPlayers)
{
  var params = {
    "lobbysize" : newPlayers
  };
  var filter = '?filter=gamertag%3D' + gamertag;
  updateRecord(params, '/playersonline', filter, function(response){

  });
}
*/

function setMap(mapIndex)
{
  var idx = (mapIndex.split(':'))[1]
  if (idx != undefined && idx < maps.length) {
    mapSelection = (maps[idx]).filename
    document.getElementById("map-display-name").textContent = (maps[idx]).name
  }
}

function resetMatchTab(isHost, shouldShow)
{
  if (shouldShow)
  {
    $('#leave-match-button').css('visibility','visible');
    $("#game-chat-container").css('visibility', 'visible');
    $("#local-player").css('visibility', 'visible');
    $('#launcher-lock-panel').css('visibility', 'hidden')
    if (!isHost) {
      $('#ready-checkbox').css('visibility','visible')
    }
  }
  else {
    $("#match-players").empty();
    $('#ready-checkbox').prop('checked', false);
    $("#local-player").css('visibility', 'hidden');
    $('#match-settings').css('visibility','hidden');
    $('#leave-match-button').css('visibility','hidden');
    $('#ready-checkbox').css('visibility','hidden')
    $('#launcher-lock-panel').css('visibility', 'hidden')
    $("#game-chat-container").css('visibility', 'hidden');
  }
}

// need to keep track of our current match.
var matchID = 0;
var isHost = false;

function initMatchmaker(){
  resetMatchTab(false, false)
  $("#ready-checkbox").change(function() {
    if(this.checked) {
        setReady(true);
    }
    else {
      setReady(false);
    }
  });
  matchRemote.getCurrentWindow().on('close', () => {
    console.log("calling leaveGame.");
      leaveGame(function(response){

      });
  });

  document.getElementById("leave-match-button").addEventListener("click", function (e) {
    leaveGame(function(response){
      if(response != false) {
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
  });

  document.getElementById("match-start-button").addEventListener("click", function (e) {
    launchAsHost();
  });

  document.getElementById("single-player-button").addEventListener("click", function (e) {
    launchSinglePlayer();
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
