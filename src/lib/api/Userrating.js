'use strict';

import request from 'request';
import ora from 'ora';
import Table from 'cli-table2';
import chalk from 'chalk';
import qs from 'qs';
import forEach from 'lodash/forEach';
import * as contrib from 'blessed-contrib';
import blessed from 'blessed';
import striptags from 'striptags';
import { log, logr } from '../helpers';

var spinner = ora({ spinner: 'line' });
var CB = chalk.bold.cyan;


export default class Userrating {

    /**
     * Get and print user rating of all contests
     * @param {String} handle - user codefroces handle
     * @param {boolean} noChart - if true display table insted of chart
     */
    constructor(handle = null, noChart = false){

        if (handle === null || typeof handle !== 'string') {
            throw new Error('handle should be string and should not be empty or null');
        }

        this.handle = handle;
        this.noChart = noChart;
    }


    getRating() {

        let self = this;

        let qsf = qs.stringify({ handle: self.handle });
        let reqOptions = {
            uri: `http://codeforces.com/api/user.rating?${qsf}`,
            json: true
        };

        spinner.text = 'Fetching rating...';
        spinner.start();

        request.get(reqOptions, (err, response, body) => {

            if (err) {
                spinner.fail();
                logr('Failed [Request]');
                return;
            }

            if (response.statusCode !== 200) {
                spinner.fail();
                logr('Failed HTTP');
                return;
            }

            let contentType = response.headers['content-type'];
            if (contentType.indexOf('application/json') === -1) {
                spinner.fail();
                logr('Failed.Not valid data.');
                return;
            }

            if (body.status !== 'OK') {
                spinner.fail();
                logr(body.comment);
                return;
            }

            spinner.succeed();

            if ( self.noChart ) {

                let table = new Table({
                    head: [CB('Contest'), CB('Rank'), CB('Rating change'), CB('New rating')]
                });

                forEach(body.result, (data) => {
                    table.push([
                        striptags(data.contestName.toString()),
                        data.rank,
                        (parseInt(data.newRating, 10) - parseInt(data.oldRating, 10)).toString(),
                        data.newRating
                    ]);
                });

                log(table.toString());
                return;
            }

            let axisX = [];
            let axisY = [];
            forEach(body.result, (data) => {
                axisY.push(data.newRating);
                axisX.push(data.newRating.toString());
            });

            this.showLineChart(axisX, axisY);
        });
    }


    /**
     * Show user rating chart
     * @param {Array} axisX - x axis data (constest ratings)
     * @param {Array} axisY - y axis data (constest ratings)
     */
    showLineChart(axisX, axisY) /* istanbul ignore next  */ {

        let screen = blessed.screen();

        let chartLine = contrib.line({
            style: {
                line: 'white',
                text: 'green',
                baseline: 'black'
            },
            width: '100%',
            height: '80%',
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
        screen.key(['escape', 'q', 'C-c'], function (ch, key) {
            return process.exit(0);
        });

        screen.render();
    }
}


