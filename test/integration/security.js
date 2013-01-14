// Load modules

var Chai = require('chai');
var Fs = require('fs');
var Path = require('path');
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

    describe('XML blowup', function () {

        var _server = new Hapi.Server('0.0.0.0', 0);

        var createItemHandler = function (request) {

            request.reply('Success!');
        };

        before(function () {

            _server.addRoute({ method: 'POST', path: '/item', handler: createItemHandler });
        });

        it('attempts return an error message', function (done) {

            Fs.readFile(Path.join(__dirname, 'secResources', 'blowup.xml'), function (err, file) {

                expect(err).to.not.exist;

                _server.inject({ method: 'POST', url: '/item',
                    payload: file.toString(),
                    headers: { 'Content-Type': 'application/xml' } }, function (res) {

                    expect(res.statusCode).to.equal(400);
                    done();
                });
            });

        });
    });

    describe('Path Traversal', function () {

        var _server = new Hapi.Server('0.0.0.0', 0);

        before(function () {

            _server.addRoute({ method: 'GET', path: '/{path*}', handler: { directory: { path: './directory' } } });
        });

        it('to files outside of hosted directory is not allowed with null byte injection', function (done) {

            _server.inject({ method: 'GET', url: '/%00/../security.js' }, function (res) {

                expect(res.statusCode).to.equal(403);
                done();
            });
        });

        it('to files outside of hosted directory is not allowed', function (done) {

            _server.inject({ method: 'GET', url: '/../security.js' }, function (res) {

                expect(res.statusCode).to.equal(403);
                done();
            });
        });

        it('to files outside of hosted directory is not allowed with encoded slash', function (done) {

            _server.inject({ method: 'GET', url: '/..%2Fsecurity.js' }, function (res) {

                expect(res.statusCode).to.equal(403);
                done();
            });
        });

        it('to files outside of hosted directory is not allowed with double encoded slash', function (done) {

            _server.inject({ method: 'GET', url: '/..%252Fsecurity.js' }, function (res) {

                expect(res.statusCode).to.equal(403);
                done();
            });
        });

        it('to files outside of hosted directory is not allowed with unicode encoded slash', function (done) {

            _server.inject({ method: 'GET', url: '/..%u2216security.js' }, function (res) {

                expect(res.statusCode).to.equal(404);
                done();
            });
        });
    });

    describe('Null Byte Injection', function () {

        var _server = new Hapi.Server('0.0.0.0', 0);

        before(function () {

            _server.addRoute({ method: 'GET', path: '/{path*}', handler: { directory: { path: './directory' } } });
        });

        it('isn\'t allowed when serving a file', function (done) {

            _server.inject({ method: 'GET', url: '/index%00.html' }, function (res) {

                expect(res.statusCode).to.equal(404);
                done();
            });
        });
    });
});