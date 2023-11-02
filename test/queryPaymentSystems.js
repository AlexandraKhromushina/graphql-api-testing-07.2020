const {request, GraphQLClient, gql} = require('graphql-request');
const assert = require("assert");
let config = require("./config.js");
const {v4: uuidv4} = require("uuid");

//Global variables
let queryPaymentSystem, lang, path, response, data

//Проверка списка Платежных систем на RU, EN языках
const createQueryPaymentSystem = async (language) => {
    queryPaymentSystem = gql`
        query{
            paymentSystems(lang: ${language}){
                paymentSystems{
                    id
                    name
                    currencies{
                        id
                        name
                        description
                        type
                        precision
                        blockchains{
                            id
                            name
                            description
                        }
                    }
                }
                errors
            }
        }`
    return queryPaymentSystem
}

describe('check list of Payment Systems', function () {
    this.timeout(20000)

    beforeEach(async () => {
        // define variables here
        lang = {'Russian': 'RU', 'English': 'EN'}
        path = 'paymentSystems'
    });

    it('Get ENG all list of Payment Systems', async () => {
        await createQueryPaymentSystem(lang['English'])
        response = await request(config.apiUrl, queryPaymentSystem)
        console.log(response.paymentSystems.paymentSystems[0].currencies)

        assert.equal(response.paymentSystems.paymentSystems[0].id, 1)
        assert.equal(response.paymentSystems.paymentSystems[0].name, 'QIWI')
        assert.equal(response.paymentSystems.paymentSystems[0].currencies[0].id, 3)
        assert.equal(response.paymentSystems.paymentSystems[0].currencies[0].name, 'RUB')
        assert.equal(response.paymentSystems.paymentSystems[0].currencies[0].description, 'Russian Ruble')
        assert.equal(response.paymentSystems.paymentSystems[0].currencies[0].type, 'FIAT')
        assert.equal(response.paymentSystems.paymentSystems[0].currencies[0].precision,2)
        assert.equal(response.paymentSystems.paymentSystems[0].currencies[0].blockchains, null)

        for (let i = 0; i < response.paymentSystems.paymentSystems.length; i++){
            for (let j = 0; j < response.paymentSystems.paymentSystems[i].currencies.length; j++) {
                assert.notEqual(response.paymentSystems.paymentSystems[i].id, null)
                assert.notEqual(response.paymentSystems.paymentSystems[i].name, null)
                assert.notEqual(response.paymentSystems.paymentSystems[i].currencies[j].id, null)
                assert.notEqual(response.paymentSystems.paymentSystems[i].currencies[j].name, null)
                assert.notEqual(response.paymentSystems.paymentSystems[i].currencies[j].description, null)
                assert.notEqual(response.paymentSystems.paymentSystems[i].currencies[j].type, null)
                assert.notEqual(response.paymentSystems.paymentSystems[i].currencies[j].precision,null)

            }
        }
        assert.equal(response.paymentSystems.errors, null)
    });

    //TODO: Изменить assert ниже, когда добавят списки платежных систем на Русском языке
    it('Get RUS all list of Payment Systems', async () => {
        await createQueryPaymentSystem(lang['Russian'])
        response = await request(config.apiUrl, queryPaymentSystem)
        console.log(response.paymentSystems.paymentSystems[0].currencies)

        assert.equal(response.paymentSystems.paymentSystems[0].id, 1)
        assert.equal(response.paymentSystems.paymentSystems[0].name, 'QIWI')
        assert.equal(response.paymentSystems.paymentSystems[0].currencies[0].id, 3)
        //assert.equal(response.paymentSystems.paymentSystems[0].currencies[0].name, 'РУБ')
        //assert.equal(response.paymentSystems.paymentSystems[0].currencies[0].description, 'Российский рубль')
        assert.equal(response.paymentSystems.paymentSystems[0].currencies[0].type, 'FIAT')
        assert.equal(response.paymentSystems.paymentSystems[0].currencies[0].precision,2)
        assert.equal(response.paymentSystems.paymentSystems[0].currencies[0].blockchains, null)

        for (let i = 0; i < response.paymentSystems.paymentSystems.length; i++){
            for (let j = 0; j < response.paymentSystems.paymentSystems[i].currencies.length; j++) {
                assert.notEqual(response.paymentSystems.paymentSystems[i].id, null)
                assert.notEqual(response.paymentSystems.paymentSystems[i].name, null)
                assert.notEqual(response.paymentSystems.paymentSystems[i].currencies[j].id, null)
                assert.notEqual(response.paymentSystems.paymentSystems[i].currencies[j].name, null)
                assert.notEqual(response.paymentSystems.paymentSystems[i].currencies[j].description, null)
                assert.notEqual(response.paymentSystems.paymentSystems[i].currencies[j].type, null)
                assert.notEqual(response.paymentSystems.paymentSystems[i].currencies[j].precision,null)

            }
        }
        assert.equal(response.paymentSystems.errors, null)
    });

    it('Get an ERROR with not valid LANG', async () => {
        lang = 'JP'
        await createQueryPaymentSystem(lang)
        data = await request(config.apiUrl, queryPaymentSystem).catch(e => e)
        response = data.response
        console.log(response)
        assert.equal(response.status, 200)
        assert.equal(response.data, null)
        assert.equal(response.errors[0].message, `Value ${lang} is not a valid value for enum Lang`)
        assert.equal(response.errors[0].path, path)
    });

    it('Get an ERROR with empty LANG', async () => {
        await createQueryPaymentSystem('')
        data = await request(config.apiUrl, queryPaymentSystem).catch(e => e)
        response = data.response
        console.log(response)
        assert.equal(response.status, 200)
        assert.equal(response.data, null)
        assert.equal(response.errors[0].path, null)
    });
})