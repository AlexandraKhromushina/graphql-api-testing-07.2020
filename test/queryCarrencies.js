const {request, GraphQLClient, gql} = require('graphql-request');
const assert = require("assert");
let config = require("./config.js");
const {v4: uuidv4} = require("uuid");

//Global variables
let queryCurrencies, lang, currencyType, path, response, data

//Проверка списка Валют на RU, EN языках и типов: FIAT, CRYPTO, EMONEY
const createQueryCurrencies = async (language, currensyType) => {
    queryCurrencies = gql`
        query{
            currencies(lang: ${language}, currencyType: ${currensyType}){
                currencies{
                    id
                    name
                    description
                    precision
                    type
                    blockchains{
                        id
                        name
                    }
                }
                errors
            }
        }`
    return queryCurrencies
}

describe('check list of Currencies', function () {
    this.timeout(20000)

    beforeEach(async () => {
        // define variables here
        lang = {'Russian': 'RU', 'English': 'EN'}
        currencyType = {'Fiat': 'FIAT', 'Crypto': 'CRYPTO', 'Emoney': 'EMONEY'}
        path = 'currencies'
    });

    it('Get ENG all list of FIAT', async () => {
        await createQueryCurrencies(lang['English'], currencyType['Fiat'])
        response = await request(config.apiUrl, queryCurrencies)
        console.log(response.currencies.currencies)

        assert.equal(response.currencies.currencies[0].id, 11)
        assert.equal(response.currencies.currencies[0].name, 'JPY')
        assert.equal(response.currencies.currencies[0].description, 'Japan Yen')
        assert.equal(response.currencies.currencies[0].precision, 2)
        assert.equal(response.currencies.currencies[0].type, currencyType['Fiat'])
        assert.equal(response.currencies.currencies[0].blockchains, '')

        for (let i = 0; i < response.currencies.currencies.length; i++){
            assert.notEqual(response.currencies.currencies[i].id, null)
            assert.notEqual(response.currencies.currencies[i].name, null)
            assert.notEqual(response.currencies.currencies[i].description, null)
            assert.notEqual(response.currencies.currencies[i].precision, null)
            assert.notEqual(response.currencies.currencies[i].type, null)
            assert.notEqual(response.currencies.currencies[i].blockchains, null)
        }
        assert.equal(response.currencies.errors, null)
    });

    it('Get RUS  all list of FIAT', async () => {
        await createQueryCurrencies(lang['Russian'], currencyType['Fiat'])
        response = await request(config.apiUrl, queryCurrencies)
        console.log(response.currencies.currencies)

        assert.equal(response.currencies.currencies[0].id, 11)
        assert.equal(response.currencies.currencies[0].name, 'JPY')
        assert.equal(response.currencies.currencies[0].description, 'Японская йена')
        assert.equal(response.currencies.currencies[0].precision, 2)
        assert.equal(response.currencies.currencies[0].type, currencyType['Fiat'])
        assert.equal(response.currencies.currencies[0].blockchains, '')

        for (let i = 0; i < response.currencies.currencies.length; i++){
            assert.notEqual(response.currencies.currencies[i].id, null)
            assert.notEqual(response.currencies.currencies[i].name, null)
            assert.notEqual(response.currencies.currencies[i].description, null)
            assert.notEqual(response.currencies.currencies[i].precision, null)
            assert.notEqual(response.currencies.currencies[i].type, null)
            assert.notEqual(response.currencies.currencies[i].blockchains, null)
        }
        assert.equal(response.currencies.errors, null)
    });

    it('Get ENG  all list of CRYPTO', async () => {
        await createQueryCurrencies(lang['English'], currencyType['Crypto'])
        response = await request(config.apiUrl, queryCurrencies)
        console.log(response.currencies.currencies)

        assert.equal(response.currencies.currencies[0].id, 4)
        assert.equal(response.currencies.currencies[0].name, 'EOS')
        assert.equal(response.currencies.currencies[0].description, 'EOS token')
        assert.equal(response.currencies.currencies[0].precision, 4)
        assert.equal(response.currencies.currencies[0].type, currencyType['Crypto'])
        assert.equal(response.currencies.currencies[0].blockchains[0].id, 3)
        assert.equal(response.currencies.currencies[0].blockchains[0].name, 'EOS')

        for (let i = 0; i < response.currencies.currencies.length; i++){
            for (let j = 0; j < response.currencies.currencies[i].blockchains.length; j++) {
                assert.notEqual(response.currencies.currencies[i].id, null)
                assert.notEqual(response.currencies.currencies[i].name, null)
                assert.notEqual(response.currencies.currencies[i].description, null)
                assert.notEqual(response.currencies.currencies[i].precision, null)
                assert.notEqual(response.currencies.currencies[i].blockchains[j].id, null)
                assert.notEqual(response.currencies.currencies[i].blockchains[j].name, null)
            }
        }
        assert.equal(response.currencies.errors, null)
    });

    it('Get RUS  all list of CRYPTO', async () => {
        await createQueryCurrencies(lang['Russian'], currencyType['Crypto'])
        response = await request(config.apiUrl, queryCurrencies)
        console.log(response.currencies.currencies)

        assert.equal(response.currencies.currencies[0].id, 4)
        assert.equal(response.currencies.currencies[0].name, 'EOS')
        assert.equal(response.currencies.currencies[0].description, 'токен EOS')
        assert.equal(response.currencies.currencies[0].precision, 4)
        assert.equal(response.currencies.currencies[0].type, currencyType['Crypto'])
        assert.equal(response.currencies.currencies[0].blockchains[0].id, 3)
        assert.equal(response.currencies.currencies[0].blockchains[0].name, 'EOS')

        for (let i = 0; i < response.currencies.currencies.length; i++){
            for (let j = 0; j < response.currencies.currencies[i].blockchains.length; j++) {
                assert.notEqual(response.currencies.currencies[i].id, null)
                assert.notEqual(response.currencies.currencies[i].name, null)
                assert.notEqual(response.currencies.currencies[i].description, null)
                assert.notEqual(response.currencies.currencies[i].precision, null)
                assert.notEqual(response.currencies.currencies[i].blockchains[j].id, null)
                assert.notEqual(response.currencies.currencies[i].blockchains[j].name, null)
            }
        }
        assert.equal(response.currencies.errors, null)
    });

    it('Get ENG  all list of EMONEY', async () => {
        await createQueryCurrencies(lang['English'], currencyType['Emoney'])
        response = await request(config.apiUrl, queryCurrencies)
        console.log(response.currencies.currencies)

        assert.equal(response.currencies.currencies[0].id, 13)
        assert.equal(response.currencies.currencies[0].name, 'WMU')
        assert.equal(response.currencies.currencies[0].description, 'WebMoney USD')
        assert.equal(response.currencies.currencies[0].precision, 2)
        assert.equal(response.currencies.currencies[0].type, currencyType['Emoney'])
        assert.equal(response.currencies.currencies[0].blockchains, '')

        for (let i = 0; i < response.currencies.currencies.length; i++){
            assert.notEqual(response.currencies.currencies[i].id, null)
            assert.notEqual(response.currencies.currencies[i].name, null)
            assert.notEqual(response.currencies.currencies[i].description, null)
            assert.notEqual(response.currencies.currencies[i].precision, null)
            assert.notEqual(response.currencies.currencies[i].type, null)
            assert.notEqual(response.currencies.currencies[i].blockchains, null)
        }
        assert.equal(response.currencies.errors, null)
    });

    //TODO: Изменить assert ниже, когда добавят списки на Русском языке
    it('Get RUS  all list of EMONEY', async () => {
        await createQueryCurrencies(lang['Russian'], currencyType['Emoney'])
        response = await request(config.apiUrl, queryCurrencies)
        console.log(response.currencies.currencies)

        assert.equal(response.currencies.currencies[0].id, 13)
        assert.equal(response.currencies.currencies[0].name, 'WMU')
        assert.equal(response.currencies.currencies[0].description, 'WebMoney USD')
        assert.equal(response.currencies.currencies[0].precision, 2)
        assert.equal(response.currencies.currencies[0].type, currencyType['Emoney'])
        assert.equal(response.currencies.currencies[0].blockchains, '')

        for (let i = 0; i < response.currencies.currencies.length; i++){
            assert.notEqual(response.currencies.currencies[i].id, null)
            assert.notEqual(response.currencies.currencies[i].name, null)
            assert.notEqual(response.currencies.currencies[i].description, null)
            assert.notEqual(response.currencies.currencies[i].precision, null)
            assert.notEqual(response.currencies.currencies[i].type, null)
            assert.notEqual(response.currencies.currencies[i].blockchains, null)
        }
        assert.equal(response.currencies.errors, null)
    });

    it('Get an ERROR with not valid LANG', async () => {
        lang = 'JP'
        await createQueryCurrencies(lang, currencyType['Fiat'])
        data = await request(config.apiUrl, queryCurrencies).catch(e => e)
        response = data.response
        console.log(response)
        assert.equal(response.data, null)
        assert.equal(response.errors[0].message, `Value ${lang} is not a valid value for enum Lang`)
        assert.equal(response.errors[0].path, path)
    });

    it('Get an ERROR with empty LANG', async () => {
        lang = ''
        await createQueryCurrencies(lang, currencyType['Fiat'])
        data = await request(config.apiUrl, queryCurrencies).catch(e => e)
        response = data.response
        console.log(response)
        assert.equal(response.data, null)
        assert.equal(response.errors.path, null)
    });

    it('Get an ERROR with not valid TYPE', async () => {
        currencyType = 'NALICHKA'
        await createQueryCurrencies(lang['Russian'], currencyType)
        data = await request(config.apiUrl, queryCurrencies).catch(e => e)
        response = data.response
        console.log(response)
        assert.equal(response.data, null)
        assert.equal(response.errors[0].message, `Value ${currencyType} is not a valid value for enum CurrencyType`)
        assert.equal(response.errors[0].path, path)
    });

    it('Get an ERROR with empty TYPE', async () => {
        currencyType = ''
        await createQueryCurrencies(lang['English'], currencyType)
        data = await request(config.apiUrl, queryCurrencies).catch(e => e)
        response = data.response
        console.log(response)
        assert.equal(response.data, null)
        assert.equal(response.errors.path, null)
    });
})