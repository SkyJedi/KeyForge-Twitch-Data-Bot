const tmi = require('tmi.js');
const {twitchOptions} = require('./config');
const version = require('./package').version;
const handlers = require('./handlers');
const client = new tmi.client(twitchOptions);

// Called every time the bot connects to Twitch chat:
const onConnected = (addr, port) => {
	console.log(`Logged in as ${client.getUsername()} Version:${version}`);
	console.log(`* Connected to ${addr}:${port}`);
	console.log(`Logged into ${twitchOptions.channels.join(', ')}`)
};

// Called every time the bot disconnects from Twitch:
const onDisconnected = (reason) => {
	console.log(`Disconnected: ${reason}`);
	process.exit(1)
};

client.on('message', handlers.onMessage);
client.on('connected', onConnected);
client.on('disconnected', onDisconnected);

const sendMessage = (target, context, message) => {
	if (context['message-type'] === 'whisper') {
		client.whisper(target, message)
	} else client.say(target, message)
};

// Connect to Twitch:
client.connect();

exports.sendMessage = sendMessage;
