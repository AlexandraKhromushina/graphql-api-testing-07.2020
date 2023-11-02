const {request, GraphQLClient, gql} = require('graphql-request');
const assert = require("assert");
let config = require("./config.js");
const {v4: uuidv4} = require("uuid");

//Global variables
let queryCities, lang, countryIds, path, response, data

//Проверка списка Городов на RU, EN языках и ID стран
const createQueryCities = async (language, Ids) => {
    queryCities = gql`
        query{
            cities(lang: ${language}, countryIds:[${Ids}]){
                cities{
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
    return queryCities
}

describe('check list of Cities', function () {
    this.timeout(20000)

    beforeEach(async () => {
        // define variables here
        lang = {'Russian': 'RU', 'English': 'EN'}
        countryIds = 32
        path = 'cities'
    });

    it('Get ENG all list of Cities', async () => {
        await createQueryCities(lang['English'], '')
        response = await request(config.apiUrl, queryCities)
        console.log(response.cities.cities)
        assert.notEqual(response.cities.cities, null)
        assert.notEqual(response.cities.cities, '')
        assert.equal(response.cities.errors, null)
    });

    it('Get ENG list of Cities with CountryIds', async () => {
        await createQueryCities(lang['English'], countryIds)
        response = await request(config.apiUrl, queryCities)
        console.log(response.cities.cities)
        assert.equal(response.cities.cities[0].id, 2)
        assert.equal(response.cities.cities[0].name, 'Moscow')
        assert.equal(response.cities.cities[0].countryId, countryIds)
        assert.equal(response.cities.cities[0].country.id, countryIds)
        assert.equal(response.cities.cities[0].country.name, 'RUSSIAN FEDERATION')
        assert.equal(response.cities.cities[0].country.alpha2, null)
        assert.equal(response.cities.cities[0].country.alpha2, null)

        assert.equal(response.cities.cities[1].id, 3)
        assert.equal(response.cities.cities[1].name, 'Saint Petersburg')
        assert.equal(response.cities.cities[1].countryId, countryIds)
        assert.equal(response.cities.cities[1].country.id, countryIds)
        assert.equal(response.cities.cities[1].country.name, 'RUSSIAN FEDERATION')
        assert.equal(response.cities.cities[1].country.alpha2, null)
        assert.equal(response.cities.cities[1].country.alpha2, null)

        for (let i = 0; i < response.cities.cities.length; i++){
            assert.notEqual(response.cities.cities[i].id, null)
            assert.notEqual(response.cities.cities[i].name, null)
            assert.notEqual(response.cities.cities[i].countryId, null)
            assert.notEqual(response.cities.cities[i].country.id, null)
            assert.notEqual(response.cities.cities[i].country.name, null)
        }
        assert.equal(response.cities.errors, null)
    });

    it('Get ENG list of Cities with two CountryIds', async () => {
        countryIds = [32, 85]
        await createQueryCities(lang['English'], countryIds)
        response = await request(config.apiUrl, queryCities)
        console.log(response.cities.cities)

        assert.equal(response.cities.cities[1].id, 2)
        assert.equal(response.cities.cities[1].name, 'Moscow')
        assert.equal(response.cities.cities[1].countryId, countryIds[0])
        assert.equal(response.cities.cities[1].country.id, countryIds[0])
        assert.equal(response.cities.cities[1].country.name, 'RUSSIAN FEDERATION')
        assert.equal(response.cities.cities[1].country.alpha2, null)
        assert.equal(response.cities.cities[1].country.alpha2, null)

        assert.equal(response.cities.cities[0].id, 3)
        assert.equal(response.cities.cities[0].name, 'Saint Petersburg')
        assert.equal(response.cities.cities[0].countryId, countryIds[0])
        assert.equal(response.cities.cities[0].country.id, countryIds[0])
        assert.equal(response.cities.cities[0].country.name, 'RUSSIAN FEDERATION')
        assert.equal(response.cities.cities[0].country.alpha2, null)
        assert.equal(response.cities.cities[0].country.alpha2, null)

        assert.equal(response.cities.cities[2].id, 4)
        assert.equal(response.cities.cities[2].name, 'Kyiv')
        assert.equal(response.cities.cities[2].countryId, countryIds[1])
        assert.equal(response.cities.cities[2].country.id, countryIds[1])
        assert.equal(response.cities.cities[2].country.name, 'UKRAINE')
        assert.equal(response.cities.cities[2].country.alpha2, null)
        assert.equal(response.cities.cities[2].country.alpha2, null)

        for (let i = 0; i < response.cities.cities.length; i++){
            assert.notEqual(response.cities.cities[i].id, null)
            assert.notEqual(response.cities.cities[i].name, null)
            assert.notEqual(response.cities.cities[i].countryId, null)
            assert.notEqual(response.cities.cities[i].country.id, null)
            assert.notEqual(response.cities.cities[i].country.name, null)
        }
        assert.equal(response.cities.errors, null)
    });

    it('Get ENG list of Cities with a country not on the list', async () => {
        countryIds = 666
        await createQueryCities(lang['English'], countryIds)
        response = await request(config.apiUrl, queryCities)
        console.log(response.cities.cities)
        assert.equal(response.cities.cities, '')
        assert.equal(response.cities.errors, null)
    });

    it('Get ENG list of cities, 1st country on the list, 2nd country not on the list', async () => {
        countryIds = [85, 666]
        await createQueryCities(lang['English'], countryIds)
        response = await request(config.apiUrl, queryCities)
        console.log(response.cities.cities)
        assert.equal(response.cities.cities[0].id, 4)
        assert.equal(response.cities.cities[0].name, 'Kyiv')
        assert.equal(response.cities.cities[0].countryId, countryIds[0])
        assert.equal(response.cities.cities[0].country.id, countryIds[0])
        assert.equal(response.cities.cities[0].country.name, 'UKRAINE')
        assert.equal(response.cities.cities[0].country.alpha2, null)
        assert.equal(response.cities.cities[0].country.alpha2, null)

        for (let i = 0; i < response.cities.cities.length; i++){
            assert.notEqual(response.cities.cities[i].id, null)
            assert.notEqual(response.cities.cities[i].name, null)
            assert.notEqual(response.cities.cities[i].countryId, null)
            assert.notEqual(response.cities.cities[i].country.id, null)
            assert.notEqual(response.cities.cities[i].country.name, null)
        }
        assert.equal(response.cities.errors, null)
    });

    it('Get RU all list of Cities', async () => {
        await createQueryCities(lang['Russian'], '')
        response = await request(config.apiUrl, queryCities)
        console.log(response.cities.cities)
        assert.equal(response.cities.cities[0].id, 2)
        assert.equal(response.cities.cities[0].name, 'Москва')
        assert.equal(response.cities.cities[0].countryId, countryIds)
        assert.equal(response.cities.cities[0].country.id, countryIds)
        assert.equal(response.cities.cities[0].country.name, 'Москва')

        for (let i = 0; i < response.cities.cities.length; i++){
            assert.notEqual(response.cities.cities[i].id, null)
            assert.notEqual(response.cities.cities[i].name, null)
            assert.notEqual(response.cities.cities[i].countryId, null)
            assert.notEqual(response.cities.cities[i].country.id, null)
            assert.notEqual(response.cities.cities[i].country.name, null)
        }
        assert.equal(response.cities.errors, null)
    });

    //TODO: Изменить assert country.name ниже, когда добавят списки городов на Русском языке
    it('Get RU list of Cities with CountryIds', async () => {
        await createQueryCities(lang['Russian'], countryIds)
        response = await request(config.apiUrl, queryCities)
        console.log(response.cities.cities)
        assert.equal(response.cities.cities[0].id, 2)
        assert.equal(response.cities.cities[0].name, 'Москва')
        assert.equal(response.cities.cities[0].countryId, countryIds)
        assert.equal(response.cities.cities[0].country.id, countryIds)
        assert.equal(response.cities.cities[0].country.name, 'РОССИЙСКАЯ ФЕДЕРАЦИЯ')
        assert.equal(response.cities.cities[0].country.alpha2, null)
        assert.equal(response.cities.cities[0].country.alpha2, null)

        assert.equal(response.cities.cities[1].id, 3)
        assert.equal(response.cities.cities[1].name, 'Санкт-Петербург')
        assert.equal(response.cities.cities[1].countryId, countryIds)
        assert.equal(response.cities.cities[1].country.id, countryIds)
        assert.equal(response.cities.cities[1].country.name, 'РОССИЙСКАЯ ФЕДЕРАЦИЯ')
        assert.equal(response.cities.cities[1].country.alpha2, null)
        assert.equal(response.cities.cities[1].country.alpha2, null)

        for (let i = 0; i < response.cities.cities.length; i++){
            assert.notEqual(response.cities.cities[i].id, null)
            assert.notEqual(response.cities.cities[i].name, null)
            assert.notEqual(response.cities.cities[i].countryId, null)
            assert.notEqual(response.cities.cities[i].country.id, null)
            assert.notEqual(response.cities.cities[i].country.name, null)
        }
        assert.equal(response.cities.errors, null)
    });

    it('Get an ERROR with empty LANG', async () => {
        await createQueryCities('', countryIds)
        data = await request(config.apiUrl, queryCities).catch(e => e)
        response = data.response
        console.log(response)
        assert.equal(response.status, 200)
        assert.equal(response.data, null)
        assert.equal(response.errors[0].path, null)
    });

    it('Get an ERROR with Ids is not INT', async () => {
        countryIds = 'ooph'
        await createQueryCities(lang['English'], countryIds)
        data = await request(config.apiUrl, queryCities).catch(e => e)
        response = data.response
        console.log(response)
        assert.equal(response.status, 200)
        assert.equal(response.data, null)
        assert.equal(response.errors[0].message, `Value ${countryIds} is not of correct type Int`)
        assert.equal(response.errors[0].path, path)
    });

    it('Get an ERROR with not valid LANG', async () => {
        lang = 'JP'
        await createQueryCities(lang, countryIds)
        data = await request(config.apiUrl, queryCities).catch(e => e)
        response = data.response
        console.log(response)
        assert.equal(response.status, 200)
        assert.equal(response.data, null)
        assert.equal(response.errors[0].message, `Value ${lang} is not a valid value for enum Lang`)
        assert.equal(response.errors[0].path, path)
    });
})