import { expect } from 'chai';
import sinon from 'sinon';
import request from 'request';
var chai = require('chai');
var sinonChai = require('sinon-chai');
import jsonfile from 'jsonfile';
import inquirer from 'inquirer';
var Promise = require("bluebird");

var helpers = require('../../src/lib/helpers');

chai.use(sinonChai);

module.exports = function(readF,promptF,getF){
    beforeEach(function(){
        this.s1 = sinon.stub(jsonfile, 'readFile').yields(readF.err, readF.obj);
        this.s2 = sinon.stub(jsonfile, 'writeFileSync');
        this.s3 = sinon.stub(inquirer, 'prompt').returns( Promise.resolve(promptF) );
        if(getF.ignore) {
            getF = getF.data;
            this.ignore = true;
            this.s4 = sinon.stub(request, 'get');
            this.s4.onCall(0).yields(getF[0].err, getF[0].res, getF[0].body);
            this.s4.onCall(1).yields(getF[1].err, getF[1].res, getF[1].body);
        }else{
            this.ignore = false;
            this.s4 = sinon.stub(request, 'get').yields(getF.err, getF.res, getF.body);
        }
        this.s5 = sinon.stub(process.stderr,'write');
        this.s6 = sinon.stub(helpers,'logr');
        this.s7 = sinon.stub(helpers,'log');
        this.s8 = sinon.stub(helpers,'clearSreen');
    });
    afterEach(function(){
        this.s1.restore();
        this.s2.restore();
        this.s3.restore();
        this.s4.restore();
        this.s5.restore();
        this.s6.restore();
        this.s7.restore();
        this.s8.restore();
    });
};

