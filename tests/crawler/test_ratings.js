import { expect } from 'chai';
import sinon from 'sinon';
import request from 'request';
var chai = require('chai');
var sinonChai = require('sinon-chai');

var helpers = require('../../src/lib/helpers');
import Ratings from '../../src/lib/crawler/Ratings';

chai.use(sinonChai);

var sampleData = `<div class="datatable ratingsDatatable"><table class=""><tbody><tr></tr><tr><td class="dark left">(181)</td><td><a href="/profile/nfssdq" title="Grandmaster nfssdq" class="rated-user user-red">nfssdq</a></td><td>132</td><td>2435</td></tr><tr><td class="dark left">(181)</td><td><a href="/profile/nfssdq" title="Grandmaster nfssdq" class="rated-user user-red">nfssdq</a></td><td>132</td><td>2435</td></tr><tr><td>385</td><td><a href="/profile/dragoon" title="Master dragoon" class="rated-user user-orange"></a></td><td>34</td><td>2252</td></tr></tbody></table></div>`;

describe('Codeforces',function () {
    describe('#Ratings',function () {
        describe('.constructor()',function () {

            it('should throw error when no parameter', function (done) {
                expect(function () {
                    new Ratings();
                }).to.throw(Error);
                done();
            });

            it('should throw error when country is not string', function (done) {
                expect(function () {
                    new Ratings({ country: {} });
                }).to.throw(Error);
                expect(function () {
                    new Ratings({ country: 123 });
                }).to.throw(Error);
                done();
            });

            it('should not throw error', function (done) {
                expect(function () {
                    new Ratings({ country: 'Bangladesh' });
                }).to.not.throw(Error);
                done();
            });

        });
        describe('.show()',function () {
            describe('[basic error]',function () {

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
                    new Ratings({ country: 'invlid' }).show();
                    expect(request.get.called).to.be.false;
                    expect(helpers.logr.called).to.be.true;
                    done();
                });

                it('should return and match error when country invalid - callback', function (done) {
                    new Ratings({ country: 'invlid' }).show(function (err,result) {
                        expect(request.get.called).to.be.false;
                        expect(helpers.logr.called).to.be.false;
                        expect(err).to.equal(`Invalid country 'invlid'.Please run command 'cf country' to see supported country list.`);
                        done();
                    });
                });

            });
            describe('[request error]',function () {

                var instnecRating;
                beforeEach(function () {
                    instnecRating = new Ratings({ country: 'Bangladesh' });
                    sinon.stub(instnecRating,'getOrg').yields('orgError');
                    sinon.stub(request, 'get').yields('requestError', { statusCode: 404 }, '');
                    sinon.stub(helpers,'log');
                    sinon.stub(helpers,'logr');
                    sinon.stub(process.stderr,'write');
                });

                afterEach(function () {
                    instnecRating.getOrg.restore();
                    request.get.restore();
                    helpers.logr.restore();
                    helpers.log.restore();
                    process.stderr.write.restore();
                });

                it('should return and match error when request error', function (done) {
                    instnecRating.show();
                    expect(request.get.called).to.be.true;
                    expect(helpers.logr.called).to.be.true;
                    expect(instnecRating.getOrg.called).to.be.false;
                    done();
                });

                it('should return and match error when request error - callback', function (done) {
                    instnecRating.show(function (err,result) {
                        expect(request.get.called).to.be.true;
                        expect(helpers.logr.called).to.be.false;
                        expect(err).to.equal('requestError');
                        expect(instnecRating.getOrg.called).to.be.false;
                        done();
                    });
                });

            });
            describe('[HTTP error]',function () {

                var instnecRating;
                beforeEach(function () {
                    instnecRating = new Ratings({ country: 'Bangladesh' });
                    sinon.stub(instnecRating,'getOrg').yields('orgError');
                    sinon.stub(request, 'get').yields(null, { statusCode: 404 }, '');
                    sinon.stub(helpers,'log');
                    sinon.stub(helpers,'logr');
                    sinon.stub(process.stderr,'write');
                });

                afterEach(function () {
                    instnecRating.getOrg.restore();
                    request.get.restore();
                    helpers.logr.restore();
                    helpers.log.restore();
                    process.stderr.write.restore();
                });

                it('should return and match error when request error', function (done) {
                    instnecRating.show();
                    expect(request.get.called).to.be.true;
                    expect(helpers.logr.called).to.be.true;
                    expect(instnecRating.getOrg.called).to.be.false;
                    done();
                });

                it('should return and match error when request error - callback', function (done) {
                    instnecRating.show(function (err,result) {
                        expect(request.get.called).to.be.true;
                        expect(helpers.logr.called).to.be.false;
                        expect(err).to.equal('HTTP error');
                        expect(instnecRating.getOrg.called).to.be.false;
                        done();
                    });
                });

            });
            describe('[success]',function () {

                var instnecRating;
                beforeEach(function () {
                    instnecRating = new Ratings({ country: 'Bangladesh' });
                    sinon.stub(instnecRating,'getOrg').yields('orgError');
                    sinon.stub(request, 'get').yields(null, { statusCode: 200 }, sampleData);
                    sinon.stub(helpers,'log');
                    sinon.stub(helpers,'logr');
                    sinon.stub(process.stderr,'write');
                });

                afterEach(function () {
                    instnecRating.getOrg.restore();
                    request.get.restore();
                    helpers.logr.restore();
                    helpers.log.restore();
                    process.stderr.write.restore();
                });

                it('should not have error', function (done) {
                    instnecRating.show();
                    expect(request.get.called).to.be.true;
                    expect(helpers.logr.called).to.be.false;
                    expect(helpers.log.called).to.be.true;
                    expect(instnecRating.getOrg.called).to.be.false;
                    done();
                });

                it('should not have error - callback', function (done) {
                    instnecRating.show(function (err,result) {
                        expect(request.get.called).to.be.true;
                        expect(helpers.logr.called).to.be.false;
                        expect(helpers.log.called).to.be.false;
                        expect(err).to.equal(null);
                        expect(instnecRating.getOrg.called).to.be.false;
                        done();
                    });
                });

            });
        });
        describe('.getOrg()',function () {

            describe('[req error]',function () {

                var stubReq;
                beforeEach(function () {
                    stubReq = sinon.stub(request, 'get');
                    stubReq.onCall(0).yields(null, { statusCode: 200 }, sampleData);
                    stubReq.onCall(1).yields('orgReqError', { statusCode: 404 }, '');
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

                it('should have error', function (done) {
                    new Ratings({ country: 'Bangladesh', org: true }).show();
                    expect(request.get.called).to.be.true;
                    expect(request.get.callCount).to.equal(2);
                    expect(helpers.logr.called).to.be.true;
                    expect(helpers.log.called).to.be.false;
                    done();
                });

                it('should have error - callback', function (done) {
                    new Ratings({ country: 'Bangladesh', org: true }).show(function (err,result) {
                        expect(request.get.called).to.be.true;
                        expect(helpers.logr.called).to.be.false;
                        expect(helpers.log.called).to.be.false;
                        expect(err).to.equal('orgReqError');
                        done();
                    });
                });
            });
            describe('[HTTP error]',function () {

                var stubReq;
                beforeEach(function () {
                    stubReq = sinon.stub(request, 'get');
                    stubReq.onCall(0).yields(null, { statusCode: 200 }, sampleData);
                    stubReq.onCall(1).yields(null, { statusCode: 404 }, '');
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

                it('should have error', function (done) {
                    new Ratings({ country: 'Bangladesh', org: true }).show();
                    expect(request.get.called).to.be.true;
                    expect(request.get.callCount).to.equal(2);
                    expect(helpers.logr.called).to.be.true;
                    expect(helpers.log.called).to.be.false;
                    done();
                });

                it('should have error - callback', function (done) {
                    new Ratings({ country: 'Bangladesh', org: true }).show(function (err,result) {
                        expect(request.get.called).to.be.true;
                        expect(helpers.logr.called).to.be.false;
                        expect(helpers.log.called).to.be.false;
                        expect(err).to.equal('HTTP error [org]');
                        done();
                    });
                });
            });
            describe('[HTTP error - API]',function () {

                var stubReq;
                beforeEach(function () {
                    stubReq = sinon.stub(request, 'get');
                    stubReq.onCall(0).yields(null, { statusCode: 200 }, sampleData);
                    stubReq.onCall(1).yields(null, { statusCode: 404 }, { comment: 'API error' });
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

                it('should have error', function (done) {
                    new Ratings({ country: 'Bangladesh', org: true }).show();
                    expect(request.get.called).to.be.true;
                    expect(request.get.callCount).to.equal(2);
                    expect(helpers.logr.called).to.be.true;
                    expect(helpers.log.called).to.be.false;
                    done();
                });

                it('should have error - callback', function (done) {
                    new Ratings({ country: 'Bangladesh', org: true }).show(function (err,result) {
                        expect(request.get.called).to.be.true;
                        expect(helpers.logr.called).to.be.false;
                        expect(helpers.log.called).to.be.false;
                        expect(err).to.equal('API error');
                        done();
                    });
                });
            });
            describe('[API error]',function () {

                var stubReq;
                beforeEach(function () {
                    stubReq = sinon.stub(request, 'get');
                    stubReq.onCall(0).yields(null, { statusCode: 200 }, sampleData);
                    stubReq.onCall(1).yields(null, { statusCode: 200 }, { status: 'FAILED', comment: 'API errors', result: {} });
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

                it('should have error', function (done) {
                    new Ratings({ country: 'Bangladesh', org: true }).show();
                    expect(request.get.called).to.be.true;
                    expect(request.get.callCount).to.equal(2);
                    expect(helpers.logr.called).to.be.true;
                    expect(helpers.log.called).to.be.false;
                    done();
                });

                it('should have error - callback', function (done) {
                    new Ratings({ country: 'Bangladesh', org: true }).show(function (err,result) {
                        expect(request.get.called).to.be.true;
                        expect(request.get.callCount).to.equal(2);
                        expect(helpers.logr.called).to.be.false;
                        expect(helpers.log.called).to.be.false;
                        expect(err).to.equal('API errors');
                        done();
                    });
                });
            });
            describe('[successs]',function () {

                var stubReq;
                beforeEach(function () {
                    stubReq = sinon.stub(request, 'get');
                    stubReq.onCall(0).yields(null, { statusCode: 200 }, sampleData);
                    stubReq.onCall(1).yields(null, { statusCode: 200 }, { status: 'OK', result: [ { nfssdq: { organization: 'JU'} } ] });
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

                it('should have error', function (done) {
                    new Ratings({ country: 'Bangladesh', org: true }).show();
                    expect(request.get.called).to.be.true;
                    expect(request.get.callCount).to.equal(2);
                    expect(helpers.logr.called).to.be.false;
                    expect(helpers.log.called).to.be.true;
                    done();
                });

                it('should have error - callback', function (done) {
                    new Ratings({ country: 'Bangladesh', org: true }).show(function (err,result) {
                        expect(request.get.called).to.be.true;
                        expect(request.get.callCount).to.equal(2);
                        expect(helpers.logr.called).to.be.false;
                        expect(helpers.log.called).to.be.false;
                        expect(err).to.equal(null);
                        done();
                    });
                });
            });

        });
    });
});