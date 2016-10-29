'use strict';

import path from 'path';
import has from 'has';
import forEach from 'lodash/forEach';
import jsonfile from 'jsonfile';
import inquirer from 'inquirer';
import qs from 'qs';
import request from 'request';
import debug from 'debug';
import chalk from 'chalk';
import Table from 'cli-table2';
import ora from 'ora';
import { waterfall, whilst } from 'async';
import verdicts from '../verdicts';
import { log, logr, getHomeDir, validateEmpty, clear } from '../helpers';


var debugs = debug('CF:submission');
var spinner = ora({ spinner: 'line' });
var GN = chalk.green;
var GB = chalk.bold.green;
var RB = chalk.bold.red;

var TIME_OUT = 30000; //30 seconds
var STATUS_DELAY = 5000; //5 seconds


 /**
 * @param {Number} count - total submisison to fetch
 * @param {Boolean} remember - if true, save handle in config file
 * @param {Boolean} watch - if true, fetch submission until testing done
 * @param {Boolean} contest - if true then a contestId must exists and fetch only contest submissions
 * @param {Number} contestId - contest id of submission
 * @param {Number} delay - live watch refresh delay [in milliseconds]
 * @param {Function} callback
 */
export default ({ count = 1, remember = false, watch = false, contest = false, contestId = null, delay = STATUS_DELAY, callback = null } = {}) => {

    let options = { count, watch, remember, contest, contestId, delay };

    options.config = path.resolve(`${getHomeDir()}/.cfconfig`);

    /* istanbul ignore else  */
    if( options.delay >= 2000 ){
        STATUS_DELAY = options.delay;
    }

    waterfall([
        (next) => {
            readConfig(options, next);
        },
        getSubmission
    ],(err) => {

        if( typeof callback === 'function' ){
            spinner.stop();
            return callback(err);
        }

        /* istanbul ignore else  */
        if(err){
            spinner.fail();
            logr(err);
        }
    });
};


/**
 * Reading config file and search saved credentials
 * @param {Object} options
 * @param {Function} next
 */
function readConfig(options, next) {

    spinner.text = 'Reading config file...';
    spinner.start();

    jsonfile.readFile(options.config, (err, obj) => {

        let askHandle = false;
        if( err ){

            if( err.code === 'EPERM' ){
                throw new Error(`Permission denied.Can't read config file '${options.config}'`);
            }

            if( err.code !== 'ENOENT' ){
                return next(err);
            }

            debugs('Config file not found');
            askHandle = true;
        }
        spinner.stop();

        if( askHandle || !has(obj,'user') ){

            let credentials = [{
                name: 'handle',
                message: 'handle: ',
                validate: validateEmpty
            }];

            return inquirer.prompt(credentials).then( (answer) => {
                options.handle = answer.handle;
                jsonfile.writeFileSync(options.config, { user: options.handle });//save handle

                return next(null, options);
            });
        }

        spinner.text = `Saved handle found '${obj.user}'`;
        spinner.succeed();

        options.handle = obj.user;
        return next(null, options);
    });
}


/**
 * Get submission status and exit
 * @param {Object} options
 * @param {Function} next
 */
function getSubmission(options, next) {

    //go to live submssion status
    if( options.watch ){
        return watchRun(options,next);
    }

    let url = generateUrl(options);
    debugs(`URL = ${url}`);

    let reqOptions = {
        uri: url,
        json: true,
        timeout: TIME_OUT
    };

    spinner.text = 'Fetching submissions..';
    spinner.start();

    request
        .get(reqOptions, (error, response, body) => {

            if(error){
                return next(error);
            }

            let { statusCode } = response;
            if( statusCode!==200 ){
                return next( has(body,'comment') ? body.comment : `HTTP failed with status ${statusCode}`);
            }

            if( body.status !== 'OK' ){
                return next(body.comment);
            }

            spinner.succeed();
            generateTable(body.result);

            return next();
        });
}


/**
 * Getting submission status until testing done
 * @param {Object} options
 * @param {Function} next
 */
function watchRun(options, next) {

    let url = generateUrl(options);
    debugs(url);

    let reqOptions = {
        uri: url,
        json: true,
        timeout: TIME_OUT
    };

    var keepWatching = true;
    whilst(
	    () => {
		    return keepWatching;
	    },
        (callback) => {

            spinner.text = 'Refreshing..';
            spinner.start();

            request
                .get(reqOptions, (error, response, body) => {

                    if(error){
                        return callback(error);
                    }

                    let { statusCode } = response;
                    if( statusCode !== 200 ){
                        return next( has(body,'comment') ? body.comment : `HTTP failed with status ${statusCode}`);
                    }

                    if( body.status !== 'OK' ){
                        return callback(body.comment);
                    }

                    spinner.succeed();
                    keepWatching = generateTable(body.result, true);

                    //
                    // Still testing, Wait x seconds and get status again
                    //
                    if( keepWatching ) {
                        return setTimeout(() => {
                            callback();
                        }, STATUS_DELAY);
                    }

                    return callback();
                });
        },
        next
    );
}


/**
 * Generate and print table
 * @param {Object} runs - submission object
 * @param {boolean} isWatch
 * @returns {boolean} - if still running return true for watch
 */
function generateTable(runs, isWatch = false){

    let table = new Table({
        head: [ GN('Id'), GN('Problem') , GN('Lang'), GN('Verdict'), GN('Time'), GN('Memory') ]
    });

    let done = true;
    let who = '';

    forEach(runs, (run) => {

        let { id, contestId, problem, programmingLanguage,verdict, passedTestCount, timeConsumedMillis, memoryConsumedBytes, author } = run;
        let memory = parseInt(memoryConsumedBytes,10) / 1000;
        let passed = parseInt(passedTestCount,10);
        who = author.members[0].handle;

        if( verdict === undefined || typeof verdict != 'string' ){
            done = false;
            verdict = chalk.white.bold('In queue');
        }
        else{
            switch (verdict){
                case 'TESTING':
                    done = false;
                    verdict = chalk.white.bold(verdicts[verdict]);
                    break;
                case 'OK':
                    verdict = GB(verdicts[verdict]);
                    break;
                case 'RUNTIME_ERROR':
                case 'WRONG_ANSWER':
                case 'PRESENTATION_ERROR':
                case 'TIME_LIMIT_EXCEEDED':
                case 'MEMORY_LIMIT_EXCEEDED':
                case 'IDLENESS_LIMIT_EXCEEDED':
                    verdict = RB(`${verdicts[verdict]} on test ${passed+1}`);
                    break;
                default:
                    verdict = RB(verdicts[verdict]);
            }
        }

        table.push([
            id,
            `${contestId}${problem.index} - ${problem.name}`,
            programmingLanguage,
            verdict,
            `${timeConsumedMillis} MS`,
            `${memory} KB`
        ]);
    });

    // in live watching mode, clear console in every refresh
    if( isWatch ){
        clear();
    }

    log('');
    log(GB(`User: ${who}`));
    log(table.toString());

    return !done;
}


/**
 * Generate submission status url
 * @param options
 * @returns {string}
 */
function generateUrl(options) {

    if( options.contest ){
        let params = qs.stringify({
            handle: options.handle,
            from: 1,
            count: options.count,
            contestId: options.contestId
        }, { encode: false });
        return `http://codeforces.com/api/contest.status?${params}`;
    }

    let params = qs.stringify({
        handle: options.handle,
        from: 1,
        count: options.count
    }, { encode: false });

    return `http://codeforces.com/api/user.status?${params}`;
}