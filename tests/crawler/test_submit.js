import { expect } from 'chai';
import sinon from 'sinon';
import request from 'request';
var chai = require('chai');
var sinonChai = require('sinon-chai');
import jsonfile from 'jsonfile';
import inquirer from 'inquirer';
var Promise = require("bluebird");
import CryptoJS from 'crypto-js';
import fs from 'fs';

var helpers = require('../../src/lib/helpers');
import Submit from '../../src/lib/crawler/Submit';

chai.use(sinonChai);

describe('Codeforces', function() {
    describe('#Submit', function() {

        describe('.constructor()', function() {

            beforeEach(function(){
                sinon.stub(process.stderr,'write');
                sinon.stub(request, 'get');
            });
            afterEach(function(){
                process.stderr.write.restore();
                request.get.restore();
            });

            it('should throw error when parameter empty', function(done) {
                expect(function () {
                    new Submit();
                }).to.throw(Error);
                done();
            });

            it('should throw error when parameter Object empty', function(done) {
                expect(function () {
                    new Submit({});
                }).to.throw(Error);
                done();
            });

            it('should throw error when contestId empty', function(done) {
                expect(function () {
                    new Submit({ problemIndex: 'A', codeFile: 'a.cpp' });
                }).to.throw(Error);
                done();
            });

            it('should throw error when problemIndex empty', function(done) {
                expect(function () {
                    new Submit({ contestId: 10, codeFile: 'a.cpp' });
                }).to.throw(Error);
                done();
            });

            it('should throw error when codeFile empty', function(done) {
                expect(function () {
                    new Submit({ problemIndex: 'A', contestId: 10 });
                }).to.throw(Error);
                done();
            });

            it('should not fail contest', function(done) {
                expect(function () {
                    new Submit({ problemIndex: 'A', contestId: 10, codeFile: 'a.cpp', language: 10 });
                }).to.not.throw(Error);
                done();
            });
            it('should not fail gym', function(done) {
                expect(function () {
                    new Submit({contestId : 10, problemIndex : 'A', codeFile : 'a.cpp', watch : false, totalRuns : 1, delay : 1000, language : 10, remember : false, logout : false, gym : true});
                }).to.not.throw(Error);
                done();
            });
        });

        describe('.prepareInput()', function() {
            describe('[no cb]', function () {
                describe('{string}', function () {
                    var instanceSubmit;
                    beforeEach(function () {
                        instanceSubmit = new Submit({
                            problemIndex: 'A',
                            contestId: 10,
                            codeFile: 'a.cpp',
                            language: 1100
                        });
                        sinon.stub(instanceSubmit, 'prepareInput');
                        sinon.stub(instanceSubmit, 'getCSRFToken');
                        sinon.stub(instanceSubmit, 'login');
                        sinon.stub(instanceSubmit, 'submitSolution');
                        sinon.stub(jsonfile, 'readFile');
                        sinon.stub(inquirer, 'prompt');
                        sinon.stub(helpers, 'checkPath').yields('error');
                        sinon.stub(helpers,'log', function (text) {});
                        sinon.stub(request, 'get');
                        sinon.stub(process.stderr, 'write');
                    });
                    afterEach(function () {
                        instanceSubmit.prepareInput.restore();
                        instanceSubmit.getCSRFToken.restore();
                        instanceSubmit.login.restore();
                        instanceSubmit.submitSolution.restore();
                        jsonfile.readFile.restore();
                        inquirer.prompt.restore();
                        helpers.checkPath.restore();
                        request.get.restore();
                        helpers.log.restore();
                        process.stderr.write.restore();
                    });

                    it('should not call process.stderr when invalid language string error', function (done) {
                        instanceSubmit.submit();
                        expect(process.stderr.called).to.not.be.true;
                        done();
                    });
                });
                describe('{object}', function () {
                    var instanceSubmit, errCalled;
                    beforeEach(function () {
                        instanceSubmit = new Submit({
                            problemIndex: 'A',
                            contestId: 10,
                            codeFile: 'a.cpp',
                            language: 1100
                        });
                        sinon.stub(instanceSubmit, 'prepareInput');
                        sinon.stub(instanceSubmit, 'getCSRFToken');
                        sinon.stub(instanceSubmit, 'login');
                        sinon.stub(instanceSubmit, 'submitSolution');
                        sinon.stub(jsonfile, 'readFile');
                        sinon.stub(inquirer, 'prompt');
                        sinon.stub(helpers, 'checkPath').yields({err: 'err'});
                        sinon.stub(helpers,'log', function (text) {});
                        errCalled = false;
                        sinon.stub(helpers, 'logr', function () {
                            errCalled = true;
                        });
                        sinon.stub(request, 'get');
                        sinon.stub(process.stderr, 'write');
                    });
                    afterEach(function () {
                        instanceSubmit.prepareInput.restore();
                        instanceSubmit.getCSRFToken.restore();
                        instanceSubmit.login.restore();
                        instanceSubmit.submitSolution.restore();
                        jsonfile.readFile.restore();
                        inquirer.prompt.restore();
                        helpers.checkPath.restore();
                        helpers.logr.restore();
                        request.get.restore();
                        helpers.log.restore();
                        process.stderr.write.restore();
                    });

                    it('should call process.stderr when invalid language object error', function (done) {
                        instanceSubmit.submit();
                        expect(errCalled).to.be.true;
                        done();
                    });
                });
            });

            describe('[invalid language]', function () {

                var instanceSubmit;
                beforeEach(function () {
                    instanceSubmit = new Submit({problemIndex: 'A', contestId: 10, codeFile: 'a.cpp', language: 1100});
                    // sinon.stub(instanceSubmit, 'prepareInput');
                    sinon.stub(instanceSubmit, 'getCSRFToken');
                    sinon.stub(instanceSubmit, 'login');
                    sinon.stub(instanceSubmit, 'submitSolution');
                    sinon.stub(jsonfile, 'readFile');
                    sinon.stub(inquirer, 'prompt');
                    sinon.stub(helpers, 'checkPath').yields(null);
                    sinon.stub(helpers,'log', function (text) {});
                    sinon.stub(request, 'get');
                    sinon.stub(process.stderr, 'write');
                });
                afterEach(function () {
                    //instanceSubmit.prepareInput.restore();
                    instanceSubmit.getCSRFToken.restore();
                    instanceSubmit.login.restore();
                    instanceSubmit.submitSolution.restore();
                    jsonfile.readFile.restore();
                    inquirer.prompt.restore();
                    helpers.checkPath.restore();
                    request.get.restore();
                    helpers.log.restore();
                    process.stderr.write.restore();
                });

                it('should return error when invalid language passed', function (done) {
                    instanceSubmit.submit(function (err, res) {
                        setTimeout(function () {
                            expect(err).to.not.be.null;
                            expect(err).to.not.be.undefined;
                            done();
                        });
                    });
                });
            });

            describe('[invalid extension]', function () {

                var instanceSubmit;
                beforeEach(function () {
                    instanceSubmit = new Submit({problemIndex: 'A', contestId: 10, codeFile: 'a.invalid'});
                    // sinon.stub(instanceSubmit, 'prepareInput');
                    sinon.stub(instanceSubmit, 'getCSRFToken');
                    sinon.stub(instanceSubmit, 'login');
                    sinon.stub(instanceSubmit, 'submitSolution');
                    sinon.stub(jsonfile, 'readFile');
                    sinon.stub(inquirer, 'prompt');
                    sinon.stub(helpers, 'checkPath').yields(null);
                    sinon.stub(request, 'get');
                    sinon.stub(helpers,'log', function (text) {});
                    sinon.stub(process.stderr, 'write');
                });
                afterEach(function () {
                    //instanceSubmit.prepareInput.restore();
                    instanceSubmit.getCSRFToken.restore();
                    instanceSubmit.login.restore();
                    instanceSubmit.submitSolution.restore();
                    jsonfile.readFile.restore();
                    inquirer.prompt.restore();
                    helpers.checkPath.restore();
                    request.get.restore();
                    helpers.log.restore();
                    process.stderr.write.restore();
                });

                it('should return error when invalid extension passed', function (done) {
                    instanceSubmit.submit(function (err, res) {
                        setTimeout(function () {
                            expect(err).to.not.be.null;
                            expect(err).to.not.be.undefined;
                            done();
                        });
                    });
                });
            });


            describe('[remember]', function () {

                var instanceSubmit;
                beforeEach(function () {
                    instanceSubmit = new Submit({problemIndex: 'A', contestId: 10, codeFile: 'a.cpp', remember: true});
                    sinon.stub(instanceSubmit, 'getCSRFToken').yields('called');
                    sinon.stub(instanceSubmit, 'login');
                    sinon.stub(instanceSubmit, 'submitSolution');
                    sinon.stub(jsonfile, 'readFile');
                    sinon.stub(inquirer, 'prompt').returns(Promise.resolve({handle: 'someHandle', password: 'pass'}));
                    sinon.stub(helpers, 'checkPath').yields(null);
                    sinon.stub(request, 'get');
                    sinon.stub(helpers,'log', function (text) {});
                    sinon.stub(process.stderr, 'write');
                });
                afterEach(function () {
                    instanceSubmit.getCSRFToken.restore();
                    instanceSubmit.login.restore();
                    instanceSubmit.submitSolution.restore();
                    jsonfile.readFile.restore();
                    inquirer.prompt.restore();
                    helpers.checkPath.restore();
                    request.get.restore();
                    helpers.log.restore();
                    process.stderr.write.restore();
                });

                this.timeout(15000);

                it('should skip jsonfile when remember true', function (done) {
                    instanceSubmit.submit(function (err, res) {
                        expect(jsonfile.readFile.called).to.be.false;
                        expect(inquirer.prompt.called).to.be.true;
                        expect(err).to.equal('called');
                        done();
                    });
                });
            });

            describe('[EPERM]', function () {

                var instanceSubmit;
                beforeEach(function () {
                    instanceSubmit = new Submit({problemIndex: 'A', contestId: 10, codeFile: 'a.cpp'});
                    sinon.stub(jsonfile, 'readFile').yields(new MyError('EPERM'));
                    sinon.stub(inquirer, 'prompt').returns(Promise.resolve({handle: 'some', password: 'some'}));
                    sinon.stub(instanceSubmit, 'getCSRFToken').yields('called');
                    sinon.stub(instanceSubmit, 'login');
                    sinon.stub(instanceSubmit, 'submitSolution');
                    sinon.stub(helpers, 'checkPath').yields(null);
                    sinon.stub(request, 'get');
                    sinon.stub(helpers,'log', function (text) {});
                    sinon.stub(process.stderr, 'write');
                });
                afterEach(function () {
                    instanceSubmit.getCSRFToken.restore();
                    instanceSubmit.login.restore();
                    instanceSubmit.submitSolution.restore();
                    jsonfile.readFile.restore();
                    inquirer.prompt.restore();
                    helpers.checkPath.restore();
                    request.get.restore();
                    helpers.log.restore();
                    process.stderr.write.restore();
                });

                it('should return error', function (done) {
                    instanceSubmit.submit(function (err, res) {
                        expect(err).to.equal('Permission denied config file.');
                        done();
                    });
                });
            });
            describe('[Unknown]', function () {

                var instanceSubmit;
                beforeEach(function () {
                    instanceSubmit = new Submit({problemIndex: 'A', contestId: 10, codeFile: 'a.cpp'});
                    sinon.stub(instanceSubmit, 'getCSRFToken').yields('called');
                    sinon.stub(instanceSubmit, 'login');
                    sinon.stub(instanceSubmit, 'submitSolution');
                    sinon.stub(jsonfile, 'readFile').yields(new MyError('Unknow'));
                    sinon.stub(inquirer, 'prompt').returns(Promise.resolve({handle: 'some'}));
                    sinon.stub(helpers, 'checkPath').yields(null);
                    sinon.stub(request, 'get');
                    sinon.stub(helpers,'log', function (text) {});
                    sinon.stub(process.stderr, 'write');
                });
                afterEach(function () {
                    instanceSubmit.getCSRFToken.restore();
                    instanceSubmit.login.restore();
                    instanceSubmit.submitSolution.restore();
                    jsonfile.readFile.restore();
                    inquirer.prompt.restore();
                    helpers.checkPath.restore();
                    request.get.restore();
                    helpers.log.restore();
                    process.stderr.write.restore();
                });

                it('should return error Unknown', function (done) {
                    instanceSubmit.submit(function (err, res) {
                        setTimeout(function () {
                            expect(err.code).to.equal('Unknow');
                            done();
                        });
                    });
                });
            });
            describe('[ENOENT]', function () {

                var instanceSubmit;
                beforeEach(function () {
                    instanceSubmit = new Submit({problemIndex: 'A', contestId: 10, codeFile: 'a.cpp'});
                    sinon.stub(instanceSubmit, 'getCSRFToken').yields('called');
                    sinon.stub(instanceSubmit, 'login');
                    sinon.stub(instanceSubmit, 'submitSolution');
                    sinon.stub(jsonfile, 'readFile').yields(new MyError('ENOENT'));
                    sinon.stub(inquirer, 'prompt').returns(Promise.resolve({handle: 'some'}));
                    sinon.stub(helpers, 'checkPath').yields(null);
                    sinon.stub(request, 'get');
                    sinon.stub(helpers,'log', function (text) {});
                    sinon.stub(process.stderr, 'write');
                });
                afterEach(function () {
                    instanceSubmit.getCSRFToken.restore();
                    instanceSubmit.login.restore();
                    instanceSubmit.submitSolution.restore();
                    jsonfile.readFile.restore();
                    inquirer.prompt.restore();
                    helpers.checkPath.restore();
                    request.get.restore();
                    helpers.log.restore();
                    process.stderr.write.restore();
                });

                it('should call promt', function (done) {
                    instanceSubmit.submit(function (err, res) {
                        setTimeout(function () {
                            expect(inquirer.prompt.called).to.be.true;
                            done();
                        });
                    });
                });
            });
            describe('[noUser]', function () {

                var instanceSubmit;
                before(function () {
                    instanceSubmit = new Submit({problemIndex: 'A', contestId: 10, codeFile: 'a.cpp'});
                    sinon.stub(helpers, 'checkPath').yields(null);
                    sinon.stub(jsonfile, 'readFile').yields(null, {noUser: 'adad'});
                    sinon.stub(inquirer, 'prompt').returns(Promise.resolve({handle: 'some', password: 'adad'}));
                    sinon.stub(instanceSubmit, 'getCSRFToken').yields('getCSRFTokencalled');
                    sinon.stub(helpers,'log', function (text) {});
                    sinon.stub(process.stderr, 'write');
                });
                after(function () {
                    helpers.checkPath.restore();
                    jsonfile.readFile.restore();
                    inquirer.prompt.restore();
                    instanceSubmit.getCSRFToken.restore();
                    helpers.log.restore();
                    process.stderr.write.restore();
                });

                it('should call promt when no user found in config file', function (done) {
                    instanceSubmit.submit(function (err, res) {
                        expect(inquirer.prompt.called).to.be.true;
                        expect(err).to.equal('getCSRFTokencalled');
                        done();
                    });
                });
            });

            describe('[noPass]', function () {

                var instanceSubmit;
                before(function () {
                    instanceSubmit = new Submit({problemIndex: 'A', contestId: 10, codeFile: 'a.cpp'});
                    sinon.stub(helpers, 'checkPath').yields(null);
                    sinon.stub(jsonfile, 'readFile').yields(null, {user: 'adad'});
                    sinon.stub(inquirer, 'prompt').returns(Promise.resolve({handle: 'some', password: 'adad'}));
                    sinon.stub(instanceSubmit, 'getCSRFToken').yields('getCSRFTokencalled');
                    sinon.stub(helpers,'log', function (text) {});
                    sinon.stub(process.stderr, 'write');
                });
                after(function () {
                    helpers.checkPath.restore();
                    jsonfile.readFile.restore();
                    inquirer.prompt.restore();
                    instanceSubmit.getCSRFToken.restore();
                    helpers.log.restore();
                    process.stderr.write.restore();
                });

                it('should call promt when no password found in config file', function (done) {
                    instanceSubmit.submit(function (err, res) {
                        expect(inquirer.prompt.called).to.be.true;
                        expect(err).to.equal('getCSRFTokencalled');
                        done();
                    });
                });
            });

            describe('[found]', function () {

                var instanceSubmit;
                before(function () {
                    instanceSubmit = new Submit({problemIndex: 'A', contestId: 10, codeFile: 'a.cpp'});
                    sinon.stub(helpers, 'checkPath').yields(null);
                    sinon.stub(jsonfile, 'readFile').yields(null, {user: 'adad', pass: 'some'});
                    sinon.stub(inquirer, 'prompt').returns(Promise.resolve({handle: 'some', password: 'adad'}));
                    sinon.stub(instanceSubmit, 'getCSRFToken').yields('getCSRFTokencalled');
                    sinon.stub(helpers,'log', function (text) {});
                    sinon.stub(process.stderr, 'write');
                });
                after(function () {
                    helpers.checkPath.restore();
                    jsonfile.readFile.restore();
                    inquirer.prompt.restore();
                    instanceSubmit.getCSRFToken.restore();
                    helpers.log.restore();
                    process.stderr.write.restore();
                });

                it('should skip promt when user and password found in config file', function (done) {
                    instanceSubmit.submit(function (err, res) {
                        expect(inquirer.prompt.called).to.be.false;
                        expect(err).to.equal('getCSRFTokencalled');
                        done();
                    });
                });
            });
        });

        describe('.getCSRFToken()', function() {
            describe('{reqError}', function() {

                var instanceSubmit;
                before(function(){
                    instanceSubmit = new Submit({ problemIndex: 'A', contestId: 10, codeFile: 'a.cpp' });
                    sinon.stub(helpers, 'checkPath').yields(null);
                    sinon.stub(instanceSubmit, 'prepareInput').yields(null, { handle: 'some', password: 'adad' });
                    sinon.stub(request, 'get').yields('reqError');
                    sinon.stub(instanceSubmit, 'login').yields('loginCalled');
                    sinon.stub(helpers,'log', function (text) {});
                    sinon.stub(process.stderr,'write');
                });
                after(function(){
                    helpers.checkPath.restore();
                    instanceSubmit.prepareInput.restore();
                    request.get.restore();
                    instanceSubmit.login.restore();
                    helpers.log.restore();
                    process.stderr.write.restore();
                });

                it('should return and match error when request error', function(done) {
                    instanceSubmit.submit(function (err,res) {
                        expect(request.get.called).to.be.true;
                        expect(err).to.equal('reqError');
                        expect(instanceSubmit.login.called).to.be.false;
                        done();
                    });
                });
            });
            describe('{noToken}', function() {

                var instanceSubmit, fakeBody = `<form name=""></form>`;;
                before(function(){
                    instanceSubmit = new Submit({ problemIndex: 'A', contestId: 10, codeFile: 'a.cpp' });
                    sinon.stub(helpers, 'checkPath').yields(null);
                    sinon.stub(instanceSubmit, 'prepareInput').yields(null, { handle: 'some', password: 'adad' });
                    sinon.stub(request, 'get').yields(null,{}, fakeBody);
                    sinon.stub(instanceSubmit, 'login').yields('loginError');
                    sinon.stub(helpers,'log', function (text) {});
                    sinon.stub(process.stderr,'write');
                });
                after(function(){
                    helpers.checkPath.restore();
                    instanceSubmit.prepareInput.restore();
                    request.get.restore();
                    instanceSubmit.login.restore();
                    helpers.log.restore();
                    process.stderr.write.restore();
                });

                it('should return and match error when noToken found', function(done) {
                    instanceSubmit.submit(function (err,res) {
                        expect(request.get.called).to.be.true;
                        expect(err).to.equal('token not found');
                        expect(instanceSubmit.login.called).to.be.false;
                        done();
                    });
                });
            });
            describe('{token}', function() {

                var kk = `<form name=""><input name="csrf_token" value="adad" /></form>`;

                var instanceSubmit;
                before(function(){
                    instanceSubmit = new Submit({ problemIndex: 'A', contestId: 10, codeFile: 'a.cpp' });
                    sinon.stub(helpers, 'checkPath').yields(null);
                    sinon.stub(instanceSubmit, 'prepareInput').yields(null, { handle: 'some', password: 'adad' });
                    sinon.stub(request, 'get').yields(null,{}, kk);
                    sinon.stub(instanceSubmit, 'login').yields('loginCalled');
                    sinon.stub(helpers,'log', function (text) {});
                    sinon.stub(process.stderr,'write');
                });
                after(function(){
                    helpers.checkPath.restore();
                    instanceSubmit.prepareInput.restore();
                    request.get.restore();
                    instanceSubmit.login.restore();
                    helpers.log.restore();
                    process.stderr.write.restore();
                });

                it('should not return error when token found', function(done) {
                    instanceSubmit.submit(function (err,res) {
                        expect(request.get.called).to.be.true;
                        expect(err).to.equal('loginCalled');
                        expect(instanceSubmit.login.called).to.be.true;
                        done();
                    });
                });
            });
        });


        describe('.logn()', function() {
            describe('{reqError}', function() {

                var instanceSubmit;
                before(function(){
                    instanceSubmit = new Submit({ problemIndex: 'A', contestId: 10, codeFile: 'a.cpp' });
                    sinon.stub(helpers, 'checkPath').yields(null);
                    sinon.stub(instanceSubmit, 'prepareInput').yields(null, { handle: 'some', password: 'adad' });
                    sinon.stub(instanceSubmit, 'getCSRFToken').yields(null,'adad', { handle: 'some', password: 'adad' });
                    sinon.stub(instanceSubmit, 'submitSolution').yields('submitSolutionError');
                    sinon.stub(request,'post').yields('postError');
                    sinon.stub(helpers,'log', function (text) {});
                    sinon.stub(process.stderr,'write');
                });
                after(function(){
                    helpers.checkPath.restore();
                    instanceSubmit.prepareInput.restore();
                    instanceSubmit.getCSRFToken.restore();
                    instanceSubmit.submitSolution.restore();
                    request.post.restore();
                    helpers.log.restore();
                    process.stderr.write.restore();
                });

                it('should return and match error when request error', function(done) {
                    instanceSubmit.submit(function (err,res) {
                        expect(request.post.called).to.be.true;
                        expect(err).to.equal('postError');
                        expect(instanceSubmit.submitSolution.called).to.be.false;
                        done();
                    });
                });
            });
            describe('{noHeaders}', function() {

                var instanceSubmit;
                before(function(){
                    instanceSubmit = new Submit({ problemIndex: 'A', contestId: 10, codeFile: 'a.cpp' });
                    sinon.stub(helpers, 'checkPath').yields(null);
                    sinon.stub(instanceSubmit, 'prepareInput').yields(null, { handle: 'some', password: 'adad' });
                    sinon.stub(instanceSubmit, 'getCSRFToken').yields(null,'adad', { handle: 'some', password: 'adad' });
                    sinon.stub(instanceSubmit, 'submitSolution').yields('submitSolutionError');
                    sinon.stub(request,'post').yields(null, { headers: {} }, {});
                    sinon.stub(helpers,'log', function (text) {});
                    sinon.stub(process.stderr,'write');
                });
                after(function(){
                    helpers.checkPath.restore();
                    instanceSubmit.prepareInput.restore();
                    instanceSubmit.getCSRFToken.restore();
                    instanceSubmit.submitSolution.restore();
                    request.post.restore();
                    helpers.log.restore();
                    process.stderr.write.restore();
                });

                it('should return and match error when no headers [login failed]', function(done) {
                    instanceSubmit.submit(function (err,res) {
                        expect(request.post.called).to.be.true;
                        expect(err).to.equal('Login failed.Please try again.[Issue?]');
                        expect(instanceSubmit.submitSolution.called).to.be.false;
                        done();
                    });
                });
            });
            describe('{noLocation}', function() {

                var instanceSubmit;
                before(function(){
                    instanceSubmit = new Submit({ problemIndex: 'A', contestId: 10, codeFile: 'a.cpp' });
                    sinon.stub(helpers, 'checkPath').yields(null);
                    sinon.stub(instanceSubmit, 'prepareInput').yields(null, { handle: 'some', password: 'adad' });
                    sinon.stub(instanceSubmit, 'getCSRFToken').yields(null,'adad', { handle: 'some', password: 'adad' });
                    sinon.stub(instanceSubmit, 'submitSolution').yields('submitSolutionError');
                    sinon.stub(request,'post').yields(null, { headers: { location: 'ad' } }, {});
                    sinon.stub(CryptoJS.AES,'encrypt').yields('hashed');
                    sinon.stub(jsonfile,'writeFileSync');
                    sinon.stub(helpers,'log', function (text) {});
                    sinon.stub(process.stderr,'write');
                });
                after(function(){
                    helpers.checkPath.restore();
                    instanceSubmit.prepareInput.restore();
                    instanceSubmit.getCSRFToken.restore();
                    instanceSubmit.submitSolution.restore();
                    request.post.restore();
                    CryptoJS.AES.encrypt.restore();
                    jsonfile.writeFileSync.restore();
                    helpers.log.restore();
                    process.stderr.write.restore();
                });

                it('should return and match error when no location [login failed]', function(done) {
                    instanceSubmit.submit(function (err,res) {
                        expect(request.post.called).to.be.true;
                        expect(err).to.equal('Login failed.Please try again.[Issue?]');
                        expect(instanceSubmit.submitSolution.called).to.be.false;
                        done();
                    });
                });
            });
            describe('{invalidCredentials}', function() {

                var instanceSubmit;
                before(function(){
                    instanceSubmit = new Submit({ problemIndex: 'A', contestId: 10, codeFile: 'a.cpp' });
                    sinon.stub(helpers, 'checkPath').yields(null);
                    sinon.stub(instanceSubmit, 'prepareInput').yields(null, { handle: 'some', password: 'adad' });
                    sinon.stub(instanceSubmit, 'getCSRFToken').yields(null,'adad', { handle: 'some', password: 'adad' });
                    sinon.stub(instanceSubmit, 'submitSolution').yields('submitSolutionError');
                    sinon.stub(request,'post').yields(null, { headers: { location: 'ad' } }, `<form><span class="for__password">CFdefaultError</span></form>`);
                    sinon.stub(CryptoJS.AES,'encrypt').yields('hashed');
                    sinon.stub(jsonfile,'writeFileSync');
                    sinon.stub(helpers,'log', function (text) {});
                    sinon.stub(process.stderr,'write');
                });
                after(function(){
                    helpers.checkPath.restore();
                    instanceSubmit.prepareInput.restore();
                    instanceSubmit.getCSRFToken.restore();
                    instanceSubmit.submitSolution.restore();
                    request.post.restore();
                    CryptoJS.AES.encrypt.restore();
                    jsonfile.writeFileSync.restore();
                    helpers.log.restore();
                    process.stderr.write.restore();
                });

                it('should return and match error when no location [login failed]', function(done) {
                    instanceSubmit.submit(function (err,res) {
                        expect(request.post.called).to.be.true;
                        expect(err).to.equal('CFdefaultError');
                        expect(instanceSubmit.submitSolution.called).to.be.false;
                        done();
                    });
                });
            });
            describe('{onsuccess}', function() {

                var instanceSubmit;
                before(function(){
                    instanceSubmit = new Submit({ problemIndex: 'A', contestId: 10, codeFile: 'a.cpp' });
                    sinon.stub(helpers, 'checkPath').yields(null);
                    sinon.stub(instanceSubmit, 'prepareInput').yields(null, { handle: 'some', password: 'adad' });
                    sinon.stub(instanceSubmit, 'getCSRFToken').yields(null,'adad', { handle: 'some', password: 'adad', remember: true });
                    sinon.stub(instanceSubmit, 'submitSolution').yields('submitSolutionError');
                    sinon.stub(request,'post').yields(null, { headers: { location: '/' } }, {});
                    sinon.stub(CryptoJS.AES,'encrypt').returns('hashed');
                    sinon.stub(jsonfile,'writeFileSync');
                    sinon.stub(helpers,'log', function (text) {});
                    sinon.stub(process.stderr,'write');
                });
                after(function(){
                    helpers.checkPath.restore();
                    instanceSubmit.prepareInput.restore();
                    instanceSubmit.getCSRFToken.restore();
                    instanceSubmit.submitSolution.restore();
                    request.post.restore();
                    CryptoJS.AES.encrypt.restore();
                    jsonfile.writeFileSync.restore();
                    helpers.log.restore();
                    process.stderr.write.restore();
                });

                it('should call  submitSolution', function(done) {
                    instanceSubmit.submit(function (err,res) {
                        expect(request.post.called).to.be.true;
                        expect(err).to.equal('submitSolutionError');
                        expect(instanceSubmit.submitSolution.called).to.be.true;
                        expect(CryptoJS.AES.encrypt.called).to.be.true;
                        expect(jsonfile.writeFileSync.called).to.be.true;
                        done();
                    });
                });
            });
            describe('{onsuccess2}', function() {

                var instanceSubmit;
                before(function(){
                    instanceSubmit = new Submit({ problemIndex: 'A', contestId: 10, codeFile: 'a.cpp' });
                    sinon.stub(helpers, 'checkPath').yields(null);
                    sinon.stub(instanceSubmit, 'prepareInput').yields(null, { handle: 'some', password: 'adad' });
                    sinon.stub(instanceSubmit, 'getCSRFToken').yields(null,'adad', { handle: 'some', password: 'adad', logout: true });
                    sinon.stub(instanceSubmit, 'submitSolution').yields('submitSolutionError');
                    sinon.stub(request,'post').yields(null, { headers: { location: '/' } }, {});
                    sinon.stub(CryptoJS.AES,'encrypt').returns('hashed');
                    sinon.stub(jsonfile,'writeFileSync');
                    sinon.stub(helpers,'log', function (text) {});
                    sinon.stub(process.stderr,'write');
                });
                after(function(){
                    helpers.checkPath.restore();
                    instanceSubmit.prepareInput.restore();
                    instanceSubmit.getCSRFToken.restore();
                    instanceSubmit.submitSolution.restore();
                    request.post.restore();
                    CryptoJS.AES.encrypt.restore();
                    jsonfile.writeFileSync.restore();
                    helpers.log.restore();
                    process.stderr.write.restore();
                });

                it('should call jsonfile.writeFileSync logout', function(done) {
                    instanceSubmit.submit(function (err,res) {
                        expect(request.post.called).to.be.true;
                        expect(err).to.equal('submitSolutionError');
                        expect(instanceSubmit.submitSolution.called).to.be.true;
                        expect(CryptoJS.AES.encrypt.called).to.be.false;
                        expect(jsonfile.writeFileSync.called).to.be.true;
                        done();
                    });
                });
            });
        });

        describe('.submitSolution()', function() {
            describe('{reqError}', function() {

                var instanceSubmit;
                before(function(){
                    instanceSubmit = new Submit({ problemIndex: 'A', contestId: 10, codeFile: 'a.cpp' });
                    sinon.stub(helpers, 'checkPath').yields(null);
                    sinon.stub(instanceSubmit, 'prepareInput').yields(null, { handle: 'some', password: 'adad' });
                    sinon.stub(instanceSubmit, 'getCSRFToken').yields(null,'adad', { handle: 'some', password: 'adad', logout: true, contestId: 123, problemIndex: 'A', language: 10, codePath: 'ada' });
                    sinon.stub(instanceSubmit, 'login').yields(null,  { handle: 'some', password: 'adad' });
                    sinon.stub(fs,'createReadStream').returns('adad');
                    sinon.stub(request,'post').yields('posterror');
                    sinon.stub(helpers,'log', function (text) {});
                    sinon.stub(process.stderr,'write');
                });
                after(function(){
                    helpers.checkPath.restore();
                    instanceSubmit.prepareInput.restore();
                    instanceSubmit.getCSRFToken.restore();
                    instanceSubmit.login.restore();
                    fs.createReadStream.restore();
                    request.post.restore();
                    helpers.log.restore();
                    process.stderr.write.restore();
                });

                it('should return and match error', function(done) {
                    instanceSubmit.submit(function (err,res) {
                        expect(request.post.called).to.be.true;
                        expect(err).to.equal('posterror');
                        done();
                    });
                });
            });
            describe('{noLocation}', function() {

                var instanceSubmit;
                before(function(){
                    instanceSubmit = new Submit({ problemIndex: 'A', contestId: 10, codeFile: 'a.cpp' });
                    sinon.stub(helpers, 'checkPath').yields(null);
                    sinon.stub(instanceSubmit, 'prepareInput').yields(null, { handle: 'some', password: 'adad' });
                    sinon.stub(instanceSubmit, 'getCSRFToken').yields(null,'adad', { handle: 'some', password: 'adad', logout: true, contestId: 123, problemIndex: 'A', language: 10, codePath: 'ada' });
                    sinon.stub(instanceSubmit, 'login').yields(null,  { handle: 'some', password: 'adad' });
                    sinon.stub(fs,'createReadStream').returns('adad');
                    sinon.stub(request,'post').yields(null, { headers: {  } }, {});
                    sinon.stub(helpers,'log', function (text) {});
                    sinon.stub(process.stderr,'write');
                });
                after(function(){
                    helpers.checkPath.restore();
                    instanceSubmit.prepareInput.restore();
                    instanceSubmit.getCSRFToken.restore();
                    instanceSubmit.login.restore();
                    fs.createReadStream.restore();
                    request.post.restore();
                    helpers.log.restore();
                    process.stderr.write.restore();
                });

                it('should return and match error when no location found', function(done) {
                    instanceSubmit.submit(function (err,res) {
                        expect(request.post.called).to.be.true;
                        expect(err).to.equal('Error: Submission failed.Please check your options.');
                        done();
                    });
                });
            });
            describe('{locationErr}', function() {

                var instanceSubmit;
                before(function(){
                    instanceSubmit = new Submit({ problemIndex: 'A', contestId: 10, codeFile: 'a.cpp' });
                    sinon.stub(helpers, 'checkPath').yields(null);
                    sinon.stub(instanceSubmit, 'prepareInput').yields(null, { handle: 'some', password: 'adad' });
                    sinon.stub(instanceSubmit, 'getCSRFToken').yields(null,'adad', { handle: 'some', password: 'adad', logout: true, contestId: 123, problemIndex: 'A', language: 10, codePath: 'ada' });
                    sinon.stub(instanceSubmit, 'login').yields(null,  { handle: 'some', password: 'adad' });
                    sinon.stub(fs,'createReadStream').returns('adad');
                    sinon.stub(request,'post').yields(null, { headers: { location: 'adad' } }, {});
                    sinon.stub(helpers,'log', function (text) {});
                    sinon.stub(process.stderr,'write');
                });
                after(function(){
                    helpers.checkPath.restore();
                    instanceSubmit.prepareInput.restore();
                    instanceSubmit.getCSRFToken.restore();
                    instanceSubmit.login.restore();
                    fs.createReadStream.restore();
                    request.post.restore();
                    helpers.log.restore();
                    process.stderr.write.restore();
                });

                it('should return and match error when location not valid', function(done) {
                    instanceSubmit.submit(function (err,res) {
                        expect(request.post.called).to.be.true;
                        expect(err).to.equal('Error: Submission failed.Please check your options.');
                        done();
                    });
                });
            });
            describe('{CFErr}', function() {

                var instanceSubmit;
                before(function(){
                    instanceSubmit = new Submit({ problemIndex: 'A', contestId: 10, codeFile: 'a.cpp' });
                    sinon.stub(helpers, 'checkPath').yields(null);
                    sinon.stub(instanceSubmit, 'prepareInput').yields(null, { handle: 'some', password: 'adad' });
                    sinon.stub(instanceSubmit, 'getCSRFToken').yields(null,'adad', { handle: 'some', password: 'adad', logout: true, contestId: 123, problemIndex: 'A', language: 10, codePath: 'ada' });
                    sinon.stub(instanceSubmit, 'login').yields(null,  { handle: 'some', password: 'adad' });
                    sinon.stub(fs,'createReadStream').returns('adad');
                    sinon.stub(request,'post').yields(null, { headers: { location: 'adad' } }, `<div class="for__source">someError</div>`);
                    sinon.stub(helpers,'log', function (text) {});
                    sinon.stub(process.stderr,'write');
                });
                after(function(){
                    helpers.checkPath.restore();
                    instanceSubmit.prepareInput.restore();
                    instanceSubmit.getCSRFToken.restore();
                    instanceSubmit.login.restore();
                    fs.createReadStream.restore();
                    request.post.restore();
                    helpers.log.restore();
                    process.stderr.write.restore();
                });

                it('should return and match error when CF error', function(done) {
                    instanceSubmit.submit(function (err,res) {
                        expect(request.post.called).to.be.true;
                        expect(err).to.equal('someError');
                        done();
                    });
                });
            });
            describe('{success-contest}', function() {

                var instanceSubmit;
                before(function(){
                    instanceSubmit = new Submit({ problemIndex: 'A', contestId: 10, codeFile: 'a.cpp' });
                    sinon.stub(helpers, 'checkPath').yields(null);
                    sinon.stub(instanceSubmit, 'prepareInput').yields(null, { handle: 'some', password: 'adad' });
                    sinon.stub(instanceSubmit, 'getCSRFToken').yields(null,'adad', { handle: 'some', password: 'adad', logout: true, contestId: 123, problemIndex: 'A', language: 10, codePath: 'ada', type: 'contest' });
                    sinon.stub(instanceSubmit, 'login').yields(null,  { handle: 'some', password: 'adad' });
                    sinon.stub(fs,'createReadStream').returns('adad');
                    sinon.stub(request,'post').yields(null, { headers: { location: '/contest/123/my' } }, {});
                    sinon.stub(helpers,'log', function (text) {});
                    sinon.stub(process.stderr,'write');
                });
                after(function(){
                    helpers.checkPath.restore();
                    instanceSubmit.prepareInput.restore();
                    instanceSubmit.getCSRFToken.restore();
                    instanceSubmit.login.restore();
                    fs.createReadStream.restore();
                    request.post.restore();
                    helpers.log.restore();
                    process.stderr.write.restore();
                });

                it('should not have error', function(done) {
                    instanceSubmit.submit(function (err,res) {
                        expect(request.post.called).to.be.true;
                        expect(err).to.equal(null);
                        done();
                    });
                });
            });
            describe('{success-gym}', function() {

                var instanceSubmit;
                before(function(){
                    instanceSubmit = new Submit({ problemIndex: 'A', contestId: 10, codeFile: 'a.cpp' });
                    sinon.stub(helpers, 'checkPath').yields(null);
                    sinon.stub(instanceSubmit, 'prepareInput').yields(null, { handle: 'some', password: 'adad' });
                    sinon.stub(instanceSubmit, 'getCSRFToken').yields(null,'adad', { handle: 'some', password: 'adad', logout: true, contestId: 123, problemIndex: 'A', language: 10, codePath: 'ada', type: 'gym' });
                    sinon.stub(instanceSubmit, 'login').yields(null,  { handle: 'some', password: 'adad' });
                    sinon.stub(fs,'createReadStream').returns('adad');
                    sinon.stub(request,'post').yields(null, { headers: { location: '/gym/123/my' } }, {});
                    sinon.stub(helpers,'log', function (text) {});
                    sinon.stub(process.stderr,'write');
                });
                after(function(){
                    helpers.checkPath.restore();
                    instanceSubmit.prepareInput.restore();
                    instanceSubmit.getCSRFToken.restore();
                    instanceSubmit.login.restore();
                    fs.createReadStream.restore();
                    request.post.restore();
                    helpers.log.restore();
                    process.stderr.write.restore();
                });

                it('should not have error', function(done) {
                    instanceSubmit.submit(function (err,res) {
                        expect(request.post.called).to.be.true;
                        expect(err).to.equal(null);
                        done();
                    });
                });
            });
        });

    });
});


function MyError(code) {
    this.name = 'MyError';
    this.code = code;
    this.message = 'nothing to say';
    this.stack = (new Error()).stack;
}
MyError.prototype = new Error;