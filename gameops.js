function setReady(r)
{
  var lockCallback = function(response)
  {
    if (response[0].locked == false)
    {
      var callback = function(response)
      {
        //console.log(response);
      };
      if (r == true)
      {
        // update with our new information
        var params = {
          "isready" : true,
        };
        var filter = '?filter=gamertag%3D' + localGamertag;
        updateRecord(params, '/playersonline', filter, callback);
      }
      else
      {
        // update with our new information
        var params = {
          "isready" : false,
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


function createGame(gamename, lobbysize)
{
  if (gamename.indexOf('\'') >= 0 && str.indexOf('"') >= 0) {
    alert("Game names cannot contain quotes.");
      return;
  }

  var params = {
    "gamename" : gamename,
    "lobbysize" : lobbysize,
    "hostIP" : internetIP,
    "hostport" : internetPort,
    "hostlanip" : lanIP
  };

  setRecord(params, '/match', function(response){
    console.log(response);
    var newGameID = response["resource"][0].GameID;
    if (newGameID != null)
    {
      resetServer()
      resetMatchTab(true, true)
      joinGameChat(gamename)
      matchState = matchStates.IN_LOBBY
      matchID = newGameID
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

function joinOpenGame(joinName)
{
  // retrieve the game and see if there are still slots.
  getRecord('filter=gamename%3D' + joinName, '/match', function(response){
    console.log("JOINING GAME");
    var game = response[0];
    console.log(joinName);
    var players = game.playersonline_by_Match
    var gameID = game.GameID;
    var filled = game.length;
    var slots = game.lobbysize;
    var name = game.gamename;
    if (filled >= slots)
    {
      alert("Unable to join: game is full.");
    }
    else if (gameID == matchID)
    {
      alert("Already in this game.");
    }
    else if (gameID > -1)
    {
      // set our match to the games' MatchID.
      // set ready, locked, host to false.
      resetServer()
      resetMatchTab(false, true)
      joinGameChat(name)
      matchState = matchStates.IN_LOBBY
      matchPlayers = [];
      hosting = false;
      params = {
        "ishost" : false,
        "isready" : false,
        "Match" : gameID
      };
      var filter = "?filter=gamertag%3D" + localGamertag;
      matchID = gameID;
      updateRecord(params, '/playersonline', filter, function(response){
        inGame = false;
        starting = false;
        gamename = name;
        refreshMatch();
        $('#main-tabs a[href="#match"]').tab('show');
      });
    }
  });

}


function leaveGame(callback)
{
  if (matchID != null)
  {
    //resetServer()
    leaveGameChat()
    matchState = matchStates.OUT_OF_GAME
    inGame = false
    lastMatch = matchID
    matchID = null
    hosting = false
    gamename = ""
    console.log("leaving game")
    resetMatchTab(false, false)
    document.getElementById("game-name-label").textContent = "Join or Create a game in the Lobby";
    var params = {
      "gamertag" : gamertag,
      "isready" : false,
      "ishost" : false,
      "Match" : null,
      "locked" : false,
      "attached" : false,
      "lastmatch" : lastMatch,
    };
    var filter = '?filter=gamertag%3D' + localGamertag;
    updateRecord(params, '/playersonline', filter, callback);
  }
  else {
    console.log("NOT leaving game: no game in progress.");
    callback(false);
  }
}
