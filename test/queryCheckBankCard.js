const {request, GraphQLClient, gql} = require('graphql-request');
const assert = require("assert");
let config = require("./config.js");
const {v4: uuidv4} = require("uuid");

//Global variables
let queryCheckBankCard, inn, path, data, response
let cardErrorMessage, serverErrorMessage

//Проверка одной карты
const createQueryCheckBankCard = async (card_number) => {
    queryCheckBankCard = gql`
        query{
            checkBankCard(iin:"${card_number}"){
                cardNumber
                bank{
                    id
                    name
                }
                bankId
                country
                countryId
                bankId
                brand
                errors
            }
        }`
    return queryCheckBankCard
}

describe('Bank card', function () {
    this.timeout(10000)

    beforeEach(async () => {
        // define variables here
        path = 'checkBankCard'
        cardErrorMessage = "'INVALID_CARD_LENGTH'"
        serverErrorMessage = "'Server error'"
    });

    it('Successfully check Maestro 12-digit card', async () => {
        inn = '566507210235'
        await createQueryCheckBankCard(inn)
        response = await request(config.apiUrl, queryCheckBankCard)
        console.log(response)
        assert.equal(response.checkBankCard.cardNumber, inn)
        assert.equal(response.checkBankCard.bank, null)
        assert.equal(response.checkBankCard.bankId, 1)
        assert.equal(response.checkBankCard.country, null)
        assert.equal(response.checkBankCard.brand, 'MAESTRO')
        assert.equal(response.checkBankCard.countryId, 1)

        assert.equal(response.checkBankCard.errors, null)
    });

    it('Successfully check American Peoples United 14-digit card', async () => {
        inn = '41414141414148'
        await createQueryCheckBankCard(inn)
        response = await request(config.apiUrl, queryCheckBankCard)
        console.log(response)
        assert.equal(response.checkBankCard.cardNumber, inn)
        assert.equal(response.checkBankCard.bank.id, 2880)
        assert.equal(response.checkBankCard.bank.name, 'PEOPLE\'S UNITED BANK')
        assert.equal(response.checkBankCard.bankId, 2880)
        assert.equal(response.checkBankCard.country, 'UNITED STATES')
        assert.equal(response.checkBankCard.brand, 'UNKNOWN')
        assert.equal(response.checkBankCard.countryId, 4)
        assert.equal(response.checkBankCard.errors, null)
    });

    it('Successfully check Russian Sberbank 16-digit card', async () => {
        inn = '4276380069760028'
        await createQueryCheckBankCard(inn)
        response = await request(config.apiUrl, queryCheckBankCard)
        console.log(response)
        assert.equal(response.checkBankCard.cardNumber, inn)
        assert.equal(response.checkBankCard.bank.id, 162)
        assert.equal(response.checkBankCard.bank.name, 'SAVINGS BANK OF THE RUSSIAN FEDERATION (SBERBANK)')
        assert.equal(response.checkBankCard.bankId, 162)
        assert.equal(response.checkBankCard.country, 'RUSSIAN FEDERATION')
        assert.equal(response.checkBankCard.brand, 'VISA')
        assert.equal(response.checkBankCard.countryId, 32)
        assert.equal(response.checkBankCard.errors, null)
    });

    it('Successfully check Slovakia 19-digit card', async () => {
        inn = '4000001234562345678'
        await createQueryCheckBankCard(inn)
        response = await request(config.apiUrl, queryCheckBankCard)
        console.log(response)
        assert.equal(response.checkBankCard.cardNumber, inn)
        assert.equal(response.checkBankCard.bank.id, 1222)
        assert.equal(response.checkBankCard.bank.name, 'ZUNO BANK AG (CLOSED)')
        assert.equal(response.checkBankCard.bankId, 1222)
        assert.equal(response.checkBankCard.country, 'SLOVAKIA')
        assert.equal(response.checkBankCard.brand, 'UNKNOWN')
        assert.equal(response.checkBankCard.countryId, 66)
        assert.equal(response.checkBankCard.errors, null)
    });

    it('Get an ERROR on 11-digit (Luhn valid) card', async () => {
        inn = '61182175341'
        await createQueryCheckBankCard(inn)
        data = await request(config.apiUrl, queryCheckBankCard).catch(e => e)
        response = data.response
        assert.equal(response.status, 200)
        assert.equal(response.data.checkBankCard, null)
        assert.equal(response.errors[0].message, cardErrorMessage)
        assert.equal(response.errors[0].path, path)
    });

    it('Get an ERROR on 20-digit (Luhn valid) card', async () => {
        inn = '61002042740306123582'
        await createQueryCheckBankCard(inn)
        data = await request(config.apiUrl, queryCheckBankCard).catch(e => e)
        response = data.response
        console.log(response)
        assert.equal(response.status, 200)
        assert.equal(response.data.checkBankCard, null)
        assert.equal(response.errors[0].message, cardErrorMessage)
        assert.equal(response.errors[0].path, path)
    });

    it('Get an ERROR on text card', async () => {
        await createQueryCheckBankCard('asb') //text
        data = await request(config.apiUrl, queryCheckBankCard).catch(e => e)
        response = data.response
        console.log(response)
        assert.equal(response.status, 200)
        assert.equal(response.data.checkBankCard, null)
        assert.equal(response.errors[0].message, serverErrorMessage)
        assert.equal(response.errors[0].path, path)
    });

    it('Get an ERROR on valid card number with space', async () => {
        inn = '4276 3800 6976 0028'
        await createQueryCheckBankCard(inn)
        data = await request(config.apiUrl, queryCheckBankCard).catch(e => e)
        response = data.response
        console.log(response)
        assert.equal(response.status, 200)
        assert.equal(response.data.checkBankCard, null)
        assert.equal(response.errors[0].message, serverErrorMessage)
        assert.equal(response.errors[0].path, path)
    });

    it('Get an ERROR with empty inn', async () => {
        inn = ''
        await createQueryCheckBankCard(inn)
        data = await request(config.apiUrl, queryCheckBankCard).catch(e => e)
        response = data.response
        console.log(response)
        assert.equal(response.status, 200)
        assert.equal(response.data.checkBankCard, null)
        assert.equal(response.errors[0].message, serverErrorMessage)
        assert.equal(response.errors[0].path, path)
    });
})
