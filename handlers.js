const functions = require('./functions/index');
const {prefix} = require('./config');

// These are the commands the bot knows (defined below):
const knownCommands = functions;

// Called every time a message comes in:
const onMessage = (target, context, msg, self) => {
	if (self) return; // Ignore messages from the bot

	const uuid = /[0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12}/;

	if (msg.match(uuid)) msg = `${prefix}deck ${msg.match(uuid)[0]}`;

	if (!msg.includes(prefix)) return;
	let params = [], commandName;

		if (msg.startsWith(prefix)) params = msg.substr(1).split(' ');
		else params = msg.split(prefix)[1].split(' ');
		commandName = params[0].toLowerCase();
		params = params.splice(1);

	const flags = params.filter(a => a.startsWith('-')).map(flag => flag.slice(1));
	params = params.filter(a => !a.startsWith('-'));

	switch (commandName) {
		case 'c':
			commandName = 'card';
			break;
		case 'd':
			commandName = 'deck';
			break;
		case 'rh':
		case 'randomhand':
			commandName = 'randomHand';
			break;
		case 'time':
		case 'timing':
		case 'chart':
		case 'timingchart':
			commandName = 'timingChart';
			break;
		default:
			break;
	}
	// If the command is known, let's execute it:
	if (commandName in knownCommands) {
		// Retrieve the function by its name:
		const command = knownCommands[commandName];
		// Then call the command with parameters:
		command(target, context, params, flags);
		console.log(`* Executed ${context.username}, ${commandName}, ${params}`)
	}
};

exports.onMessage = onMessage;
