'use strict';

import request from 'request';
import debug from 'debug';
import Table from 'cli-table2';
import chalk from 'chalk';
import has from 'has';
import { isArray, join , split, forEach } from 'lodash';
import qs from 'qs';
import ora from 'ora';
import { log, logr } from '../helpers';

var debugs = debug('CF:userinfo');
var spinner = ora({ spinner: 'line' });
const GB = chalk.bold.green;

/**
 * @param handles
 */
export default (handles) => {

    let invalidHandle = !isArray(handles) && typeof handles !== 'string';
    if( invalidHandle ){
        throw new Error('handles must be array or string');
    }

    let reqOptions = {
        uri: '',
        json: true
    };

    let handlesString = handles;
    if( isArray(handles) ){
        handlesString = join(handles,';');
    }
    else if( handles.indexOf(',') !== -1 ){
        handlesString = split(handles,',');
        handlesString = join(handlesString,';');
    }

    let qsf = qs.stringify({ handles: handlesString }, { encode: false });
    reqOptions.uri = `http://codeforces.com/api/user.info?${qsf}`;

    debugs('Fetching user data...');
    spinner.text = 'fetching user info...';
    spinner.start();

    request.get(reqOptions, (error, response, body) => {

        if(error){
            spinner.fail();
            return logr(error);
        }

        let { statusCode } = response;
        if( statusCode !== 200 ){
            spinner.fail();
            return logr( has(body,'comment') ? body.comment : `HTTP failed with status ${statusCode}`);
        }

        if( body.status !== 'OK' ){
            spinner.fail();
            return logr(body.comment);
        }
        spinner.succeed();

        let table = new Table({
            head: [ GB('Name'), GB('Handle'), GB('Rank'), GB('Rating'), GB('Max'), GB('Contrib.'), GB('Country'), GB('Organization') ]
        });

        forEach(body.result, (data) => {

            let name = '';
            if( has(data,'firstName') && has(data,'lastName') ){
                name = `${data.firstName} ${data.lastName}`;
            }

            let info = [
                name,
                data.handle || '',
                data.rank || '0',
                data.rating || '',
                data.maxRating || '',
                data.contribution || '',
                data.country || '',
                data.organization || ''
            ];
            table.push(info);
        });

        log('');
        log(table.toString());
    });
};