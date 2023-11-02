const {request, GraphQLClient, gql} = require('graphql-request');
const assert = require("assert");
let config = require("./config.js");
const {v4: uuidv4} = require("uuid");

//Global variables
let queryCheckBankCards, inns, path, data, response
let cardErrorMessage, serverErrorMessage

//Проверка нескольких карт
const createQueryCheckBankCards = async (inns) => {
    queryCheckBankCards = gql`
        query{
            checkBankCards(iins: ${inns}){
                cards{
                    cardNumber
                    bank{
                        id
                        name
                    }
                    bankId
                    country
                    countryId
                    brand
                    errors
                }
            }
        }`
    return queryCheckBankCards
}

describe('check Bank cards', function () {
    this.timeout(10000)

    beforeEach(async () => {
        // define variables here
        path = 'checkBankCards'
        cardErrorMessage = "'INVALID_CARD'"
        serverErrorMessage = "'Server error'"

    });
    it('Successfully check 2 valid cards', async () => {
        let inn1 = "4276380069760028"
        let inn2 = "5358385390005967"
        inns = `["${inn1}", "${inn2}"]`
        await createQueryCheckBankCards(inns)
        response = await request(config.apiUrl, queryCheckBankCards)

        console.log(response.checkBankCards.cards[0])
        console.log(response.checkBankCards.cards[1])

        assert.equal(response.checkBankCards.cards[0].cardNumber, inn1)
        assert.equal(response.checkBankCards.cards[0].bank.id, 162)
        assert.equal(response.checkBankCards.cards[0].bank.name, 'SAVINGS BANK OF THE RUSSIAN FEDERATION (SBERBANK)')
        assert.equal(response.checkBankCards.cards[0].bankId, 162)
        assert.equal(response.checkBankCards.cards[0].country, 'RUSSIAN FEDERATION')
        assert.equal(response.checkBankCards.cards[0].countryId,32)
        assert.equal(response.checkBankCards.cards[0].brand, 'VISA')
        assert.equal(response.checkBankCards.cards[0].errors, null)

        assert.equal(response.checkBankCards.cards[1].cardNumber, inn2)
        assert.equal(response.checkBankCards.cards[1].bank.id, 14398)
        assert.equal(response.checkBankCards.cards[1].bank.name, 'JSC UNIVERSAL BANK')
        assert.equal(response.checkBankCards.cards[1].bankId, 14398)
        assert.equal(response.checkBankCards.cards[1].country, 'UKRAINE')
        assert.equal(response.checkBankCards.cards[1].countryId,85)
        assert.equal(response.checkBankCards.cards[1].brand, 'MASTERCARD')
        assert.equal(response.checkBankCards.cards[1].errors, null)
    });

    it('Get an ERROR with empty inns', async () => {
        let inn1 = ""
        let inn2 = ""
        inns = `["${inn1}", "${inn2}"]`
        await createQueryCheckBankCards(inns)
        data = await request(config.apiUrl, queryCheckBankCards).catch(e => e)
        response = data.response
        console.log(response)
        assert.equal(response.status, 200)
        assert.equal(response.data.checkBankCards, null)
        assert.equal(response.errors[0].message, serverErrorMessage)
        assert.equal(response.errors[0].path, path)
    });

    //TODO: Дописать тесты проверки карт после обсуждения таски MOB-520
})