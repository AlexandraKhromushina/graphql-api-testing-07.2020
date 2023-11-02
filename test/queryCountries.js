const {request, GraphQLClient, gql} = require('graphql-request');
const assert = require("assert");
let config = require("./config.js");
const {v4: uuidv4} = require("uuid");

//Global variables
let queryCountries, lang, path, response, data

//Проверка списка Стран на RU, EN языках
const createQueryCountries = async (language) => {
    queryCountries = gql`
        query{
            countries(lang: ${language}){
                countries{
                    id
                    name
                    alpha2
                    alpha3
                }
                errors
            }
        }`
    return queryCountries
}

describe('check list of Countries', function () {
    this.timeout(20000)

    beforeEach(async () => {
        // define variables here
        lang = {'Russian': 'RU', 'English': 'EN'}
        path = 'countries'
    });

    it('Get ENG list of Countries', async () => {
        await createQueryCountries(lang['English'])
        response = await request(config.apiUrl, queryCountries)
        console.log(response.countries.countries)
        assert.equal(response.countries.countries[0].id, 1)
        assert.equal(response.countries.countries[0].name, 'Other')
        assert.equal(response.countries.countries[0].alpha2, null)
        assert.equal(response.countries.countries[0].alpha3, null)

        assert.equal(response.countries.countries[9].id, 10)
        assert.equal(response.countries.countries[9].name, 'SPAIN')
        assert.equal(response.countries.countries[9].alpha2, 'ES')
        assert.equal(response.countries.countries[9].alpha3, 'ESP')

        for (let i = 0; i < response.countries.countries.length; i++){
            assert.notEqual(response.countries.countries[i].id, null)
            assert.notEqual(response.countries.countries[i].name, null)
        }
        assert.equal(response.countries.errors, null)
    });

    //TODO: Изменить закоментированный assert ниже, когда добавят списки стран на Русском языке
    it('Get RUS list of Countries', async () => {
        await createQueryCountries(lang['Russian'])
        response = await request(config.apiUrl, queryCountries)
        console.log(response.countries.countries)
        assert.equal(response.countries.countries[0].id, 1)
        assert.equal(response.countries.countries[0].name, 'Другая')
        assert.equal(response.countries.countries[0].alpha2, null)
        assert.equal(response.countries.countries[0].alpha3, null)

        // assert.equal(response.countries.countries[9].id, 10)
        // assert.equal(response.countries.countries[9].name, 'Испания')
        // assert.equal(response.countries.countries[9].alpha2, 'ES')
        // assert.equal(response.countries.countries[9].alpha3, 'ESP')
        for (let i = 0; i < response.countries.countries.length; i++){
            assert.notEqual(response.countries.countries[i].id, null)
            assert.notEqual(response.countries.countries[i].name, null)
        }
        assert.equal(response.countries.errors, null)
    });

    it('Get an ERROR with not valid LANG', async () => {
        lang = 'JP'
        await createQueryCountries(lang)
        data = await request(config.apiUrl, queryCountries).catch(e => e)
        response = data.response
        console.log(response)
        assert.equal(response.data, null)
        assert.equal(response.errors[0].message, `Value ${lang} is not a valid value for enum Lang`)
        assert.equal(response.errors[0].path, path)
    });

    it('Get an ERROR with empty LANG', async () => {
        lang = ''
        await createQueryCountries(lang)
        data = await request(config.apiUrl, queryCountries).catch(e => e)
        response = data.response
        console.log(response)
        assert.equal(response.data, null)
        assert.equal(response.errors.path, null)
    });
})