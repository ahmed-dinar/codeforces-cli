import { expect } from 'chai';
import usertags from '../../src/lib/api/usertags';


describe('Codeforces', function() {
    describe('#usertags', function() {

        it('should throw error when parameter is empty', function(done) {
            expect(function () {
                usertags();
            }).to.throw(Error);
            done();
        });

        it('should throw error when handle is empty', function(done) {
            expect(function () {
                usertags({});
            }).to.throw(Error);
            done();
        });

        it('should throw error when handle is not a string', function(done) {

            expect(function () {
                usertags({ handle: {} });
            }).to.throw(Error);

            expect(function () {
                usertags({ handle: null });
            }).to.throw(Error);

            expect(function () {
                usertags({ handle: undefined });
            }).to.throw(Error);

            done();
        });

    });
});



