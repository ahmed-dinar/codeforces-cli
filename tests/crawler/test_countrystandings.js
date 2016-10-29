import { expect } from 'chai';
import sinon from 'sinon';
import request from 'request';
var chai = require('chai');
var sinonChai = require('sinon-chai');

var helpers = require('../../src/lib/helpers');
import Countrystandings from '../../src/lib/crawler/Countrystandings';

chai.use(sinonChai);

describe('Codeforces',function () {
    describe('#Countrystandings',function () {
        describe('.constructor()',function () {

            it('should throw error when no parameter', function (done) {
                expect(function () {
                    new Countrystandings();
                }).to.throw(Error);
                done();
            });

            it('should throw error when contestId not exists', function (done) {
                expect(function () {
                    new Countrystandings({});
                }).to.throw(Error);
                done();
            });

            it('should throw error when country is not integer', function (done) {
                expect(function () {
                    new Countrystandings({ contestId: '10' });
                }).to.throw(Error);
                done();
            });

            it('should throw error when country not exists', function (done) {
                expect(function () {
                    new Countrystandings({ contestId: 10 });
                }).to.throw(Error);
                done();
            });

            it('should not throw error', function (done) {
                expect(function () {
                    new Countrystandings({ contestId: 10, country: 'Bangladesh' });
                }).to.not.throw(Error);
                done();
            });

        });
        describe('.show()',function () {
            describe('basic error',function () {

                this.timeout(20000);

                beforeEach(function () {
                    sinon.stub(request, 'get').yields('requestError', { statusCode: 404 }, '');
                    sinon.stub(helpers,'log');
                    sinon.stub(helpers,'logr');
                    sinon.stub(process.stderr,'write');
                });

                afterEach(function () {
                    request.get.restore();
                    helpers.logr.restore();
                    helpers.log.restore();
                    process.stderr.write.restore();
                });

                it('should return and match error when country invalid', function (done) {
                    new Countrystandings({ contestId: 10, country: 'invalid', total: 1 }).show();
                    expect(request.get.called).to.be.false;
                    expect(helpers.logr.called).to.be.true;
                    done();
                });

                it('should return and match error when country invalid - callabck', function (done) {
                    new Countrystandings({ contestId: 10, country: 'invalid', total: 1 }).show(function (err) {
                        expect(request.get.called).to.be.false;
                        expect(helpers.logr.called).to.be.false;
                        expect(err).to.equal(`'invalid' not found in supported country list.Please run 'cf country' to see all supported countries.`);
                        done();
                    });
                });
            });
            describe('request error',function () {

                this.timeout(20000);

                beforeEach(function () {
                    sinon.stub(request, 'get').yields('requestError', { statusCode: 404 }, '');
                    sinon.stub(helpers,'log');
                    sinon.stub(helpers,'logr');
                    sinon.stub(process.stderr,'write');
                });

                afterEach(function () {
                    request.get.restore();
                    helpers.logr.restore();
                    helpers.log.restore();
                    process.stderr.write.restore();
                });

                it('should return and match error when request error', function (done) {
                    new Countrystandings({ contestId: 10, country: 'Bangladesh', total: 1 }).show(function (err) {
                        expect(request.get.called).to.be.true;
                        expect(helpers.logr.called).to.be.false;
                        expect(err).to.equal(`requestError`);
                        done();
                    });
                });
            });
            describe('HTTP error',function () {

                this.timeout(20000);

                beforeEach(function () {
                    sinon.stub(request, 'get').yields(null, { statusCode: 404 }, '');
                    sinon.stub(helpers,'log');
                    sinon.stub(helpers,'logr');
                    sinon.stub(process.stderr,'write');
                });

                afterEach(function () {
                    request.get.restore();
                    helpers.logr.restore();
                    helpers.log.restore();
                    process.stderr.write.restore();
                });

                it('should return and match error when connection error', function (done) {
                    new Countrystandings({ contestId: 10, country: 'Bangladesh', total: 1 }).show(function (err) {
                        expect(request.get.called).to.be.true;
                        expect(helpers.logr.called).to.be.false;
                        expect(err).to.equal(`HTTP failed with status 404`);
                        done();
                    });
                });
            });
            describe('error - no callback',function () {

                this.timeout(20000);

                beforeEach(function () {
                    sinon.stub(request, 'get').yields(null, { statusCode: 404 }, '');
                    sinon.stub(helpers,'log');
                    sinon.stub(helpers,'logr');
                    sinon.stub(process.stderr,'write');
                });

                afterEach(function () {
                    request.get.restore();
                    helpers.logr.restore();
                    helpers.log.restore();
                    process.stderr.write.restore();
                });

                it('should return and match error when connection error', function (done) {
                    new Countrystandings({ contestId: 10, country: 'Bangladesh', total: 1 }).show();
                    expect(request.get.called).to.be.true;
                    expect(helpers.logr.called).to.be.true;
                    done();
                });
            });
            describe('no user',function () {

                this.timeout(20000);

                beforeEach(function () {
                    sinon.stub(request, 'get').yields(null, { statusCode: 200 }, '');
                    sinon.stub(helpers,'log');
                    sinon.stub(helpers,'logr');
                    sinon.stub(process.stderr,'write');
                });

                afterEach(function () {
                    request.get.restore();
                    helpers.logr.restore();
                    helpers.log.restore();
                    process.stderr.write.restore();
                });

                it('should request call 5 times', function (done) {
                    new Countrystandings({ contestId: 10, country: 'Bangladesh', total: 1 }).show(function (err) {
                        expect(request.get.called).to.be.true;
                        expect(request.get.callCount).to.equal(2);
                        expect(err).to.be.null;
                        done();
                    });
                });
            });
            describe('no user - log',function () {

                this.timeout(20000);

                beforeEach(function () {
                    sinon.stub(request, 'get').yields(null, { statusCode: 200 }, '');
                    sinon.stub(helpers,'log');
                    sinon.stub(helpers,'logr');
                    sinon.stub(process.stderr,'write');
                });

                afterEach(function () {
                    request.get.restore();
                    helpers.logr.restore();
                    helpers.log.restore();
                    process.stderr.write.restore();
                });

                it('should request call 5 times and call log', function (done) {
                    new Countrystandings({ contestId: 10, country: 'Bangladesh', total: 1 }).show();
                    expect(request.get.called).to.be.true;
                    expect(request.get.callCount).to.equal(2);
                    expect(helpers.log.called).to.be.true;
                    done();
                });
            });
            describe('user in 2 page',function () {

                this.timeout(20000);

                var pageIndx = `<span class="page-index" pageindex="3"><a href="/contest/10/standings/page/3"></a></span>`;
                var page1Data = `<table class="standings"><tr><td><img class="standings-flag" title="Bangladesh"></td></tr></table>${pageIndx}`;
                var stubReq;

                beforeEach(function () {
                    stubReq = sinon.stub(request, 'get');
                    stubReq.onCall(0).yields(null, {statusCode: 200}, page1Data);
                    stubReq.onCall(1).yields(null, {statusCode: 200}, page1Data);
                    stubReq.onCall(2).yields('more than 2 times error', {statusCode: 200}, '');
                    sinon.stub(helpers,'log');
                    sinon.stub(helpers,'logr');
                    sinon.stub(process.stderr,'write');
                });

                afterEach(function () {
                    stubReq.restore();
                    helpers.logr.restore();
                    helpers.log.restore();
                    process.stderr.write.restore();
                });

                it('should not return error and call 2 times', function (done) {
                    new Countrystandings({ contestId: 10, country: 'Bangladesh', total: 2 }).show(function (err) {
                        expect(request.get.called).to.be.true;
                        expect(request.get.callCount).to.equal(2);
                        expect(err).to.be.null;
                        done();
                    });
                });
            });
            describe('show table',function () {

                this.timeout(20000);

                var pageIndx = `<span class="page-index" pageindex="3"><a href="/contest/10/standings/page/3"></a></span>`;
                var page1Data = `<table class="standings"><tr><td><img class="standings-flag" title="Bangladesh"></td></tr></table>${pageIndx}`;
                var stubReq;

                beforeEach(function () {
                    stubReq = sinon.stub(request, 'get');
                    stubReq.onCall(0).yields(null, {statusCode: 200}, page1Data);
                    stubReq.onCall(1).yields('more than 1 times error', {statusCode: 200}, '');
                    sinon.stub(helpers,'log');
                    sinon.stub(helpers,'logr');
                    sinon.stub(process.stderr,'write');
                });

                afterEach(function () {
                    stubReq.restore();
                    helpers.logr.restore();
                    helpers.log.restore();
                    process.stderr.write.restore();
                });

                it('should not return error and call 2 times', function (done) {
                    new Countrystandings({ contestId: 10, country: 'Bangladesh', total: 1 }).show();
                    expect(request.get.called).to.be.true;
                    expect(request.get.callCount).to.equal(1);
                    expect(helpers.log.called).to.be.true;
                    done();
                });
            });
        });
    });
});