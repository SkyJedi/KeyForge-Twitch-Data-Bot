const client = require('../index');

const {fetchFAQ} = require('./fetch');

const faq = (target, context, params, msg = '') => {
    const data = fetchFAQ(params);
    if (data) {
        msg = `QUESTION: ${data.question} ANSWER: ${data.answer}`;
        client.sendMessage(target, context, msg);
    }
};


exports.faq = faq;