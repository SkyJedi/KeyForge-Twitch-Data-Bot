const client = require('../index');
const {findIndex, upperCase} = require('lodash');
const rules = require('../card_data/rules');

const {format} = require('./fetch');
const rule = (target, context, params, msg = '') => {
    let i = findIndex(Object.keys(rules), term => term === params.join(' ') || term.startsWith(params.join(' ')));
    const key = Object.keys(rules)[i];
    if (key) msg = `RULE - ${upperCase(key)} - ${format(rules[key])}`;
    else msg = `Rule: ${params.join(' ')} not found`;
    client.sendMessage(target, context, msg);
};

exports.rule = rule;