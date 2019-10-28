const client = require('../index');
const {get, kebabCase, upperFirst} = require('lodash');

const {shortenURL, fetchCard, rarityFix} = require('./fetch');
const {sets} = require('../card_data');

const card = async (target, context, params, flags) => {
    const data = await fetchCard(params.join(' ').toLowerCase(), flags);
    Promise.all([data]).then(async ([data]) => {
        if (data) {
            const link = await shortenURL(`https://decksofkeyforge.com/cards/${kebabCase(data.card_title)}?powered_by=archonMatrixTwitch`);
            const msg = ['card_title', 'card_number', 'house', 'card_type', 'traits', 'amber', 'power', 'armor', 'rarity', 'expansion', 'card_text', 'flavor_text'].map(type => {
                if (data[type] === 0 || !data[type]) return '';
                switch (type) {
                    case 'amber':
                        return `Æmber:${data[type]} •`;
                    case 'power':
                    case 'armor':
                        return `${upperFirst(type)}: ${data[type]} •`;
                    case 'flavor_text':
                        if (data[type])
                            return `• ${data[type]}`;
                        break;
                    case 'card_text':
                        return `${data[type]}`;
                    case 'expansion':
                        return `${get(sets.filter(set => data.expansion === set.set_number), '[0].flag', 'ERROR')} •`;
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