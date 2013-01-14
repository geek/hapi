// Load modules

var Chai = require('chai');
var Hapi = require('../helpers');


// Declare internals

var internals = {};


// Test shortcuts

var expect = Chai.expect;


describe('Security', function () {

    describe('response splitting', function () {

        var _server = new Hapi.Server('0.0.0.0', 0);

        var createItemHandler = function (request) {

            request.reply(new Hapi.Response.Empty().created(request.server.settings.uri + '/item/' + request.payload.name));
        };

        before(function () {

            _server.addRoute({ method: 'POST', path: '/item', handler: createItemHandler });
        });

        it('isn\'t allowed through the request.create method', function (done) {

            _server.inject({ method: 'POST', url: '/item',
                payload: '{"name": "foobar%0d%0aContent-Length:%200%0d%0a%0d%0aHTTP/1.1%20200%20OK%0d%0aContent-Type:%20text/html%0d%0aContent-Length:%2019%0d%0a%0d%0a<html>Shazam</html>"}',
                headers: { 'Content-Type': 'application/json' } }, function (res) {

                expect(res.headers.Location).to.not.contain('%0d%0a');
                done();
            });
        });
    });
});