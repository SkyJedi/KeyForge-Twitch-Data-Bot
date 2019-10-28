const axios = require('axios');
const {db} = require('./firestore');
const uuid = require('uuid/v4');
const {get, sortBy, round, filter} = require('lodash');
const faqs = require('../card_data/faq');
const cards = require('../card_data/');
const {deckSearchAPI, dokAPI, dokKey} = require('../config');
const {sets, langs} = require('../card_data');

const fetchDeck = (name) => {
    return new Promise(resolve => {
        axios.get(encodeURI(`http://www.keyforgegame.com/api/decks/?search=${name}`))
            .then(async response => {
                const deck = get(response, 'data.data[0]', false);
                deck.cards = await buildCardList(deck);
                resolve(deck);
            }).catch(console.error);
    });
};

const fetchDeckBasic = (id) => new Promise(resolve => {
    db.collection('decks').doc(id).get()
        .then(async doc => {
            if(doc.exists) {
                const deck = doc.data();
                deck.houses = get(deck, '_links.houses');
                deck.cards = await buildCardList(deck);
                resolve(deck);
            } else {
                console.log(`${ id } is not in DB, fetching from the man`);
                resolve(await fetchDeckBasicMV(id));
            }
        }).catch(console.error);
});

const fetchDeckBasicMV = (id) => new Promise(resolve => {
    axios.get(encodeURI(deckSearchAPI + id))
        .then(async response => {
            const deck = get(response, 'data.data', false);
            if(deck) {
                db.collection('decks').doc(deck.id).set(deck);
                deck.houses = get(deck, '_links.houses');
                deck.cards = await buildCardList(deck);
            }
            resolve(deck);
        }).catch(console.error);
});

const buildCardList = (deck) => new Promise(async resolve => {
    const cardRefs = deck.cards.map(card => db.collection('AllCards').doc(card));
    return db.runTransaction(transaction => {
        return transaction.getAll(...cardRefs).then(async docs => {
            let list = [];
            for(let x = 0; x < docs.length; x++) {
                if(docs[x].exists) {
                    let card = docs[x].data();
                    card.is_legacy = deck.set_era_cards.Legacy.includes(card.id);
                    list.push(card);
                } else {
                    let unknownCard = await fetchUnknownCard(deck.cards[x], deck.id);
                    unknownCard.is_legacy = deck.set_era_cards.Legacy.includes(unknownCard.id);
                    list.push(unknownCard);
                }
            }
            resolve(sortBy(list, ['house', 'card_number']));
        });
    });
});

const fetchCard = (search, flags) => {
    const set = getFlagSet(flags),
        lang = getFlagLang(flags);
    let final;
    final = cards[lang].find(card => card.card_title.toLowerCase() === search && (set ? card.expansion === set : true));
    if (final) return final;
    final = cards[lang].find(card => card.card_title.toLowerCase().startsWith(search) && (set ? card.expansion === set : true));
    if (final) return final;
    final = cards[lang].find(card => card.card_title.toLowerCase().endsWith(search) && (set ? card.expansion === set : true));
    if (final) return final;
    final = cards[lang].find(card => card.card_number === search && (set ? card.expansion === set : true));
    if (final) return final;
    final = cards[lang].find(card => card.card_title.toLowerCase().replace(/['"’`“”\d]/g, '').includes(search.replace(/['"’`“”\d]/g, '')) && (set ? card.expansion === set : true));
    return final;
};

const fetchFAQ = (params) => {
    return faqs.find(x => params.every(y => x.question.toLowerCase().includes(y.toLowerCase())));
};

const fetchDoK = (deckID) => {
    return new Promise(resolve => {
        axios.get(`${dokAPI}${deckID}`,dokKey)
            .then(response => {
                if (response.data) {
                    const {
                            amberControl: A, expectedAmber: E,
                            artifactControl: R, creatureControl: C,
                            efficiency: F, disruption: D, effectivePower: P,
                            sasRating, sasPercentile, aercScore
                        } = response.data.deck,
                        sas = `${ round(sasRating, 2) } SAS • ${ round(aercScore, 2) } AERC`,
                        deckAERC = `A: ${ round(A, 2) } • E: ${ round(E, 2) } • R: ${ round(R, 2) } • C: ${ round(C, 2) } • F: ${ round(F, 2) } • D: ${ round(D, 2) } • P: ${ round(P, 2) }`,
                        sasStar = sasStarRating(sasPercentile);
                    resolve({sas, deckAERC, sasStar});
                } else resolve(['Unable to Retrieve SAS', 'Unable to Retrieve AERC']);
            }).catch(() => resolve(['Unable to Retrieve SAS, DoK non-responsive', 'Unable to Retrieve AERC, DoK non-responsive']));
    });
};

const fetchUnknownCard = (cardId, deckId) => new Promise(async resolve => {
    console.log(`${ cardId } not found, fetching from the man`);
    const fetchedCards = await axios.get(`http://www.keyforgegame.com/api/decks/${ deckId }/?links=cards`);
    const card = fetchedCards.data._linked.cards.find(o => o.id === cardId);
    resolve(card);
    db.collection('AllCards').doc(card.id).set(card).then(() => {
        console.log(`${ card.id } has been added to firestore`);
    });
});

const fetchRandomDecks = (expansion) => new Promise(resolve => {
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
        }).catch(console.error);
});

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

const getFlagSet = (flags) => {
    const final = filter(sets, set => flags.includes(set.flag.toLowerCase()));
    return get(final, '[0].set_number');
};

const getFlagLang = (flags) => {
    const final = filter(flags, flag => langs.includes(flag));
    return get(final, '[0]', 'en');
};

const getFlagNumber = (flags, defaultNumber = 0) => {
    const final = +(get(filter(flags, flag => Number.isInteger(+flag)), '[0]'));
    if(final) return final;
    else return defaultNumber;
};

const shortenURL = (url) => {
    return new Promise(resolve => {
        axios.post('https://api-ssl.bitly.com/v4/shorten',
            {long_url: url, domain: 'skyj.io'}, {
                headers: {
                    'Authorization': `Bearer 703970e0f1b6d05940cc756f55c5f8453cd96a43`,
                    'Content-Type': "application/json"
                }
            })
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
exports.fetchDeckBasic = fetchDeckBasic;
exports.fetchDeckBasicMV = fetchDeckBasicMV;
exports.fetchCard = fetchCard;
exports.fetchDoK = fetchDoK;
exports.fetchFAQ = fetchFAQ;
exports.fetchUnknownCard = fetchUnknownCard;
exports.fetchRandomDecks = fetchRandomDecks;
exports.getFlagLang = getFlagLang;
exports.getFlagSet = getFlagSet;
exports.getFlagNumber = getFlagNumber;
exports.shortenURL = shortenURL;
exports.rarityFix = rarityFix;
exports.format = format;