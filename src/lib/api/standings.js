'use strict';

import qs from 'qs';
import request from 'request';
import debug from 'debug';
import JSONStream from 'JSONStream';
import Table from 'cli-table2';
import chalk from 'chalk';
import { forEach, split , isArray , join, map } from 'lodash';
import { line } from 'cli-spinners';
import ora from 'ora';
import { duration } from 'moment';
import { log, logr } from '../helpers';

var debugs = debug('CF:standings');
var spinner = ora({ spinner: line });
var GB = chalk.green.bold;
var CB = chalk.cyan.bold;
var RB = chalk.red.bold;


/**
 * Main standings function
 * @param {Number} contestId id of the contest (*required)
 * @param {Number} count - total standings to fetch
 * @param {Boolean} unofficial - if true, also fetch unofficial standings
 * @param {Number} from - offset of rank to fetch from
 * @param {Array/String} handles - comma separated handles or array of handles
 */
export default ({ contestId = null, count = 200, unofficial = false, from = 1, handles = [] } = {}) => {

    if( contestId === null || !Number.isInteger(contestId) ){
        throw new Error('contest id should not be empty or null and should be integer.');
    }

    let options = { contestId, count, unofficial, from, handles };
    let url = generateUrl(options);

    let apiFailed = false;
    let apiMsg = null;
    let responseCode = 404;
    let contentType = '';
    let table = new Table();
    let contestInfo = {};
    let problemSet = [];

    let reqOptions = {
        uri: url,
        json: true,
        timeout: 30000
    };

    debugs('Fetching standings..');
    spinner.text = 'Fetching standings..';
    spinner.start();

    /* istanbul ignore next */
    request
        .get(reqOptions)
        .on('error', (err) => {

            debugs('Failed: Request error');
            debugs(err);

            logr(err);
        })
        .on('complete', () => {

            debugs('parsing completed');

            if( responseCode !== 200 ){
			    log('a ' + responseCode);
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

            let head = [ GB('Rank'), GB('Who'), GB('Points'), GB('Hacks') ];
            forEach(problemSet, prb => {
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

            log(responseCode);

            debugs(`HTTP Code: ${responseCode}`);
            debugs(`Content-Type: ${contentType}`);
        })
        .pipe( JSONStream.parse('result.rows.*') )
        .on('header', (data) => {

            debugs(`API Status: ${data.status}`);

            if( data.status !== 'OK' ){
                apiFailed = true;
                apiMsg = data.comment;
                return;
            }
            contestInfo = data.contest;
            problemSet = data.problems;
        })
        .on('data', (data) => {

            let hacks = '';

            if( data.successfulHackCount > 0 ){
                hacks = `+${data.successfulHackCount.toString()}`;
            }

            if( data.unsuccessfulHackCount > 0 ){
                hacks = `${hacks} : -${data.unsuccessfulHackCount.toString()}`;
            }

			/**********TO-DO*************/
			//  handle Multiple members (team)
            //
            let chunk = [
                data.rank.toString(),
                CB(data.party.members[0].handle),
                data.points.toString(),
                hacks
            ];


            let results = map(data.problemResults, (result) => {

                if( result.points === 0 && result.rejectedAttemptCount > 0 ){
                    return RB(`-${result.rejectedAttemptCount.toString()}`);
                }
                else if( result.points === 0 && result.rejectedAttemptCount === 0 ){
                    return '';
                }

                let subSecond = duration(result.bestSubmissionTimeSeconds, 'seconds');
                let h = parseInt(subSecond.hours(),10);
                let s = parseInt(subSecond.minutes(),10);
                let subTime = `${Math.floor(h/10)}${h%10}:${Math.floor(s/10)}${s%10}`;

                return ` ${result.points.toString()}\n${subTime}`;
            });

            table.push(chunk.concat(results));
        });
};

/**
 * Generate API url from given parameters
 * @param {Object} options
 * @returns {string} - generated url
 */
function generateUrl(options) {

    let param = {
        contestId: options.contestId,
        count: options.count,
        from: options.from,
        showUnofficial: options.unofficial,
    };

    let { handles } = options;
    if( isArray(handles) && handles.length ){
        param['handles'] = join(handles,';');
    }
    else if( typeof handles === 'string' ){
        handles = split(handles,',');
        param['handles'] = join(handles,';');
    }

    let sp = qs.stringify(param,{ encode: false });

    return `http://codeforces.com/api/contest.standings?${sp}`;
}
