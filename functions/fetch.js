const axios = require('axios');
const Fuse = require('fuse.js');
const { db } = require('./firestore');
const uuid = require('uuid/v4');
const { get, sortBy, round, filter, findIndex, shuffle } = require('lodash');
const faq = require('../card_data/faq');
const { deckSearchAPI, dokAPI, dokKey, bitlyKey } = require('../config');
const { sets, langs, houses } = require('../card_data');
const deckIdRegex = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/;

const fetchDeck = (params) => new Promise((resolve, reject) => {
    const data = params.map(param => deckIdRegex.test(param) ? fetchDeckId(param.match(deckIdRegex)[0]) : fetchDeckNameMV(param));
    Promise.all(data).then(data => resolve(data)).catch(() => reject());
});
const fetchDeckId = (id) => new Promise((resolve, reject) => {
    db.collection('decks').doc(id).get()
        .then(doc => {
            if(doc.exists) {
                const deck = doc.data();
                deck.houses = get(deck, '_links.houses');
                buildCardList(deck).then(cards => {
                    deck.cards = cards;
                    resolve(deck);
                });
            } else {
                console.log(`${id} is not in DB, fetching from the man`);
                fetchDeckIdMV(id)
                    .then(deck => resolve(deck))
                    .catch(() => reject());
            }
        }).catch(() => reject());
});
const fetchDeckIdMV = (id) => new Promise((resolve, reject) => {
    axios.get(encodeURI(deckSearchAPI + id))
        .then(response => {
            const deck = get(response, 'data.data', false);
            if(deck) {
                db.collection('decks').doc(deck.id).set(deck).catch(console.error);
                deck.houses = get(deck, '_links.houses');
                buildCardList(deck).then(cards => {
                    deck.cards = cards;
                    resolve(deck);
                });
            } else reject();
        }).catch(() => reject());
});
const fetchDeckNameMV = (name) => new Promise((resolve, reject) => {
    axios.get(encodeURI(deckSearchAPI + '?search=' + name.split(' ').join('+')))
        .then(response => {
            const index = findIndex(response.data.data, x => x.name.toLowerCase() === name);
            const deck = get(response, `data.data[${Math.max(index, 0)}]`, false);
            if(deck) {
                deck.houses = get(deck, '_links.houses');
                buildCardList(deck).then(cards => {
                    deck.cards = cards;
                    resolve(deck);
                });
            } else reject();
            let batch = db.batch();
            response.data.data.forEach(x => batch.set(db.collection('decks').doc(x.id), x));
            batch.commit().catch(console.error);
        }).catch(() => reject());
});

const buildCardList = (deck) => new Promise(resolve => {
    const cardRefs = deck.cards.map(card => db.collection('AllCards').doc(card));
    return db.runTransaction(transaction => {
        return transaction.getAll(...cardRefs).then(docs => {
            let list = [];
            for(let x = 0; x < docs.length; x++) {
                if(docs[x].exists) {
                    let card = docs[x].data();
                    card.is_legacy = deck.set_era_cards.Legacy.includes(card.id);
                    list.push(card);
                } else {
                    fetchUnknownCard(deck.cards[x], deck.id).then(unknownCard => {
                        unknownCard.is_legacy = deck.set_era_cards.Legacy.includes(unknownCard.id);
                        list.push(unknownCard);
                    });
                }
            }
            resolve(sortBy(list, ['house', 'card_number']));
        });
    });
});
const fetchUnknownCard = (cardId, deckId) => new Promise(resolve => {
    console.log(`${cardId} not found, fetching from the man`);
    axios.get(`http://www.keyforgegame.com/api/decks/${deckId}/?links=cards`)
        .then(fetchedCards => {
            const card = fetchedCards.data._linked.cards.find(o => o.id === cardId);
            resolve(card);
            db.collection('AllCards').doc(card.id).set(card).then(() => {
                console.log(`${card.id} has been added to firestore`);
                text(`${card.card_title} in House ${card.house} had been found! https://www.keyforgegame.com/deck-details/${deckId}/`);
            });
        });
});

const fetchMavCard = (name, house) => new Promise((resolve, reject) => {
    db.collection('AllCards').limit(1)
        .where('card_title', '==', name)
        .where('house', '==', house)
        .get().then(snapshot => {
        if(snapshot.size > 0) snapshot.forEach(doc => resolve(doc.data()));
        else reject();
    }).catch(() => reject());
});
const fetchDeckWithCard = (cardId) => new Promise((resolve, reject) => {
    db.collection('decks').limit(10).where('cards', 'array-contains', cardId).get().then(snapshot => {
        if(snapshot.size > 0) {
            let deck = [];
            snapshot.forEach(doc => deck.push(doc.data()));
            deck = shuffle(deck)[0];
            deck.houses = get(deck, '_links.houses');
            buildCardList(deck).then(cards => {
                deck.cards = cards;
                resolve(deck);
            });
        } else reject();
    }).catch(() => reject());
});
const fetchRandomDecks = (expansion) => new Promise((resolve, reject) => {
    const key = uuid();
    let decksRef = db.collection('decks').limit(1);
    if(expansion) decksRef = decksRef.where('expansion', '==', expansion);
    decksRef.where('id', '>=', key).get()
        .then(snapshot => {
            if(snapshot.size > 0) snapshot.forEach(doc => resolve(doc.data()));
            else {
                decksRef.where('id', '<', key).get()
                    .then(snapshot => {
                        if(snapshot.size > 0) snapshot.forEach(doc => resolve(doc.data()));
                        else resolve(false);
                    }).catch(console.error);
            }
        }).catch(() => reject());
});

