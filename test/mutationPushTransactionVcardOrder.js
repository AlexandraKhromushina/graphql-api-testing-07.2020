const {request, GraphQLClient, gql} = require('graphql-request');
const {v4: uuidv4} = require('uuid');
const assert = require("assert");
let config = require("./config.js");
let {
    wait, createQueryAllOrders,
    createMutationPushTransactionCreateOrder: createMutationPushTransaction
} = require("./functions.js");
const serializeTransaction = require("./serializeTransaction.js");

describe("Create VCARD orders", function () {
    this.timeout(175000);

    // Local variables
    const 'REDACTED'Name = config.'REDACTED'.code
    const cashTokenName = config.cashToken.code

    let transactionJson = []
    let paymentType, currencyId, currencyName, tokenName, countryId, countryName, isCashRate, rate, cardNumber, bankId
    let bankName, memo, volume, insurance, minPackage, maxPackage, serializedTransactionJson
    let cardholderName, cardExpirationDate, cardCvv, generatedSignature, queryAllOrders
    let uuid, dataJson, orderType, mutationPushTransaction, transactionName
    let userA, userB, userC, 'REDACTED', paySC, cashToken, cashSC, response, signatureDate

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
                    country_id: countryId,
                    memo: memo,
                    bank_ids: bankId,
                    card_number: cardNumber,
                    card_name: cardholderName,
                    card_expiry: cardExpirationDate,
                    cvv: cardCvv,
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
                    country_id: countryId,
                    memo: memo
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
                meta: "{\"params\":{\"card_number\":\"" + cardNumber + "\"},\"type\":\"" + paymentType + "\",\"uuid\":\"" + uuid + "\"}",
                data: "{\"country\":\"" + countryName + "\"}"
            }
        }]
        return transactionJson
    }

    beforeEach(async () => {
        // define variables here
        uuid = uuidv4()
        paymentType = 'VCARD';
        currencyId = 13;
        currencyName = 'UAH';
        tokenName = currencyName + 'CASH';
        countryId = 236
        countryName = 'Ukraine'
        rate = '2'
        isCashRate = false
        cardNumber = 'REDACTED'
        bankId = [371]
        cardholderName = "Celldweller"
        cardExpirationDate = "06/66"
        cardCvv = "012"
        bankName = 'Mono'
        memo = 'vcarrrrd'
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
        let generatedSignatureUserB = await serializeTransaction({from: userB, transactionJson: []})
        dataJson = await createDataJson({generatedSignature})
        queryAllOrders = await createQueryAllOrders({from: userA, generatedSignature, signatureDate})
        let queryAllOrdersUserB = await createQueryAllOrders({
            from: userA,
            generatedSignature: generatedSignatureUserB,
            signatureDate
        })
        transactionJson = await createTransactionJson()

        serializedTransactionJson = await serializeTransaction({from: userA, transactionJson})
        mutationPushTransaction = await createMutationPushTransaction({serializedTransactionJson, dataJson, orderType})

        response = await request(config.apiUrl, mutationPushTransaction)
        console.log(response)
        assert.equal(response.pushTransaction.response, null)
        assert.equal(response.pushTransaction.errors, null)

        await wait(13000)

        let allOrdersOfOwner = await request(config.apiUrl, queryAllOrders)
        let ordersArray = await allOrdersOfOwner.allOrders.orders
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
        assert.deepEqual(myOrder.bank_ids, bankId)
        assert.equal(myOrder.city_id, null)
        assert.equal(myOrder.country_id, countryId)
        assert.equal(myOrder.card_name, cardholderName)
        assert.equal(myOrder.card_expiry, cardExpirationDate) //should be visible
        assert.equal(myOrder.cvv, cardCvv) //should be visible
        assert.equal(myOrder.blockchain_id, null)
        assert.equal(myOrder.payment_system_id, null)
        assert.equal(myOrder.rate, rate)
        assert.equal(myOrder.currency_id, currencyId)
        assert.equal(myOrder.card_number, cardNumber)
        assert.equal(myOrder.payment_url, null)
        assert.equal(myOrder.wallet_number, null)
        assert.equal(myOrder.wallet_address, null)

        let allOrdersUserB = await request(config.apiUrl, queryAllOrdersUserB)
        ordersArray = await allOrdersUserB.allOrders.orders
        myOrder = await ordersArray.find(x => x.uuid === uuid)
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
        assert.deepEqual(myOrder.bank_ids, bankId)
        assert.equal(myOrder.city_id, null)
        assert.equal(myOrder.country_id, countryId)
        assert.equal(myOrder.card_name, cardholderName)
        assert.equal(myOrder.card_expiry, '') //should be hidden
        assert.equal(myOrder.cvv, '') //should be hidden
        assert.equal(myOrder.blockchain_id, null)
        assert.equal(myOrder.payment_system_id, null)
        assert.equal(myOrder.rate, rate)
        assert.equal(myOrder.currency_id, currencyId)
        assert.equal(myOrder.card_number, cardNumber)
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

        await wait(15000)

        let allOrdersOfUser = await request(config.apiUrl, queryAllOrders)
        console.log(allOrdersOfUser)
        let ordersArray = await allOrdersOfUser.allOrders.orders
        let myOrder = await ordersArray.find(x => x.uuid === uuid)
        // let myOrder = await ordersArray.find(x => x.country_id===countryId)
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

    it("pushTransaction VCARD SELL with the payload of BUY", async () => {
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

    it("pushTransaction VCARD BUY with the payload of SELL", async () => {
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

    it("pushTransaction VCARD BUY but rate has the wrong format", async () => {
        orderType = 'BUY'
        rate = 4

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

    it("pushTransaction VCARD BUY but currency_id has the wrong format", async () => {
        orderType = 'BUY'
        currencyId = '3'

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

    it("pushTransaction VCARD BUY but currency_id is way too big", async () => {
        orderType = 'BUY'
        currencyId = 200

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

    it("pushTransaction VCARD BUY but country_id has the wrong format", async () => {
        orderType = 'BUY'
        countryId = '4'

        generatedSignature = await serializeTransaction({from: userA, transactionJson: []})
        dataJson = await createDataJson({generatedSignature})
        queryAllOrders = await createQueryAllOrders({from: userA, generatedSignature, signatureDate})
        transactionJson = await createTransactionJson()
        serializedTransactionJson = await serializeTransaction({from: userA, transactionJson})
        mutationPushTransaction = await createMutationPushTransaction({serializedTransactionJson, dataJson, orderType})

        response = await request(config.apiUrl, mutationPushTransaction)
        console.log(response)
        assert.equal(response.pushTransaction.transactionResponse, null)
        assert.equal(response.pushTransaction.response.includes('\'country_id\': [\'Not a valid integer.\']'), true)
        assert.equal(response.pushTransaction.errors, 'INVALID_DATA')
    })

    it("pushTransaction VCARD BUY but country_id is way too big", async () => {
        orderType = 'BUY'
        countryId = 555

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

    it("pushTransaction VCARD BUY but memo has the wrong format", async () => {
        orderType = 'BUY'
        memo = false

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

    it("pushTransaction VCARD BUY but bank_ids has the wrong format", async () => {
        orderType = 'BUY'
        bankId = 371

        generatedSignature = await serializeTransaction({from: userA, transactionJson: []})
        dataJson = await createDataJson({generatedSignature})
        queryAllOrders = await createQueryAllOrders({from: userA, generatedSignature, signatureDate})
        transactionJson = await createTransactionJson()
        serializedTransactionJson = await serializeTransaction({from: userA, transactionJson})
        mutationPushTransaction = await createMutationPushTransaction({serializedTransactionJson, dataJson, orderType})

        response = await request(config.apiUrl, mutationPushTransaction)
        console.log(response)
        assert.equal(response.pushTransaction.transactionResponse, null)
        assert.equal(response.pushTransaction.response.includes('\'bank_ids\': [\'Not a valid list.\']'), true)
        assert.equal(response.pushTransaction.errors, 'INVALID_DATA')
    })

    it("pushTransaction VCARD BUY but bank_ids is empty", async () => {
        orderType = 'BUY'
        bankId = []

        generatedSignature = await serializeTransaction({from: userA, transactionJson: []})
        dataJson = await createDataJson({generatedSignature})
        queryAllOrders = await createQueryAllOrders({from: userA, generatedSignature, signatureDate})
        transactionJson = await createTransactionJson()
        serializedTransactionJson = await serializeTransaction({from: userA, transactionJson})
        mutationPushTransaction = await createMutationPushTransaction({serializedTransactionJson, dataJson, orderType})

        response = await request(config.apiUrl, mutationPushTransaction)
        console.log(response)
        assert.equal(response.pushTransaction.transactionResponse, null)
        assert.equal(response.pushTransaction.response.includes('\'bank_ids\': [\'Not a valid list.\']'), true)
        assert.equal(response.pushTransaction.errors, 'INVALID_DATA')
    })

    it("pushTransaction VCARD BUY but bank_ids consists of multiple ids", async () => {
        orderType = 'BUY'
        bankId = [405, 392, 576]

        generatedSignature = await serializeTransaction({from: userA, transactionJson: []})
        dataJson = await createDataJson({generatedSignature})
        queryAllOrders = await createQueryAllOrders({from: userA, generatedSignature, signatureDate})
        transactionJson = await createTransactionJson()
        serializedTransactionJson = await serializeTransaction({from: userA, transactionJson})
        mutationPushTransaction = await createMutationPushTransaction({serializedTransactionJson, dataJson, orderType})

        response = await request(config.apiUrl, mutationPushTransaction)
        console.log(response)
        assert.equal(response.pushTransaction.transactionResponse, null)
        assert.equal(response.pushTransaction.response.includes('\'bank_ids\': [\'Not a valid list.\']'), true)
        assert.equal(response.pushTransaction.errors, 'INVALID_DATA')
    })

    it("pushTransaction VCARD BUY but card_number has the wrong format", async () => {
        orderType = 'BUY'
        cardNumber = 12345678901234

        generatedSignature = await serializeTransaction({from: userA, transactionJson: []})
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

    it("pushTransaction VCARD BUY but card_name has the wrong format", async () => {
        orderType = 'BUY'
        cardholderName = 12345678901234

        generatedSignature = await serializeTransaction({from: userA, transactionJson: []})
        dataJson = await createDataJson({generatedSignature})
        queryAllOrders = await createQueryAllOrders({from: userA, generatedSignature, signatureDate})
        transactionJson = await createTransactionJson()
        serializedTransactionJson = await serializeTransaction({from: userA, transactionJson})
        mutationPushTransaction = await createMutationPushTransaction({serializedTransactionJson, dataJson, orderType})

        response = await request(config.apiUrl, mutationPushTransaction)
        console.log(response)
        assert.equal(response.pushTransaction.transactionResponse, null)
        assert.equal(response.pushTransaction.response.includes('\'card_name\': [\'Not a valid string.\']'), true)
        assert.equal(response.pushTransaction.errors, 'INVALID_DATA')
    })

    it("pushTransaction VCARD BUY but card_name is empty", async () => {
        orderType = 'BUY'
        cardholderName = ''

        generatedSignature = await serializeTransaction({from: userA, transactionJson: []})
        dataJson = await createDataJson({generatedSignature})
        queryAllOrders = await createQueryAllOrders({from: userA, generatedSignature, signatureDate})
        transactionJson = await createTransactionJson()
        serializedTransactionJson = await serializeTransaction({from: userA, transactionJson})
        mutationPushTransaction = await createMutationPushTransaction({serializedTransactionJson, dataJson, orderType})

        response = await request(config.apiUrl, mutationPushTransaction)
        console.log(response)
        assert.equal(response.pushTransaction.transactionResponse, null)
        assert.equal(response.pushTransaction.response.includes('\'card_name\': [\'Not a valid string.\']'), true)
        assert.equal(response.pushTransaction.errors, 'INVALID_DATA')
    })

    it("pushTransaction VCARD BUY but card_expiry is expired", async () => {
        orderType = 'BUY'
        cardExpirationDate = "11/21"

        generatedSignature = await serializeTransaction({from: userA, transactionJson: []})
        dataJson = await createDataJson({generatedSignature})
        queryAllOrders = await createQueryAllOrders({from: userA, generatedSignature, signatureDate})
        transactionJson = await createTransactionJson()
        serializedTransactionJson = await serializeTransaction({from: userA, transactionJson})
        mutationPushTransaction = await createMutationPushTransaction({serializedTransactionJson, dataJson, orderType})

        response = await request(config.apiUrl, mutationPushTransaction)
        console.log(response)
        assert.equal(response.pushTransaction.transactionResponse, null)
        assert.equal(response.pushTransaction.response.includes('\'card_name\': [\'Not a valid string.\']'), true)
        assert.equal(response.pushTransaction.errors, 'INVALID_DATA')
    })

    it("pushTransaction VCARD BUY but card_expiry has a month of 0", async () => {
        orderType = 'BUY'
        cardExpirationDate = "00/25"

        generatedSignature = await serializeTransaction({from: userA, transactionJson: []})
        dataJson = await createDataJson({generatedSignature})
        queryAllOrders = await createQueryAllOrders({from: userA, generatedSignature, signatureDate})
        transactionJson = await createTransactionJson()
        serializedTransactionJson = await serializeTransaction({from: userA, transactionJson})
        mutationPushTransaction = await createMutationPushTransaction({serializedTransactionJson, dataJson, orderType})

        response = await request(config.apiUrl, mutationPushTransaction)
        console.log(response)
        assert.equal(response.pushTransaction.transactionResponse, null)
        assert.equal(response.pushTransaction.response.includes('month must be in 1..12'), true)
        assert.equal(response.pushTransaction.errors, 'INVALID_DATA')
    })

    it("pushTransaction VCARD BUY but card_expiry has a month of 13", async () => {
        orderType = 'BUY'
        cardExpirationDate = "13/25"

        generatedSignature = await serializeTransaction({from: userA, transactionJson: []})
        dataJson = await createDataJson({generatedSignature})
        queryAllOrders = await createQueryAllOrders({from: userA, generatedSignature, signatureDate})
        transactionJson = await createTransactionJson()
        serializedTransactionJson = await serializeTransaction({from: userA, transactionJson})
        mutationPushTransaction = await createMutationPushTransaction({serializedTransactionJson, dataJson, orderType})

        response = await request(config.apiUrl, mutationPushTransaction)
        console.log(response)
        assert.equal(response.pushTransaction.transactionResponse, null)
        assert.equal(response.pushTransaction.response.includes('month must be in 1..12'), true)
        assert.equal(response.pushTransaction.errors, 'INVALID_DATA')
    })

    it("pushTransaction VCARD BUY but cvv is empty", async () => {
        orderType = 'BUY'
        cardCvv = ""

        generatedSignature = await serializeTransaction({from: userA, transactionJson: []})
        dataJson = await createDataJson({generatedSignature})
        queryAllOrders = await createQueryAllOrders({from: userA, generatedSignature, signatureDate})
        transactionJson = await createTransactionJson()
        serializedTransactionJson = await serializeTransaction({from: userA, transactionJson})
        mutationPushTransaction = await createMutationPushTransaction({serializedTransactionJson, dataJson, orderType})

        response = await request(config.apiUrl, mutationPushTransaction)
        console.log(response)
        assert.equal(response.pushTransaction.transactionResponse, null)
        assert.equal(response.pushTransaction.response.includes('month must be in 1..12'), true)
        assert.equal(response.pushTransaction.errors, 'INVALID_DATA')
    })

    it("pushTransaction VCARD BUY but cvv has the wrong format", async () => {
        orderType = 'BUY'
        cardCvv = 1222

        generatedSignature = await serializeTransaction({from: userA, transactionJson: []})
        dataJson = await createDataJson({generatedSignature})
        queryAllOrders = await createQueryAllOrders({from: userA, generatedSignature, signatureDate})
        transactionJson = await createTransactionJson()
        serializedTransactionJson = await serializeTransaction({from: userA, transactionJson})
        mutationPushTransaction = await createMutationPushTransaction({serializedTransactionJson, dataJson, orderType})

        response = await request(config.apiUrl, mutationPushTransaction)
        console.log(response)
        assert.equal(response.pushTransaction.transactionResponse, null)
        assert.equal(response.pushTransaction.response.includes('\'cvv\': [\'Not a valid string.\']'), true)
        assert.equal(response.pushTransaction.errors, 'INVALID_DATA')
    })

    it("pushTransaction VCARD BUY but cvv has 2 symbols", async () => {
        orderType = 'BUY'
        cardCvv = '11'

        generatedSignature = await serializeTransaction({from: userA, transactionJson: []})
        dataJson = await createDataJson({generatedSignature})
        queryAllOrders = await createQueryAllOrders({from: userA, generatedSignature, signatureDate})
        transactionJson = await createTransactionJson()
        serializedTransactionJson = await serializeTransaction({from: userA, transactionJson})
        mutationPushTransaction = await createMutationPushTransaction({serializedTransactionJson, dataJson, orderType})

        response = await request(config.apiUrl, mutationPushTransaction)
        console.log(response)
        assert.equal(response.pushTransaction.transactionResponse, null)
        assert.equal(response.pushTransaction.response.includes('\'cvv\': [\'Not a valid string.\']'), true)
        assert.equal(response.pushTransaction.errors, 'INVALID_DATA')
    })

    it("pushTransaction VCARD BUY but cvv has 4 symbols", async () => {
        orderType = 'BUY'
        cardCvv = '1222'

        generatedSignature = await serializeTransaction({from: userA, transactionJson: []})
        dataJson = await createDataJson({generatedSignature})
        queryAllOrders = await createQueryAllOrders({from: userA, generatedSignature, signatureDate})
        transactionJson = await createTransactionJson()
        serializedTransactionJson = await serializeTransaction({from: userA, transactionJson})
        mutationPushTransaction = await createMutationPushTransaction({serializedTransactionJson, dataJson, orderType})

        response = await request(config.apiUrl, mutationPushTransaction)
        console.log(response)
        assert.equal(response.pushTransaction.transactionResponse, null)
        assert.equal(response.pushTransaction.response.includes('\'cvv\': [\'Not a valid string.\']'), true)
        assert.equal(response.pushTransaction.errors, 'INVALID_DATA')
    })

    it("pushTransaction VCARD SELL but is_cash_rate has the wrong format", async () => {
        orderType = 'SELL'
        isCashRate = 'false'

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

    it("pushTransaction VCARD SELL but the signature is incorrect", async () => {
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

    it("pushTransaction VCARD SELL but there is an error from blockchain", async () => {
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