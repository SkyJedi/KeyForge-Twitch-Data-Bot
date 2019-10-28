const client = require('../index');
const {sortBy, shuffle} = require('lodash');

const {fetchDeck} = require('./fetch');
const {sets} = require('../card_data');

const randomHand = async (target, context, params) => {
    const deck = await fetchDeck(params.join('+'));
    let number;
    if (deck) {
        //grab 6 random cards
        const randomCards = sortBy(shuffle(deck.cards).slice(0, Math.min(number ? number : 6, 8)), ['house', 'card_number']);
        const msg = `Random hand from ${deck.name}: ${randomCards.map((card => card.card_title)).join(' • ')}`;
        client.sendMessage(target, context, msg);
    } else client.sendMessage(target, context, `Deck - ${params.join(' ')}: not found!`);
};

exports.randomHand = randomHand;