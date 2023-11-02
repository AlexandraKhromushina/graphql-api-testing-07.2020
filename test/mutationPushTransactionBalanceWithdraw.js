const {request, GraphQLClient, gql} = require('graphql-request');
const {v4: uuidv4} = require('uuid');
const assert = require("assert");
let config = require("./config.js");
let {
    wait, createQueryAllDeals,
    createMutationPushTransactionBalanceWithdraw: createMutationPushTransaction, createNewDeal
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
const expect = require('chai').expect

describe("Withdraw p2p balance for all completed deals", function () {
    this.timeout(175000);

    // Local variables
    const 'REDACTED'Name = config.'REDACTED'.code
    const cashTokenName = config.cashToken.code

    let transactionJson = []
    let currencyId, currencyName, tokenName, signatureDate
    let serializedTransactionJson, generatedSignature
    let uuid, dataJson, mutationPushTransaction, transactionName
    let userA, userB, userC, 'REDACTED', paySC, cashToken, cashSC, response, queryAllDeals

    // Local functions
    const createDataJson = ({generatedSignature, from, signatureDate}) => {
        dataJson = {
            signature: {
                username: from.name,
                text: signatureDate,
                signature: generatedSignature.signatures[0]
            }
        }
        return dataJson
    }

    const createTransactionJson = ({from, tokenName}) => {
        transactionJson = [{
            account: 'REDACTED'Name,
            name: 'withdraw',
            authorization: [
                {
                    actor: from.name,
                    permission: "active"
                }
            ],
            data: {
                owner: from.name,
                value: '1.50000 ' + tokenName
            }
        }]
        return transactionJson
    }

    beforeEach(async () => {
        // define variables here
        uuid = uuidv4()
        currencyId = 13;
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

    it("Successfully withdraw tokens", async () => {
        // Get all deals before
        let generatedSignatureUserA = await serializeTransaction({
            from: userA, transactionJson: []
        })
        queryAllDeals = await createQueryAllDeals({
            from: userA,
            generatedSignature: generatedSignatureUserA,
            signatureDate
        })
        let allDealsOfUser = await request(config.apiUrl, queryAllDeals)
        let dealsArray = await allDealsOfUser.allDeals.deals

        // Check that there's a deal without withdrawal
        let deal = await dealsArray.find(x => ((x.status === 'complete' || x.status === 'cancelled')
            && ((x.buyer.username === userA.name && x.buyer.did_withdraw === false)
                || (x.seller.username === userA.name && x.seller.did_withdraw === false))))
        if (!deal) {
            await createNewDeal({
                orderCreator: userA,
                dealCreator: userB,
                createTransactionJsonOrder,
                createDataJsonOrder,
                createDataJsonDeal,
                createTransactionJsonDeal
            })

            await wait(10000)

            let allDealsOfUser = await request(config.apiUrl, queryAllDeals)
            let dealsArray = await allDealsOfUser.allDeals.deals
        }

        // Withdraw tokens
        dataJson = await createDataJson({
            generatedSignature: generatedSignatureUserA, signatureDate, from: userA
        })
        transactionJson = await createTransactionJson({from: userA, tokenName})
        serializedTransactionJson = await serializeTransaction({from: userA, transactionJson})
        mutationPushTransaction = await createMutationPushTransaction({
            serializedTransactionJson,
            dataJson
        })

        response = await request(config.apiUrl, mutationPushTransaction)
        console.log(response)
        assert.equal(response.pushTransaction.response, null)
        assert.equal(response.pushTransaction.errors, null)

        // Prepare expected array
        for (let i = 0; i < dealsArray.length; i++) {
            if (dealsArray[i].status === 'completed' || dealsArray[i].status === 'cancelled') {
                if (dealsArray[i].buyer.username === userA.name) {
                    dealsArray[i].buyer.did_withdraw = true
                } else if (dealsArray[i].seller.username === userA.name) {
                    dealsArray[i].seller.did_withdraw = true
                }
            }
        }

        await wait(5000)

        // Get all deals after
        allDealsOfUser = await request(config.apiUrl, queryAllDeals)
        let dealsArrayAfter = await allDealsOfUser.allDeals.deals

        // Compare arrays
        expect(dealsArrayAfter.sort()).to.have.deep.all.members(dealsArray.sort())
    })
})