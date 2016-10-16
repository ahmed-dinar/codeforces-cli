'use strict';

import qs from 'qs';
import request from 'request';
import debug from 'debug';
import JSONStream from 'JSONStream';
import Table from 'cli-table2';
import chalk from 'chalk';
import _ from 'lodash';

var debugs = debug('CF:standings');

/**
 *
 * @param options
 */
export default (options) => {

    let url = generateUrl(options);

    let apiFailed = false;
    let apiMsg = null;
    let responseCode = 404;
    let contentType = '';
    let standings = [];
    let table = new Table();

    let reqOptions = {
        uri: url,
        json: true,
        timeout: 30000
    };

    debugs(`Fetching standings..`);

    let strmm = request
        .get(reqOptions)
        .on('error', (err) => {

            debugs(`Failed: Request error`);
            debugs(err);

            console.log(err);
            process.exit(1);
        })
        .on('complete', () => {

            debugs('parsing completed');

            if( responseCode !== 200 ){
                if( apiMsg !== null ){
                    return console.log(apiMsg);
                }
                return console.log('Failed HTTP');
            }

            if( contentType.indexOf('application/json;') === -1 ){
                return console.log('Failed.Not valid data.');
            }

            if( apiFailed ){
                return console.log(apiMsg);
            }

            let problemName = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
            let head = [ chalk.bold.green('Rank'), chalk.bold.green('Who'), chalk.bold.green('Points') ];
            head = head.concat( _.slice(problemName,0,standings[0].length-3).map( x => { return chalk.bold.green(x); }) );
            table.options.head = head;

            console.log();
            console.log(chalk.bold.cyan(` Contest: ${options.contestId}`));
            console.log(table.toString());
            process.exit(0);
        })
        .on('response', (response) => {

            responseCode = response.statusCode;
            contentType = response.headers['content-type'];

            debugs(`HTTP Code: ${responseCode}`);
            debugs(`Content-Type: ${contentType}`);
        })
        .pipe( JSONStream.parse('result.rows.*') )
        .on('header',  (data) => {

            debugs(`API Status: ${data.status}`);

            if( data.status !== 'OK' ){
                apiFailed = true;
                apiMsg = data.comment;
            }

        }).on('data', (data) => {

            let chunk = [
                data.rank.toString(),
                data.party.members[0].handle,
                data.points.toString()
            ];

            let results = _.map(data.problemResults, (result) => {
               return result.points.toString();
            });

            standings.push(chunk.concat(results));
            table.push(chunk.concat(results));
        });
}

/**
 *
 * @param options
 * @returns {string}
 */
function generateUrl(options) {

    if( !_.has(options,'contestId')  ){
        console.log('Error: Contest id required.');
        process.exit(1);
    }

    let param = {
        count: 50
    };
    param.contestId = options.contestId;
    param.from = _.has(options,'from') ? options.from : 1;
    if( _.has(options,'count') ){
        param.count = options.count < 201 ? options.count : 200;
    }
    else{

    }

    param.showUnofficial = _.has(options,'showUnofficial') ? options.showUnofficial : false;

    if( _.has(options,'handles') ){
        let handles = options.handles;
        if( _.isArray(handles) ){
            handles = _.join(handles,';');
        }
        param.handles = handles;
    }

    let sp = qs.stringify(param,{ encode: false });
    let url = `http://codeforces.com/api/contest.standings?${sp}`;

    return url;
}