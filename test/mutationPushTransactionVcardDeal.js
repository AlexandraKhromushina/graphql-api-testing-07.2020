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
} = require("./mutationPushTransactionVcardOrder.js");

describe("Create VCARD deals", function () {
    this.timeout(175000);

    // Local variables
    const 'REDACTED'Name = config.'REDACTED'.code
    const cashTokenName = config.cashToken.code

    let transactionJson = []
    let paymentType, currencyName, tokenName, countryId, countryName, isCashRate, rate, cardNumber
    let bankId, bankName, volume, insurance, serializedTransactionJson
    let cardholderName, cardExpirationDate, cardCvv
    let generatedSignature, myOrder, dealsArray, myDeal, queryAllDealsBuyer, queryAllDealsSeller
    let dataJson, orderType, dealType, mutationPushTransaction, transactionName
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
                payload: {
                    bank_id: bankId,
                    card_number: cardNumber,
                    card_name: cardholderName,
                    card_expiry: cardExpirationDate,
                    cvv: cardCvv,
                    country_id: countryId
                }
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
                payload: {}
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
        paymentType = 'VCARD';
        currencyName = 'UAH';
        tokenName = currencyName + 'CASH';
        countryId = 186
        countryName = 'Russia'
        cardNumber = 'REDACTED'
        cardholderName = "Rose"
        cardExpirationDate = "09/29"
        cardCvv = "443"
        bankName = 'VTB'
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
        let generatedSignatureUserA = await serializeTransaction({from: userA, transactionJson: []})
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
        queryAllDealsBuyer = await createQueryAllDeals({from: userB, generatedSignature, signatureDate})
        queryAllDealsSeller = await createQueryAllDeals({
            from: userA,
            generatedSignature: generatedSignatureUserA,
            signatureDate
        })
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

        await wait(35000)

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
        assert.equal(myDeal.card_number, cardNumber)
        assert.equal(myDeal.payment_url, null)
        assert.equal(myDeal.wallet_number, null)
        assert.equal(myDeal.wallet_address, null)
        assert.equal(myDeal.memo, myOrder.memo)
        assert.equal(myDeal.rate, myOrder.rate)
        assert.equal(myDeal.bank_id, bankId)
        assert.equal(myDeal.city_id, null)
        assert.equal(myDeal.currency_id, myOrder.currency_id)
        assert.equal(myDeal.country_id, countryId)
        assert.equal(myDeal.card_expiry, cardExpirationDate)
        assert.equal(myDeal.card_name, cardholderName)
        assert.equal(myDeal.cvv, cardCvv)
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
        assert.equal(myDeal.card_number, cardNumber)
        assert.equal(myDeal.payment_url, null)
        assert.equal(myDeal.wallet_number, null)
        assert.equal(myDeal.wallet_address, null)
        assert.equal(myDeal.memo, myOrder.memo)
        assert.equal(myDeal.rate, myOrder.rate)
        assert.equal(myDeal.bank_id, bankId)
        assert.equal(myDeal.city_id, null)
        assert.equal(myDeal.currency_id, myOrder.currency_id)
        assert.equal(myDeal.country_id, countryId)
        assert.equal(myDeal.card_expiry, '')
        assert.equal(myDeal.card_name, cardholderName)
        assert.equal(myDeal.cvv, '')
        assert.equal(myDeal.payment_system_id, null)
        assert.equal(myDeal.blockchain_id, null)
    })

    it("Successfully create a sell deal", async () => {
        orderType = 'BUY'
        dealType = 'SELL'

        // Pick or create a buy order
        let generatedSignatureUserA = await serializeTransaction({from: userA, transactionJson: []})
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
        assert.equal(response.pushTransaction.response, null)
        assert.equal(response.pushTransaction.errors, null)

        await wait(35000)

        // Check buyer's new deal
        let allDealsOfBuyer = await request(config.apiUrl, queryAllDealsBuyer)
        dealsArray = await allDealsOfBuyer.allDeals.deals
        myDeal = await dealsArray.find(a => a.order_id === parseInt(myOrder.order_id))
        console.log(myDeal)
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
        assert.equal(myDeal.card_expiry, '')
        assert.equal(myDeal.card_name, myOrder.card_name)
        assert.equal(myDeal.cvv, '')
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
        assert.equal(myDeal.card_expiry, myOrder.card_expiry)
        assert.equal(myDeal.card_name, myOrder.card_name)
        assert.equal(myDeal.cvv, myOrder.cvv)
        assert.equal(myDeal.payment_system_id, null)
        assert.equal(myDeal.blockchain_id, null)
    })

    it("pushTransaction VCARD BUY with the payload of SELL", async () => {
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
        assert.equal(response.pushTransaction.response.includes('Missing data for required field'), true)
        assert.equal(response.pushTransaction.errors, 'INVALID_DATA')

        await wait(35000)

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

    it("pushTransaction VCARD BUY with the payload of BUY", async () => {
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
        assert.equal(response.pushTransaction.response.includes('Unknown field'), true)
        assert.equal(response.pushTransaction.errors, 'INVALID_DATA')

        await wait(35000)

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

    it("pushTransaction VCARD BUY, but country_id has the wrong format", async () => {
        orderType = 'SELL'
        dealType = 'BUY'
        countryId = '8'

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
        assert.equal(response.pushTransaction.response.includes('\'country_id\': [\'Not a valid integer.\']'), true)
        assert.equal(response.pushTransaction.errors, 'INVALID_DATA')
    })

    it("pushTransaction VCARD BUY, but country_id is way too big", async () => {
        orderType = 'SELL'
        dealType = 'BUY'
        countryId = 555

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
        assert.equal(response.pushTransaction.response.includes('\'country_id\': [\'Not a valid integer.\']'), true)
        assert.equal(response.pushTransaction.errors, 'INVALID_DATA')
    })

    it("pushTransaction VCARD SELL, but bank_id is a string", async () => {
        orderType = 'BUY'
        dealType = 'SELL'
        bankId = '5'

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
    })

    it("pushTransaction VCARD BUY, but bank_id is an empty array", async () => {
        orderType = 'SELL'
        dealType = 'BUY'
        bankId = []

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
    })

    it("pushTransaction VCARD BUY, but bank_id is an array of several elements", async () => {
        orderType = 'SELL'
        dealType = 'BUY'
        bankId = [601, 786]

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
    })

    it("pushTransaction VCARD BUY, but card_number has the wrong format", async () => {
        orderType = 'SELL'
        dealType = 'BUY'
        cardNumber = 9090901212341234

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
        assert.equal(response.pushTransaction.response.includes('\'card_number\': [\'Not a valid string.\']'), true)
        assert.equal(response.pushTransaction.errors, 'INVALID_DATA')
    })

    it("pushTransaction VCARD BUY, but card_name has the wrong format", async () => {
        orderType = 'SELL'
        dealType = 'BUY'
        cardholderName = 9090901212341234

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
        assert.equal(response.pushTransaction.response.includes('\'card_name\': [\'Not a valid string.\']'), true)
        assert.equal(response.pushTransaction.errors, 'INVALID_DATA')
    })

    it("pushTransaction VCARD BUY, but card_name is empty", async () => {
        orderType = 'SELL'
        dealType = 'BUY'
        cardholderName = ''

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
        assert.equal(response.pushTransaction.response.includes('\'card_name\': [\'Not a valid string.\']'), true)
        assert.equal(response.pushTransaction.errors, 'INVALID_DATA')
    })

    it("pushTransaction VCARD BUY, but card_expiry is expired", async () => {
        orderType = 'SELL'
        dealType = 'BUY'
        cardExpirationDate = "11/21"

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
        assert.equal(response.pushTransaction.response.includes('\'card_expiry\': [\'Not a valid string.\']'), true)
        assert.equal(response.pushTransaction.errors, 'INVALID_DATA')
    })

    it("pushTransaction VCARD BUY, but card_expiry has a month that equals 0", async () => {
        orderType = 'SELL'
        dealType = 'BUY'
        cardExpirationDate = "00/21"

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
        assert.equal(response.pushTransaction.response.includes('month must be in 1..12'), true)
        assert.equal(response.pushTransaction.errors, 'INVALID_DATA')
    })

    it("pushTransaction VCARD BUY, but card_expiry has a month that equals 13", async () => {
        orderType = 'SELL'
        dealType = 'BUY'
        cardExpirationDate = "13/21"

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
        assert.equal(response.pushTransaction.response.includes('month must be in 1..12'), true)
        assert.equal(response.pushTransaction.errors, 'INVALID_DATA')
    })

    it("pushTransaction VCARD BUY, but cvv is an empty string", async () => {
        orderType = 'SELL'
        dealType = 'BUY'
        cardCvv = ""

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
        assert.equal(response.pushTransaction.response.includes('month must be in 1..12'), true)
        assert.equal(response.pushTransaction.errors, 'INVALID_DATA')
    })

    it("pushTransaction VCARD BUY, but cvv has the wrong format", async () => {
        orderType = 'SELL'
        dealType = 'BUY'
        cardCvv = 123

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
        assert.equal(response.pushTransaction.response.includes('\'cvv\': [\'Not a valid string.\']'), true)
        assert.equal(response.pushTransaction.errors, 'INVALID_DATA')
    })

    it("pushTransaction VCARD BUY, but cvv has 2 symbols", async () => {
        orderType = 'SELL'
        dealType = 'BUY'
        cardCvv = '90'

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
        assert.equal(response.pushTransaction.response.includes('\'cvv\': [\'Not a valid string.\']'), true)
        assert.equal(response.pushTransaction.errors, 'INVALID_DATA')
    })

    it("pushTransaction VCARD BUY, but cvv has 4 symbols", async () => {
        orderType = 'SELL'
        dealType = 'BUY'
        cardCvv = '9090'

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
        assert.equal(response.pushTransaction.response.includes('\'cvv\': [\'Not a valid string.\']'), true)
        assert.equal(response.pushTransaction.errors, 'INVALID_DATA')
    })

    it("pushTransaction VCARD SELL, but the signature is incorrect", async () => {
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

        await wait(35000)

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

    it("pushTransaction VCARD SELL, but there is an error from blockchain", async () => {
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

        await wait(35000)

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

    it("pushTransaction VCARD SELL, but there is no such order in the DB", async () => {
        orderType = 'BUY'
        dealType = 'SELL'
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

        await wait(35000)

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