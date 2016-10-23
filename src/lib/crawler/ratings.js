'use strict';

import request from 'request';
import debug from 'debug';
import cheerio from 'cheerio';
import Table from 'cli-table2';
import chalk from 'chalk';
import _ from 'lodash';
import qs from 'qs';
import { line } from 'cli-spinners';
import ora from 'ora';
import { log, logr, commonHeaders } from '../helpers';

var debugs = debug('CF:standings:c');
var spinner = ora({ spinner: line });
var GB = chalk.bold.green;
var CB = chalk.bold.cyan;
var RB = chalk.bold.red;

/**
 *
 * @param {Object} options - { country, org,  }
 */
export default (options) => {

    if( !_.has(options,'country') ){
        logr('  country required');
        return;
    }

    let { country } = options;
    let withOrg = false;

    if( _.has(options,'org') && options.org ){
        withOrg = true;
    }

    let headers = commonHeaders();

    let reqOptions = {
        uri: `http://codeforces.com/ratings/country/${country}`,
        headers: headers
    };

    debugs(`Fetching ratings of ${country}...`);
    spinner.text = `fetching top 200 user ratings of ${country}...`;
    spinner.start();

    request.get(reqOptions, (err, response, body) => {

        if(err){
            spinner.fail();
            logr(err);
            return;
        }

        let { statusCode } = response;

        if( statusCode!==200 ){
            spinner.fail();
            logr('  HTTP error');
            return;
        }

        spinner.succeed();

        var $ = cheerio.load(body, {decodeEntities: true});
        let ratings = $('div.ratingsDatatable tr');

        let table = new Table({
            head: [ GB('#') ,GB('Rank'), GB('Who'), GB('Title'), GB('Contests'), GB('Rating') ]
        });

        _.forEach(ratings, (rating, key) => {

            if(key === 0){ return; } //skip table header

            rating = $(rating).children();
            let info = [ (key).toString() ];

            _.forEach(rating, function (data, indx) {

                let inf = _.replace( $(data).text(), /\s\s+/g , '' ); //remove spaces and \n\r
                let title = '';

                if( indx === 1 ){

                    title = $(data)
						.find($('.rated-user'))
						.attr('title');
                    title = _.replace(title, inf, '');

                    if(!withOrg){
                        if( title.toLowerCase().indexOf('grandmaster') !== -1 ){
                            inf = RB(inf);
                        }
                        else{
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

        if( withOrg ){
            return getOrg(table, country);
        }

        log('');
        log(CB(`Country: ${country}`));
        log(table.toString());
    });
};


/**
 * Get users organization
 * @param table
 * @param country
 */
function getOrg(table, country) {

    let rOptions = {
        uri: '',
        json: true
    };

    let handles = _.map(table, (info) => {
        return info[2];
    }).join(';');

    let qsf = qs.stringify({ handles: handles }, { encode: false });
    rOptions.uri = `http://codeforces.com/api/user.info?${qsf}`;

    debugs('fetching user\'s Organization...');
    spinner.text = 'fetching user\'s Organization...';
    spinner.start();

    request
        .get(rOptions, (error, response, body) => {

            if(error){
                spinner.fail();
                logr(error);
                return;
            }

            let { statusCode } = response;

            if( statusCode!==200 ){
                spinner.fail();
                logr('  HTTP error');
                return;
            }

            if( body.status !== 'OK' ){
                spinner.fail();
                logr(`  ${body.comment}`);
                return;
            }

            spinner.succeed();

            _.forEach(body.result, (data,key) => {
               // table[key].push(`${data.firstName} ${data.lastName}`);
              //  table[key].push(data.maxRating);
               // table[key].push(data.contribution);
                table[key].push(data.organization);
            });

            table.options.head.push(GB('Organization'));

            log('');
            log(CB(`Country: ${country}`));
            log(table.toString());
        });
}