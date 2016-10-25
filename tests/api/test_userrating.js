import { expect } from 'chai';
import request from 'request';
import sinon from 'sinon';
var chai = require('chai');
var sinonChai = require('sinon-chai');

var helpers = require('../../src/lib/helpers');
import Userrating from '../../src/lib/api/Userrating';

chai.use(sinonChai);

var mockResponse = {
    statusCode: 200,
    headers: {
        'content-type': 'application/json;'
    }
};
var mockBody = {
    status: 'OK',
    comment: '',
    result: [{
        contestName: 'Roud test',
        rank: 1,
        newRating: 2000,
        oldRating: 1900
    }]
};

describe('Codeforces', function() {
    describe('#Userrating', function() {
        describe('[core]', function() {

            it('should throw error when parameter is empty', function(done) {
                expect(function () {
                    new Userrating().getRating();
                }).to.throw(Error);
                done();
            });

            it('should throw error when handle is not a string', function(done) {

                expect(function () {
                    new Userrating({}).getRating();
                }).to.throw(Error);

                expect(function () {
                    new Userrating(null).getRating();
                }).to.throw(Error);

                expect(function () {
                    new Userrating(undefined).getRating();
                }).to.throw(Error);

                done();
            });
        });

        describe('[onsuccess]', function() {
            describe('{No chart}', function() {

                var logCalled;
                var instanceOf;

                beforeEach(function(){
                    instanceOf = new Userrating('Ahmed_Dinar', true);
                    logCalled = false;
                    sinon.stub(helpers, 'log', function () { logCalled = true; });
                    sinon.stub(process.stderr,'write'); //disable spinner
                    sinon
                        .stub(request, 'get')
                        .yields(null, mockResponse, mockBody);
                });

                afterEach(function(){
                    helpers.log.restore();
                    process.stderr.write.restore();
                    request.get.restore();
                });

                it('should call console.log when response is successful', function(done){
                    expect(logCalled).to.be.false;
                    instanceOf.getRating();
                    expect(logCalled).to.be.true;
                    done();
                });

                it('should call request', function(done){
                    instanceOf.getRating();
                    expect(request.get.called).to.be.true;
                    done();
                });
            });
            describe('{Chart}', function() {

                var chartCalled;
                var instanceOf;

                beforeEach(function(){
                    instanceOf = new Userrating('Ahmed_Dinar');
                    chartCalled = false;
                    sinon.stub(instanceOf, 'showLineChart', function () {
                       chartCalled = true;
                    });
                    sinon.stub(process.stderr,'write'); //disable spinner
                    sinon
                        .stub(request, 'get')
                        .yields(null, mockResponse, mockBody);
                });

                afterEach(function(){
                    instanceOf.showLineChart.restore();
                    process.stderr.write.restore();
                    request.get.restore();
                });

                it('should call request', function(done){
                    instanceOf.getRating();
                    expect(request.get.called).to.be.true;
                    done();
                });

                it('should call showchart', function(done){
                    expect(chartCalled).to.be.false;
                    instanceOf.getRating();
                    expect(chartCalled).to.be.true;
                    done();
                });

            });
        });

        describe('[onerror]', function() {
            describe('{Request error}', function() {

                var logCalled;
                var instanceOf;

                beforeEach(function(){
                    instanceOf = new Userrating('Ahmed_Dinar', true);
                    logCalled = false;
                    sinon.stub(helpers, 'logr', function () { logCalled = true; });
                    sinon.stub(process.stderr,'write'); //disable spinner
                    sinon
                        .stub(request, 'get')
                        .yields(new Error('Error'), mockResponse,mockBody);
                });

                afterEach(function(){
                    helpers.logr.restore();
                    process.stderr.write.restore();
                    request.get.restore();
                });

                it('should call request', function(done){
                    instanceOf.getRating();
                    expect(request.get.called).to.be.true;
                    done();
                });

                it('should call console.error when request failed', function(done){
                    expect(logCalled).to.be.false;
                    instanceOf.getRating();
                    expect(logCalled).to.be.true;
                    done();
                });
            });

            describe('{HTTP error}', function() {

                var logCalled;
                var instanceOf;

                beforeEach(function(){
                    instanceOf = new Userrating('Ahmed_Dinar', true);
                    logCalled = false;
                    sinon.stub(helpers, 'logr', function () { logCalled = true; });
                    sinon.stub(process.stderr,'write'); //disable spinner
                    mockResponse.statusCode = 404;
                    sinon
                        .stub(request, 'get')
                        .yields(null, mockResponse,mockBody);
                });

                afterEach(function(){
                    helpers.logr.restore();
                    process.stderr.write.restore();
                    request.get.restore();
                    mockResponse.statusCode = 200;
                });

                it('should call request', function(done){
                    instanceOf.getRating();
                    expect(request.get.called).to.be.true;
                    done();
                });

                it('should call console.error when HTTP response status not 200', function(done){
                    expect(logCalled).to.be.false;
                    instanceOf.getRating();
                    expect(logCalled).to.be.true;
                    done();
                });
            });

            describe('{Invalid JSON}', function() {

                var logCalled;
                var instanceOf;

                beforeEach(function(){
                    instanceOf = new Userrating('Ahmed_Dinar', true);
                    logCalled = false;
                    sinon.stub(helpers, 'logr', function () { logCalled = true; });
                    sinon.stub(process.stderr,'write'); //disable spinner
                    mockResponse.headers['content-type'] = 'html';
                    sinon
                        .stub(request, 'get')
                        .yields(null, mockResponse,mockBody);
                });

                afterEach(function(){
                    helpers.logr.restore();
                    process.stderr.write.restore();
                    request.get.restore();
                    mockResponse.headers['content-type'] = 'application/json;';
                });

                it('should call request', function(done){
                    instanceOf.getRating();
                    expect(request.get.called).to.be.true;
                    done();
                });

                it('should call console.error when content is not json', function(done){
                    expect(logCalled).to.be.false;
                    instanceOf.getRating();
                    expect(logCalled).to.be.true;
                    done();
                });
            });

            describe('{API error}', function() {

                var logCalled;
                var instanceOf;

                beforeEach(function(){
                    instanceOf = new Userrating('Ahmed_Dinar', true);
                    logCalled = false;
                    sinon.stub(helpers, 'logr', function () { logCalled = true; });
                    sinon.stub(process.stderr,'write'); //disable spinner
                    mockBody.status = 'FAILED';
                    sinon
                        .stub(request, 'get')
                        .yields(null, mockResponse,mockBody);
                });

                afterEach(function(){
                    helpers.logr.restore();
                    process.stderr.write.restore();
                    request.get.restore();
                    mockBody.status = 'OK';
                });

                it('should call request', function(done){
                    instanceOf.getRating();
                    expect(request.get.called).to.be.true;
                    done();
                });

                it('should call console.error when API is not OK', function(done){
                    expect(logCalled).to.be.false;
                    instanceOf.getRating();
                    expect(logCalled).to.be.true;
                    done();
                });
            });
        });
    });
});



