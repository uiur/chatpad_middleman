var fs = require('fs');

var casper = require('casper').create({
  verbose: true,
  pageSettings: {
    loadPlugins: false
  },
  waitTimeout: 20000
});

var mode = +casper.cli.args[0] || 0;
var say_file = 'say' + mode + '.txt'
var partner_say_file = 'say' + (+!mode) + '.txt'

// set User Agent iOS6
casper.userAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 6_0 like Mac OS X) AppleWebKit/536.26 (KHTML, like Gecko) Version/6.0 Mobile/10A5376e Safari/8536.25');

casper.start('http://sp.chatpad.jp/room/', function() {
  var self = this;
  this.echo(this.getTitle());

  var say = function (text) {
    self.evaluate(function(text){
      document.querySelector('#sayField').value = text;
      document.querySelector('#sayButton').click();
    }, text);
  };

  var startNewChat = function() {
    self.evaluate(function() {
      document.querySelector('#chatNewButton').click()
    });
  };

  var last_messages = [];
  var last_companion_messages = [];

  var loop = function () {
    self.wait(1000, function() {
      self.capture('room.png');

      var messages = self.evaluate(function() {
        return [].map.call(document.querySelectorAll('#chatLog .message:not(.companionTypeMessage) .text'), function(text){
          return text.textContent
        })
      });

      var companion_messages = self.evaluate(function() {
        return [].map.call(document.querySelectorAll('#chatLog .companionMessage:not(.companionTypeMessage) .text'), function(text){
          return text.textContent
        })
      });

      var new_messages = messages.slice(last_messages.length);
      var new_companion_messages = companion_messages.slice(last_companion_messages.length);
      console.log('************************************')
      console.log(messages.join('\n'));
      console.log('------------------------------------');
      console.log(new_messages.join('\n'));

      new_messages.forEach(function(message) {
        if (message.indexOf('終了したよ') !== -1) {
          startNewChat();
          last_messages = [];
          last_companion_messages = [];
        }
      });

      var text = fs.read(say_file);
      say(text);
      fs.write(say_file, '', 'w');

      if (new_companion_messages[0]) {
        fs.write(partner_say_file, new_messages[0], 'w');
      }

      last_messages = messages;
      last_companion_messages = companion_messages;

      loop();
    });
  }
  loop();
});

casper.run();