const fetchDoK = (deckID) => {
    return new Promise(resolve => {
        axios.get(`${dokAPI}${deckID}`, dokKey)
            .then(response => {
                if(response.data) {
                    const {
                            amberControl: A, expectedAmber: E,
                            artifactControl: R, creatureControl: C,
                            efficiency: F, disruption: D, effectivePower: P,
                            sasRating, sasPercentile, aercScore
                        } = response.data.deck,
                        sas = `${round(sasRating, 2)} SAS • ${round(aercScore, 2)} AERC`,
                        deckAERC = `A: ${round(A, 2)} • E: ${round(E, 2)} • R: ${round(R, 2)} • C: ${round(C, 2)} • F: ${round(F, 2)} • D: ${round(D, 2)} • P: ${round(P, 2)}`,
                        sasStar = sasStarRating(sasPercentile);
                    resolve({ sas, deckAERC, sasStar });
                } else resolve({
                    sas: 'Unable to Retrieve SAS',
                    deckAERC: 'Unable to Retrieve AERC',
                    sasStar: 'Unable to Retrieve sasStars'
                });
            }).catch(() => resolve({
            sas: 'Unable to Retrieve SAS',
            deckAERC: 'Unable to Retrieve AERC',
            sasStar: 'Unable to Retrieve sasStars'
        }));
    });
};

const fetchCard = (search, flags) => {
    const set = getFlagSet(flags),
        lang = getFlagLang(flags);
    const options = {
        shouldSort: true,
        tokenize: true,
        matchAllTokens: true,
        threshold: 0.2,
        keys: [{
            name: 'card_number',
            weight: 0.3
        }, {
            name: 'card_title',
            weight: 0.7
        }],
    };
    const cards = (set ? require(`../card_data/${lang}/${set}`) : require(`../card_data/`)[lang]);
    const fuse = new Fuse(cards, options);
    const final = fuse.search(search);
    return get(final, '[0]');
};
const fetchFAQ = (text) => {
    const options = {
        shouldSort: true,
        tokenize: true,
        matchAllTokens: true,
        includeScore: true,
        threshold: 0.3,
        keys: [
            { name: 'question', weight: 0.6 },
            { name: 'answer', weight: 0.4 },
        ],
    };
    const fuse = new Fuse(faq, options);
    let results = fuse.search(text);
    results = sortBy(results.filter(x => x.score < 0.6), 'score');
    return results.map(item => item.item)[0];
};
const fetchReprints = (card) => {
    const cards = require(`../card_data/`)['en'];
    return cards.filter(x => x.card_title === card.card_title);
};

const sasStarRating = (x) => {
    switch (true) {
        case (x >= 99.99):
            return '✮✮✮✮✮';
        case (x >= 99.9):
            return '★★★★★';
        case (x >= 99):
            return '★★★★½';
        case (x >= 90):
            return '★★★★';
        case (x >= 75):
            return '★★★½';
        case (x >= 25):
            return '★★★';
        case (x >= 10):
            return '★★½';
        case (x >= 1):
            return '★★';
        case (x >= 0.1):
            return '★½';
        case (x >= 0.01):
            return '★';
        case (x > 0):
            return '½';
        default:
            return 'No Star Rating';
    }
};

const getSet = (number) => get(sets.filter(set => number === set.set_number), '[0].flag', 'ERROR');
const getCardLink = (card) => {
    const AllCards = require(`../card_data/en/${card.expansion}`);
    card = AllCards.find(x => x.card_number === card.card_number);
    return encodeURI(`https://archonarcana.com/${card.card_title.replace(' ', '_').replace(/[\[\]']+/g, '')}?powered_by=archonMatrixDiscord`);
};
const getFlagSet = (flags) => get(filter(sets, set => flags.includes(set.flag.toLowerCase())), '[0].set_number');
const getFlagHouse = (flags) => houses[filter(Object.keys(houses), house => flags.includes(house))];
const getFlagLang = (flags) => get(filter(flags, flag => langs.includes(flag)), '[0]', 'en');
const getFlagNumber = (flags, defaultNumber = 0) => +(get(filter(flags, flag => Number.isInteger(+flag)), '[0]', defaultNumber));

const shortenURL = (url) => {
    return new Promise(resolve => {
        axios.post('https://api-ssl.bitly.com/v4/shorten',
            { long_url: url, domain: 'skyj.io' }, bitlyKey)
            .then(response => resolve(get(response, 'data.id', url)))
            .catch(() => resolve(''));
    });
};
const rarityFix = rarity => rarity === 'FIXED' || rarity === 'Variant' ? 'Special' : rarity;
const format = (text) => {
    text = text.replace(/<I>/gi, "");
    text = text.replace(/<B>/gi, "");
    return text;
};

exports.fetchDeck = fetchDeck;
exports.fetchDeckWithCard = fetchDeckWithCard;
exports.fetchMavCard = fetchMavCard;
exports.fetchCard = fetchCard;
exports.fetchDoK = fetchDoK;
exports.fetchFAQ = fetchFAQ;
exports.fetchUnknownCard = fetchUnknownCard;
exports.fetchRandomDecks = fetchRandomDecks;
exports.fetchReprints = fetchReprints;
exports.getSet = getSet;
exports.getCardLink = getCardLink;
exports.getFlagLang = getFlagLang;
exports.getFlagSet = getFlagSet;
exports.getFlagHouse = getFlagHouse;
exports.getFlagNumber = getFlagNumber;
exports.shortenURL = shortenURL;
exports.rarityFix = rarityFix;
exports.format = format;