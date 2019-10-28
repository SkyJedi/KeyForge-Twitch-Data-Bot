const client = require('../index');
const {fetchRandomDecks, shortenURL, getFlagSet, getFlagNumber} = require('./fetch');
const {sets} = require('../card_data');

const sealed = (target, context, params, flags) => {
    const number = getFlagNumber(flags, 2),
        set = getFlagSet(flags),
        arr = [...Array(+number)];
    const decks = arr.map(() => fetchRandomDecks(set));
    Promise.all(decks).then(decks => {
        const houses = decks.map(deck => deck._links.houses.join(' • ')),
            links = decks.map(deck => shortenURL(`https://www.keyforgegame.com/deck-details/${ deck.id }?powered_by=archonMatrixTwitch)`));
        Promise.all(links).then(links => {
            const message = arr.map((a, index) => `Deck ${ index + 1 }, ${ decks[index].name }, ${ sets.find(x => x.set_number === decks[index].expansion).flag }, ${ houses[index] }, ${ links[index] }`).join(`\n\n`);
            client.sendMessage(target, context, message);
        });
    });
};

exports.sealed = sealed;