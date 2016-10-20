'use strict';

import qs from 'qs';
import request from 'request';
import debug from 'debug';
import JSONStream from 'JSONStream';
import Table from 'cli-table2';
import chalk from 'chalk';
import _ from 'lodash';
import { line } from 'cli-spinners';
import ora from 'ora';
import moment from 'moment';
import { log, logr } from '../helpers';

var debugs = debug('CF:standings');
var spinner = ora({ spinner: line });
var GB = chalk.green.bold;
var CB = chalk.cyan.bold;
var RB = chalk.red.bold;


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
    let contestInfo = {};
    let problemSet = [];


    let reqOptions = {
        uri: url,
        json: true,
        timeout: 30000
    };

    debugs(`Fetching standings..`);
    spinner.text = `Fetching standings..`;
    spinner.start();

    let strmm = request
        .get(reqOptions)
        .on('error', (err) => {

            debugs(`Failed: Request error`);
            debugs(err);

            logr(err);

        })
        .on('complete', () => {

            debugs('parsing completed');

            if( responseCode !== 200 ){
                spinner.fail();
                if( apiMsg !== null ){
                    return logr(apiMsg);
                }
                return logr('Failed HTTP');
            }

            if( contentType.indexOf('application/json;') === -1 ){
                spinner.fail();
                return logr('Failed.Not valid data.');
            }

            if( apiFailed ){
                spinner.fail();
                return logr(apiMsg);
            }

            spinner.succeed();

            let head = [ GB('Rank'), GB('Who'), GB('Points'), GB(`Hacks`) ];
            _.forEach(problemSet, prb => {
                head.push( GB(prb.index) );
            });
            table.options.head = head;

            log('');
            log( CB(` Title: ${contestInfo.name}`) );
            log( CB(` Type : ${contestInfo.type}`) );
            log( CB(` Phase: ${contestInfo.phase}`) );
            log(table.toString());

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
                return;
            }

            contestInfo = data.contest;
            problemSet = data.problems;

        }).on('data', (data) => {

            let hacks = '';

            if( data.successfulHackCount > 0 ){
                hacks = `+${data.successfulHackCount.toString()}`;
            }

            if( data.unsuccessfulHackCount > 0 ){
                hacks = `${hacks} : -${data.unsuccessfulHackCount.toString()}`;
            }

            let chunk = [
                data.rank.toString(),
                CB(data.party.members[0].handle),
                data.points.toString(),
                hacks
            ];


            let results = _.map(data.problemResults, (result) => {

                if( result.points === 0 && result.rejectedAttemptCount > 0 ){
                    return RB(`-${result.rejectedAttemptCount.toString()}`);
                }
                else if( result.points === 0 && result.rejectedAttemptCount === 0 ){
                    return ``;
                }

                let subSecond = moment.duration(result.bestSubmissionTimeSeconds, 'seconds');
                let h = parseInt(subSecond.hours());
                let s = parseInt(subSecond.minutes());
                let subTime = `${Math.floor(h/10)}${h%10}:${Math.floor(s/10)}${s%10}`;

                return ` ${result.points.toString()}\n${subTime}`;
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
        throw new Error('Error: Contest id required.');
    }

    let param = {
        contestId: options.contestId,
        count: 200
    };

    param.from = _.has(options,'from')
        ? options.from
        : 1;

    if( _.has(options,'count') &&  options.count <= 200 ){
        param.count = options.count;
    }

    param.showUnofficial = _.has(options,'unofficial')
        ? options.unofficial
        : false;

    if( _.has(options,'handles') ){

        let handles = options.handles;
        if( _.isArray(handles) ){
            handles = _.join(handles,';');
        }
        else if( handles.indexOf(',') !== -1 ){
            handles = _.split(handles,',');
            handles = _.join(handles,';');
        }
        param.handles = handles;
    }

    let sp = qs.stringify(param,{ encode: false });
    let url = `http://codeforces.com/api/contest.standings?${sp}`;

    return url;
}