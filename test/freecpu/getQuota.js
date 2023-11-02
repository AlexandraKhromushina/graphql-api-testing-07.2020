const assert = require("assert");
const url =  require("../config.js").url;

const chai = require("chai");
const request = require("chai"),
   chaiHttp = require('chai-http');
// const should = require("should");
// const request = require("request");
// const response = require("response");
const expect = chai.expect;

chai.use(chaiHttp);

describe("Get the amount of free transactions",  function () {
    this.timeout(75000);

    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

    let username = 'thew1shmaker'

    it("Successfully get the amount of free transactions", function(done) {
        chai.request(url)
            .get('/quota?username=' + username)
            .then(function(err, response) {
                console.log(response)
                expect(err).to.be.null;
                expect(response).to.have.status(200);
                expect(response.jsonData.data.checkPassword.success).to.eql(true);
                done();
            })
    })
})