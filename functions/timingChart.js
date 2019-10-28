const client = require('../index');

const timing = require('../card_data/timing');
const {upperCase} = require('lodash');
const {format} = require('./fetch');

const timingChart = (target, context, params,) => {
    let msg = '';
    const step = timing.find(x => params.every(y => x.phase.toLowerCase().includes(y.toLowerCase())));
    if (step && params.length > 0) {
        msg = upperCase(step.phase) + ': ' + format(step.steps);
        client.sendMessage(target, context, msg);
    }
};

exports.timingChart = timingChart;