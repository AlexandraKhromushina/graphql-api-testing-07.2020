const {request, GraphQLClient, gql} = require('graphql-request');
const {v4: uuidv4} = require('uuid');
const assert = require("assert");
let config = require("./config.js");
let {
    wait, createQueryAllOrders, createQueryAllDeals,
    createMutationPushTransactionEndDeal: createMutationPushTransaction, createNewDeal
} = require("./functions.js");
const serializeTransaction = require("./serializeTransaction.js");
const {
    createDataJson: createDataJsonOrder,
    createTransactionJson: createTransactionJsonOrder
} = require("./mutationPushTransactionCardOrder.js");
const {
    createDataJson: createDataJsonDeal,
    createTransactionJson: createTransactionJsonDeal
} = require("./mutationPushTransactionCardDeal.js");

describe("P2P_END_DEAL: pushTransaction with cmptselldeal or cmptbuydeal and withdraw", function () {
    this.timeout(175000);

    // Local variables
    const 'REDACTED'Name = config.'REDACTED'.code
    const cashTokenName = config.cashToken.code

    let transactionJson = []
    let generatedSignature, signatureDate, dataJson, transactionName, currencyName, tokenName
    let myDeal, queryAllDeals, value
    let userA, userB, userC, 'REDACTED', paySC, cashToken, cashSC, response

    // Local functions
    const createDataJson = ({generatedSignature}) => {
        dataJson = {
            signature: {
                username: userA.name,
                text: signatureDate,
                signature: generatedSignature.signatures[0]
            },
            payload: {
                deal_id: myDeal.id,
                token: tokenName
            }
        }
        return dataJson
    }

    const createTransactionJson = () => {
        if (myDeal.deal_type === 'BUY') {
            transactionName = 'cmptselldeal'
            value = myDeal.volume
        } else {
            transactionName = 'cmptbuydeal'
            value = myDeal.insurance
        }

        transactionJson = [{
            account: 'REDACTED'Name,
            name: transactionName,
            authorization: [
                {
                    actor: userA.name,
                    permission: "active"
                }
            ],
            data: {
                id: myDeal.id,
                token: tokenName
            }
        }, {
            account: 'REDACTED'Name,
            name: 'withdraw',
            authorization: [
                {
                    actor: userA.name,
                    permission: "active"
                }
            ],
            data: {
                owner: userA.name,
                value: value
            }
        }]
        return transactionJson
    }

    beforeEach(async () => {
        // define variables here
        currencyName = 'UAH';
        tokenName = currencyName + 'CASH';
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

    it("Successfully end a deal", async () => {
        // Pick or create a deal
        let generatedSignature = await serializeTransaction({from: userA, transactionJson: []})
        queryAllDeals = await createQueryAllDeals({from: userA, generatedSignature, signatureDate})
        let allDealsOfUser = await request(config.apiUrl, queryAllDeals)
        let dealsArray = await allDealsOfUser.allDeals.deals
        myDeal = await dealsArray.find(x => (x.status === 'proceed' && x.volume.includes(tokenName)))

        if (!myDeal) {
            myDeal = await createNewDeal({
                orderCreator: userA,
                dealCreator: userB,
                createTransactionJsonOrder,
                createDataJsonOrder,
                createDataJsonDeal,
                createTransactionJsonDeal
            })
        }

        // End this deal
        dataJson = await createDataJson({generatedSignature})
        transactionJson = await createTransactionJson()
        let serializedTransactionJson = await serializeTransaction({from: userA, transactionJson})
        let mutationPushTransaction = await createMutationPushTransaction({
            serializedTransactionJson,
            dataJson
        })

        response = await request(config.apiUrl, mutationPushTransaction)
        console.log(response)
        assert.equal(response.pushTransaction.response, null)
        assert.equal(response.pushTransaction.errors, null)

        await wait(30000)

        // Check AllDeals for did_withdraw and completion_date
        allDealsOfUser = await request(config.apiUrl, queryAllDeals)
        dealsArray = await allDealsOfUser.allDeals.deals
        let myDealAfterEnding = await dealsArray.find(x => x.id === myDeal.id)
        console.log(myDealAfterEnding)
        assert.equal(myDealAfterEnding.status, 'completed')
        if (myDealAfterEnding.seller.username === userA.name) {
            assert.equal(myDealAfterEnding.seller.did_withdraw, true)
            assert.equal(myDealAfterEnding.buyer.did_withdraw, myDeal.buyer.did_withdraw)
        } else if (myDealAfterEnding.buyer.username === userA.name) {
            assert.equal(myDealAfterEnding.seller.did_withdraw, myDeal.seller.did_withdraw)
            assert.equal(myDealAfterEnding.buyer.did_withdraw, true)
        } else {
            throw new Error('neither seller nor buyer is ' + userA.name)
        }

        if (myDeal.completed_date != null) {
            assert.notEqual(myDealAfterEnding.completed_date, myDeal.completed_date)
        } else {
            assert.notEqual(myDealAfterEnding.completed_date, null)
        }
    })
})