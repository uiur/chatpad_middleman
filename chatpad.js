var fs = require('fs');

var casper = require('casper').create({
  verbose: true,
  // logLevel: 'debug',
  pageSettings: {
    loadPlugins: false
  },
  waitTimeout: 20000
});

casper.setFilter("page.confirm", function(msg) {
    console.log('confirm: ' + msg);
    return true;
});

// mode: 'alice', 'bob'
function ChatPadClient(mode) {
  this.mode = mode || 'alice';

  this.new_message_index = 0;
  this.messages = [];
  this.chatlog = [];
}

ChatPadClient.prototype = {
  start: function () {
    var client = this;
    // set User Agent iOS6
    casper.userAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 6_0 like Mac OS X) AppleWebKit/536.26 (KHTML, like Gecko) Version/6.0 Mobile/10A5376e Safari/8536.25');

    casper.start('http://sp.chatpad.jp/room/', function() {
      var casper_context = client.casper_context = this;

      casper_context.echo(casper_context.getTitle());

      client.loop(function () {
        var casper_context = client.casper_context;

        casper_context.capture(client.mode + '.png');

        var new_messages = client.getNewMessages();

        if (new_messages.length > 0) {
          client.printMessages(new_messages);

          var new_message = new_messages[0];

          if (new_message.type === 'systemMessage' && new_message.text.indexOf('終了したよ') !== -1) {
            client.sendCommand('close')
            client.startNewChat();
            client.chatlog.push(client.messages);
            client.messages = [];
            client.new_message_index = 0;
            return;
          }
        }

        client.executeCommand();

        client.sayFromSayFile();

        var new_companion_messages = client.getNewCompanionMessages();
        if (new_companion_messages.length > 0) {
          client.writeToPartnerSayFile(new_companion_messages[0].text);
        }

        client.new_message_index = client.messages.length;
      });
    });

    casper.run();
  },
  loop: function (callback) {
    var client = this;

    client.casper_context.wait(100, function() {
      callback();
      client.loop(callback);
    });
  },
  say: function (text) {
    this.casper_context.evaluate(function(text){
      document.querySelector('#sayField').value = text;
      document.querySelector('#sayButton').click();
    }, text);
    console.log(this.mode + ': ' + text);
  },
  startNewChat: function () {
    this.casper_context.evaluate(function() {
      document.querySelector('#chatNewButton').click();
    });
  },
  closeChat: function () {
    this.casper_context.evaluate(function() {
      // copied from room.js
      (void 0 !== roomChKey && socket.emit(roomChKey, {type: "close"}), setViewerStatus("CLOSE"), setOtherOnline(!1))
    });
  },
  getMessages: function () {
    return this.casper_context.evaluate(function() {
      return [].map.call(document.querySelectorAll('#chatLog .message:not(.companionTypeMessage)'), function(message){
        return {
          type: message.className.split(' ')[1],
          text: message.querySelector('.text').textContent
        };
      });
    });
  },
  updateMessages: function () {
    this.messages = this.getMessages();
    return this.messages;
  },
  getNewCompanionMessages: function() {
    return this.getNewMessages().filter(function(message){ return message.type === 'companionMessage' });
  },
  getNewSelfMessages: function() {
    return this.getNewMessages().filter(function(message) { return message.type === 'selfMessage' });
  },
  getNewMessages: function() {
    this.updateMessages();
    return this.messages.slice(this.new_message_index);
  },
  readFromSayFile: function() {
    var say_file = this.getSayFileName();
    return fs.read(say_file);
  },
  writeToPartnerSayFile: function(text) {
    var partner = this.getPartner();
    var partner_say_file = 'say-' + partner + '.txt';
    fs.write(partner_say_file, text, 'w');
  },
  sayFromSayFile: function() {
    var text = this.readFromSayFile();
    if (text.length) {
      this.say(text);
      fs.write(this.getSayFileName(), '', 'w');

      return text;
    }
  },
  getSayFileName: function() {
    return 'say-' + this.mode + '.txt';
  },
  printMessages: function(messages) {
    console.log(messages.map(function(message){ return message.text }).join('\n'));
  },
  sendCommand: function(command) {
    var partner_command_file = 'command-' + this.getPartner() + '.txt';
    fs.write(partner_command_file, command, 'w');
  },
  executeCommand: function() {
    var command_file = 'command-' + this.mode + '.txt';
    var command = fs.read(command_file);

    if (/close/.test(command)) {
      fs.write(command_file, '', 'w');
      this.closeChat();
    }
  },
  getPartner: function() {
    return this.mode === 'alice' ? 'bob' : 'alice';
  }
};

var client = new ChatPadClient(casper.cli.args[0]);
client.start();
