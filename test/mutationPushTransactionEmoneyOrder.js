const {request, GraphQLClient, gql} = require('graphql-request');
const {v4: uuidv4} = require('uuid');
const assert = require("assert");
let config = require("./config.js");
let {
    wait, createQueryAllOrders,
    createMutationPushTransactionCreateOrder: createMutationPushTransaction
} = require("./functions.js");
const serializeTransaction = require("./serializeTransaction.js");

describe("Create EMONEY orders", function () {
    this.timeout(175000);

    // Local variables
    const 'REDACTED'Name = config.'REDACTED'.code
    const cashTokenName = config.cashToken.code

    let transactionJson = []
    let paymentType, currencyId, currencyName, tokenName, countryId, countryName, isCashRate, rate, paymentSystemId
    let memo, volume, insurance, minPackage, maxPackage, serializedTransactionJson, walletNumber
    let uuid, dataJson, orderType, mutationPushTransaction, transactionName, signatureDate
    let generatedSignature, queryAllOrders
    let userA, userB, userC, 'REDACTED', paySC, cashToken, cashSC, response

    // Local functions
    const createDataJson = ({generatedSignature}) => {
        if (orderType === 'BUY') {
            dataJson = {
                data_type: paymentType,
                uuid: uuid,
                signature: {
                    username: userA.name,
                    text: signatureDate,
                    signature: generatedSignature.signatures[0]
                },
                payload: {
                    rate: rate,
                    is_cash_rate: isCashRate,
                    currency_id: currencyId,
                    memo: memo,
                    payment_system_id: paymentSystemId
                }
            }
        } else {
            dataJson = {
                data_type: paymentType,
                uuid: uuid,
                signature: {
                    username: userA.name,
                    text: signatureDate,
                    signature: generatedSignature.signatures[0]
                },
                payload: {
                    rate: rate,
                    is_cash_rate: isCashRate,
                    currency_id: currencyId,
                    memo: memo,
                    payment_system_id: paymentSystemId,
                    wallet_number: walletNumber
                }
            }
        }
        return dataJson
    }

    const createTransactionJson = () => {
        if (orderType === 'BUY') {
            transactionName = 'crtbuyord'
        } else {
            transactionName = 'crtsellord'
        }

        transactionJson = [{
            account: cashTokenName,
            name: 'transfer',
            authorization: [
                {
                    actor: userA.name,
                    permission: "active"
                }
            ],
            data: {
                from: userA.name,
                to: 'REDACTED'Name,
                quantity: '1.50000 ' + tokenName,
                memo: 'deposit'
            }
        }, {
            account: 'REDACTED'Name,
            name: transactionName,
            authorization: [
                {
                    actor: userA.name,
                    permission: "active"
                }
            ],
            data: {
                user: userA.name,
                volume: volume + ' ' + tokenName,
                insurance: insurance + ' ' + tokenName,
                min_package: minPackage + ' ' + tokenName,
                max_package: maxPackage + ' ' + tokenName,
                meta: "{\"params\":{\"payment_system_id\":\"" + paymentSystemId + "\"},\"type\":\"" + paymentType + "\",\"uuid\":\"" + uuid + "\"}",
                data: "{\"country\":\"" + countryName + "\"}"
            }
        }]
        return transactionJson
    }

    beforeEach(async () => {
        // define variables here
        uuid = uuidv4()
        paymentType = 'EMONEY';
        currencyId = 13;
        currencyName = 'UAH';
        tokenName = currencyName + 'CASH';
        countryId = 236
        countryName = 'Ukraine'
        rate = '1'
        isCashRate = true
        walletNumber = 'REDACTED'
        paymentSystemId = 4
        memo = 'memo1'
        volume = "1.00000"
        // insurance = (volume / 10).toPrecision(5)
        insurance = "0.10000"
        minPackage = volume
        maxPackage = volume
        signatureDate = await new Date().toISOString()

        userA = {
            name: 'nnnnnn.'REDACTED'',
            privateKey: 'REDACTED'
        }
        userB = {
            name: '134251.'REDACTED'',
            privateKey: 'REDACTED'
        }
        userC = {
            name: 'avpw.'REDACTED'',
            privateKey: 'REDACTED'
        }
    })

    it("Successfully create a buy order", async () => {
        orderType = 'BUY'

        generatedSignature = await serializeTransaction({from: userA, transactionJson: []})
        dataJson = await createDataJson({generatedSignature})
        queryAllOrders = await createQueryAllOrders({from: userA, generatedSignature, signatureDate})
        transactionJson = await createTransactionJson()

        serializedTransactionJson = await serializeTransaction({from: userA, transactionJson})
        mutationPushTransaction = await createMutationPushTransaction({serializedTransactionJson, dataJson, orderType})

        response = await request(config.apiUrl, mutationPushTransaction)
        console.log(response)
        assert.equal(response.pushTransaction.response, null)
        assert.equal(response.pushTransaction.errors, null)

        await wait(35000)

        let allOrdersOfUser = await request(config.apiUrl, queryAllOrders)
        console.log(allOrdersOfUser)
        let ordersArray = await allOrdersOfUser.allOrders.orders
        let myOrder = await ordersArray.find(x => x.uuid === uuid)
        console.log(myOrder)
        console.log(uuid)
        assert.equal(myOrder.data_type, paymentType)
        assert.equal(myOrder.order_type, orderType)
        assert.equal(myOrder.owner, userA.name)
        assert.equal(myOrder.token, tokenName)
        assert.equal(myOrder.status, 'available')
        assert.equal(myOrder.volume, volume + ' ' + tokenName)
        assert.equal(myOrder.insurance, insurance + ' ' + tokenName)
        assert.equal(myOrder.volume_balance, volume + ' ' + tokenName)
        assert.equal(myOrder.insurance_balance, insurance + ' ' + tokenName)
        assert.equal(myOrder.min_package, volume + ' ' + tokenName)
        assert.equal(myOrder.max_package, volume + ' ' + tokenName)
        assert.equal(myOrder.memo, memo)
        assert.deepEqual(myOrder.bank_ids, [])
        assert.equal(myOrder.city_id, null)
        assert.equal(myOrder.country_id, null)
        assert.equal(myOrder.card_name, null)
        assert.equal(myOrder.card_expiry, null)
        assert.equal(myOrder.cvv, null)
        assert.equal(myOrder.blockchain_id, null)
        assert.equal(myOrder.payment_system_id, paymentSystemId)
        assert.equal(myOrder.rate, rate)
        assert.equal(myOrder.currency_id, currencyId)
        assert.equal(myOrder.card_number, null)
        assert.equal(myOrder.payment_url, null)
        assert.equal(myOrder.wallet_number, null)
        assert.equal(myOrder.wallet_address, null)
    })

    it("Successfully create a sell order", async () => {
        orderType = 'SELL'

        generatedSignature = await serializeTransaction({from: userA, transactionJson: []})
        dataJson = await createDataJson({generatedSignature})
        queryAllOrders = await createQueryAllOrders({from: userA, generatedSignature, signatureDate})
        transactionJson = await createTransactionJson()

        serializedTransactionJson = await serializeTransaction({from: userA, transactionJson})
        mutationPushTransaction = await createMutationPushTransaction({serializedTransactionJson, dataJson, orderType})

        response = await request(config.apiUrl, mutationPushTransaction)
        console.log(response)
        assert.equal(response.pushTransaction.response, null)
        assert.equal(response.pushTransaction.errors, null)

        await wait(35000)

        let allOrdersOfUser = await request(config.apiUrl, queryAllOrders)
        console.log(allOrdersOfUser)
        let ordersArray = await allOrdersOfUser.allOrders.orders
        let myOrder = await ordersArray.find(x => x.uuid === uuid)
        console.log(myOrder)
        console.log(uuid)
        assert.equal(myOrder.data_type, paymentType)
        assert.equal(myOrder.order_type, orderType)
        assert.equal(myOrder.owner, userA.name)
        assert.equal(myOrder.token, tokenName)
        assert.equal(myOrder.status, 'available')
        assert.equal(myOrder.volume, volume + ' ' + tokenName)
        assert.equal(myOrder.insurance, insurance + ' ' + tokenName)
        assert.equal(myOrder.volume_balance, volume + ' ' + tokenName)
        assert.equal(myOrder.insurance_balance, insurance + ' ' + tokenName)
        assert.equal(myOrder.min_package, volume + ' ' + tokenName)
        assert.equal(myOrder.max_package, volume + ' ' + tokenName)
        assert.equal(myOrder.memo, memo)
        assert.deepEqual(myOrder.bank_ids, [])
        assert.equal(myOrder.city_id, null)
        assert.equal(myOrder.country_id, null)
        assert.equal(myOrder.card_name, null)
        assert.equal(myOrder.card_expiry, null)
        assert.equal(myOrder.cvv, null)
        assert.equal(myOrder.blockchain_id, null)
        assert.equal(myOrder.payment_system_id, paymentSystemId)
        assert.equal(myOrder.rate, rate)
        assert.equal(myOrder.currency_id, currencyId)
        assert.equal(myOrder.card_number, null)
        assert.equal(myOrder.payment_url, null)
        assert.equal(myOrder.wallet_number, walletNumber)
        assert.equal(myOrder.wallet_address, null)
    })

    it("pushTransaction EMONEY SELL with the payload of BUY", async () => {
        orderType = 'BUY'

        generatedSignature = await serializeTransaction({from: userA, transactionJson: []})
        dataJson = await createDataJson({generatedSignature})

        orderType = 'SELL'

        queryAllOrders = await createQueryAllOrders({from: userA, generatedSignature, signatureDate})
        transactionJson = await createTransactionJson()
        serializedTransactionJson = await serializeTransaction({from: userA, transactionJson})
        mutationPushTransaction = await createMutationPushTransaction({serializedTransactionJson, dataJson, orderType})

        response = await request(config.apiUrl, mutationPushTransaction)
        console.log(response)
        assert.equal(response.pushTransaction.transactionResponse, null)
        assert.equal(response.pushTransaction.response.includes('Missing data for required field'), true)
        assert.equal(response.pushTransaction.errors, 'INVALID_DATA')

        await wait(35000)

        let allOrdersOfUser = await request(config.apiUrl, queryAllOrders)
        let ordersArray = await allOrdersOfUser.allOrders.orders
        let myOrder = await ordersArray.find(x => x.uuid === uuid)

        if (myOrder) {
            throw new Error('the order ' + uuid + ' was inserted into the DB')
        }
    })

    it("pushTransaction EMONEY BUY with the payload of SELL", async () => {
        orderType = 'SELL'

        generatedSignature = await serializeTransaction({from: userA, transactionJson: []})
        dataJson = await createDataJson({generatedSignature})

        orderType = 'BUY'

        queryAllOrders = await createQueryAllOrders({from: userA, generatedSignature, signatureDate})
        transactionJson = await createTransactionJson()
        serializedTransactionJson = await serializeTransaction({from: userA, transactionJson})
        mutationPushTransaction = await createMutationPushTransaction({serializedTransactionJson, dataJson, orderType})

        response = await request(config.apiUrl, mutationPushTransaction)
        console.log(response)
        assert.equal(response.pushTransaction.transactionResponse, null)
        assert.equal(response.pushTransaction.response.includes('Unknown field'), true)
        assert.equal(response.pushTransaction.errors, 'INVALID_DATA')

        await wait(35000)

        let allOrdersOfUser = await request(config.apiUrl, queryAllOrders)
        let ordersArray = await allOrdersOfUser.allOrders.orders
        let myOrder = await ordersArray.find(x => x.uuid === uuid)

        if (myOrder) {
            throw new Error('the order ' + uuid + ' was inserted into the DB')
        }
    })

    it("pushTransaction EMONEY BUY but rate has the wrong format", async () => {
        orderType = 'BUY'
        rate = 2.3

        generatedSignature = await serializeTransaction({from: userA, transactionJson: []})
        dataJson = await createDataJson({generatedSignature})
        queryAllOrders = await createQueryAllOrders({from: userA, generatedSignature, signatureDate})
        transactionJson = await createTransactionJson()
        serializedTransactionJson = await serializeTransaction({from: userA, transactionJson})
        mutationPushTransaction = await createMutationPushTransaction({serializedTransactionJson, dataJson, orderType})

        response = await request(config.apiUrl, mutationPushTransaction)
        console.log(response)
        assert.equal(response.pushTransaction.transactionResponse, null)
        assert.equal(response.pushTransaction.response.includes('\'rate\': [\'Not a valid string.\']'), true)
        assert.equal(response.pushTransaction.errors, 'INVALID_DATA')
    })

    it("pushTransaction EMONEY BUY but currency_id has the wrong format", async () => {
        orderType = 'BUY'
        currencyId = '2'

        generatedSignature = await serializeTransaction({from: userA, transactionJson: []})
        dataJson = await createDataJson({generatedSignature})
        queryAllOrders = await createQueryAllOrders({from: userA, generatedSignature, signatureDate})
        transactionJson = await createTransactionJson()
        serializedTransactionJson = await serializeTransaction({from: userA, transactionJson})
        mutationPushTransaction = await createMutationPushTransaction({serializedTransactionJson, dataJson, orderType})

        response = await request(config.apiUrl, mutationPushTransaction)
        console.log(response)
        assert.equal(response.pushTransaction.transactionResponse, null)
        assert.equal(response.pushTransaction.response.includes('\'rate\': [\'Not a valid string.\']'), true)
        assert.equal(response.pushTransaction.errors, 'INVALID_DATA')
    })

    it("pushTransaction EMONEY BUY but currency_id is way too big", async () => {
        orderType = 'BUY'
        currencyId = 92

        generatedSignature = await serializeTransaction({from: userA, transactionJson: []})
        dataJson = await createDataJson({generatedSignature})
        queryAllOrders = await createQueryAllOrders({from: userA, generatedSignature, signatureDate})
        transactionJson = await createTransactionJson()
        serializedTransactionJson = await serializeTransaction({from: userA, transactionJson})
        mutationPushTransaction = await createMutationPushTransaction({serializedTransactionJson, dataJson, orderType})

        response = await request(config.apiUrl, mutationPushTransaction)
        console.log(response)
        assert.equal(response.pushTransaction.transactionResponse, null)
        assert.equal(response.pushTransaction.response.includes('some of payload ids is invalid'), true)
        assert.equal(response.pushTransaction.errors, 'INVALID_DATA')
    })

    it("pushTransaction EMONEY BUY but payment_system_id has the wrong format", async () => {
        orderType = 'BUY'
        paymentSystemId = '1'

        generatedSignature = await serializeTransaction({from: userA, transactionJson: []})
        dataJson = await createDataJson({generatedSignature})
        queryAllOrders = await createQueryAllOrders({from: userA, generatedSignature, signatureDate})
        transactionJson = await createTransactionJson()
        serializedTransactionJson = await serializeTransaction({from: userA, transactionJson})
        mutationPushTransaction = await createMutationPushTransaction({serializedTransactionJson, dataJson, orderType})

        response = await request(config.apiUrl, mutationPushTransaction)
        console.log(response)
        assert.equal(response.pushTransaction.transactionResponse, null)
        assert.equal(response.pushTransaction.response.includes('\'rate\': [\'Not a valid string.\']'), true)
        assert.equal(response.pushTransaction.errors, 'INVALID_DATA')
    })

    it("pushTransaction EMONEY BUY but payment_system_id is way too big", async () => {
        orderType = 'BUY'
        paymentSystemId = 92

        generatedSignature = await serializeTransaction({from: userA, transactionJson: []})
        dataJson = await createDataJson({generatedSignature})
        queryAllOrders = await createQueryAllOrders({from: userA, generatedSignature, signatureDate})
        transactionJson = await createTransactionJson()
        serializedTransactionJson = await serializeTransaction({from: userA, transactionJson})
        mutationPushTransaction = await createMutationPushTransaction({serializedTransactionJson, dataJson, orderType})

        response = await request(config.apiUrl, mutationPushTransaction)
        console.log(response)
        assert.equal(response.pushTransaction.transactionResponse, null)
        assert.equal(response.pushTransaction.response.includes('some of payload ids is invalid'), true)
        assert.equal(response.pushTransaction.errors, 'INVALID_DATA')
    })

    it("pushTransaction EMONEY SELL but wallet_number has the wrong format", async () => {
        orderType = 'SELL'
        walletNumber = 19191999191991991

        generatedSignature = await serializeTransaction({from: userA, transactionJson: []})
        dataJson = await createDataJson({generatedSignature})
        queryAllOrders = await createQueryAllOrders({from: userA, generatedSignature, signatureDate})
        transactionJson = await createTransactionJson()
        serializedTransactionJson = await serializeTransaction({from: userA, transactionJson})
        mutationPushTransaction = await createMutationPushTransaction({serializedTransactionJson, dataJson, orderType})

        response = await request(config.apiUrl, mutationPushTransaction)
        console.log(response)
        assert.equal(response.pushTransaction.transactionResponse, null)
        assert.equal(response.pushTransaction.response.includes('\'wallet_number\': [\'Not a valid string.\']'), true)
        assert.equal(response.pushTransaction.errors, 'INVALID_DATA')
    })

    it("pushTransaction EMONEY SELL but memo has the wrong format", async () => {
        orderType = 'SELL'
        memo = 19191999191991991

        generatedSignature = await serializeTransaction({from: userA, transactionJson: []})
        dataJson = await createDataJson({generatedSignature})
        queryAllOrders = await createQueryAllOrders({from: userA, generatedSignature, signatureDate})
        transactionJson = await createTransactionJson()
        serializedTransactionJson = await serializeTransaction({from: userA, transactionJson})
        mutationPushTransaction = await createMutationPushTransaction({serializedTransactionJson, dataJson, orderType})

        response = await request(config.apiUrl, mutationPushTransaction)
        console.log(response)
        assert.equal(response.pushTransaction.transactionResponse, null)
        assert.equal(response.pushTransaction.response.includes('\'memo\': [\'Not a valid string.\']'), true)
        assert.equal(response.pushTransaction.errors, 'INVALID_DATA')
    })

    it("pushTransaction EMONEY SELL but is_cash_rate has the wrong format", async () => {
        orderType = 'SELL'
        isCashRate = 1

        generatedSignature = await serializeTransaction({from: userA, transactionJson: []})
        dataJson = await createDataJson({generatedSignature})
        queryAllOrders = await createQueryAllOrders({from: userA, generatedSignature, signatureDate})
        transactionJson = await createTransactionJson()
        serializedTransactionJson = await serializeTransaction({from: userA, transactionJson})
        mutationPushTransaction = await createMutationPushTransaction({serializedTransactionJson, dataJson, orderType})

        response = await request(config.apiUrl, mutationPushTransaction)
        console.log(response)
        assert.equal(response.pushTransaction.transactionResponse, null)
        assert.equal(response.pushTransaction.response.includes('\'is_cash_rate\': [\'Not a valid string.\']'), true)
        assert.equal(response.pushTransaction.errors, 'INVALID_DATA')
    })

    it("pushTransaction EMONEY SELL but the signature is incorrect", async () => {
        orderType = 'SELL'

        // Generate a signature from another user for data
        generatedSignature = await serializeTransaction({from: userC, transactionJson: []})

        dataJson = await createDataJson({generatedSignature})
        queryAllOrders = await createQueryAllOrders({from: userA, generatedSignature, signatureDate})
        transactionJson = await createTransactionJson()
        serializedTransactionJson = await serializeTransaction({from: userA, transactionJson})
        mutationPushTransaction = await createMutationPushTransaction({serializedTransactionJson, dataJson, orderType})

        response = await request(config.apiUrl, mutationPushTransaction)
        console.log(response)
        assert.equal(response.pushTransaction.transactionResponse, null)
        assert.equal(response.pushTransaction.response.includes('\'card_number\': [\'Not a valid string.\']'), true)
        assert.equal(response.pushTransaction.errors, 'INVALID_DATA')
    })

    it("pushTransaction EMONEY SELL but there is an error from blockchain", async () => {
        orderType = 'SELL'
        volume = "1.0000"

        generatedSignature = await serializeTransaction({from: userA, transactionJson: []})
        dataJson = await createDataJson({generatedSignature})
        queryAllOrders = await createQueryAllOrders({from: userA, generatedSignature, signatureDate})
        transactionJson = await createTransactionJson()
        serializedTransactionJson = await serializeTransaction({from: userA, transactionJson})
        mutationPushTransaction = await createMutationPushTransaction({serializedTransactionJson, dataJson, orderType})

        response = await request(config.apiUrl, mutationPushTransaction)
        console.log(response)
        assert.equal(response.pushTransaction.transactionResponse.includes('"code":500'), true)
        assert.equal(response.pushTransaction.response, null)
        assert.equal(response.pushTransaction.errors, 'EOS_UNKNOWN_ERROR')

        await wait(35000)

        let allOrdersOfUser = await request(config.apiUrl, queryAllOrders)
        let ordersArray = await allOrdersOfUser.allOrders.orders
        let myOrder = await ordersArray.find(x => x.uuid === uuid)

        if (myOrder) {
            throw new Error('the order ' + uuid + ' was inserted into the DB')
        }
    })

    module.exports = {
        createDataJson,
        createTransactionJson
    };
})