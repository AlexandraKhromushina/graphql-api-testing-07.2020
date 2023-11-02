const {request, GraphQLClient, gql} = require('graphql-request');
const {v4: uuidv4} = require('uuid');
const assert = require("assert");
let config = require("./config.js");
let {
    wait, createQueryAllOrders, createQueryAllDeals,
    createMutationPushTransactionCreateDeal: createMutationPushTransaction, createNewOrder
} = require("./functions.js");
const serializeTransaction = require("./serializeTransaction.js");
const {
    createDataJson: createDataJsonOrder,
    createTransactionJson: createTransactionJsonOrder
} = require("./mutationPushTransactionCardOrder.js");

describe("Create CARD deals", function () {
    this.timeout(175000);

    // Local variables
    const 'REDACTED'Name = config.'REDACTED'.code
    const cashTokenName = config.cashToken.code

    let transactionJson = []
    let paymentType, currencyId, currencyName, tokenName, countryId, countryName, cardNumber, bankId
    let bankIds, bankName, volume, insurance, minPackage, maxPackage, serializedTransactionJson
    let generatedSignature, myOrder, dealsArray, myDeal, queryAllDealsBuyer, queryAllDealsSeller
    let dataJson, orderType, dealType, mutationPushTransaction, data, transactionName, meta
    let userA, userB, userC, 'REDACTED', paySC, cashToken, cashSC, response, queryAllOrders, signatureDate

    // Local functions
    const createDataJson = ({generatedSignature, myOrder, from, paymentType}) => {
        if (dealType === 'BUY') {
            dataJson = {
                data_type: paymentType,
                uuid: myOrder.uuid,
                signature: {
                    username: from.name,
                    text: signatureDate,
                    signature: generatedSignature.signatures[0]
                },
                payload: {}
            }
        } else {
            dataJson = {
                data_type: paymentType,
                uuid: myOrder.uuid,
                signature: {
                    username: from.name,
                    text: signatureDate,
                    signature: generatedSignature.signatures[0]
                },
                payload: {
                    bank_id: bankId,
                    card_number: cardNumber
                }
            }
        }
        return dataJson
    }

    const createTransactionJson = ({from, myOrder, tokenName, volume, insurance}) => {
        if (dealType === 'SELL') {
            transactionName = 'sellcrypto'
        } else {
            transactionName = 'buycrypto'
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
                ord_id: myOrder.order_id,
                user: from.name,
                volume: volume + ' ' + tokenName,
                insurance: insurance + ' ' + tokenName
            }
        }]
        return transactionJson
    }

    beforeEach(async () => {
        // define variables here
        paymentType = 'CARD';
        currencyId = 13;
        currencyName = 'UAH';
        tokenName = currencyName + 'CASH';
        countryId = 236
        countryName = 'Ukraine'
        cardNumber = '378282246310005'
        bankName = 'Mono'
        volume = "1.00000"
        // insurance = (volume / 10).toPrecision(5)
        insurance = "0.10000"
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

    it("Successfully create a buy deal", async () => {
        orderType = 'SELL'
        dealType = 'BUY'

        // Pick or create a sell order
        let generatedSignatureUserA = await serializeTransaction({
            from: userA, transactionJson: []
        })
        queryAllOrders = await createQueryAllOrders({
            from: userA,
            generatedSignature: generatedSignatureUserA,
            signatureDate
        })
        let allOrdersOfUser = await request(config.apiUrl, queryAllOrders)
        let ordersArray = await allOrdersOfUser.allOrders.orders
        myOrder = await ordersArray.find(x => (x.volume_balance === volume + ' ' + tokenName
            && x.status === 'available' && x.data_type === paymentType && x.order_type === orderType))

        if (!myOrder) {
            myOrder = await createNewOrder({
                orderType, from: userA, createDataJsonOrder, createTransactionJsonOrder
            })
        }

        generatedSignature = await serializeTransaction({
            from: userB, transactionJson: []
        })
        dataJson = await createDataJson({
            generatedSignature, myOrder, from: userB, paymentType
        })
        queryAllDealsBuyer = await createQueryAllDeals({
            from: userB, generatedSignature, signatureDate
        })
        queryAllDealsSeller = await createQueryAllDeals({
            from: userA,
            generatedSignature: generatedSignatureUserA,
            signatureDate
        })
        transactionJson = await createTransactionJson({
            from: userB, myOrder, tokenName, volume, insurance
        })

        serializedTransactionJson = await serializeTransaction({
            from: userB, transactionJson
        })
        mutationPushTransaction = await createMutationPushTransaction({
            serializedTransactionJson,
            dataJson,
            dealType
        })

        response = await request(config.apiUrl, mutationPushTransaction)
        console.log(response)
        assert.equal(response.pushTransaction.response, null)
        assert.equal(response.pushTransaction.errors, null)

        await wait(15000)

        // Check buyer's new deal
        let allDealsOfBuyer = await request(config.apiUrl, queryAllDealsBuyer)
        dealsArray = await allDealsOfBuyer.allDeals.deals
        myDeal = await dealsArray.find(x => x.order_id === parseInt(myOrder.order_id))
        console.log(myDeal)
        assert.equal(myDeal.status, 'proceed')
        assert.equal(myDeal.seller.username, userA.name)
        assert.equal(myDeal.seller.did_withdraw, false)
        assert.equal(myDeal.buyer.username, userB.name)
        assert.equal(myDeal.buyer.did_withdraw, false)
        assert.equal(myDeal.volume, volume + ' ' + tokenName)
        assert.equal(myDeal.insurance, insurance + ' ' + tokenName)
        assert.equal(myDeal.deal_type, orderType)
        assert.equal(myDeal.completed_date, null)
        assert.equal(myDeal.is_paid, false)
        assert.equal(myDeal.card_number, myOrder.card_number)
        assert.equal(myDeal.payment_url, null)
        assert.equal(myDeal.wallet_number, null)
        assert.equal(myDeal.wallet_address, null)
        assert.equal(myDeal.memo, myOrder.memo)
        assert.equal(myDeal.rate, myOrder.rate)
        assert.equal(myDeal.bank_id, myOrder.bank_ids[0])
        assert.equal(myDeal.city_id, null)
        assert.equal(myDeal.currency_id, myOrder.currency_id)
        assert.equal(myDeal.country_id, myOrder.country_id)
        assert.equal(myDeal.card_expiry, null)
        assert.equal(myDeal.card_name, null)
        assert.equal(myDeal.cvv, null)
        assert.equal(myDeal.payment_system_id, null)
        assert.equal(myDeal.blockchain_id, null)

        // Check seller's new deal
        let allDealsOfSeller = await request(config.apiUrl, queryAllDealsSeller)
        dealsArray = await allDealsOfSeller.allDeals.deals
        myDeal = await dealsArray.find(b => b.order_id === parseInt(myOrder.order_id))
        console.log(myDeal)
        assert.equal(myDeal.status, 'proceed')
        assert.equal(myDeal.seller.username, userA.name)
        assert.equal(myDeal.seller.did_withdraw, false)
        assert.equal(myDeal.buyer.username, userB.name)
        assert.equal(myDeal.buyer.did_withdraw, false)
        assert.equal(myDeal.volume, volume + ' ' + tokenName)
        assert.equal(myDeal.insurance, insurance + ' ' + tokenName)
        assert.equal(myDeal.deal_type, orderType)
        assert.equal(myDeal.completed_date, null)
        assert.equal(myDeal.is_paid, false)
        assert.equal(myDeal.card_number, myOrder.card_number)
        assert.equal(myDeal.payment_url, null)
        assert.equal(myDeal.wallet_number, null)
        assert.equal(myDeal.wallet_address, null)
        assert.equal(myDeal.memo, myOrder.memo)
        assert.equal(myDeal.rate, myOrder.rate)
        assert.equal(myDeal.bank_id, myOrder.bank_ids[0])
        assert.equal(myDeal.city_id, null)
        assert.equal(myDeal.currency_id, myOrder.currency_id)
        assert.equal(myDeal.country_id, myOrder.country_id)
        assert.equal(myDeal.card_expiry, null)
        assert.equal(myDeal.card_name, null)
        assert.equal(myDeal.cvv, null)
        assert.equal(myDeal.payment_system_id, null)
        assert.equal(myDeal.blockchain_id, null)
    })

    it("Successfully create a sell deal", async () => {
        orderType = 'BUY'
        dealType = 'SELL'

        // Pick or create a buy order
        let generatedSignatureUserA = await serializeTransaction({
            from: userA, transactionJson: []
        })
        queryAllOrders = await createQueryAllOrders({
            from: userA,
            generatedSignature: generatedSignatureUserA,
            signatureDate
        })
        let allOrdersOfUser = await request(config.apiUrl, queryAllOrders)
        let ordersArray = await allOrdersOfUser.allOrders.orders
        myOrder = await ordersArray.find(x => (x.volume_balance === volume + ' ' + tokenName
            && x.status === 'available' && x.data_type === paymentType && x.order_type === orderType))

        if (!myOrder) {
            myOrder = await createNewOrder({orderType, from: userA, createDataJsonOrder, createTransactionJsonOrder})
        }

        // Pick random bank_id
        bankId = myOrder.bank_ids[Math.floor(Math.random() * myOrder.bank_ids.length)]

        if (!bankId) {
            bankId = 404
        }

        generatedSignature = await serializeTransaction({from: userB, transactionJson: []})
        dataJson = await createDataJson({generatedSignature, myOrder, from: userB, paymentType})
        queryAllDealsBuyer = await createQueryAllDeals({
            from: userA,
            generatedSignature: generatedSignatureUserA,
            signatureDate
        })
        queryAllDealsSeller = await createQueryAllDeals({from: userB, generatedSignature, signatureDate})
        transactionJson = await createTransactionJson({from: userB, myOrder, tokenName, volume, insurance})

        serializedTransactionJson = await serializeTransaction({from: userB, transactionJson})
        mutationPushTransaction = await createMutationPushTransaction({
            serializedTransactionJson,
            dataJson,
            dealType
        })

        response = await request(config.apiUrl, mutationPushTransaction)
        console.log(response)
        assert.equal(response.pushTransaction.response, null)
        assert.equal(response.pushTransaction.errors, null)

        await wait(16000)

        // Check buyer's new deal
        let allDealsOfBuyer = await request(config.apiUrl, queryAllDealsBuyer)
        dealsArray = await allDealsOfBuyer.allDeals.deals
        myDeal = await dealsArray.find(a => a.order_id === parseInt(myOrder.order_id))
        assert.equal(myDeal.status, 'proceed')
        assert.equal(myDeal.seller.username, userB.name)
        assert.equal(myDeal.seller.did_withdraw, false)
        assert.equal(myDeal.buyer.username, userA.name)
        assert.equal(myDeal.buyer.did_withdraw, false)
        assert.equal(myDeal.volume, volume + ' ' + tokenName)
        assert.equal(myDeal.insurance, insurance + ' ' + tokenName)
        assert.equal(myDeal.deal_type, orderType)
        assert.equal(myDeal.completed_date, null)
        assert.equal(myDeal.is_paid, false)
        assert.equal(myDeal.card_number, cardNumber)
        assert.equal(myDeal.payment_url, null)
        assert.equal(myDeal.wallet_number, null)
        assert.equal(myDeal.wallet_address, null)
        assert.equal(myDeal.memo, myOrder.memo)
        assert.equal(myDeal.rate, myOrder.rate)
        assert.equal(myDeal.bank_id, bankId)
        assert.equal(myDeal.city_id, null)
        assert.equal(myDeal.currency_id, myOrder.currency_id)
        assert.equal(myDeal.country_id, myOrder.country_id)
        assert.equal(myDeal.card_expiry, null)
        assert.equal(myDeal.card_name, null)
        assert.equal(myDeal.cvv, null)
        assert.equal(myDeal.payment_system_id, null)
        assert.equal(myDeal.blockchain_id, null)

        // Check seller's new deal
        let allDealsOfSeller = await request(config.apiUrl, queryAllDealsSeller)
        dealsArray = await allDealsOfSeller.allDeals.deals
        myDeal = await dealsArray.find(x => x.order_id === parseInt(myOrder.order_id))
        assert.equal(myDeal.status, 'proceed')
        assert.equal(myDeal.seller.username, userB.name)
        assert.equal(myDeal.seller.did_withdraw, false)
        assert.equal(myDeal.buyer.username, userA.name)
        assert.equal(myDeal.buyer.did_withdraw, false)
        assert.equal(myDeal.volume, volume + ' ' + tokenName)
        assert.equal(myDeal.insurance, insurance + ' ' + tokenName)
        assert.equal(myDeal.deal_type, orderType)
        assert.equal(myDeal.completed_date, null)
        assert.equal(myDeal.is_paid, false)
        assert.equal(myDeal.card_number, cardNumber)
        assert.equal(myDeal.payment_url, null)
        assert.equal(myDeal.wallet_number, null)
        assert.equal(myDeal.wallet_address, null)
        assert.equal(myDeal.memo, myOrder.memo)
        assert.equal(myDeal.rate, myOrder.rate)
        assert.equal(myDeal.bank_id, bankId)
        assert.equal(myDeal.city_id, null)
        assert.equal(myDeal.currency_id, myOrder.currency_id)
        assert.equal(myDeal.country_id, myOrder.country_id)
        assert.equal(myDeal.card_expiry, null)
        assert.equal(myDeal.card_name, null)
        assert.equal(myDeal.cvv, null)
        assert.equal(myDeal.payment_system_id, null)
        assert.equal(myDeal.blockchain_id, null)
    })

    it("pushTransaction CARD BUY with the payload of SELL", async () => {
        orderType = 'SELL'
        dealType = 'BUY'

        // Pick or create a buy order
        let generatedSignatureUserA = await serializeTransaction({
            from: userA, transactionJson: []
        })
        queryAllOrders = await createQueryAllOrders({
            from: userA,
            generatedSignature: generatedSignatureUserA,
            signatureDate
        })
        let allOrdersOfUser = await request(config.apiUrl, queryAllOrders)
        let ordersArray = await allOrdersOfUser.allOrders.orders
        myOrder = await ordersArray.find(x => (x.volume_balance === volume + ' ' + tokenName
            && x.status === 'available' && x.data_type === paymentType && x.order_type === orderType))

        if (!myOrder) {
            myOrder = await createNewOrder({orderType, from: userA, createDataJsonOrder, createTransactionJsonOrder})
        }

        // Pick random bank_id
        bankId = myOrder.bank_ids[Math.floor(Math.random() * myOrder.bank_ids.length)]

        if (!bankId) {
            bankId = 404
        }

        orderType = 'BUY'
        dealType = 'SELL'

        generatedSignature = await serializeTransaction({from: userB, transactionJson: []})
        dataJson = await createDataJson({generatedSignature, myOrder, from: userB, paymentType})

        orderType = 'SELL'
        dealType = 'BUY'

        queryAllDealsBuyer = await createQueryAllDeals({
            from: userA,
            generatedSignature: generatedSignatureUserA,
            signatureDate
        })
        queryAllDealsSeller = await createQueryAllDeals({from: userB, generatedSignature, signatureDate})
        transactionJson = await createTransactionJson({from: userB, myOrder, tokenName, volume, insurance})

        serializedTransactionJson = await serializeTransaction({from: userB, transactionJson})
        mutationPushTransaction = await createMutationPushTransaction({
            serializedTransactionJson,
            dataJson,
            dealType
        })

        response = await request(config.apiUrl, mutationPushTransaction)
        console.log(response)
        assert.equal(response.pushTransaction.transactionResponse, null)
        assert.equal(response.pushTransaction.response.includes('Unknown field'), true)
        assert.equal(response.pushTransaction.errors, 'INVALID_DATA')

        await wait(2000)

        // Check buyer's new deal
        let allDealsOfBuyer = await request(config.apiUrl, queryAllDealsBuyer)
        dealsArray = await allDealsOfBuyer.allDeals.deals
        myDeal = await dealsArray.find(a => a.order_id === parseInt(myOrder.order_id))

        if (myDeal) {
            throw new Error('the deal ' + myDeal.id + ' for the order ' + myOrder.order_id + ' was inserted into the DB')
        }

        // Check seller's new deal
        let allDealsOfSeller = await request(config.apiUrl, queryAllDealsSeller)
        dealsArray = await allDealsOfSeller.allDeals.deals
        myDeal = await dealsArray.find(x => x.order_id === parseInt(myOrder.order_id))

        if (myDeal) {
            throw new Error('the deal ' + myDeal.id + ' for the order ' + myOrder.order_id + ' was inserted into the DB')
        }
    })

    it("pushTransaction CARD SELL with the payload of BUY", async () => {
        orderType = 'BUY'
        dealType = 'SELL'

        // Pick or create a buy order
        let generatedSignatureUserA = await serializeTransaction({
            from: userA, transactionJson: []
        })
        queryAllOrders = await createQueryAllOrders({
            from: userA,
            generatedSignature: generatedSignatureUserA,
            signatureDate
        })
        let allOrdersOfUser = await request(config.apiUrl, queryAllOrders)
        let ordersArray = await allOrdersOfUser.allOrders.orders
        myOrder = await ordersArray.find(x => (x.volume_balance === volume + ' ' + tokenName
            && x.status === 'available' && x.data_type === paymentType && x.order_type === orderType))

        if (!myOrder) {
            myOrder = await createNewOrder({orderType, from: userA, createDataJsonOrder, createTransactionJsonOrder})
        }

        orderType = 'SELL'
        dealType = 'BUY'

        generatedSignature = await serializeTransaction({from: userB, transactionJson: []})
        dataJson = await createDataJson({generatedSignature, myOrder, from: userB, paymentType})

        orderType = 'BUY'
        dealType = 'SELL'

        queryAllDealsBuyer = await createQueryAllDeals({
            from: userA,
            generatedSignature: generatedSignatureUserA,
            signatureDate
        })
        queryAllDealsSeller = await createQueryAllDeals({from: userB, generatedSignature, signatureDate})
        transactionJson = await createTransactionJson({from: userB, myOrder, tokenName, volume, insurance})

        serializedTransactionJson = await serializeTransaction({from: userB, transactionJson})
        mutationPushTransaction = await createMutationPushTransaction({
            serializedTransactionJson,
            dataJson,
            dealType
        })

        response = await request(config.apiUrl, mutationPushTransaction)
        console.log(response)
        assert.equal(response.pushTransaction.transactionResponse, null)
        assert.equal(response.pushTransaction.response.includes('Missing data for required field'), true)
        assert.equal(response.pushTransaction.errors, 'INVALID_DATA')

        await wait(2000)

        // Check buyer's new deal
        let allDealsOfBuyer = await request(config.apiUrl, queryAllDealsBuyer)
        dealsArray = await allDealsOfBuyer.allDeals.deals
        myDeal = await dealsArray.find(a => a.order_id === parseInt(myOrder.order_id))

        if (myDeal) {
            throw new Error('the deal ' + myDeal.id + ' for the order ' + myOrder.order_id + ' was inserted into the DB')
        }

        // Check seller's new deal
        let allDealsOfSeller = await request(config.apiUrl, queryAllDealsSeller)
        dealsArray = await allDealsOfSeller.allDeals.deals
        myDeal = await dealsArray.find(x => x.order_id === parseInt(myOrder.order_id))

        if (myDeal) {
            throw new Error('the deal ' + myDeal.id + ' for the order ' + myOrder.order_id + ' was inserted into the DB')
        }
    })

    it("pushTransaction CARD SELL, but bank_id has the wrong format", async () => {
        orderType = 'BUY'
        dealType = 'SELL'
        bankId = [405, 392, 576]

        // Pick or create a buy order
        let generatedSignatureUserA = await serializeTransaction({
            from: userA, transactionJson: []
        })
        queryAllOrders = await createQueryAllOrders({
            from: userA,
            generatedSignature: generatedSignatureUserA,
            signatureDate
        })
        let allOrdersOfUser = await request(config.apiUrl, queryAllOrders)
        let ordersArray = await allOrdersOfUser.allOrders.orders
        myOrder = await ordersArray.find(x => (x.volume_balance === volume + ' ' + tokenName
            && x.status === 'available' && x.data_type === paymentType && x.order_type === orderType))

        if (!myOrder) {
            myOrder = await createNewOrder({orderType, from: userA, createDataJsonOrder, createTransactionJsonOrder})
        }

        generatedSignature = await serializeTransaction({from: userB, transactionJson: []})
        dataJson = await createDataJson({generatedSignature, myOrder, from: userB, paymentType})
        queryAllDealsBuyer = await createQueryAllDeals({
            from: userA,
            generatedSignature: generatedSignatureUserA,
            signatureDate
        })
        queryAllDealsSeller = await createQueryAllDeals({from: userB, generatedSignature, signatureDate})
        transactionJson = await createTransactionJson({from: userB, myOrder, tokenName, volume, insurance})

        serializedTransactionJson = await serializeTransaction({from: userB, transactionJson})
        mutationPushTransaction = await createMutationPushTransaction({
            serializedTransactionJson,
            dataJson,
            dealType
        })

        response = await request(config.apiUrl, mutationPushTransaction)
        console.log(response)
        assert.equal(response.pushTransaction.transactionResponse, null)
        assert.equal(response.pushTransaction.response.includes('\'bank_id\': [\'Not a valid integer.\']'), true)
        assert.equal(response.pushTransaction.errors, 'INVALID_DATA')

        await wait(2000)

        // Check buyer's new deal
        let allDealsOfBuyer = await request(config.apiUrl, queryAllDealsBuyer)
        dealsArray = await allDealsOfBuyer.allDeals.deals
        myDeal = await dealsArray.find(a => a.order_id === parseInt(myOrder.order_id))

        if (myDeal) {
            throw new Error('the deal ' + myDeal.id + ' for the order ' + myOrder.order_id + ' was inserted into the DB')
        }

        // Check seller's new deal
        let allDealsOfSeller = await request(config.apiUrl, queryAllDealsSeller)
        dealsArray = await allDealsOfSeller.allDeals.deals
        myDeal = await dealsArray.find(x => x.order_id === parseInt(myOrder.order_id))

        if (myDeal) {
            throw new Error('the deal ' + myDeal.id + ' for the order ' + myOrder.order_id + ' was inserted into the DB')
        }
    })

    it("pushTransaction CARD SELL, but card_number has the wrong format", async () => {
        orderType = 'BUY'
        dealType = 'SELL'
        cardNumber = 1471147114711471

        // Pick or create a buy order
        let generatedSignatureUserA = await serializeTransaction({
            from: userA, transactionJson: []
        })
        queryAllOrders = await createQueryAllOrders({
            from: userA,
            generatedSignature: generatedSignatureUserA,
            signatureDate
        })
        let allOrdersOfUser = await request(config.apiUrl, queryAllOrders)
        let ordersArray = await allOrdersOfUser.allOrders.orders
        myOrder = await ordersArray.find(x => (x.volume_balance === volume + ' ' + tokenName
            && x.status === 'available' && x.data_type === paymentType && x.order_type === orderType))

        if (!myOrder) {
            myOrder = await createNewOrder({orderType, from: userA, createDataJsonOrder, createTransactionJsonOrder})
        }

        // Pick random bank_id
        bankId = myOrder.bank_ids[Math.floor(Math.random() * myOrder.bank_ids.length)]

        if (!bankId) {
            bankId = 404
        }

        generatedSignature = await serializeTransaction({from: userB, transactionJson: []})
        dataJson = await createDataJson({generatedSignature, myOrder, from: userB, paymentType})
        queryAllDealsBuyer = await createQueryAllDeals({
            from: userA,
            generatedSignature: generatedSignatureUserA,
            signatureDate
        })
        queryAllDealsSeller = await createQueryAllDeals({from: userB, generatedSignature, signatureDate})
        transactionJson = await createTransactionJson({from: userB, myOrder, tokenName, volume, insurance})

        serializedTransactionJson = await serializeTransaction({from: userB, transactionJson})
        mutationPushTransaction = await createMutationPushTransaction({
            serializedTransactionJson,
            dataJson,
            dealType
        })

        response = await request(config.apiUrl, mutationPushTransaction)
        console.log(response)
        assert.equal(response.pushTransaction.transactionResponse, null)
        assert.equal(response.pushTransaction.response.includes('\'card_number\': [\'Not a valid string.\']'), true)
        assert.equal(response.pushTransaction.errors, 'INVALID_DATA')

        await wait(2000)

        // Check buyer's new deal
        let allDealsOfBuyer = await request(config.apiUrl, queryAllDealsBuyer)
        dealsArray = await allDealsOfBuyer.allDeals.deals
        myDeal = await dealsArray.find(a => a.order_id === parseInt(myOrder.order_id))

        if (myDeal) {
            throw new Error('the deal ' + myDeal.id + ' for the order ' + myOrder.order_id + ' was inserted into the DB')
        }

        // Check seller's new deal
        let allDealsOfSeller = await request(config.apiUrl, queryAllDealsSeller)
        dealsArray = await allDealsOfSeller.allDeals.deals
        myDeal = await dealsArray.find(x => x.order_id === parseInt(myOrder.order_id))

        if (myDeal) {
            throw new Error('the deal ' + myDeal.id + ' for the order ' + myOrder.order_id + ' was inserted into the DB')
        }
    })

    it("pushTransaction CARD SELL, but the signature is incorrect", async () => {
        orderType = 'BUY'
        dealType = 'SELL'

        // Pick or create a buy order
        let generatedSignatureUserA = await serializeTransaction({
            from: userA, transactionJson: []
        })
        queryAllOrders = await createQueryAllOrders({
            from: userA,
            generatedSignature: generatedSignatureUserA,
            signatureDate
        })
        let allOrdersOfUser = await request(config.apiUrl, queryAllOrders)
        let ordersArray = await allOrdersOfUser.allOrders.orders
        myOrder = await ordersArray.find(x => (x.volume_balance === volume + ' ' + tokenName
            && x.status === 'available' && x.data_type === paymentType && x.order_type === orderType))

        if (!myOrder) {
            myOrder = await createNewOrder({orderType, from: userA, createDataJsonOrder, createTransactionJsonOrder})
        }

        // Pick random bank_id
        bankId = myOrder.bank_ids[Math.floor(Math.random() * myOrder.bank_ids.length)]

        if (!bankId) {
            bankId = 404
        }

        //Generating the wrong signature for payload
        generatedSignature = await serializeTransaction({from: userC, transactionJson: []})
        dataJson = await createDataJson({generatedSignature, myOrder, from: userB, paymentType})
        queryAllDealsBuyer = await createQueryAllDeals({
            from: userA,
            generatedSignature: generatedSignatureUserA,
            signatureDate
        })
        queryAllDealsSeller = await createQueryAllDeals({from: userB, generatedSignature, signatureDate})
        transactionJson = await createTransactionJson({from: userB, myOrder, tokenName, volume, insurance})

        serializedTransactionJson = await serializeTransaction({from: userB, transactionJson})
        mutationPushTransaction = await createMutationPushTransaction({
            serializedTransactionJson,
            dataJson,
            dealType
        })

        response = await request(config.apiUrl, mutationPushTransaction)
        console.log(response)
        assert.equal(response.pushTransaction.transactionResponse, null)
        assert.equal(response.pushTransaction.response.includes('\'card_number\': [\'Not a valid string.\']'), true)
        assert.equal(response.pushTransaction.errors, 'INVALID_DATA')

        await wait(2000)

        // Check buyer's new deal
        let allDealsOfBuyer = await request(config.apiUrl, queryAllDealsBuyer)
        dealsArray = await allDealsOfBuyer.allDeals.deals
        myDeal = await dealsArray.find(a => a.order_id === parseInt(myOrder.order_id))

        if (myDeal) {
            throw new Error('the deal ' + myDeal.id + ' for the order ' + myOrder.order_id + ' was inserted into the DB')
        }

        // Check seller's new deal
        let allDealsOfSeller = await request(config.apiUrl, queryAllDealsSeller)
        dealsArray = await allDealsOfSeller.allDeals.deals
        myDeal = await dealsArray.find(x => x.order_id === parseInt(myOrder.order_id))

        if (myDeal) {
            throw new Error('the deal ' + myDeal.id + ' for the order ' + myOrder.order_id + ' was inserted into the DB')
        }
    })

    it("pushTransaction CARD SELL, but there is an error from blockchain", async () => {
        orderType = 'BUY'
        dealType = 'SELL'

        // Pick or create a buy order
        let generatedSignatureUserA = await serializeTransaction({
            from: userA, transactionJson: []
        })
        queryAllOrders = await createQueryAllOrders({
            from: userA,
            generatedSignature: generatedSignatureUserA,
            signatureDate
        })
        let allOrdersOfUser = await request(config.apiUrl, queryAllOrders)
        let ordersArray = await allOrdersOfUser.allOrders.orders
        myOrder = await ordersArray.find(x => (x.volume_balance === volume + ' ' + tokenName
            && x.status === 'available' && x.data_type === paymentType && x.order_type === orderType))

        if (!myOrder) {
            myOrder = await createNewOrder({orderType, from: userA, createDataJsonOrder, createTransactionJsonOrder})
        }

        // Pick random bank_id
        bankId = myOrder.bank_ids[Math.floor(Math.random() * myOrder.bank_ids.length)]

        if (!bankId) {
            bankId = 404
        }

        //Change volume to create an error from blockchain
        volume = "1.0000"

        generatedSignature = await serializeTransaction({from: userC, transactionJson: []})
        dataJson = await createDataJson({generatedSignature, myOrder, from: userB, paymentType})
        queryAllDealsBuyer = await createQueryAllDeals({
            from: userA,
            generatedSignature: generatedSignatureUserA,
            signatureDate
        })
        queryAllDealsSeller = await createQueryAllDeals({from: userB, generatedSignature, signatureDate})
        transactionJson = await createTransactionJson({from: userB, myOrder, tokenName, volume, insurance})

        serializedTransactionJson = await serializeTransaction({from: userB, transactionJson})
        mutationPushTransaction = await createMutationPushTransaction({
            serializedTransactionJson,
            dataJson,
            dealType
        })

        response = await request(config.apiUrl, mutationPushTransaction)
        console.log(response)
        assert.equal(response.pushTransaction.transactionResponse.includes('"code":500'), true)
        assert.equal(response.pushTransaction.response, null)
        assert.equal(response.pushTransaction.errors, 'EOS_UNKNOWN_ERROR')

        await wait(2000)

        // Check buyer's new deal
        let allDealsOfBuyer = await request(config.apiUrl, queryAllDealsBuyer)
        dealsArray = await allDealsOfBuyer.allDeals.deals
        myDeal = await dealsArray.find(a => a.order_id === parseInt(myOrder.order_id))

        if (myDeal) {
            throw new Error('the deal ' + myDeal.id + ' for the order ' + myOrder.order_id + ' was inserted into the DB')
        }

        // Check seller's new deal
        let allDealsOfSeller = await request(config.apiUrl, queryAllDealsSeller)
        dealsArray = await allDealsOfSeller.allDeals.deals
        myDeal = await dealsArray.find(x => x.order_id === parseInt(myOrder.order_id))

        if (myDeal) {
            throw new Error('the deal ' + myDeal.id + ' for the order ' + myOrder.order_id + ' was inserted into the DB')
        }
    })

    it("pushTransaction CARD BUY, but there is no such order in the DB", async () => {
        orderType = 'SELL'
        dealType = 'BUY'
        let orderId = 1

        // Pick or create a buy order
        let generatedSignatureUserA = await serializeTransaction({
            from: userA, transactionJson: []
        })
        queryAllOrders = await createQueryAllOrders({
            from: userA,
            generatedSignature: generatedSignatureUserA,
            signatureDate
        })
        let allOrdersOfUser = await request(config.apiUrl, queryAllOrders)
        let ordersArray = await allOrdersOfUser.allOrders.orders
        myOrder = await ordersArray.find(x => x.order_id === orderId)

        if (!myOrder) {
            myOrder = await createNewOrder({orderType, from: userA, createDataJsonOrder, createTransactionJsonOrder})
        }

        generatedSignature = await serializeTransaction({from: userC, transactionJson: []})
        dataJson = await createDataJson({generatedSignature, myOrder, from: userB, paymentType})
        queryAllDealsBuyer = await createQueryAllDeals({
            from: userA,
            generatedSignature: generatedSignatureUserA,
            signatureDate
        })
        queryAllDealsSeller = await createQueryAllDeals({from: userB, generatedSignature, signatureDate})
        transactionJson = await createTransactionJson({from: userB, myOrder, tokenName, volume, insurance})

        serializedTransactionJson = await serializeTransaction({from: userB, transactionJson})
        mutationPushTransaction = await createMutationPushTransaction({
            serializedTransactionJson,
            dataJson,
            dealType
        })

        response = await request(config.apiUrl, mutationPushTransaction)
        console.log(response)
        assert.equal(response.pushTransaction.transactionResponse.includes('"code":500'), true)
        assert.equal(response.pushTransaction.response, null)
        assert.equal(response.pushTransaction.errors, 'EOS_UNKNOWN_ERROR')

        await wait(2000)

        // Check buyer's new deal
        let allDealsOfBuyer = await request(config.apiUrl, queryAllDealsBuyer)
        dealsArray = await allDealsOfBuyer.allDeals.deals
        myDeal = await dealsArray.find(a => a.order_id === parseInt(myOrder.order_id))

        if (myDeal) {
            throw new Error('the deal ' + myDeal.id + ' for the order ' + myOrder.order_id + ' was inserted into the DB')
        }

        // Check seller's new deal
        let allDealsOfSeller = await request(config.apiUrl, queryAllDealsSeller)
        dealsArray = await allDealsOfSeller.allDeals.deals
        myDeal = await dealsArray.find(x => x.order_id === parseInt(myOrder.order_id))

        if (myDeal) {
            throw new Error('the deal ' + myDeal.id + ' for the order ' + myOrder.order_id + ' was inserted into the DB')
        }
    })

    module.exports = {
        createDataJson,
        createTransactionJson
    };
})