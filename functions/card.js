const client = require('../index');
const { upperFirst } = require('lodash');

const { shortenURL, fetchCard, fetchReprints, getCardLink, getSet, rarityFix } = require('./fetch');

const card = async (target, context, params, flags) => {
	const data = await fetchCard(params.join(' ').toLowerCase(), flags);
	Promise.all([data]).then(async ([data]) => {
		if(data) {
			const link = await shortenURL(getCardLink(data));
			const msg = [
				'card_title',
				'expansion',
				'house',
				'card_type',
				'traits',
				'amber',
				'power',
				'armor',
				'rarity',
				'card_text',
				'flavor_text'].map(type => {
				if(data[type] === 0 || !data[type]) return '';
				switch (type) {
					case 'amber':
						return `Æmber:${data[type]} •`;
					case 'power':
					case 'armor':
						return `${upperFirst(type)}: ${data[type]} •`;
					case 'flavor_text':
						if(data[type])
							return `• ${data[type]}`;
						break;
					case 'card_text':
						return `${data[type]}`;
					case 'expansion':
					    const reprints = fetchReprints(data, flags);
						return reprints.map(x => `${getSet(x.expansion)} (${x.card_number})`).join(' • ') + ' • ';
					case 'rarity':
						return `${rarityFix(data[type])} •`;
					default:
						return `${data[type]} •`;
				}
			}).join(' ');
			client.sendMessage(target, context, msg + ' ' + link);
		} else client.sendMessage(target, context, `Card - ${params.join(' ')}: not found!`);
	});
};

exports.card = card;