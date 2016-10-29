'use strict';

import request from 'request';
import debug from 'debug';
import cheerio from 'cheerio';
import Table from 'cli-table2';
import chalk from 'chalk';
import _ from 'lodash';
import ora from 'ora';
import whilst from 'async/whilst';
import { log, logr, commonHeaders } from '../helpers';
import countries from '../countries';

var debugs = debug('CF:standings:c');
var spinner = ora({ spinner: 'line' });
const TIME_OUT = 30000;
const GB = chalk.bold.green;
const CB = chalk.bold.cyan;
const RB = chalk.bold.red;



export default class Countrystandings {

    /*
     * @param {Number} contestId
     * @param {String} country
     * @param {Number} total
     */
    constructor({contestId = null, country = null, total = 50, offset = 1} = {}) {

        let isInvalid = contestId === null || country === null || !Number.isInteger(contestId) || typeof country !== 'string';
        if (isInvalid) {
            throw new Error('contestId and country should not be null or empty.');
        }

        this.error = null;
        if (countries.indexOf(country) === -1) {
            this.error = `'${country}' not found in supported country list.Please run 'cf country' to see all supported countries.`;
            return;
        }

        this.contestId = contestId;
        this.country = country;
        this.total = total;
        this.offset = offset;
    }


    /**
     * @param callback
     * @returns {*}
     */
    show(callback){

        let self = this;
        if( self.error ){
            if( typeof callback === 'function' ){
                return callback(self.error);
            }
            logr(self.error);
            return;
        }

        let headers = commonHeaders();
        let reqOptions = {
            uri: '',
            headers: headers,
            timeout: TIME_OUT
        };

        let head;
        let table = new Table();
        var totalPage = 2;
        var count = 0;
        var found = 0;
        var page = 1;
        let contestName = '';

        log('');

        whilst(
            () => {
                return count < self.total && page <= totalPage;
            },
            (next) => {

                let remain = (self.total - found) < 0
                    ? 0
                    : (self.total - found);
                spinner.text = `Fetching standings - ${found} participants found,${remain} remaining...`;
                spinner.start();

                reqOptions.uri = `http://codeforces.com/contest/${self.contestId}/standings/page/${page}`;
                request.get(reqOptions, (err, response, body) => {

                    if (err) {
                        return next(err);
                    }

                    let {statusCode} = response;
                    if (statusCode !== 200) {
                        return next(`HTTP failed with status ${statusCode}`);
                    }
                    spinner.stop();

                    var $ = cheerio.load(body, {decodeEntities: true});
                    let standings = $(`table.standings .standings-flag[title="${self.country}"]`);
                    found += standings.length;

                    _.forEach(standings, (standing) => {

                        let allData = $(standing)
                            .parent()
                            .parent()
                            .children();
                        let data = [(count + 1).toString()];

                        _.forEach(allData, (info, key) => {

                            let val = _.replace($(info).text(), /\s\s+/g, '');

                            /* istanbul ignore next */
                            switch (key) {
                                case 0:
                                    break;
                                case 1:
                                    val = CB(val);
                                    break;
                                case 2:
                                    break;
                                case 3:
                                    if (val.indexOf('+') !== -1) {
                                        val = GB(val);
                                    }
                                    else if (val.indexOf('-') !== -1) {
                                        val = RB(val);
                                    }
                                    else{
                                        val = chalk.bold.white(val);
                                    }
                                    break;
                                default:
                                    if (val.indexOf(':') !== -1) {
                                        val = self.splitPenalty(val, val.length - 5);
                                    }
                                    else {
                                        val = RB(val);
                                    }
                            }

                            data.push(val);
                        });
                        count++;
                        table.push(data);
                    });

                    if (page === 1) {

                        contestName = _.replace($('.contest-name a').text(), /\s\s+/g, '');
                        let pg = $('.page-index');
                        let indxes = pg.length;
                        if (indxes) {
                            pg = pg[indxes - 1];
                            totalPage = parseInt($(pg).attr('pageindex'), 10);
                            debugs(`Total page: ${totalPage}`);
                        }

                        let tabHeads = $('table.standings tr')[0];
                        head = _.map( $(tabHeads).children(), (heads) => {
                            let name = _.replace( $(heads).text() , /\s\s+/g, '');
                            if( name === '#' ){
                                name = 'Rank';
                            }
                            else if( name.length > 1 && self.hasDigit(name) ){
                                name = self.splitPenalty(name, 1);
                            }
                            return GB(name);
                        });
                    }
                    page++;
                    return next();
                });
            },
            function (err, n) {

                if( typeof callback === 'function' ){
                    spinner.stop();
                    return callback(err);
                }

                if (err) {
                    spinner.fail();
                    logr(err);
                    return;
                }

                if (!table.length) {
                    log('No standings found.');
                    return;
                }

                let colWidths = [ null, ...(_.map(head, (hd,key) => { //bad practice? who cares! eslint, is that you??
                    return key == 1 ? 30 : null;
                }))];

                table.options.head = [ GB('#'), ...head ];
                table.options.colWidths = colWidths;
                table.options.wordWrap = true;

                log('');
                log(CB(`Contest: ${contestName}`));
                log(CB(`Country: ${self.country}`));
                log(table.toString());
            }
        );
    }


    /**
     * http://stackoverflow.com/questions/16441770/split-string-in-two-on-given-index-and-return-both-parts
     * @param value
     * @param index
     * @returns {string}
     */
    splitPenalty(value, index) {
        /* istanbul ignore next */
        return ` ${value.substring(0, index)}\n${value.substring(index)}`;
    }


    /**
     * Check if a string contains any digit
     * @param val
     */
    hasDigit(val) {
        return val.match(/\d+/g) != null;
    }
}