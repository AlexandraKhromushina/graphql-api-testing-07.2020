const {request, GraphQLClient, gql} = require('graphql-request');
const assert = require("assert");
let config = require("./config.js");
const {v4: uuidv4} = require("uuid");

//Global variables
let queryLastUpdate, response

//Проверка последних обновлений списков
const createQueryLastUpdate = async () => {
    queryLastUpdate = gql`
        query{
            lastUpdate{
                lastUpdate
                errors
            }
        }`
    return queryLastUpdate
}

describe('check Last Update', function () {
    this.timeout(10000)

    it('check Last Update', async () => {
        await createQueryLastUpdate()
        response = await request(config.apiUrl, queryLastUpdate)
        console.log(response)
        assert.notEqual(response.lastUpdate.lastUpdate, null)

        assert.equal(response.lastUpdate.errors, null)
    });
})