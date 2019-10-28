const client = require('../index');
const {prefix} = require('../config');

const help = (target, context) => {
    const msg = `${prefix}card [card name] (-de, -es, -en, -fr, -it, -pl, -pt, -th, -zh) (optional, to search a different language) • ${prefix}deck [deck name] • ${prefix}faq [search term] • ${prefix}rule [rule name] • ${prefix}randomhand [deckname] • ${prefix}sealed • ${prefix}roll 1d10 roll a d10.`;
    client.sendMessage(target, context, msg);
};

exports.help = help;