const {request, GraphQLClient, gql} = require('graphql-request');
const assert = require("assert");
let config = require("./config.js");
const {v4: uuidv4} = require("uuid");
let {db,pgp} = require("./dbthingies.js");

//Global variables
let queryBanks, lang, path, response, data

//Проверка списка Банков на RU, EN языках
const createQueryBanks = async (language) => {
    queryBanks = gql`
        query{
            banks(lang: ${language}){
                banks{
                    id
                    name
                    countryId
                    country{
                        id
                        name
                        alpha2
                        alpha3
                    }
                }
                errors
            }
        }`
    return queryBanks
}

describe('check list of Banks', function () {
    this.timeout(30000)

    beforeEach(async () => {
        // define variables here
        lang = {'Russian': 'RU', 'English': 'EN'}
        path = 'banks'
    });

    it('Get ENG all list of Banks', async () => {
        await createQueryBanks(lang['English'])
        response = await request(config.apiUrl, queryBanks)
        console.log(response.banks.banks)
        // TODO check db, create an expected json and compare the two like in balance withdraw
        assert.equal(response.banks.banks[0].id, 3)
        assert.equal(response.banks.banks[0].name, 'STATE BANK OF INDIA')
        assert.equal(response.banks.banks[0].countryId, 2)
        assert.equal(response.banks.banks[0].country.id, 2)
        assert.equal(response.banks.banks[0].country.name, 'INDIA')
        assert.equal(response.banks.banks[0].country.alpha2, 'IN')
        assert.equal(response.banks.banks[0].country.alpha3, 'IND')

        for (let i = 0; i < response.banks.banks.length; i++){
            assert.notEqual(response.banks.banks[i].id, null)
            assert.notEqual(response.banks.banks[i].name, null)
            assert.notEqual(response.banks.banks[i].countryId, null)
            assert.notEqual(response.banks.banks[i].country.id, null)
            assert.notEqual(response.banks.banks[i].country.name, null)
            // assert.notEqual(response.banks.banks[i].country.alpha2, null)
            // assert.notEqual(response.banks.banks[i].country.alpha3, null)
        }

        assert.equal(response.banks.errors, null)
    });

    //TODO: Изменить assert (name,alpha) ниже, когда добавят списки Банков на Русском языке
    it('Get RUS all list of Banks', async () => {
        await createQueryBanks(lang['Russian'])
        response = await request(config.apiUrl, queryBanks)
        console.log(response.banks.banks)
        assert.equal(response.banks.banks[0].id, 3)
        assert.equal(response.banks.banks[0].name, 'STATE BANK OF INDIA')
        assert.equal(response.banks.banks[0].countryId, 2)
        assert.equal(response.banks.banks[0].country.id, 2)
        assert.equal(response.banks.banks[0].country.name, 'INDIA')
        assert.equal(response.banks.banks[0].country.alpha2, 'IN')
        assert.equal(response.banks.banks[0].country.alpha3, 'IND')

        for (let i = 0; i < response.banks.banks.length; i++){
            assert.notEqual(response.banks.banks[i].id, null)
            assert.notEqual(response.banks.banks[i].name, null)
            assert.notEqual(response.banks.banks[i].countryId, null)
            assert.notEqual(response.banks.banks[i].country.id, null)
            assert.notEqual(response.banks.banks[i].country.name, null)
            // assert.notEqual(response.banks.banks[i].country.alpha2, null)
            // assert.notEqual(response.banks.banks[i].country.alpha3, null)
        }

        assert.equal(response.banks.errors, null)
    });

    it('Get an ERROR with not valid LANG', async () => {
        lang = 'JP'
        await createQueryBanks(lang)
        data = await request(config.apiUrl, queryBanks).catch(e => e)
        response = data.response
        console.log(response)
        assert.equal(response.status, 200)
        assert.equal(response.data, null)
        assert.equal(response.errors[0].message, `Value ${lang} is not a valid value for enum Lang`)
        assert.equal(response.errors[0].path, path)
    });

    it('Get an ERROR with empty LANG', async () => {
        lang = ''
        await createQueryBanks(lang)
        data = await request(config.apiUrl, queryBanks).catch(e => e)
        response = data.response
        console.log(response)
        assert.equal(response.status, 200)
        assert.equal(response.data, null)
        assert.equal(response.errors[0].path, null)
    });
})