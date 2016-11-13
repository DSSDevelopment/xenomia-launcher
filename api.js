var auth = false

// need to connect to API server and register a player.
function registerPlayer(gamertag, teamcolor, ipAddr, lanIPAddr, remotePort, realIPAddr)
{
  var callback = function(response) {
    console.log("REGISTERPLAYER()");
    console.log(response);
    localGamertag = gamertag;
    localIP = lanIPAddr;
    internetIP = ipAddr;
    internetPort = remotePort;
    realIP = realIPAddr;
    localTeamcolor = teamcolor;
    ready = false;
    if (response.length > 0 && response[0].PID >= 0)
    {
      // we are already registered
      var callback = function(response)
      {
        //console.log(response);
        auth = true
        console.log(response[0].PID);
      }
      // update with our new information
      var params = {
        "faction" : 0,
        "teamcolor" : teamcolor,
        "IPAddr" : ipAddr,
        "lanIP" : lanIPAddr,
        "externalport" : remotePort,
        "isready" : false,
        "ishost" : false,
        "Match" : null,
        "locked" : false,
        "attached" : false,
        "realIP" : realIP
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
        "externalport" : remotePort,
        "lanIP" : lanIPAddr,
        "teamcolor" : teamcolor,
        "realIP" : realIP
      };
      setRecord(params, '/playersonline', function(response){
        auth = true
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
          callback(response);
          return true;
     },
     error: function (response) {
          callback(response);
          return false;
     }
  });

}

function getRecord(params, endpoint, callback)
{
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
               }
             else
             {
                 callback(response);
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
