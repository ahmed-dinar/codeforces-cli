import { expect } from 'chai';
import sinon from 'sinon';
import request from 'request';
var chai = require('chai');
var sinonChai = require('sinon-chai');

var helpers = require('../../src/lib/helpers');
import tags from '../../src/lib/api/tags';

chai.use(sinonChai);

describe('Codeforces', function() {
    describe('#tags', function() {

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
            tags();
            expect(request.get.called).to.be.true;
            done();
        });

        it('should call all 5 event', function(done) {
             tags();
            expect(spy.callCount).to.equal(5);
            done();
        });
    })
});


