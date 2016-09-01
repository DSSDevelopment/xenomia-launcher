var connection;
var xmpp = require('node-xmpp-client');
const remote = require('electron').remote;
var room = 'lobby@conference.xenomia.com';
var onlinePlayers = [];
var login = "none";
var jid = "none";
var password = "none";
var knownAdmins = ['Leonan', 'captainventris', 'Rosirine', 'CaptainVentris'];
var audio = new Audio(__dirname + '/sounds/' + 'chat.wav');
var chatloaded = false;
var lasttimestamp = Date().toUTCString;
var lastdate = Date();
var match = require('./match.js');

function initChat() {
  remote.getCurrentWindow().on('close', () => {
  // window was closed...
    leaveChat();
  })



  $('#chat-box').keypress(function(event){
      var keycode = (event.keyCode ? event.keyCode : event.which);
      if(keycode == '13'){
         sendMessage();
      }
  });

  $('#lobby-password').keypress(function(event){
      var keycode = (event.keyCode ? event.keyCode : event.which);
      if(keycode == '13'){
        login = document.getElementById("lobby-username").value;
        password = document.getElementById("lobby-password").value;
        chatLogin();
      }
  });

  document.getElementById("loginbutton").addEventListener("click", function (e) {
    login = document.getElementById("lobby-username").value;
    password = document.getElementById("lobby-password").value;
    chatLogin();
  });

  document.getElementById("lobby-username").focus();
};

function chatLogin() {
  document.getElementById('login-status').textContent = "Logging in...";
  jid = login.toLowerCase() + '@xenomia.com';
  console.log("LOGIN: " + jid + " PASSWORD: " + password);

  connection = new xmpp({
    jid: jid,
    password: password
  });

  connection.on('online', function(data) {
    console.log("CONNECTED: " + data);
        gamertag = login;
        document.getElementById('player-name').textContent = gamertag;
        document.getElementById('login-status').textContent = "Logged in successfully.";
        $("#login-panel").slideUp(400);
        $("#latest-news").attr("class", "latest-news-expanded");
        setTimeout(chatReady, 3000);
        registerPlayer(gamertag, team, ip, lanIP);

        connection.send(new xmpp.Stanza('presence', { to: room +'/' + login }).
          c('x', { xmlns: 'http://jabber.org/protocol/muc' })
          );

          connection.send(new xmpp.Stanza('iq',
          {from: jid, to: room, type: 'get' })
          .c('query', { xmlns: 'http://jabber.org/protocol/disco#items' }));


         var roster = new xmpp.Stanza('iq', {
            to: room,
            id: 'roster_0',
            type: 'get'
          }).c('query', {
            xmlns: 'http://jabber.org/protocol/muc#admin'
          }).c('item', {
            affiliation: 'member'
          });

          connection.send(roster);


  });

  connection.on('stanza', function(stanza) {
    console.log(stanza);
    if (stanza.is('message') &&
   // Important: never reply to errors!
   (stanza.attrs.type !== 'error')) {
     if (stanza.getChild('delay') != null)
     {
       var date = stanza.getChild('delay').attrs.stamp;
       setLastTimestamp(date);
    }

    if (stanza.getChild('subject') != null)
    {
      //console.log(stanza.getChildText('subject'));
      document.getElementById('lobby-subject').textContent = stanza.getChildText('subject');
      return;
    }

    //put it in the chat log UI
    var idx = $.inArray(stanza.attrs.from.split("/")[1], knownAdmins)
    if (idx > -1)
    {
      $('#timestamp-container').before("<p class='moderator-chat-name'>" + stanza.attrs.from.split("/")[1] + ": <span class='moderator-chat-text'>" + stanza.getChildText('body') + "</span></p>");
    }
    else {
      $('#timestamp-container').before("<p class='chat-name'>" + stanza.attrs.from.split("/")[1] + ": <span class='chat-text'>" + stanza.getChildText('body') + "</span></p>");
    }
    $('#messages').stop();
    $("#messages").animate({ scrollTop: $('#messages').prop("scrollHeight")}, 500);


    if (chatloaded == true)
    {
      audio.currentTime = 0;
      audio.play();
      var timenow = new Date();
      timenow.setTime(Date.now());
      setLastTimestamp(timenow.toUTCString());
      addLastTimestamp();
    }
   }

   if(stanza.is('presence')) {
        // We are only interested in stanzas with <x> in the payload or it will throw some errors
        if(stanza.getChild('x') != undefined) {
            // Deciding what to do based on the xmlns attribute
            var _presXmlns = stanza.getChild('x').attrs.xmlns;

            switch(_presXmlns) {
                // If someone is joining or leaving
                case 'http://jabber.org/protocol/muc#user':
                    // Get the role of joiner/leaver
                    _presRole = stanza.getChild('x').getChild('item').attrs.role;
                    // Get the JID of joiner/leaver
                    _presName  = stanza.from;
                    // Get the nick of joiner/leaver
                    _presNick = stanza.attrs.from.split('/')[1];
                    console.log("NEW USER: " + _presNick + " WITH ROLE:" + _presRole);

                    // If it's not none, this user must be joining or changing his nick
                    if(_presRole !== 'none' && _presNick != undefined) {

                        // We are now handling the data of joinging / nick changing users. I recommend to use an in-memory store like 'dirty' [https://github.com/felixge/node-dirty] to store information of the users currentliy in the group chat.
                        var name = _presNick;
                        var upperCaseNames = onlinePlayers.map(function(value) {
                            return value[0].toUpperCase();
                          });
                        var pos = upperCaseNames.indexOf(name.toUpperCase());
                        if (pos > -1)
                        {
                          onlinePlayers.splice(pos, 1);
                        }
                        onlinePlayers.push([name, _presRole]);
                        updatePlayersOnline()

                    } else {

                        // We are now handling the data of leaving users
                        if (_presNick != undefined) {
                          console.log(_presNick + " has left.")
                          var idx = $.inArray(_presNick, onlinePlayers.map(function(val){ return val[0]; }));
                          if (idx > -1) {
                            onlinePlayers.splice(idx, 1);
                            updatePlayersOnline()
                          }
                        }
                    }
                break;
            }
        }
    }

  });

  connection.on('error', function(error) {
    console.log(error);
    if (error =='XMPP authentication failure')
    {
      document.getElementById('login-status').textContent = "Incorrect login.";
    }
  });
}

