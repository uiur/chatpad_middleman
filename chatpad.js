var fs = require('fs');

var casper = require('casper').create({
  verbose: true,
  // logLevel: 'debug',
  pageSettings: {
    loadPlugins: false
  },
  waitTimeout: 20000
});

var mode = +casper.cli.args[0] || 0;
var say_file = 'say' + mode + '.txt'
var partner_say_file = 'say' + (+!mode) + '.txt'

function ChatPadClient() {}

ChatPadClient.prototype = {
  start: function () {
    var client = this;
    // set User Agent iOS6
    casper.userAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 6_0 like Mac OS X) AppleWebKit/536.26 (KHTML, like Gecko) Version/6.0 Mobile/10A5376e Safari/8536.25');

    casper.start('http://sp.chatpad.jp/room/', function() {
      client.casper_context = this;
      var self = this;

      self.echo(self.getTitle());

      client.last_messages = [];
      client.last_companion_messages = [];
      client.loop();
    });

    casper.run();
  },
  loop: function () {
    var client = this;
    var casper_context = client.casper_context;

    casper_context.wait(100, function() {
      casper_context.capture('room.png');

      var messages = client.getMessages();
      var companion_messages = client.getCompanionMessages();

      var new_messages = messages.slice(client.last_messages.length);
      var new_companion_messages = companion_messages.slice(client.last_companion_messages.length);

      if (new_messages.length > 0) {
        console.log(new_messages.join('\n'));
      }

      new_messages.forEach(function(message) {
        if (message.indexOf('終了したよ') !== -1) {
          client.startNewChat();
          client.last_messages = [];
          client.last_companion_messages = [];
        }
      });

      var text = fs.read(say_file);
      client.say(text);
      fs.write(say_file, '', 'w');

      if (new_companion_messages[0]) {
        fs.write(partner_say_file, new_messages[0], 'w');
      }

      client.last_messages = messages;
      client.last_companion_messages = companion_messages;

      client.loop();
    });
  },
  say: function (text) {
    this.casper_context.evaluate(function(text){
      document.querySelector('#sayField').value = text;
      document.querySelector('#sayButton').click();
    }, text);
  },
  startNewChat: function() {
    this.casper_context.evaluate(function() {
      document.querySelector('#chatNewButton').click()
    });
  },
  getMessages: function() {
    return this.casper_context.evaluate(function() {
      return [].map.call(document.querySelectorAll('#chatLog .message:not(.companionTypeMessage) .text'), function(text){
        return text.textContent
      })
    });
  },
  getCompanionMessages: function() {
    return this.casper_context.evaluate(function() {
      return [].map.call(document.querySelectorAll('#chatLog .companionMessage:not(.companionTypeMessage) .text'), function(text){
        return text.textContent
      })
    });
  }
};

var client = new ChatPadClient();
client.start();
