'use strict';

import request from 'request';
import debug from 'debug';
import Table from 'cli-table2';
import chalk from 'chalk';
import _ from 'lodash';
import qs from 'qs';
import { line } from 'cli-spinners';
import ora from 'ora';
import { log, logr } from '../helpers';

var debugs = debug('CF:userinfo');
var spinner = ora({ spinner: line });
var GB = chalk.bold.green;


/**
 *
 * @param handles
 */
export default (handles) => {


	let invalidHandle = !_.isArray(handles) && typeof handles !== 'string';
	if( invalidHandle ){
		throw new Error('handles must be array or string');
	}

	let reqOptions = {
		uri: '',
		json: true
	};

	let handlesString = handles;
	if( _.isArray(handles) ){
		handlesString = _.join(handles,';');
	}
	else if( handles.indexOf(',') !== -1 ){
		handlesString = _.split(handles,',');
		handlesString = _.join(handlesString,';');
	}

	let qsf = qs.stringify({ handles: handlesString }, { encode: false });
	reqOptions.uri = `http://codeforces.com/api/user.info?${qsf}`;

	debugs('Fetching user data...');
	spinner.text = 'fetching user info...';
	spinner.start();

	request
		.get(reqOptions, (error, response, body) => {

			if(error){
				spinner.fail();
				logr(error);
				return;
			}

			let { statusCode } = response;

			if( statusCode !== 200 ){
				spinner.fail();
				logr(body.comment || '  HTTP error');
				return;
			}

			if( body.status !== 'OK' ){
				spinner.fail();
				logr(`  ${body.comment}`);
				return;
			}

			spinner.succeed();

			let table = new Table({
				head: [ GB('Name'), GB('Handle'), GB('Rank'), GB('Rating'), GB('Max'), GB('Contrib.'), GB('Country'), GB('Organization') ]
			});

			_.forEach(body.result, (data) => {

				let name = '';
				if( _.has(data,'firstName') && _.has(data,'lastName') ){
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