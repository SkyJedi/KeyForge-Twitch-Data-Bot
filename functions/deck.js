const client = require('../index');
const {get} = require('lodash');

const {fetchDeck, fetchDoK, shortenURL, rarityFix} = require('./fetch');
const {sets} = require('../card_data');

const deck = async (target, context, params) => {
    const [deck] = await fetchDeck(params);
    if (!deck) {
        client.sendMessage(target, context, `Deck - ${params.join(' ')}: not found!`)
        return;
    }
    const cardStats = getCardStats(deck.cards, deck.expansion),
        dokStats = await fetchDoK(deck.id),
        dokLink = await shortenURL(`https://decksofkeyforge.com/decks/${deck.id}?powered_by=archonMatrixTwitch`),
        officialLink = await shortenURL(`https://keyforgegame.com/deck-details/${deck.id}?powered_by=archonMatrixTwitch`),
        aaLink = await shortenURL(`https://archonarcana.com/Deck:${deck.id}?powered_by=archonMatrixDiscord`);
    const msg = `${deck.name} • ${deck.houses.map(house => house)
        .join(' • ')} • ${get(sets.filter(set => deck.expansion ===
        set.set_number), '[0].flag', '')} ${deck.wins > 0 || deck.losses >
    0 ? `• ${deck.wins}W/${deck.losses}L • Power: ${deck.power_level}  • Chains: ${deck.chains}` : ''} 
		• ${Object.keys(cardStats.card_type).map(type => `${type}: ${cardStats.card_type[type]}`).join(' • ')}
		• ${['Special', 'Rare', 'Uncommon', 'Common'].map(type => {
        if (cardStats.rarity[type]) return `${type}: ${cardStats.rarity[type]}`;
    }).filter(Boolean).join(' • ')}
		${cardStats.is_maverick > 0 ? ` • Mavericks: ${cardStats.is_maverick}` : ''} 
		${cardStats.is_anomaly > 0 ? ` • Anomaly: ${cardStats.is_anomaly}` : ''} 
		${cardStats.legacy > 0 ? ` • Legacy: ${cardStats.legacy}` : ''} 
		• ${dokStats.sas} • ${dokStats.sasStar} • Official: ${officialLink} • AA: ${aaLink} • DoK: ${dokLink}`;
    client.sendMessage(target, context, msg);
};

const getCardStats = (cards, expansion) => {
    return {
        card_type: cards.reduce((acc, card) => ({
                ...acc,
                [card.card_type.replace(/\d+/g, '')]: acc[card.card_type.replace(/\d+/g, '')] + 1
            }),
            {Action: 0, Artifact: 0, Creature: 0, Upgrade: 0}
        ),
        rarity: cards.reduce((acc, card) =>
            ({
                ...acc,
                [rarityFix(card.rarity)]: acc[rarityFix(card.rarity)] ? acc[rarityFix(card.rarity)] + 1 : 1
            }), {}),
        is_maverick: cards.filter(card => card.is_maverick).length,
        is_anomaly: cards.filter(card => card.is_anomaly).length,
        legacy: cards.filter(card => !(card.expansion === expansion)).length
    };
};

exports.deck = deck;
