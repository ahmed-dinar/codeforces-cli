'use strict';

import request from 'request';
import debug from 'debug';
import cheerio from 'cheerio';
import Table from 'cli-table2';
import chalk from 'chalk';
import _ from 'lodash';
import qs from 'qs';

var debugs = debug('CF:standings:c');
var GB = chalk.bold.green;
var CB = chalk.bold.cyan;
var RB = chalk.bold.red;


export default (options) => {

    if( !_.has(options,'country') ){
        console.log("country parameters required");
        process.exit(1);
    }

    let { country } = options;
    let withOrg = false;

    if( _.has(options,'withOrg') && options.withOrg ){
        withOrg = true;
    }

    let headers = {
        "Host": "codeforces.com",
        "Upgrade-Insecure-Requests": 1,
        "User-Agent": "Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.143 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.8"
    };

    let reqOptions = {
        uri: `http://codeforces.com/ratings/country/${country}`,
        headers: headers
    };

    debugs(`Fetching ratings of ${country}...`);

    request.get(reqOptions, (err, response, body) => {

        if(err){
            console.log(err);
            process.exit(1);
        }

        let { statusCode } = response;

        if( statusCode!==200 ){
            console.log('HTTP error');
            process.exit(1);
        }

        var $ = cheerio.load(body, {decodeEntities: true});
        let ratings = $('div.ratingsDatatable tr');

        let table = new Table({
            head: [ GB('#') ,GB(`Rank`), GB(`Who`), GB(`Title`), GB(`Contests`), GB(`Rating`) ]
        });

        _.forEach(ratings, (rating, key) => {
                if(key === 0){ return; }

                rating = $(rating).children();
                let info = [ (key).toString() ];
                _.forEach(rating, function (data, indx) {
                    let inf =  _.replace( $(data).text(), /\s\s+/g , '' );
                    let title = '';

                    if( indx === 1 ){

                        title = $(data).find($('.rated-user')).attr('title');
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

        console.log();
        console.log(CB(`Country: ${country}`));
        console.log(table.toString());

        process.exit(0);
    });
}


/**
 *
 * @param table
 */
function getOrg(table, country) {

    let rOptions = {
        uri: "",
        json: true
    };

    let handles = _.map(table, (info) => {
        return info[2];
    }).join(';');

    let qsf = qs.stringify({ handles: handles }, { encode: false });
    rOptions.uri = `http://codeforces.com/api/user.info?${qsf}`;

    debugs(`Fetching user data...`);

    request
        .get(rOptions, (error, response, body) => {

            if(error){
                console.log(error);
                process.exit(1);
            }

            let { statusCode } = response;

            if( statusCode!==200 ){
                console.log('HTTP error');
                process.exit(1);
            }

            if( body.status !== 'OK' ){
                console.log(body.comment);
                process.exit(1);
            }

            _.forEach(body.result, (data,key) => {
               // table[key].push(`${data.firstName} ${data.lastName}`);
              //  table[key].push(data.maxRating);
               // table[key].push(data.contribution);
                table[key].push(data.organization);
            });

            table.options.head.push(GB(`Organization`));

            console.log();
            console.log(CB(`Country: ${country}`));
            console.log(table.toString());

            process.exit(0);
        });
}