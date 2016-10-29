'use strict';

import JSONStream from 'JSONStream';
import debug from 'debug';
import request from 'request';
import has from 'has';
import forEach from 'lodash/forEach';
import Table from 'cli-table2';
import chalk from 'chalk';
import ora from 'ora';
import qs from 'qs';
import waterfall from 'async/waterfall';
import { log, logr } from '../helpers';
import tags from './tags';

var spinner = ora({ spinner: 'line' });
var debugs = debug('CF:usertags');
const CB = chalk.cyan.bold;
const PROGRESS_WIDTH = 20;


/**
 * First fetch all  user tags status and then all available tags , calculate and concat user tags progress
 * @param {String} handle - user handle
 */
export default ({ handle = null } = {}) => {

    if( handle === null || typeof handle !== 'string' ){
        throw new Error('handle should be string and should not be empty or null');
    }

    /* istanbul ignore next  */
    waterfall([
        (next) => {
            getUserTags(handle, next);
        },
        (userTags, totalSubmissions, totalAccepted, next) => {
            tags((error,allTags) => {
                if(error){
                    return next(error);
                }
                printTable(allTags, userTags, totalSubmissions, totalAccepted, handle);
                return next();
            });
        }
    ], (err, result) => {
        if(err){
            logr(err);
        }
    });
};


/**
 * Fetch tags of accepted problems solved by the user
 * @param {String} handle - user handle
 * @param callback
 */
/* istanbul ignore next  */
function getUserTags(handle, callback) {

    let reqOptions = {
        uri: '',
        json: true
    };

    let par = qs.stringify({ handle: handle },{ encode: false });
    reqOptions.uri = `http://codeforces.com/api/user.status?${par}`;

    let apiFailed= false;
    let apiMsg = null;
    let responseCode = 404;
    let contentType = '';
    let totalSubmissions = 0;
    let totalAccepted = 0;
    let userTags = new Map();

    spinner.text = 'Fetching user tags...';
    spinner.start();

    let reqStream = request.get(reqOptions);
    let jsonStream = reqStream.pipe( JSONStream.parse('result.*') );

    reqStream.on('error', (err) => {
        debugs('Failed: Request error');
        debugs(err);

        return callback(err);
    });

    reqStream.on('complete', () => {
        debugs('parsing completed');

        if( responseCode !== 200 ){
            spinner.fail();
            return callback(apiMsg || `HTTP failed with status ${responseCode}`);
        }

        if( contentType.indexOf('application/json;') === -1 ){
            spinner.fail();
            return callback('Failed.Invalid data.');
        }

        if( apiFailed ){
            spinner.fail();
            return callback(apiMsg);
        }
        spinner.succeed();

        return callback(null, userTags, totalSubmissions, totalAccepted);
    });


    reqStream.on('response', (response) => {
        debugs(`HTTP Code: ${responseCode}`);
        debugs(`Content-Type: ${contentType}`);

        responseCode = response.statusCode;
        contentType = response.headers['content-type'];
    });


    jsonStream.on('header', (data) => {
        debugs(`API Status: ${data.status}`);

        if( data.status !== 'OK' ){
            apiFailed = true;
            apiMsg = data.comment;
        }
    });


    jsonStream.on('data', (data) => {
        totalSubmissions++;

        if( has(data,'problem') && data.verdict === 'OK' ) {
            totalAccepted++;

            let prob = `${data.problem.contestId}${data.problem.index}`;
            let problemTags = data.problem.tags;

            forEach(problemTags, (tag) => {
                if( userTags.has(tag) ){
                    let mySet = userTags.get(tag);
                    mySet.add(prob);
                    userTags.set(tag, mySet);
                }
                else{
                    let mySet = new Set();
                    mySet.add(prob);
                    userTags.set(tag,mySet);
                }
            });
        }
    });
}


/**
 * print user solved problem's tag status in console table
 * @param {Array} allTags - All tags list and count of codeforces
 * @param {Map} userTags - user solved problems tags
 * @param {Number} totalSubmissions - by the user
 * @param {Number} totalAccepted - by the user
 * @param {String} handle - the user handle
 */
/* istanbul ignore next  */
function printTable(allTags, userTags, totalSubmissions, totalAccepted, handle) {

    let table = new Table({
        head: [ CB('TAG'), CB('Total Problem'), CB('Solved'), CB('%'), CB('Progress') ]
    });

    let completeColor = `${chalk.styles.bgGreen.open} ${chalk.styles.bgGreen.close}`;
    let incompleteColor = `${chalk.styles.bgBlack.open} ${chalk.styles.bgBlack.close}`;

    forEach(allTags, (value,tag) => {

        if( userTags.has(tag) && userTags.get(tag).size > 0 ){

            let userTotal = userTags.get(tag).size;
            let ratio = parseInt(userTotal,10) / parseInt(value,10);
            ratio = Math.min(Math.max(ratio, 0), 1);
            let percent = ratio * 100;

            let comLenght = Math.round(PROGRESS_WIDTH * ratio);
            let incomLenght = PROGRESS_WIDTH - comLenght;

            let bar = '';
            for (let i = 0; i < comLenght; i++) {
                bar += completeColor;
            }
            for (let i = 0; i < incomLenght; i++) {
                bar += incompleteColor;
            }

            table.push([tag, value, userTotal, `${percent.toFixed(0)}%`, bar]);
        }
        else{
            let bar = '';
            for(let i=0; i<PROGRESS_WIDTH; i++){
                bar += incompleteColor;
            }
            table.push([tag, value, 0, '0%', bar]);
        }
    });

    //
    // Sort table by percentage
    //
    table = table.sort( (a,b) => {
        let p1 = (parseInt(a[2],10)*100) / parseInt(a[1],10);
        let p2 = (parseInt(b[2],10)*100) / parseInt(b[1],10);
        return p2 - p1;
    });

    log('');
    log(chalk.bold.green(` User: ${handle}`));
    log(chalk.green(` Total Submissions: ${totalSubmissions}`));
    log(chalk.green(` Total Accepted: ${totalAccepted}`));
    log(table.toString());
}