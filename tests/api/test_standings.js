import { expect } from 'chai';
import sinon from 'sinon';
import request from 'request';
var chai = require('chai');
import has from 'has';
var sinonChai = require('sinon-chai');

var helpers = require('../../src/lib/helpers');
import standings from '../../src/lib/api/standings';

chai.use(sinonChai);

var mockResponse = {
    statusCode: 200,
    headers: {
        'content-type': 'application/json;'
    }
};

var mockBody = {
    "status":"OK",
    "result":{
        "contest":{
            "id":550,
            "name":"Codeforces Round #306 (Div. 2)",
            "type":"CF",
            "phase":"FINISHED",
            "frozen":false,
            "durationSeconds":7200,
            "startTimeSeconds":1433435400,
            "relativeTimeSeconds":43653316
        },
        "problems":[],
        "rows":[]
    }
};



describe('Codeforces', function() {
    describe('#standings', function() {
        describe('[core]', function() {

            it('should throw error when parameter is empty', function(done) {
                expect(function () {
                    standings();
                }).to.throw(Error);
                done();
            });

            it('should throw error when contest id is not integer', function(done) {
                expect(function () {
                    standings({ contestId: null });
                }).to.throw(Error);
                expect(function () {
                    standings({ contestId: '211' });
                }).to.throw(Error);
                expect(function () {
                    standings({ contestId: undefined });
                }).to.throw(Error);
                expect(function () {
                    standings({ contestId: {} });
                }).to.throw(Error);
                done();
            });
        });

        describe('[event]', function() {

            var eventStub =  {
                on:  function(eventName , data) { return this; },
                pipe: function() { return this; }
            };
            var spy;

            beforeEach(function(){
                sinon.stub(process.stderr,'write');
                sinon.stub(request, 'get').returns(eventStub);
                spy = sinon.spy(eventStub,'on');
            });

            afterEach(function(){
                process.stderr.write.restore();
                request.get.restore();
                eventStub.on.restore();
            });

            it('should call request', function(done) {
                standings({ contestId: 550, count: 2 });
                expect(request.get.called).to.be.true;
                done();
            });

            it('should call all 5 event', function(done) {
                standings({ contestId: 550, count: 2 });
                expect(spy.callCount).to.equal(5);
                done();
            });

            it('should call all 5 event with handles', function(done) {
                standings({ contestId: 550, count: 2, handles: ['ad'] });
                expect(spy.callCount).to.equal(5);
                done();
            });

            it('should call all 5 event with unofficial', function(done) {
                standings({ contestId: 550, count: 2, handles: 'ada,adad,ad', unofficial: true, from: 2 });
                expect(spy.callCount).to.equal(5);
                done();
            });
        });
    });
});

