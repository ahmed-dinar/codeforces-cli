'use strict';

import request from 'request';
import debug from 'debug';
import Table from 'cli-table2';
import chalk from 'chalk';
import _ from 'lodash';
import qs from 'qs';

var debugs = debug('CF:userinfo');
var GB = chalk.bold.green;

export default (handles) => {

    let reqOptions = {
        uri: "",
        json: true
    };

    let handlesString = _.join(handles,';');
    let qsf = qs.stringify({ handles: handlesString }, { encode: false });
    reqOptions.uri = `http://codeforces.com/api/user.info?${qsf}`;

    debugs(`Fetching user data...`);

    request
        .get(reqOptions, (error, response, body) => {

            if(error){
                console.log(error);
                process.exit(1);
            }

            let { statusCode } = response;

            if( statusCode!==200 ){
                console.log(body.comment || 'HTTP error');
                process.exit(1);
            }

            if( body.status !== 'OK' ){
                console.log(body.comment);
                process.exit(1);
            }

            let table = new Table({
                head: [ GB(`Name`), GB(`Handle`), GB(`Rank`), GB(`Rating`), GB(`Max`), GB(`Contrib.`), GB(`Country`), GB(`Organization`)  ]
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

            console.log();
            console.log(table.toString());

            process.exit(0);
        });
}