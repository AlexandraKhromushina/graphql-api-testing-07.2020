const {request, GraphQLClient, gql} = require('graphql-request');
const serializeTransaction = require("./serializeTransaction.js");
let config = require("./config.js");
const {v4: uuidv4} = require('uuid');

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

const escape = (obj) => {
    if (!obj) {
        return
    }
    return JSON.stringify(obj)
        .replace(/\\n/g, "\\n")
        .replace(/\\'/g, "\\'")
        .replace(/\\"/g, '\\"')
        .replace(/\\&/g, "\\&")
        .replace(/\\r/g, "\\r")
        .replace(/\\t/g, "\\t")
        .replace(/\\b/g, "\\b")
        .replace(/\\f/g, "\\f")
        .replace(/\\/g, "\\\\");
}

const createQueryAllOrders = ({
                                  generatedSignature,
                                  from,
                                  signatureDate
                              }) => {
    let queryAllOrders = gql`
                query AllOrders{
                  allOrders(signature:"{\\"username\\": \\"${from.name}\\", \\"text\\": \\"${signatureDate}\\", \\"signature\\": \\"${generatedSignature.signatures[0]}\\"}"){
                    orders{
                      uuid
                      order_id
                      backend_data
                      data_type
                      order_type
                      owner
                      token
                      status
                      volume
                      insurance
                      volume_balance
                      insurance_balance
                      min_package
                      max_package
                      rating{
                        failed_deals
                        completed_deals
                      }
                      memo
                      bank_ids
                      city_id
                      country_id
                      card_name
                      card_expiry
                      cvv
                      blockchain_id
                      payment_system_id
                      rate
                      currency_id
                      card_number
                      payment_url
                      wallet_number
                      wallet_address
                      created_at
                    }
                    errors
                  }
                }
            `
    return queryAllOrders
}

const createQueryAllDeals = ({
                                 generatedSignature,
                                 from,
                                 signatureDate
                             }) => {
    let queryAllDeals = gql`
                query AllDeals{
                  allDeals(signature:"{\\"username\\": \\"${from.name}\\", \\"text\\": \\"${signatureDate}\\", \\"signature\\": \\"${generatedSignature.signatures[0]}\\"}"){
                    deals{
                      id
                      order_id
                      status
                      seller{
                        username
                        did_withdraw
                        rating{
                          completed_deals
                          failed_deals
                        }
                      }
                      buyer{
                        username
                        did_withdraw
                        rating{
                          completed_deals
                          failed_deals
                        }
                      }
                      volume
                      insurance
                      deal_type
                      creation_date
                      expiration_date
                      completed_date
                      is_paid
                      
                      card_number
                      payment_url
                      wallet_number
                      wallet_address
                  
                      memo
                      rate
                      bank_id
                      city_id
                      currency_id
                      country_id
                      card_expiry
                      card_name
                      cvv
                      payment_system_id
                      blockchain_id
                    }
                    errors
                  }
                }
            `
    return queryAllDeals
}

const createMutationPushTransactionCreateOrder = ({serializedTransactionJson, dataJson, orderType}) => {
    let mutationPushTransaction = gql`
                mutation PushTransaction{
                  pushTransaction(
                    transactionType:P2P_CREATE_${orderType}_ORDER
                    isUsingFreetx:true
                    transaction:${JSON.stringify(escape(serializedTransactionJson))}
                    data:${JSON.stringify(escape(dataJson))}
                  ){
                    transactionResponse
                    response
                    errors
                  }
                }
            `
    return mutationPushTransaction
}

const createMutationPushTransactionCreateDeal = ({serializedTransactionJson, dataJson, dealType}) => {
    let mutationPushTransaction = gql`
                mutation PushTransaction{
                  pushTransaction(
                    transactionType:P2P_CREATE_${dealType}_DEAL
                    isUsingFreetx:true
                    transaction:${JSON.stringify(escape(serializedTransactionJson))}
                    data:${JSON.stringify(escape(dataJson))}
                  ){
                    transactionResponse
                    response
                    errors
                  }
                }
            `
    return mutationPushTransaction
}

const createMutationPushTransactionEndDeal = ({serializedTransactionJson, dataJson}) => {
    let mutationPushTransaction = gql`
                mutation PushTransaction{
                  pushTransaction(
                    transactionType:P2P_END_DEAL
                    isUsingFreetx:true
                    transaction:${JSON.stringify(escape(serializedTransactionJson))}
                    data:${JSON.stringify(escape(dataJson))}
                  ){
                    transactionResponse
                    response
                    errors
                  }
                }
            `
    return mutationPushTransaction
}

const createMutationPushTransactionBalanceWithdraw = ({serializedTransactionJson, dataJson}) => {
    let mutationPushTransaction = gql`
                mutation PushTransaction{
                  pushTransaction(
                    transactionType:P2P_BALANCE_WITHDRAW
                    isUsingFreetx:true
                    transaction:${JSON.stringify(escape(serializedTransactionJson))}
                    data:${JSON.stringify(escape(dataJson))}
                  ){
                    transactionResponse
                    response
                    errors
                  }
                }
            `
    return mutationPushTransaction
}

const createNewOrder = async ({
                                  orderType,
                                  from,
                                  createDataJsonOrder,
                                  createTransactionJsonOrder,
                                  paymentType = 'CARD'
                              }) => {
    let uuid = uuidv4()
    let currencyId = 13;
    let currencyName = 'UAH';
    let tokenName = currencyName + 'CASH';
    let countryId = 236
    let countryName = 'Ukraine'
    let rate = '1'
    let isCashRate = false
    let cardNumber = '5358385390005967'
    let bankId = [371]
    let bankIds = [405, 392, 576]
    let bankName = 'Mono'
    let memo = 'memo1'
    let volume = "1.00000"
    let insurance = "0.10000"
    let minPackage = volume
    let maxPackage = volume
    let cityId = 42256
    let walletNumber = '2008385390005967002'
    let paymentSystemId = 1
    let paymentUrl = 'https://music.youtube.com/watch?v=xjLTDaCUYuQ&feature=share'
    let cardholderName = "B.C."
    let cardExpirationDate = "07/77"
    let cardCvv = "999"
    let signatureDate = await new Date().toISOString()

    let generatedSignature = await serializeTransaction({from, transactionJson: []})
    let dataJson = await createDataJsonOrder({generatedSignature, from})
    let queryAllOrders = await createQueryAllOrders({from, generatedSignature, signatureDate})
    let transactionJson = await createTransactionJsonOrder()
    let serializedTransactionJson = await serializeTransaction({from, transactionJson})
    let mutationPushTransaction = await createMutationPushTransactionCreateOrder({
        serializedTransactionJson,
        dataJson,
        orderType
    })
    await request(config.apiUrl, mutationPushTransaction)
    await wait(25000)

    let allOrdersOfUser = await request(config.apiUrl, queryAllOrders)
    console.log(allOrdersOfUser)
    let ordersArray = await allOrdersOfUser.allOrders.orders
    let myOrder = await ordersArray.find(x => x.uuid === uuid)

    return myOrder
}

const createNewDeal = async ({
                                 orderType = 'SELL',
                                 orderCreator,
                                 createDataJsonOrder,
                                 createTransactionJsonOrder,
                                 createDataJsonDeal,
                                 createTransactionJsonDeal,
                                 dealCreator,
                                 paymentType = 'CARD'
                             }) => {
    // Pick or create an order
    let uuid = uuidv4()
    let currencyId = 13;
    let currencyName = 'UAH';
    let tokenName = currencyName + 'CASH';
    let countryId = 236
    let countryName = 'Ukraine'
    let rate = '1'
    let isCashRate = false
    let cardNumber = '5358385390005967'
    let bankId = [405]
    let bankIds = [576, 392]
    let bankName = 'Mono'
    let memo = 'memo1'
    let volume = "1.00000"
    let insurance = "0.10000"
    let minPackage = volume
    let maxPackage = volume
    let cityId = 42257
    let walletNumber = '2008385390005967002'
    let paymentSystemId = 2
    let paymentUrl = 'https://music.youtube.com/watch?v=xjLTDaCUYuQ&feature=share'
    let cardholderName = "B.C."
    let cardExpirationDate = "07/77"
    let cardCvv = "999"
    let signatureDate = await new Date().toISOString()
    let dealType
    if (orderType === 'BUY') {
        dealType = 'SELL'
    } else {
        dealType = 'BUY'
    }

    let generatedSignatureForOrder = await serializeTransaction({from: orderCreator, transactionJson: []})
    let queryAllOrders = await createQueryAllOrders({
        from: orderCreator,
        generatedSignature: generatedSignatureForOrder,
        signatureDate
    })
    let allOrdersOfUser = await request(config.apiUrl, queryAllOrders)
    let ordersArray = await allOrdersOfUser.allOrders.orders
    let myOrder = await ordersArray.find(x => (x.volume_balance === volume + ' ' + tokenName
        && x.status === 'available' && x.data_type === paymentType && x.order_type === orderType))

    if (!myOrder) {
        myOrder = await createNewOrder({orderType, from: orderCreator, createDataJsonOrder, createTransactionJsonOrder})
    }

    // Prepare bankId for the deal
    bankId = myOrder.bank_ids[Math.floor(Math.random() * myOrder.bank_ids.length)]

    if (!bankId) {
        bankId = 404
    }

    // Reset signatureDate
    signatureDate = await new Date().toISOString()

    // Create a new deal
    let generatedSignatureForDeal = await serializeTransaction({from: dealCreator, transactionJson: []})
    let dataJson = await createDataJsonDeal({
        myOrder,
        from: dealCreator,
        generatedSignature: generatedSignatureForDeal,
        paymentType
    })
    let queryAllDeals = await createQueryAllDeals({
        from: dealCreator,
        generatedSignature: generatedSignatureForDeal,
        signatureDate
    })
    let transactionJson = await createTransactionJsonDeal({from: dealCreator, myOrder, tokenName, volume, insurance})
    let serializedTransactionJson = await serializeTransaction({from: dealCreator, transactionJson})
    let mutationPushTransaction = await createMutationPushTransactionCreateDeal({
        serializedTransactionJson,
        dataJson,
        dealType
    })

    let result = await request(config.apiUrl, mutationPushTransaction)
    console.log(result)
    await wait(45000)

    let allDeals = await request(config.apiUrl, queryAllDeals)
    let dealsArray = await allDeals.allDeals.deals
    let myDeal = await dealsArray.find(z => z.order_id = parseInt(myOrder.order_id))

    if (!myDeal) {
        throw new Error('Deal not found, order id: ' + myOrder.order_id)
    }

    return myDeal
}

module.exports = {
    wait,
    createQueryAllOrders,
    createQueryAllDeals,
    createMutationPushTransactionCreateOrder,
    createMutationPushTransactionCreateDeal,
    createMutationPushTransactionEndDeal,
    createMutationPushTransactionBalanceWithdraw,
    escape,
    createNewOrder,
    createNewDeal
};