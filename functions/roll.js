const client = require('../index');
const {random} = require('lodash');
const dice = sides => random(1, sides);

const roll = (target, context, params) => {
    let text = 'rolled:';
    params.forEach(unit => {
        let modifier = 0, position = 0;
        text += `  \`${unit}\` (`;

        if (unit.includes("+")) {
            for (let k = 0; k < unit.length; k++) {
                if (unit[k] === '+') {
                    modifier = +unit.slice(k + 1);
                    unit = unit.slice(0, k - unit.length);
                    break;
                }
            }
        }

        if (unit.includes("-")) {
            for (let l = 0; l < unit.length; l++) {
                if (unit[l] === '-') {
                    modifier = -(+unit.slice(l + 1));
                    unit = unit.slice(0, l - unit.length);
                    break;
                }
            }
        }

        for (let i = 0; i < unit.length; i++) {
            if (unit[i] === 'd') {
                position = i;
                break;
            }
        }

        let dieAmount = unit.slice(0, position);
        if (!dieAmount) dieAmount = 1;
        let dieType = unit.slice(position + 1);
        let total = 0;
        let rolls = [];

        if (dieAmount > 1000) {
            text = `Roll exceeds max roll per die limit of 1000. Please try again.`;
            client.sendMessage(target, context, text);
            return;
        }

        for (let j = 0; j < dieAmount; j++) {
            rolls.push(dice(dieType));
        }

        rolls.forEach(roll => {
            text += `${roll} + `;
            total += roll;
        });

        total += modifier;
        text = `${text.slice(0, -3)})`;
        if (modifier > 0) text += ` + ${modifier}`;
        if (modifier < 0) text += ` - ${Math.abs(modifier)}`;
        if (text.length < 1500) {
            text += ` = ${total}.`;
        } else text = `Too many dice to display.  Total roll is ${total}.`;
    });
    client.sendMessage(target, context, text)
};

exports.roll = roll;