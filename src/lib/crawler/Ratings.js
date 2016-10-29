'use strict';

import waterfall from 'async/waterfall';
import request from 'request';
import debug from 'debug';
import cheerio from 'cheerio';
import Table from 'cli-table2';
import chalk from 'chalk';
import { forEach, replace, map } from 'lodash';
import has from 'has';
import qs from 'qs';
import ora from 'ora';
import { log, logr, commonHeaders } from '../helpers';
import countries from '../countries';

var spinner = ora({ spinner: 'line' });
var debugs = debug('CF:standings:c');
const GB = chalk.bold.green;
const CB = chalk.bold.cyan;
const RB = chalk.bold.red;


export default class Ratings {


    /**
     * @param country
     * @param org
     */
    constructor({ country = null, org = false } = {}) {

        if ( country === null || typeof country !== 'string' ) {
            throw new Error('country should not be null or empty');
        }

        this.error = null;
        if (countries.indexOf(country) === -1) {
            this.error = `Invalid country '${country}'.Please run 'cf country' to see supported country list.`;
            return;
        }

        this.country = country;
        this.withOrg = org;
    }


    /******* TO-DO ************************************************
     *   Add count and offset (and may be categorize by CF colors?)
     **************************************************************
     * @param callback
     * @returns {*}
     */
    show(callback){

        let self = this;
        let isCallback = typeof callback === 'function';
        if( self.error ){
            return isCallback ? callback(self.error) : logr(self.error);
        }

        spinner.text = `fetching top few user ratings of ${self.country}...`;
        spinner.start();

        waterfall([
            (next) => {

                let reqOptions = {
                    uri: `http://codeforces.com/ratings/country/${self.country}`,
                    headers: commonHeaders()
                };

                request.get(reqOptions, (err, response, body) => {

                    if (err) {
                        return next(err);
                    }

                    let {statusCode} = response;
                    if (statusCode !== 200) {
                        return next(`HTTP failed with status ${statusCode}`);
                    }

                    var $ = cheerio.load(body, {decodeEntities: true});
                    let ratings = $('div.ratingsDatatable tr');
                    let table = new Table({
                        head: [GB('#'), GB('Rank'), GB('Who'), GB('Title'), GB('Contests'), GB('Rating')]
                    });

                    forEach(ratings, (rating, key) => {

                        if (key === 0) {
                            return;
                        } //skip table header

                        rating = $(rating).children();
                        let info = [(key).toString()];

                        forEach(rating, function (data, indx) {

                            let inf = replace($(data).text(), /\s\s+/g, ''); //remove spaces and \n\r
                            let title = '';

                            if (indx === 1) {
                                title = $(data)
                                    .find($('.rated-user'))
                                    .attr('title');
                                title = replace(title, inf, '');

                                if (!self.withOrg) {
                                    if (title.toLowerCase().indexOf('grandmaster') !== -1) {
                                        inf = RB(inf);
                                    }
                                    else {
                                        inf = CB(inf);
                                    }
                                }
                                info.push(inf);
                                info.push(title);
                            }
                            else {
                                info.push(inf);
                            }
                        });
                        table.push(info);
                    });
                    spinner.succeed();
                    return next(null, table);
                });
            },
            (table, next) => {
                if( this.withOrg ){
                    return self.getOrg(table, next);
                }
                return next(null, table);
            }
        ], (err, result) => {

            if( isCallback ){
                spinner.stop();
                return callback(err, result);
            }

            if(err){
                spinner.fail();
                logr(err);
                return;
            }

            log('');
            log(CB(`Country: ${self.country}`));
            log(result.toString());
        });
    }


    /**
     * get organization of the users
     * @param table
     * @param callback
     */
    getOrg(table, callback) {

        let rOptions = {
            uri: '',
            json: true
        };

        let handles = map(table, (info) => {
            return info[2];
        }).join(';');

        let qsf = qs.stringify({handles: handles}, {encode: false});
        rOptions.uri = `http://codeforces.com/api/user.info?${qsf}`;

        debugs('fetching user\'s Organization...');
        spinner.text = 'fetching user\'s Organization...';
        spinner.start();

        request
            .get(rOptions, (error, response, body) => {

                if (error) {
                    return callback(error);
                }

                let {statusCode} = response;
                if (statusCode !== 200) {
                    return callback( has(body, 'comment') ? body.comment : `HTTP failed with status ${statusCode}`);
                }

                if (body.status !== 'OK') {
                    return callback(body.comment);
                }
                spinner.succeed();

                forEach(body.result, (data, key) => {
                    table[key].push(data.organization);
                });
                table.options.head.push(GB('Organization'));

                return callback(null, table);
            });
    }
}