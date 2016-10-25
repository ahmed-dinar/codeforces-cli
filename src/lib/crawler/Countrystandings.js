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
var GB = chalk.bold.green;
var CB = chalk.bold.cyan;
var RB = chalk.bold.red;


/*
 *********** TO-DO / FIX *********************************
 *   check 702 contest, its not match with table headers
 * *******************************************************
 */
export default class Countrystandings {

    /*
     * @param {Number} contestId
     * @param {String} country
     * @param {Number} total
     */
    constructor({contestId = null, country = null, total = 50} = {}) {

        let isInvalid = contestId === null || country === null || !Number.isInteger(contestId) || typeof country !== 'string';
        if (isInvalid) {
            throw new Error('contestId and country should not be null or empty.');
        }

        this.error = null;
        if (countries.indexOf(country) === -1) {
            this.error = `'${country}' not found in supported country list.Please run 'cf country' to see all supported countries.`;
        }

        this.contestId = contestId;
        this.country = country;
        this.total = total;
    }


    /**
     * @param callback
     * @returns {*}
     */
    show(callback){

        let self = this;
        if( self.error !== null ){
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
            timeout: 30000
        };

        let table = new Table();
        var totalPage = 5;
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

                reqOptions.uri = `http://codeforces.com/contest/${self.contestId}/standings/page/${page}`;

                debugs(`Fetching from page ${page}...`);
                spinner.text = `Fetching standings - page ${page}...`;
                spinner.start();

                request.get(reqOptions, (err, response, body) => {

                    if (err) {
                        return next(err);
                    }

                    let {statusCode} = response;
                    if (statusCode !== 200) {
                        return next('HTTP error');
                    }

                    spinner.stop();

                    var $ = cheerio.load(body, {decodeEntities: true});
                    let standings = $('table.standings .standings-flag');

                    standings = _.filter(standings, (stdng) => {
                        return $(stdng).attr('title') === self.country;
                    });

                    found += standings.length;
                    let remain = (self.total - found) < 0
                        ? 0
                        : (self.total - found);

                    spinner.text = `${standings.length} users found in page ${page} [${remain} remaining]`;
                    spinner.start();
                    spinner.succeed();

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

                let totalProblem = table[0].length - 5;
                let problemChar = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
                let head = [GB('#'), GB('Rank'), GB('Who'), GB('#'), GB('*')];

                let problemNames = _
                    .slice(problemChar, 0, totalProblem)
                    .map(x => {
                        return GB(x);
                    });

                head = head.concat(problemNames);
                table.options.head = head;

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
}