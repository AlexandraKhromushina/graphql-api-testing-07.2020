require('dotenv').config()

let config = {
    eos: {
        privateKey: process.env.EOS_PRIVATE_KEY || '',
        nodeUrl: process.env.EOS_NODE_URL || 'REDACTED',
        blocksBehind: 60,
        expireSeconds: 60,
    },
    dbConnectionString: process.env.PG_CONN_STR,
    apiUrl: process.env.API_URL || 'REDACTED',
    freecpu: {
        code: process.env.FREECPU_CODE || 'REDACTED',
    },
    'REDACTED': {
        code: process.env.'REDACTED'_CODE || 'REDACTED',
    },
    cashToken: {
        code: process.env.'REDACTED'_CODE || 'REDACTED',
    }
}

module.exports = config;