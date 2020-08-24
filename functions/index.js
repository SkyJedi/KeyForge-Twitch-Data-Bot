const client = require('../index');

exports.bestkey = (target, context) => client.sendMessage(target, context, `The correct answer is Blue Key`);

exports.deck = require('./deck').deck;
exports.roll = require('./roll').roll;
exports.card = require('./card').card;
exports.help = require('./help').help;
exports.sealed = require('./sealed').sealed;
exports.rule = require('./rule').rule;
exports.faq = require('./faq').faq;
exports.timingChart = require('./timingChart').timingChart;
exports.randomHand = require('./randomHand').randomHand;
exports.weirdo = require('./weirdo').weirdo;
