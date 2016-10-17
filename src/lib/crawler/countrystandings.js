'use strict';

import request from 'request';
import debug from 'debug';
import cheerio from 'cheerio';
import Table from 'cli-table2';
import chalk from 'chalk';
import _ from 'lodash';
import { whilst } from 'async';

var debugs = debug('CF:standings:c');
var GB = chalk.bold.green;
var CB = chalk.bold.cyan;
var RB = chalk.bold.red;

export default (options) => {

    if( !_.has(options,'contestId') || !_.has(options,'country') ){
        console.log("parameters required");
        process.exit(1);
    }

    let { contestId, country } = options;

    let headers = {
        "Host": "codeforces.com",
        "Upgrade-Insecure-Requests": 1,
        "User-Agent": "Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.143 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.8"
    };

    let reqOptions = {
        uri: '',
        headers: headers
    };


    let table = new Table();
    var total = 54;
    var totalPage = 5;
    var count = 0;
    var page = 1;

    let contestName = "";

    whilst(
        () => {
            return count < total && page <= totalPage;
        },
        (next) => {

            reqOptions.uri =  `http://codeforces.com/contest/${contestId}/standings//page/${page}`;

            debugs(`Fetching from page ${page}...`);

            request.get(reqOptions, (err, response, body) => {

                if(err){
                    return next(err);
                }

                let { statusCode } = response;

                if( statusCode!==200 ){
                    return next('HTTP error');
                }

                var $ = cheerio.load(body, {decodeEntities: true});
                let standings = $('table.standings .standings-flag');

                standings = _.filter(standings, (stdng) => {
                    return $(stdng).attr('title') === country;
                });

                _.forEach(standings, (standing) => {

                    let allData = $(standing).parent().parent().children();
                    let data = [(count+1).toString()];

                    _.forEach(allData, (info, key) => {

                        let val = _.replace( $(info).text(), /\s\s+/g , '' );

                        switch (key){
                            case 0:
                                break;
                            case 1:
                                val = CB(val);
                                break;
                            case 2:
                                break;
                            case 3:
                                if( val.indexOf('+') !== -1  ){
                                    val = GB(val);
                                }
                                else if( val.indexOf('-') !== -1 ){
                                    val = RB(val);
                                }
                                break;
                            default:
                                if( val.indexOf(':') !== -1 ){
                                    val = splitPenalty(val, val.length - 5);
                                }
                                else{
                                    val = RB(val);
                                }
                        }

                        data.push( val );
                    });
                    count++;
                    table.push( data );
                });


                if( page === 1 ){
                    contestName = _.replace( $('.contest-name a').text() , /\s\s+/g , '' );
                    let pg = $('.page-index');
                    let indxes = pg.length;
                    if( indxes ){
                        pg = pg[indxes-1];
                        totalPage = parseInt( $(pg).attr('pageindex') );
                        debugs(`Total page: ${totalPage}`);
                    }
                }

                page++;
                return next();
            });
        },
        function (err, n) {

            if(err){
                console.log(err);
                process.exit(1);
            }

            let totalProblem = table[0].length - 5;
            let problemChar = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
            let head = [ GB('#'), GB('Rank'), GB('Who'), GB('#'), GB('*') ];
            head = head.concat( _.slice( problemChar, 0, totalProblem).map( x => {
                return GB(x);
            }));
            table.options.head = head;


            console.log();
            console.log(CB(`Contest: ${contestName}`));
            console.log(CB(`Country: ${country}`));
            console.log(table.toString());

            process.exit(0);

        }
    );
}



/**
 * http://stackoverflow.com/questions/16441770/split-string-in-two-on-given-index-and-return-both-parts
 * @param value
 * @param index
 * @returns {string}
 */
function splitPenalty(value, index) {
    return ` ${value.substring(0, index)}\n${value.substring(index)}`;
}