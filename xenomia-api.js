function setRecord(params, endpoint)
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
     url: apiHost + endpoint,
     headers: {
                        "X-DreamFactory-API-Key": APP_API_KEY
                      },
     data: JSON.stringify({resource : [params]}),
     method: 'POST',
     success: function (response) {
          // Handle success
          console.log(response);
          return true;
     },
     error: function (response) {
          // Handle error
          console.log(response);
          return false;
     }
  });

}

function getRecord(params, endpoint)
{

}
