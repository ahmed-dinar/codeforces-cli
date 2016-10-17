'use strict';

import JSONStream from 'JSONStream';
import debug from 'debug';
import request from 'request';
import ora from 'ora';
import Table from 'cli-table2';
import chalk from 'chalk';
import { line } from 'cli-spinners';
import qs from 'qs';
import * as contrib from 'blessed-contrib';
import blessed from 'blessed';
import striptags from 'striptags';

var debugs = debug('CF:userrating');
var spinner = ora({
    text: 'Loading data...',
    spinner: line
});


/**
 * Get and print user rating of all contests
 *
 * @param handle
 *         - user codefroces handle
 * @param noChart
 *          - if true display table insted of chart
 */
export default (handle = '', noChart = false) => {

    let reqOptions = {
        uri: ``,
        json: true
    };

    let qsf = qs.stringify({ handle: handle });
    reqOptions.uri = `http://codeforces.com/api/user.rating?${qsf}`;

    debugs(reqOptions.uri);

    //
    // Request validators
    //
    let apiFailed= false;
    let apiMsg = '';
    let responseCode = '404';
    let contentType = '';


    //
    // default chart view, only need newRating data
    //
    let jStream = JSONStream.parse('result.*.newRating');

    //
    // Chart's x axis and y axis data
    //
    var axisX = [];
    var axisY = [];

    //
    // No chart,Get all result and make a table.
    // using already declared 'axisX' variable
    //
    if( noChart ){
        jStream = JSONStream.parse('result.*');
        axisX = new Table({
            head: [
                chalk.bold.cyan('Contest'),
                chalk.bold.cyan('Rank'),
                chalk.bold.cyan('Rating change'),
                chalk.bold.cyan('New rating')
            ]
            // colWidths: [60, 10, 10, 10],
            //  wordWrap:true
        });
    }

    spinner.text = "Loading rating...";
    spinner.start();

    request
        .get(reqOptions)
        .on('error', (err) => {

            debugs(`Failed: Request error`);
            debugs(err);

            console.log('Failed [Request]');

            process.exit(1);
        })
        .on('complete', () => {

            debugs('parsing completed');

            if( responseCode !== 200 ){
                spinner.fail();
                console.log('Failed.');
                return process.exit(1);
            }

            if( contentType.indexOf('application/json') === -1 ){
                spinner.fail();
                console.log('Failed.Not valid data.');
                return process.exit(1);
            }

            if( apiFailed ){
                spinner.fail();
                console.log(apiMsg);
                return process.exit(1);
            }

            spinner.succeed();

            //
            // Show table
            //
            if (noChart) {

                console.log();
                console.log(chalk.bold.green(` User: ${handle}`));
                console.log(chalk.bold.green(` Total contest: ${axisX.length}`));
                console.log(axisX.toString());

                process.exit(0);
            }

            //
            // Show fancy chart
            //
            showLineChart(axisX,axisY);

        })
        .on('response', (response) => {

            responseCode = response.statusCode;
            contentType = response.headers['content-type'];

            debugs(`HTTP Code: ${responseCode}`);
            debugs(`Content-Type: ${contentType}`);
        })
        .pipe( jStream )
        .on('header', (data) => {

            debugs(`API Status: ${data.status}`);

            if( data.status !== 'OK' ){
                apiFailed = true;
                apiMsg = data.comment;
            }
        })
        .on('data', (data) => {

            // debugs('data received');

            if( noChart ){
                axisX.push([
                    striptags(data.contestName.toString()),
                    data.rank,
                    (parseInt(data.newRating) - parseInt(data.oldRating)).toString(),
                    data.newRating
                ]);
            }else{
                axisY.push(data);
                axisX.push(data.toString());
            }
        });
}



/**
 * Show user rating chart
 *
 * @param axisX - x axis data (constest ratings)
 * @param axisY - y axis data (constest ratings)
 */
function showLineChart(axisX,axisY) {

    let screen = blessed.screen();

    let chartLine = contrib.line({
        style: {
            line: "white",
            text: "green",
            baseline: "black"
        },
        width: "100%",
        height: "80%",
        top: 3,
        showLegend: false,
        wholeNumbersOnly: false,
        label: ''
    });


    let chartData = {
        x: axisX,
        y: axisY
    };

    screen.append(chartLine);
    chartLine.setData([chartData]);

    //
    // Exit when press esc, q or ctrl+c
    //
    screen.key(['escape', 'q', 'C-c'], function(ch, key) {
        return process.exit(0);
    });

    screen.render();
}