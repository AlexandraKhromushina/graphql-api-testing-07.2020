let config = require("./config.js");
const {Api, JsonRpc, RpcError} = require('eosjs');
const {JsSignatureProvider} = require('eosjs/dist/eosjs-jssig');      // development only
const fetch = require('node-fetch');                                    // node only; not needed in browsers
const {TextEncoder, TextDecoder} = require('util');
const fs = require("fs");

const arrayToHex = (dataJson) => {
    let hex = '';
    for (const x of dataJson) {
        hex += ('00' + x.toString(16)).slice(-2);
    }
    return hex;
};

const serializeTransaction = async ({
                                        from,
                                        dataJson,
                                        transactionJson,
                                        meta,
                                        orderType
                                    }) => {
    let result
    const privateKeys = [from.privateKey];
    const signatureProvider = new JsSignatureProvider(privateKeys)
    const rpcUrl = config.eos.nodeUrl || '';
    const rpc = new JsonRpc(rpcUrl, {fetch})
    const api = new Api({rpc, signatureProvider, textDecoder: new TextDecoder(), textEncoder: new TextEncoder()})
    const chainId = 'REDACTED'
    const requiredKeys = await api.signatureProvider.getAvailableKeys();
    const transactionHeader = {
        blocksBehind: config.eos.blocksBehind,
        expireSeconds: config.eos.expireSeconds,
    };

    const tx = {
        actions: [
            {
                account: config.freecpu.code,
                name: "freecpu",
                authorization: [
                    {
                        actor: config.freecpu.code,
                        permission: "active",
                    },
                ],
                data: {},
            },
            ...transactionJson
        ],
    }

    let pushTransactionArgs = await api.transact(tx, {
        ...transactionHeader,
        sign: false,
        broadcast: false,
    });

    try {
        const serializedTransaction = pushTransactionArgs.serializedTransaction;

        const signArgs = {
            chainId: api.chainId,
            requiredKeys,
            serializedTransaction,
            abis: []
        };

        const signedTransaction = await api.signatureProvider.sign(signArgs)

        return {
            serializedTransaction: arrayToHex(signedTransaction.serializedTransaction),
            signatures: signedTransaction.signatures
        }
    } catch (e) {
        console.log('\nCaught exception: ' + e);
        if (e instanceof RpcError) {
            console.log(JSON.stringify(e.json, null, 2));
        }
        throw e
    }
}

module.exports = serializeTransaction;