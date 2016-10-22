
export default {
	typeId: {
		'10': 'GNU GCC 5.1.0',
		'43': 'GNU GCC C11 5.1.0',
		'1': 'GNU G++ 5.1.0',
		'42': 'GNU G++11 5.1.0',
		'50': 'GNU G++14 6.2.0',
		'2': 'Microsoft Visual C++ 2010',
		'9': 'C# Mono 3.12.1.0',
		'29': 'MS C# .NET 4.0.30319',
		'28': 'D DMD32 v2.069.2',
		'32': 'Go 1.5.2',
		'12': 'Haskell GHC 7.8.3',
		'36': 'Java 1.8.0_66',
		'48': 'Kotlin 1.0.1',
		'19': 'OCaml 4.02.1',
		'3': 'Delphi 7',
		'4': 'Free Pascal 2.6.4',
		'13': 'Perl 5.20.1',
		'6': 'PHP 5.4.42',
		'7': 'Python 2.7.10',
		'31': 'Python 3.5.1',
		'40': 'PyPy 2.7.10 (2.6.1)',
		'41': 'PyPy 3.2.5 (2.4.0)',
		'8': 'Ruby 2.0.0p645',
		'49': 'Rust 1.10',
		'20': 'Scala 2.11.7',
		'34': 'JavaScript V8 4.8.0',
		'14': 'ActiveTcl 8.5',
		'15': 'Io-2008-01-07 (Win32)',
		'17': 'Pike 7.8',
		'18': 'Befunge',
		'22': 'OpenCobol 1.0',
		'25': 'Factor',
		'26': 'Secret_171',
		'27': 'Roco',
		'33': 'Ada GNAT 4',
		'38': 'Mysterious Language',
		'39': 'FALSE',
		'44': 'Picat 0.9',
		'45': 'GNU C++11 5 ZIP',
		'46': 'Java 8 ZIP',
		'47': 'J'
	},
	extensions: {
		'c': '10',
		'cpp': '1',
		'cc': '50',
		'java': '36',
		'py': '31',
		'cs': '29',
		'go': '32',
		'hs': '12',
		'ml': '19',
		'pas': '4',
		'php': '6',
		'js': '34',
		'pl': '13',
		'rb': '8',
		'rs': '49',
		'scala': '20',
		'sc': '20'
	},
	getExtension (language = 'text') {

		if( language.toLowerCase().indexOf('c++') !== -1 || language.toLowerCase().indexOf('g++') !== -1 ){
			return 'cpp';
		}
		if( language.toLowerCase().indexOf('gcc') !== -1 ){
			return 'c';
		}
		if( language.toLowerCase().indexOf('java') !== -1 ){
			return 'java';
		}
		if( language.toLowerCase().indexOf('python') !== -1 ){
			return 'py';
		}
		if( language.toLowerCase().indexOf('pascal') !== -1 ){
			return 'pas';
		}
		if( language.toLowerCase().indexOf('ruby') !== -1 ){
			return 'rb';
		}
		if( language.toLowerCase().indexOf('c#') !== -1 ){
			return 'cs';
		}
		if( language.toLowerCase().indexOf('perl') !== -1 ){
			return 'pl';
		}
		if( language.toLowerCase().indexOf('scala') !== -1 ){
			return 'sc';
		}
		if( language.toLowerCase().indexOf('php') !== -1 ){
			return 'php';
		}
		if( language.toLowerCase().indexOf('go') !== -1 ){
			return 'go';
		}
		if( language.toLowerCase().indexOf('haskell') !== -1 ){
			return 'hs';
		}
		return language;
	}
};