function setLastTimestamp(datestring) {
  var time = new Date();
  time.setTime(Date.parse(datestring));
  lastdate = time.getTime();
  var options = { weekday: 'long', hour: '2-digit', minute: '2-digit' };
  var timestamp = time.toLocaleTimeString('en-US', options);
  lasttimestamp = timestamp;
  console.log(timestamp);
}

function addLastTimestamp() {
  document.getElementById('timestamp-display').textContent = "Last message: " + lasttimestamp;
}

function chatReady() {
  chatloaded = true
  addLastTimestamp();
  $('#messages').stop();
  $("#messages").animate({ scrollTop: $('#messages').prop("scrollHeight")}, 500);

}


function leaveChat() {
  connection.send(new xmpp.Element('presence', { from: jid, to: room_jid, type: 'unavailable' }).c('x', { xmlns: 'http://jabber.org/protocol/muc' }));
  connection.end();
}

function updatePlayersOnline() {
  $("#online-players").empty();
  for (i = 0; i < onlinePlayers.length; i++) {
    if (onlinePlayers[i][1] == 'moderator') {
      $('#online-players').append('<p class="list-group-item moderator-item">' + '&lt;admin&gt; ' + onlinePlayers[i][0] + '</p>');
    }
    else {
      $('#online-players').append('<p class="list-group-item">' + onlinePlayers[i][0] + '</p>');
    }
  }
}

function sendMessage()
{
  var message = document.getElementById("chat-box").value;
  if (message.length > 0 &&  $.trim( message ) != '' )
  {
    connection.send(new xmpp.Element('message', { to: room, type: 'groupchat' }).c('body').t(message));
  }
  document.getElementById("chat-box").value = "";
}
