const {request, GraphQLClient, gql} = require('graphql-request');
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
} = require("./mutationPushTransactionCryptoExchangeOrder.js");

describe("Create CRYPTO_EXCHANGE deals", function () {
    this.timeout(175000);

    // Local variables
    const 'REDACTED'Name = config.'REDACTED'.code
    const cashTokenName = config.cashToken.code

    let transactionJson = []
    let paymentType, currencyId, currencyName, tokenName, countryId, countryName
    let volume, insurance, serializedTransactionJson, walletAddress, signatureDate
    let generatedSignature, myOrder, dealsArray, myDeal, queryAllDealsBuyer, queryAllDealsSeller
    let dataJson, orderType, dealType, mutationPushTransaction, transactionName
    let userA, userB, userC, 'REDACTED', paySC, cashToken, cashSC, response, queryAllOrders

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
                    wallet_address: walletAddress
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
        paymentType = 'CRYPTO_EXCHANGE';
        currencyId = 13;
        currencyName = 'UAH';
        tokenName = currencyName + 'CASH';
        countryId = 236
        countryName = 'Ukraine'
        walletAddress = 'REDACTED'
        volume = "1.00000"
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
        assert.equal(myDeal.card_number, null)
        assert.equal(myDeal.payment_url, null)
        assert.equal(myDeal.wallet_number, null)
        assert.equal(myDeal.wallet_address, myOrder.wallet_address)
        assert.equal(myDeal.memo, myOrder.memo)
        assert.equal(myDeal.rate, myOrder.rate)
        assert.deepEqual(myDeal.bank_id, [])
        assert.equal(myDeal.city_id, null)
        assert.equal(myDeal.currency_id, myOrder.currency_id)
        assert.equal(myDeal.country_id, null)
        assert.equal(myDeal.card_expiry, null)
        assert.equal(myDeal.card_name, null)
        assert.equal(myDeal.cvv, null)
        assert.equal(myDeal.payment_system_id, null)
        assert.equal(myDeal.blockchain_id, myOrder.blockchain_id)

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
        assert.equal(myDeal.card_number, null)
        assert.equal(myDeal.payment_url, null)
        assert.equal(myDeal.wallet_number, null)
        assert.equal(myDeal.wallet_address, myOrder.wallet_address)
        assert.equal(myDeal.memo, myOrder.memo)
        assert.equal(myDeal.rate, myOrder.rate)
        assert.deepEqual(myDeal.bank_id, [])
        assert.equal(myDeal.city_id, null)
        assert.equal(myDeal.currency_id, myOrder.currency_id)
        assert.equal(myDeal.country_id, null)
        assert.equal(myDeal.card_expiry, null)
        assert.equal(myDeal.card_name, null)
        assert.equal(myDeal.cvv, null)
        assert.equal(myDeal.payment_system_id, null)
        assert.equal(myDeal.blockchain_id, myOrder.blockchain_id)
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

        await wait(15000)

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
        assert.equal(myDeal.card_number, null)
        assert.equal(myDeal.payment_url, null)
        assert.equal(myDeal.wallet_number, null)
        assert.equal(myDeal.wallet_address, walletAddress)
        assert.equal(myDeal.memo, myOrder.memo)
        assert.equal(myDeal.rate, myOrder.rate)
        assert.deepEqual(myDeal.bank_id, [])
        assert.equal(myDeal.city_id, null)
        assert.equal(myDeal.currency_id, myOrder.currency_id)
        assert.equal(myDeal.country_id, null)
        assert.equal(myDeal.card_expiry, null)
        assert.equal(myDeal.card_name, null)
        assert.equal(myDeal.cvv, null)
        assert.equal(myDeal.payment_system_id, null)
        assert.equal(myDeal.blockchain_id, myOrder.blockchain_id)

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
        assert.equal(myDeal.card_number, null)
        assert.equal(myDeal.payment_url, null)
        assert.equal(myDeal.wallet_number, null)
        assert.equal(myDeal.wallet_address, walletAddress)
        assert.equal(myDeal.memo, myOrder.memo)
        assert.equal(myDeal.rate, myOrder.rate)
        assert.deepEqual(myDeal.bank_id, [])
        assert.equal(myDeal.city_id, null)
        assert.equal(myDeal.currency_id, myOrder.currency_id)
        assert.equal(myDeal.country_id, null)
        assert.equal(myDeal.card_expiry, null)
        assert.equal(myDeal.card_name, null)
        assert.equal(myDeal.cvv, null)
        assert.equal(myDeal.payment_system_id, null)
        assert.equal(myDeal.blockchain_id, myOrder.blockchain_id)
    })

    it("pushTransaction CE BUY with the payload of SELL", async () => {
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

    it("pushTransaction CE SELL with the payload of BUY", async () => {
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

    it("pushTransaction CE SELL, but wallet_address has the wrong format", async () => {
        orderType = 'BUY'
        dealType = 'SELL'
        walletAddress = 14705909234567898

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
        assert.equal(response.pushTransaction.response.includes('\'wallet_address\': [\'Not a valid string.\']'), true)
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

    it("pushTransaction CE SELL, but the signature is incorrect", async () => {
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

    it("pushTransaction CE SELL, but there is an error from blockchain", async () => {
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

    it("pushTransaction CE BUY, but there is no such order in the DB", async () => {
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
})