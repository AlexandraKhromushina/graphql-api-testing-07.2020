const {request, GraphQLClient, gql} = require('graphql-request');
const assert = require("assert");
let config = require("./config.js");
const {v4: uuidv4} = require("uuid");

//Global variables
let queryBlockchains, lang, path, response, data

//Проверка списка Блокчейнов на RU, EN языках
const createQueryBlockchains = async (language) => {
    queryBlockchains = gql`
        query{
            blockchains(lang: ${language}){
                blockchains{
                    id
                    name
                    description
                }
                errors
            }
        }`
    return queryBlockchains
}

describe('check list of Blockchains', function () {
    this.timeout(20000)

    beforeEach(async () => {
        // define variables here
        lang = {'Russian': 'RU', 'English': 'EN'}
        path = 'blockchains'
    });

    it('Get ENG list of Blockchains', async () => {
        await createQueryBlockchains(lang['English'])
        response = await request(config.apiUrl, queryBlockchains)
        console.log(response.blockchains.blockchains)

        assert.equal(response.blockchains.blockchains[0].id, 2)
        assert.equal(response.blockchains.blockchains[0].name, 'ETHEREUM')
        assert.equal(response.blockchains.blockchains[0].description, 'ethereum blockchain')

        for (let i = 0; i < response.blockchains.blockchains.length; i++){
            assert.notEqual(response.blockchains.blockchains[i].id, null)
            assert.notEqual(response.blockchains.blockchains[i].name, null)
            assert.notEqual(response.blockchains.blockchains[i].description, null)
        }
    });

    it('Get RUS list of Blockchains', async () => {
        await createQueryBlockchains(lang['Russian'])
        response = await request(config.apiUrl, queryBlockchains)
        console.log(response.blockchains.blockchains)

        assert.equal(response.blockchains.blockchains[0].id, 2)
        assert.equal(response.blockchains.blockchains[0].name, 'ETHEREUM')
        assert.equal(response.blockchains.blockchains[0].description, 'эфир')

        for (let i = 0; i < response.blockchains.blockchains.length; i++){
            assert.notEqual(response.blockchains.blockchains[i].id, null)
            assert.notEqual(response.blockchains.blockchains[i].name, null)
            assert.notEqual(response.blockchains.blockchains[i].description, null)
        }
    });

    it('Get an ERROR with not valid LANG', async () => {
        lang = 'JP'
        await createQueryBlockchains(lang)
        data = await request(config.apiUrl, queryBlockchains).catch(e => e)
        response = data.response
        console.log(response)
        assert.equal(response.status, 200)
        assert.equal(response.data, null)
        assert.equal(response.errors[0].message, `Value ${lang} is not a valid value for enum Lang`)
        assert.equal(response.errors[0].path, path)
    });

    it('Get an ERROR with empty LANG', async () => {
        lang = ''
        await createQueryBlockchains(lang)
        data = await request(config.apiUrl, queryBlockchains).catch(e => e)
        response = data.response
        console.log(response)
        // TODO check that error message includes syntax error
        assert.equal(response.status, 200)
        assert.equal(response.data, null)
        assert.equal(response.errors[0].path, null)
    });
})