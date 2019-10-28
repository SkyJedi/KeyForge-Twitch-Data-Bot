const client = require('../index');
const {get} = require('lodash');

const {fetchDeck, fetchDeckBasicMV, fetchDoK, shortenURL, rarityFix} = require('./fetch');
const {sets} = require('../card_data');

const deck = async (target, context, params) => {
    let deck;
    if(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/.test(params[0])) deck = await fetchDeckBasicMV(params[0]);
    else deck = await fetchDeck(params.join('+'));
    if (deck) {
        const cardStats = getCardStats(deck.cards, deck.expansion),
            dokStats = fetchDoK(deck.id),
            dok = shortenURL(`https://decksofkeyforge.com/decks/${deck.id}?powered_by=archonMatrixTwitch`),
            official = shortenURL(`https://keyforgegame.com/deck-details/${deck.id}?powered_by=archonMatrixTwitch`),
            bt = shortenURL(`https://burgertokens.com/pages/keyforge-deck-analyzer?deck=${deck.id}&powered_by=archonMatrixTwitch`);
        Promise.all([dokStats, dok, official, bt]).then(([dokStats, dokLink, officialLink, btLink]) => {
            const msg = `${deck.name} • ${get(sets.filter(set => deck.expansion === set.set_number), '[0].flag', '')} • ${deck.wins}W/${deck.losses}L • Power: ${deck.power_level}  • Chains: ${deck.chains} 
		• ${Object.keys(cardStats.card_type).map(type => `${type}: ${cardStats.card_type[type]}`).join(', ')}
		• ${['Special', 'Rare', 'Uncommon', 'Common'].map(type => {
                if (cardStats.rarity[type]) return `${type}: ${cardStats.rarity[type]}`;
            }).filter(Boolean).join(', ')}
		• Mavericks: ${cardStats.is_maverick}. 
		• Legacy: ${cardStats.legacy}. 
		• ${dokStats.sas} • ${dokStats.deckAERC} • ${dokStats.sasStar} • Official: ${officialLink} • BT: ${btLink} • DoK: ${dokLink}`;
            client.sendMessage(target, context, msg);
        });

    } else client.sendMessage(target, context, `Deck - ${params.join(' ')}: not found!`);
};
const getCardStats = (cards, expansion) => {
    return {
        card_type: cards.reduce((acc, card) => ({...acc, [card.card_type]: acc[card.card_type] + 1}),
            {Action: 0, Artifact: 0, Creature: 0, Upgrade: 0}
        ),
        rarity: cards.reduce((acc, card) =>
            ({
                ...acc,
                [rarityFix(card.rarity)]: acc[rarityFix(card.rarity)] ? acc[rarityFix(card.rarity)] + 1 : 1
            }), {}),
        is_maverick: cards.filter(card => card.is_maverick).length,
        legacy: cards.filter(card => !(card.expansion === expansion)).length
    };
};

exports.deck = deck;