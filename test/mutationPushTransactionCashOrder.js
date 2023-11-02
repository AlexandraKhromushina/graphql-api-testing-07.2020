const {request, GraphQLClient, gql} = require('graphql-request');
const {v4: uuidv4} = require('uuid');
const assert = require("assert");
let config = require("./config.js");
let {
    wait, createQueryAllOrders,
    createMutationPushTransactionCreateOrder: createMutationPushTransaction
} = require("./functions.js");
const serializeTransaction = require("./serializeTransaction.js");

describe("Create CASH orders", function () {
    this.timeout(175000);

    // Local variables
    const 'REDACTED'Name = config.'REDACTED'.code
    const cashTokenName = config.cashToken.code

    let transactionJson = []
    let paymentType, currencyId, currencyName, tokenName, countryId, countryName, isCashRate, rate, cityId
    let bankName, memo, volume, insurance, minPackage, maxPackage, serializedTransactionJson, response
    let uuid, dataJson, orderType, mutationPushTransaction, data, transactionName, meta
    let signatureDate, generatedSignature, queryAllOrders
    let userA, userB, userC, 'REDACTED', paySC, cashToken, cashSC

    // Local functions
    const createDataJson = ({
                                generatedSignature,
                                signatureDate,
                                paymentType,
                                uuid,
                                from,
                                rate,
                                currencyId,
                                countryId,
                                cityId,
                                memo
                            }) => {
        dataJson = {
            data_type: paymentType,
            uuid: uuid,
            signature: {
                username: from.name,
                text: signatureDate,
                signature: generatedSignature.signatures[0]
            },
            payload: {
                rate: rate,
                is_cash_rate: isCashRate,
                currency_id: currencyId,
                country_id: countryId,
                city_id: cityId,
                memo: memo
            }
        }
        return dataJson
    }

    const createTransactionJson = ({
                                       orderType,
                                       cashTokenName,
                                       from,
                                       'REDACTED'Name,
                                       tokenName,
                                       volume,
                                       insurance,
                                       minPackage,
                                       maxPackage,
                                       cityId,
                                       paymentType,
                                       uuid,
                                       countryName
                                   }) => {
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
                    actor: from.name,
                    permission: "active"
                }
            ],
            data: {
                from: from.name,
                to: 'REDACTED'Name,
                quantity: '1.50000 ' + tokenName,
                memo: 'deposit'
            }
        }, {
            account: 'REDACTED'Name,
            name: transactionName,
            authorization: [
                {
                    actor: from.name,
                    permission: "active"
                }
            ],
            data: {
                user: userA.name,
                volume: volume + ' ' + tokenName,
                insurance: insurance + ' ' + tokenName,
                min_package: minPackage + ' ' + tokenName,
                max_package: maxPackage + ' ' + tokenName,
                meta: "{\"params\":{\"city_id\":\"" + cityId + "\"},\"type\":\"" + paymentType + "\",\"uuid\":\"" + uuid + "\"}",
                data: "{\"country\":\"" + countryName + "\"}"
            }
        }]
        return transactionJson
    }

    beforeEach(async () => {
        // define variables here
        uuid = uuidv4()
        paymentType = 'CASH';
        currencyId = 13;
        currencyName = 'UAH';
        tokenName = currencyName + 'CASH';
        countryId = 1
        countryName = 'Ukraine'
        cityId = 1
        rate = '2'
        isCashRate = true
        bankName = 'Mono'
        memo = 'cashorder'
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
        dataJson = await createDataJson({
            generatedSignature,
            signatureDate,
            paymentType,
            uuid,
            from: userA,
            rate,
            currencyId,
            countryId,
            cityId,
            memo
        })
        queryAllOrders = await createQueryAllOrders({from: userA, generatedSignature, signatureDate})
        transactionJson = await createTransactionJson({
            orderType,
            cashTokenName,
            from: userA,
            'REDACTED'Name,
            tokenName,
            volume,
            insurance,
            minPackage,
            maxPackage,
            cityId,
            paymentType,
            uuid,
            countryName
        })
        serializedTransactionJson = await serializeTransaction({from: userA, transactionJson})
        mutationPushTransaction = await createMutationPushTransaction({serializedTransactionJson, dataJson, orderType})

        response = await request(config.apiUrl, mutationPushTransaction)
        console.log(response)
        assert.equal(response.pushTransaction.response, null)
        assert.equal(response.pushTransaction.errors, null)

        await wait(15000)

        let allOrdersOfUser = await request(config.apiUrl, queryAllOrders)
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
        assert.equal(myOrder.city_id, cityId)
        assert.equal(myOrder.country_id, countryId)
        assert.equal(myOrder.card_name, null)
        assert.equal(myOrder.card_expiry, null)
        assert.equal(myOrder.cvv, null)
        assert.equal(myOrder.blockchain_id, null)
        assert.equal(myOrder.payment_system_id, null)
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
        dataJson = await createDataJson({
            generatedSignature,
            signatureDate,
            paymentType,
            uuid,
            from: userA,
            rate,
            currencyId,
            countryId,
            cityId,
            memo
        })
        queryAllOrders = await createQueryAllOrders({from: userA, generatedSignature, signatureDate})
        transactionJson = await createTransactionJson({
            orderType,
            cashTokenName,
            from: userA,
            'REDACTED'Name,
            tokenName,
            volume,
            insurance,
            minPackage,
            maxPackage,
            cityId,
            paymentType,
            uuid,
            countryName
        })
        serializedTransactionJson = await serializeTransaction({from: userA, transactionJson})
        mutationPushTransaction = await createMutationPushTransaction({serializedTransactionJson, dataJson, orderType})

        response = await request(config.apiUrl, mutationPushTransaction)
        console.log(response)
        assert.equal(response.pushTransaction.response, null)
        assert.equal(response.pushTransaction.errors, null)

        await wait(15000)

        let allOrdersOfUser = await request(config.apiUrl, queryAllOrders)
        let ordersArray = await allOrdersOfUser.allOrders.orders
        let myOrder = await ordersArray.find(x => x.uuid === uuid)
        console.log(myOrder)
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
        assert.equal(myOrder.city_id, cityId)
        assert.equal(myOrder.country_id, countryId)
        assert.equal(myOrder.card_name, null)
        assert.equal(myOrder.card_expiry, null)
        assert.equal(myOrder.cvv, null)
        assert.equal(myOrder.blockchain_id, null)
        assert.equal(myOrder.payment_system_id, null)
        assert.equal(myOrder.rate, rate)
        assert.equal(myOrder.currency_id, currencyId)
        assert.equal(myOrder.card_number, null)
        assert.equal(myOrder.payment_url, null)
        assert.equal(myOrder.wallet_number, null)
        assert.equal(myOrder.wallet_address, null)
    })

    it("pushTransaction CASH BUY but rate has the wrong format", async () => {
        orderType = 'BUY'
        rate = 23456

        generatedSignature = await serializeTransaction({from: userA, transactionJson: []})
        dataJson = await createDataJson({
            generatedSignature,
            signatureDate,
            paymentType,
            uuid,
            from: userA,
            rate,
            currencyId,
            countryId,
            cityId,
            memo
        })
        queryAllOrders = await createQueryAllOrders({from: userA, generatedSignature, signatureDate})
        transactionJson = await createTransactionJson({
            orderType,
            cashTokenName,
            from: userA,
            'REDACTED'Name,
            tokenName,
            volume,
            insurance,
            minPackage,
            maxPackage,
            cityId,
            paymentType,
            uuid,
            countryName
        })
        serializedTransactionJson = await serializeTransaction({from: userA, transactionJson})
        mutationPushTransaction = await createMutationPushTransaction({serializedTransactionJson, dataJson, orderType})

        response = await request(config.apiUrl, mutationPushTransaction)
        console.log(response)
        assert.equal(response.pushTransaction.transactionResponse, null)
        assert.equal(response.pushTransaction.response.includes('\'rate\': [\'Not a valid string.\']'), true)
        assert.equal(response.pushTransaction.errors, 'INVALID_DATA')

        await wait(35000)

        let allOrdersOfUser = await request(config.apiUrl, queryAllOrders)
        let ordersArray = await allOrdersOfUser.allOrders.orders
        let myOrder = await ordersArray.find(x => x.uuid === uuid)

        if (myOrder) {
            throw new Error('the order ' + uuid + ' was inserted into the DB')
        }
    })

    it("pushTransaction CASH BUY but currency_id has the wrong format", async () => {
        orderType = 'BUY'
        currencyId = '3'

        generatedSignature = await serializeTransaction({from: userA, transactionJson: []})
        dataJson = await createDataJson({
            generatedSignature,
            signatureDate,
            paymentType,
            uuid,
            from: userA,
            rate,
            currencyId,
            countryId,
            cityId,
            memo
        })
        queryAllOrders = await createQueryAllOrders({from: userA, generatedSignature, signatureDate})
        transactionJson = await createTransactionJson({
            orderType,
            cashTokenName,
            from: userA,
            'REDACTED'Name,
            tokenName,
            volume,
            insurance,
            minPackage,
            maxPackage,
            cityId,
            paymentType,
            uuid,
            countryName
        })
        serializedTransactionJson = await serializeTransaction({from: userA, transactionJson})
        mutationPushTransaction = await createMutationPushTransaction({serializedTransactionJson, dataJson, orderType})

        response = await request(config.apiUrl, mutationPushTransaction)
        console.log(response)
        assert.equal(response.pushTransaction.transactionResponse, null)
        assert.equal(response.pushTransaction.response.includes('currency_id must be an int'), true)
        assert.equal(response.pushTransaction.errors, 'INVALID_DATA')
    })

    it("pushTransaction CASH BUY but currency_id is way too big", async () => {
        orderType = 'BUY'
        currencyId = 33

        generatedSignature = await serializeTransaction({from: userA, transactionJson: []})
        dataJson = await createDataJson({
            generatedSignature,
            signatureDate,
            paymentType,
            uuid,
            from: userA,
            rate,
            currencyId,
            countryId,
            cityId,
            memo
        })
        queryAllOrders = await createQueryAllOrders({from: userA, generatedSignature, signatureDate})
        transactionJson = await createTransactionJson({
            orderType,
            cashTokenName,
            from: userA,
            'REDACTED'Name,
            tokenName,
            volume,
            insurance,
            minPackage,
            maxPackage,
            cityId,
            paymentType,
            uuid,
            countryName
        })
        serializedTransactionJson = await serializeTransaction({from: userA, transactionJson})
        mutationPushTransaction = await createMutationPushTransaction({serializedTransactionJson, dataJson, orderType})

        response = await request(config.apiUrl, mutationPushTransaction)
        console.log(response)
        assert.equal(response.pushTransaction.transactionResponse, null)
        assert.equal(response.pushTransaction.response.includes('some of payload ids is invalid'), true)
        assert.equal(response.pushTransaction.errors, 'INVALID_DATA')
    })

    it("pushTransaction CASH BUY but country_id has the wrong format", async () => {
        orderType = 'BUY'
        countryId = '3'

        generatedSignature = await serializeTransaction({from: userA, transactionJson: []})
        dataJson = await createDataJson({
            generatedSignature,
            signatureDate,
            paymentType,
            uuid,
            from: userA,
            rate,
            currencyId,
            countryId,
            cityId,
            memo
        })
        console.log(dataJson)
        queryAllOrders = await createQueryAllOrders({from: userA, generatedSignature, signatureDate})
        transactionJson = await createTransactionJson({
            orderType,
            cashTokenName,
            from: userA,
            'REDACTED'Name,
            tokenName,
            volume,
            insurance,
            minPackage,
            maxPackage,
            cityId,
            paymentType,
            uuid,
            countryName
        })
        console.log('transactionJson: ' + transactionJson)
        serializedTransactionJson = await serializeTransaction({from: userA, transactionJson})
        mutationPushTransaction = await createMutationPushTransaction({serializedTransactionJson, dataJson, orderType})

        response = await request(config.apiUrl, mutationPushTransaction)
        console.log(response)
        assert.equal(response.pushTransaction.transactionResponse, null)
        assert.equal(response.pushTransaction.response.includes('country_id must be an int'), true)
        assert.equal(response.pushTransaction.errors, 'INVALID_DATA')
    })

    it("pushTransaction CASH BUY but country_id is way too big", async () => {
        orderType = 'BUY'
        countryId = 555

        generatedSignature = await serializeTransaction({from: userA, transactionJson: []})
        dataJson = await createDataJson({
            generatedSignature,
            signatureDate,
            paymentType,
            uuid,
            from: userA,
            rate,
            currencyId,
            countryId,
            cityId,
            memo
        })
        queryAllOrders = await createQueryAllOrders({from: userA, generatedSignature, signatureDate})
        transactionJson = await createTransactionJson({
            orderType,
            cashTokenName,
            from: userA,
            'REDACTED'Name,
            tokenName,
            volume,
            insurance,
            minPackage,
            maxPackage,
            cityId,
            paymentType,
            uuid,
            countryName
        })
        serializedTransactionJson = await serializeTransaction({from: userA, transactionJson})
        mutationPushTransaction = await createMutationPushTransaction({serializedTransactionJson, dataJson, orderType})

        response = await request(config.apiUrl, mutationPushTransaction)
        console.log(response)
        assert.equal(response.pushTransaction.transactionResponse, null)
        assert.equal(response.pushTransaction.response.includes('some of payload ids is invalid'), true)
        assert.equal(response.pushTransaction.errors, 'INVALID_DATA')
    })

    it("pushTransaction CASH BUY but city_id has the wrong format", async () => {
        orderType = 'BUY'
        cityId = '3'

        generatedSignature = await serializeTransaction({from: userA, transactionJson: []})
        dataJson = await createDataJson({
            generatedSignature,
            signatureDate,
            paymentType,
            uuid,
            from: userA,
            rate,
            currencyId,
            countryId,
            cityId,
            memo
        })
        queryAllOrders = await createQueryAllOrders({from: userA, generatedSignature, signatureDate})
        transactionJson = await createTransactionJson({
            orderType,
            cashTokenName,
            from: userA,
            'REDACTED'Name,
            tokenName,
            volume,
            insurance,
            minPackage,
            maxPackage,
            cityId,
            paymentType,
            uuid,
            countryName
        })
        serializedTransactionJson = await serializeTransaction({from: userA, transactionJson})
        mutationPushTransaction = await createMutationPushTransaction({serializedTransactionJson, dataJson, orderType})

        response = await request(config.apiUrl, mutationPushTransaction)
        console.log(response)
        assert.equal(response.pushTransaction.transactionResponse, null)
        assert.equal(response.pushTransaction.response.includes('city_id must be an int'), true)
        assert.equal(response.pushTransaction.errors, 'INVALID_DATA')
    })

    it("pushTransaction CASH BUY but city_id is way too big", async () => {
        orderType = 'BUY'
        cityId = 333333333

        generatedSignature = await serializeTransaction({from: userA, transactionJson: []})
        dataJson = await createDataJson({
            generatedSignature,
            signatureDate,
            paymentType,
            uuid,
            from: userA,
            rate,
            currencyId,
            countryId,
            cityId,
            memo
        })
        queryAllOrders = await createQueryAllOrders({from: userA, generatedSignature, signatureDate})
        transactionJson = await createTransactionJson({
            orderType,
            cashTokenName,
            from: userA,
            'REDACTED'Name,
            tokenName,
            volume,
            insurance,
            minPackage,
            maxPackage,
            cityId,
            paymentType,
            uuid,
            countryName
        })
        serializedTransactionJson = await serializeTransaction({from: userA, transactionJson})
        mutationPushTransaction = await createMutationPushTransaction({serializedTransactionJson, dataJson, orderType})

        response = await request(config.apiUrl, mutationPushTransaction)
        console.log(response)
        assert.equal(response.pushTransaction.transactionResponse, null)
        assert.equal(response.pushTransaction.response.includes('some of payload ids is invalid'), true)
        assert.equal(response.pushTransaction.errors, 'INVALID_DATA')
    })

    it("pushTransaction CASH SELL but city_id is not related to the country", async () => {
        orderType = 'SELL'
        countryId = 83
        cityId = 41148

        generatedSignature = await serializeTransaction({from: userA, transactionJson: []})
        dataJson = await createDataJson({
            generatedSignature,
            signatureDate,
            paymentType,
            uuid,
            from: userA,
            rate,
            currencyId,
            countryId,
            cityId,
            memo
        })
        queryAllOrders = await createQueryAllOrders({from: userA, generatedSignature, signatureDate})
        transactionJson = await createTransactionJson({
            orderType,
            cashTokenName,
            from: userA,
            'REDACTED'Name,
            tokenName,
            volume,
            insurance,
            minPackage,
            maxPackage,
            cityId,
            paymentType,
            uuid,
            countryName
        })
        serializedTransactionJson = await serializeTransaction({from: userA, transactionJson})
        mutationPushTransaction = await createMutationPushTransaction({serializedTransactionJson, dataJson, orderType})

        response = await request(config.apiUrl, mutationPushTransaction)
        console.log(response)
        assert.equal(response.pushTransaction.transactionResponse, null)
        assert.equal(response.pushTransaction.response.includes('some of payload ids is invalid'), true)
        assert.equal(response.pushTransaction.errors, 'INVALID_DATA')
    })

    it("pushTransaction CASH SELL but memo has the wrong format", async () => {
        orderType = 'SELL'
        memo = 1

        generatedSignature = await serializeTransaction({from: userA, transactionJson: []})
        dataJson = await createDataJson({
            generatedSignature,
            signatureDate,
            paymentType,
            uuid,
            from: userA,
            rate,
            currencyId,
            countryId,
            cityId,
            memo
        })
        queryAllOrders = await createQueryAllOrders({from: userA, generatedSignature, signatureDate})
        transactionJson = await createTransactionJson({
            orderType,
            cashTokenName,
            from: userA,
            'REDACTED'Name,
            tokenName,
            volume,
            insurance,
            minPackage,
            maxPackage,
            cityId,
            paymentType,
            uuid,
            countryName
        })
        serializedTransactionJson = await serializeTransaction({from: userA, transactionJson})
        mutationPushTransaction = await createMutationPushTransaction({serializedTransactionJson, dataJson, orderType})

        response = await request(config.apiUrl, mutationPushTransaction)
        console.log(response)
        assert.equal(response.pushTransaction.transactionResponse, null)
        assert.equal(response.pushTransaction.response.includes('\'memo\': [\'Not a valid string.\']'), true)
        assert.equal(response.pushTransaction.errors, 'INVALID_DATA')
    })

    it("pushTransaction CASH SELL but is_cash_rate has the wrong format", async () => {
        orderType = 'SELL'
        isCashRate = 'false'

        generatedSignature = await serializeTransaction({from: userA, transactionJson: []})
        dataJson = await createDataJson({
            generatedSignature,
            signatureDate,
            paymentType,
            uuid,
            from: userA,
            rate,
            currencyId,
            countryId,
            cityId,
            memo
        })
        queryAllOrders = await createQueryAllOrders({from: userA, generatedSignature, signatureDate})
        transactionJson = await createTransactionJson({
            orderType,
            cashTokenName,
            from: userA,
            'REDACTED'Name,
            tokenName,
            volume,
            insurance,
            minPackage,
            maxPackage,
            cityId,
            paymentType,
            uuid,
            countryName
        })
        serializedTransactionJson = await serializeTransaction({from: userA, transactionJson})
        mutationPushTransaction = await createMutationPushTransaction({serializedTransactionJson, dataJson, orderType})

        response = await request(config.apiUrl, mutationPushTransaction)
        console.log(response)
        assert.equal(response.pushTransaction.transactionResponse, null)
        assert.equal(response.pushTransaction.response.includes('\'is_cash_rate\': [\'Not a valid boolean.\']'), true)
        assert.equal(response.pushTransaction.errors, 'INVALID_DATA')
    })

    it("pushTransaction CASH SELL but the signature is incorrect", async () => {
        orderType = 'SELL'

        // Generate a signature from another user for data
        generatedSignature = await serializeTransaction({from: userC, transactionJson: []})

        dataJson = await createDataJson({
            generatedSignature,
            signatureDate,
            paymentType,
            uuid,
            from: userA,
            rate,
            currencyId,
            countryId,
            cityId,
            memo
        })
        queryAllOrders = await createQueryAllOrders({from: userA, generatedSignature, signatureDate})
        transactionJson = await createTransactionJson({
            orderType,
            cashTokenName,
            from: userA,
            'REDACTED'Name,
            tokenName,
            volume,
            insurance,
            minPackage,
            maxPackage,
            cityId,
            paymentType,
            uuid,
            countryName
        })
        serializedTransactionJson = await serializeTransaction({from: userA, transactionJson})
        mutationPushTransaction = await createMutationPushTransaction({serializedTransactionJson, dataJson, orderType})

        response = await request(config.apiUrl, mutationPushTransaction)
        console.log(response)
        assert.equal(response.pushTransaction.transactionResponse, null)
        assert.equal(response.pushTransaction.response.includes('\'memo\': [\'Not a valid string.\']'), true)
        assert.equal(response.pushTransaction.errors, 'INVALID_DATA')
    })

    it("pushTransaction CASH SELL but there is an error from blockchain", async () => {
        orderType = 'SELL'
        volume = "1.0000"

        generatedSignature = await serializeTransaction({from: userA, transactionJson: []})
        dataJson = await createDataJson({
            generatedSignature,
            signatureDate,
            paymentType,
            uuid,
            from: userA,
            rate,
            currencyId,
            countryId,
            cityId,
            memo
        })
        queryAllOrders = await createQueryAllOrders({from: userA, generatedSignature, signatureDate})
        transactionJson = await createTransactionJson({
            orderType,
            cashTokenName,
            from: userA,
            'REDACTED'Name,
            tokenName,
            volume,
            insurance,
            minPackage,
            maxPackage,
            cityId,
            paymentType,
            uuid,
            countryName
        })
        serializedTransactionJson = await serializeTransaction({from: userA, transactionJson})
        mutationPushTransaction = await createMutationPushTransaction({serializedTransactionJson, dataJson, orderType})

        response = await request(config.apiUrl, mutationPushTransaction)
        console.log(response)
        assert.equal(response.pushTransaction.transactionResponse.includes('"code":500'), true)
        assert.equal(response.pushTransaction.response, null)
        assert.equal(response.pushTransaction.errors, 'EOS_UNKNOWN_ERROR')
    })

    module.exports = {
        createDataJson,
        createTransactionJson
    };
})