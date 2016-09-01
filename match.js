// need to initialize API
var apiHost = "http://dramatech.net/api/v2";
const APP_API_KEY = '76c6e95ade3a42438d0eb8b0b2816dcbeb7c3c1ed658ffce9ed0a9093c0dc9eb';

var localGamertag;
var localIP;
var internetIP;
var localTeamcolor;
var ready;
var matchID;
var matchPlayers = [];


// need to connect to API server and register a player.
function registerPlayer(gamertag, teamcolor, ipAddr, lanIPAddr)
{
  var callback = function(response) {
    //console.log(response);
    localGamertag = gamertag;
    localIP = lanIPAddr;
    internetIP = ipAddr;
    localTeamcolor = teamcolor;
    ready = false;
    if (response.length > 0)
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
  getRecord('filter=gamertag%3D' + gamertag, '/playersonline', callback);
}

function createGame(gamename, lobbysize)
{
  var params = {
    "gamename" : gamename,
    "lobbysize" : lobbysize
  };
  setRecord(params, '/match', function(response){
    if (response[0].GameID != null)
    {
      matchID = response[0].GameID;
      isHost = true;
      var params = {
        "ishost" : true,
        "Match" : response[0].GameID
      };
      var filter = '?filter=gamertag%3D' + localGamertag;
      updateRecord(params, '/playersonline', filter, function(response){
        console.log(response);
      });
      refreshMatch();
      $('#main-tabs a[href="#match"]').tab('show');
    }
    else {
      alert("failed to create match!");
    }
  });
}

function joinOpenGame(gamename)
{
  // retrieve the game and see if there are still slots.

  // set our match to the games' MatchID.
  // set ready, locked, host to false.
  matchPlayers = [];
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

function launchAsHost()
{

}

function refreshAllGames()
{

}

function refreshMatch()
{
  if (matchID != null && matchID >= 0)
  {
    getRecord('filter=GameID%3D' + matchID, '/match', function(response){
        var players = response[0].playersonline_by_Match;
        if (players.length > 0)
        {
          $.each(players, function(idx, player){
            if(player.gamertag == localGamertag)
            {
              //It's us; update the top div
            }
            else {
              // is this player currently in matchPlayers?

              //if so, update them.

              //if not, append them.
            }

          });

          //sort the array by teams, starting with the player's own team.
        }
    });
  }
}

function checkLock(callback)
{
  getRecord('fields=locked&filter=gamertag%3D' + localGamertag, '/playersonline', callback);
}

function checkGameStart()
{
  var callback = function(response)
  {
    //console.log(response);
  }
  getRecord('filter=gamertag%3D' + gamertag, '/playersonline', callback);

}


// function to join game.

// function to refresh open games.

// function to send updated player info.

// function to refresh match.

// function to ready up


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
  //console.log(params);
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



// need to keep track of our current match.
var matchID = 0;
var isHost = false;

function initMatch(){


};
