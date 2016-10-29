'use strict';

import JSONStream from 'JSONStream';
import debug from 'debug';
import request from 'request';
import ora from 'ora';
import has from 'has';
import _ from 'lodash';
import Table from 'cli-table2';
import chalk from 'chalk';
import { log, logr } from '../helpers';

var debugs = debug('CF:tags');
var spinner = ora({ spinner: 'line' });

/**
 * Get all tags and quantity
 * @param callback - if callback given, return tags, otherwise print
 */
export default (callback) => {

    let reqOptions = {
        uri: 'http://codeforces.com/api/problemset.problems',
        json: true
    };

    let apiMsg = null;
    let responseCode = 404;
    let contentType = '';
    let allTags = {};
    let isCallback = typeof callback === 'function';

    spinner.text = 'Fetching all tags...';
    spinner.start();

    let reqStream = request.get(reqOptions);
    let jsonStream = reqStream.pipe( JSONStream.parse('result.problems.*') );

    reqStream.on('error', (err) => {
        debugs('Failed: Request error');
        debugs(err);

        return isCallback ? callback(err) : logr('Request connection Failed.');
    });


    reqStream.on('complete', () => {
        debugs('parsing completed');

        if( responseCode !== 200 ){
            spinner.fail();
            apiMsg = apiMsg || `HTTP Failed with status: ${responseCode}`;
            return isCallback ? callback(apiMsg) : logr(apiMsg);
        }

        // Content not json, request failed
        if( contentType.indexOf('application/json;') === -1 ){
            spinner.fail();
            apiMsg = 'Failed.Not valid data.';
            return isCallback ? callback(apiMsg) : logr(apiMsg);
        }

        // API rejects the request
        if( apiMsg ){
            spinner.fail();
            return isCallback ? callback(apiMsg) : logr(apiMsg);
        }
        spinner.succeed();
        
        if(isCallback){
            return callback(null,allTags);
        }
        
        // Sort tags by problem count, need to update if better way
        allTags = _
                .chain(allTags)
				.map((value, key) => {
                    return {key, value};
                })
				.orderBy('value')
                .reverse()
                .keyBy('key')
                .mapValues('value')
                .value();

        let table = new Table({
            head: [ chalk.green('TAG'), chalk.green('Total Problem')]
        });

        _.forEach(allTags, (value, key) => {
            table.push([key, value]);
        });

        log('');
        log(chalk.bold.green(` Total tag: ${table.length}`));
        log(table.toString());
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
            apiMsg = data.comment || 'Unknown Error?';
        }
    });


    jsonStream.on('data', (data) => {
        if( has(data,'tags') ) {
            _.forEach(data.tags, (tag) => {
                if (has(allTags, tag)) {
                    allTags[tag]++;
                } else {
                    allTags[tag] = 1;
                }
            });
        }
    });
};
