const {random, nth} = require('lodash');
const client = require('../index');
const comebacks = require('../comebacks');

exports.comeback = (target, context) => client.sendMessage(target, context, nth(comebacks, random(comebacks.length-1)));

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