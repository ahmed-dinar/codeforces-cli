'use strict';

import _ from 'lodash';
import Table from 'cli-table2';
import chalk from 'chalk';
import { log } from '../helpers';
import countries from '../countries';
import languages from '../languages';

var GB = chalk.green.bold;

export default {

	countrs() {

		let table = new Table({
			head: [GB('Country')]
		});

		_.forEach(countries, (country) => {
			table.push([country]);
		});

		log('');
		log(table.toString());
	},
	exts() {

		let table = new Table({
			head: [GB('Language'), GB('Extension')]
		});

		_.forEach(languages.extensions, (typeId, extension) => {
			table.push([languages.typeId[typeId], `.${extension}`]);
		});

		log('');
		log(table.toString());
	},
	langs() {

		let table = new Table({
			head: [GB('Language'), GB('Id')]
		});

		_.forEach(languages.typeId, (language, typeId) => {
			table.push([language, typeId]);
		});

		log('');
		log(table.toString());
	}
};