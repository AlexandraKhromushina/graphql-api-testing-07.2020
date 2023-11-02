const {request, GraphQLClient, gql} = require('graphql-request');
const {v4: uuidv4} = require('uuid');
const assert = require("assert");
const {url, wait} = require("./config.js");

describe("Create orders and deals", function () {
    this.timeout(75000);

    let orderId = '1000'
    let dealId = '1000'
    let amount = '100.00000'
    let insurance = '10.00000'
    let bank = 'VTB'
    let region = 'RU'
    let token = 'RMBCASH'   //Can only be one of cash tokens
    let signature = ''
    let dataUrl = 'REDACTED'
    let dataBankCard = 'bank card information'
    let orderType = 'SELL'  //Can only be SELL or BUY
    let amountToTransfer = '199.50000 RMBCASH'
    let memoToTransfer = 'deposit'
    const 'REDACTED'Name = 'REDACTED'
    const cashTokenName = 'REDACTED'
    let mutationPlaceOrder, mutationPlaceDeal, mutationP2pDealCompleted
    let queryP2pMyOrders, queryP2pMyDeals, queryP2pGetData
    let uuid, userA, userB, 'REDACTED', paySC, cashToken, cashSC, data, withDealId

    const createMutationPlaceOrder = () => {
        uuid = uuidv4()
        mutationPlaceOrder = gql`
            mutation {
                p2pSetData(username:"${userA.name}",uuid:"${uuid}",token:${token},signature:"${signature}",data:"${dataBankCard}",dataType:CARD,orderType:${orderType}){
                    errors
                }
            }
        `
    }

    const createMutationPlaceDeal = ({
                                         withDealId = false
                                     }) => {
        if (withDealId) {
            mutationPlaceDeal = gql`
                mutation {
                    p2pSetData(username:"${userB.name}",dealId:"${dealId}",uuid:"${uuid}",token:"${token}",signature:"${signature}",data:"${dataUrl}",dataType:URL,orderType:"${orderType}"){
                        errors
                    }
                }
            `
        } else {
            mutationPlaceDeal = gql`
                mutation {
                    p2pSetData(username:"${userB.name}",uuid:"${uuid}",token:"${token}",signature:"${signature}",data:"${dataUrl}",dataType:URL,orderType:"${orderType}"){
                        errors
                    }
                }
            `
        }
    }

    const createMutationP2pDealCompleted = ({
                                                withOrderType = false
                                            }) => {
        if (withOrderType) {
            mutationP2pDealCompleted = gql`
                mutation {
                    p2pDealCompleted(dealId:"${dealId}",orderType:"${orderType}"){
                        errors
                    }
                }
            `
        } else {
            mutationP2pDealCompleted = gql`
                mutation {
                    p2pDealCompleted(dealId:"${dealId}"){
                        errors
                    }
                }
            `
        }
    }

    const createQueryP2pMyOrders = () => {
        queryP2pMyOrders = gql`
            query {
                p2pMyOrders(username:"${userA.name}",token:${token},signature:"${signature}",orderType:${orderType}){
                    p2pOrders {
                        uuid
                        orderId
                        data
                        dataType
                        orderType
                    }
                    errors
                }
            }
        `
    }

    const createQueryP2pMyDeals = () => {
        queryP2pMyDeals = gql`
            query {
                p2pMyDeals(username:"${userB.name}",token:${token}){
                    deals {
                        id
                        order_id
                        status
                        seller
                        buyer
                        volume
                        insurance
                        meta
                        data
                        deal_type
                    }
                    errors
                }
            }
        `
    }

    const createQueryP2pGetData = ({
                                       withDealId = false
                                   }) => {
        if (withDealId) {
            queryP2pGetData = gql`
                query {
                    p2pGetData(dealId:"${dealId}",uuid:"${uuid}",token:"${token}",orderType:"${orderType}"){
                        data
                        dataType
                        errors
                    }
                }
            `
        } else {
            queryP2pGetData = gql`
                query {
                    p2pGetData(uuid:"${uuid}",token:"${token}",orderType:"${orderType}"){
                        data
                        dataType
                        errors
                    }
                }
            `
        }
    }

    before((done) => {
        'REDACTED' = eoslime.Account.load('REDACTED'Name, 'REDACTED')
        cashToken = eoslime.Account.load(cashTokenName, 'REDACTED')
        console.log('REDACTED')
        userA = eoslime.Account.load('avpw.'REDACTED'', 'REDACTED')
        userB = eoslime.Account.load('134251.'REDACTED'', 'REDACTED')
        done();
    })

    beforeEach(async () => {
        paySC = await eoslime.Contract.at('REDACTED'Name, 'REDACTED');
        cashSC = await eoslime.Contract.at(cashTokenName, cashToken);
        // console.log(cashSC)
        // await cashSC.issue(userA.name, '400000.00000 RMBCASH')
        // await cashSC.issue(userB.name, '400000.00000 RMBCASH')
    })

    afterEach(async () => {
        await createQueryP2pMyOrders()
        data = await request(url, queryP2pMyOrders)
        try {
            orderId = data.p2pMyOrders.p2pOrders[0].orderId
        } catch (e) {
        }

        await createQueryP2pMyDeals()
        data = await request(url, queryP2pMyDeals)
        try {
            dealId = data.p2pMyDeals.deals[0].id
        } catch (e) {
        }

        await paySC.cnlbuydeal(dealId, token, {from: userB}).catch(e => e)
        await paySC.cnlselldeal(dealId, token, {from: userB}).catch(e => e)
        await paySC.clssellord(orderId, token, {from: userA}).catch(e => e)
        await paySC.clsbuyord(orderId, token, {from: userA}).catch(e => e)
    })

    it("Successfully create a sell order", async () => {
        await createQueryP2pMyOrders()
        data = await request(url, queryP2pMyOrders)
        assert.equal(data.p2pMyOrders.errors, null)
        assert.equal(data.p2pMyOrders.p2pOrders[0], undefined)

        await createQueryP2pMyDeals()
        data = await request(url, queryP2pMyDeals)
        console.log(data)
        assert.equal(data.p2pMyDeals.errors, null)
        assert.equal(data.p2pMyDeals.deals[0], undefined)

        await cashSC.transfer(userA.name, paySC.name, amountToTransfer, memoToTransfer, {from: userA})
        await paySC.crtbuyord(userA.name, amount + ' ' + token, insurance + ' ' + token,
            insurance + ' ' + token, amount + ' ' + token, bank, region, {from: userA})

        await createMutationPlaceOrder()
        data = await request(url, mutationPlaceOrder)
        assert.equal(data.p2pSetData.errors, null)

        await createQueryP2pMyOrders()
        data = await request(url, queryP2pMyOrders)
        console.log(data.p2pMyOrders.p2pOrders[0])
        assert.equal(data.p2pMyOrders.errors, null)
        assert.equal(data.p2pMyOrders.p2pOrders[0], 1)

        await createQueryP2pMyDeals()
        data = await request(url, queryP2pMyDeals)
        console.log(data)
        assert.equal(data.p2pMyDeals.errors, null)
        assert.equal(data.p2pMyDeals.deals[0], 1)

        await createQueryP2pGetData()
        data = await request(url, queryP2pGetData)
        console.log(data)
        assert.equal(data.p2pMyDeals.errors, null)
        assert.equal(data.p2pMyDeals.deals[0], undefined)

        let order = await paySC.sellorders.scope('RMBCASH').find()
        console.log(order)
        assert.equal(order[0].owner, userA.name)
        assert.equal(order[0].volume, '100.00000 RMBCASH')
        assert.equal(order[0].insurance, '10.00000 RMBCASH')
        assert.equal(order[0].min_package, '5.00000 RMBCASH')
        assert.equal(order[0].max_package, '50.00000 RMBCASH')
        assert.equal(order[0].meta, '-Tinkoff-')
        assert.equal(order[0].data, '_RUS_')
    })
})