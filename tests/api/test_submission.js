import { expect } from 'chai';
import sinon from 'sinon';
import request from 'request';
var chai = require('chai');
var sinonChai = require('sinon-chai');
import jsonfile from 'jsonfile';
import inquirer from 'inquirer';
var Promise = require("bluebird");

var helpers = require('../../src/lib/helpers');
import submission from '../../src/lib/api/submission';
var beforeHelpers = require('../helpers/submission_helper');

chai.use(sinonChai);

describe('Codeforces', function() {
    describe('#submission', function() {

        describe('[No callback]', function() {
            beforeHelpers(
                { err: new MyError('Unknown'), obj: null },
                { handle: 'someHandle' },
                { err: 'reqerror', res: { statusCode: 404 }, body: null }
            );
            it('should call console.error when callback absent', function(done) {
                setTimeout(function() {
                    submission();
                    expect(helpers.logr.called).to.true;
                    done();
                });
            });
        });

        describe('[EPERM]', function() {
            beforeHelpers(
                { err: new MyError('EPERM'), obj: null },
                { handle: 'someHandle' },
                { err: 'reqerror', res: { statusCode: 404 }, body: null }
            );
            it('should throw error when reading config file permission denied', function(done) {
                expect(function () {
                    submission();
                }).to.throw(Error);
                expect(inquirer.prompt.called).to.be.false;
                expect(request.get.called).to.be.false;
                expect(helpers.logr.called).to.false;
                done();
            });
        });

        describe('[Unknown]', function() {
            beforeHelpers(
                { err: new MyError('Unknown'), obj: null },
                { handle: 'someHandle' },
                { err: 'reqerror', res: { statusCode: 404 }, body: null }
            );
            it('should return jsonfile error', function(done) {
                submission({ callback: function (err) {
                    setTimeout(function() {
                        expect(err.code).to.equal(new MyError('Unknown').code);
                        expect(inquirer.prompt.called).to.be.false;
                        expect(request.get.called).to.be.false;
                        expect(helpers.logr.called).to.false;
                        done();
                    });
                }});
            });
        });

        describe('[ENOENT]', function() {
            beforeHelpers(
                { err: new MyError('ENOENT'), obj: null },
                { handle: 'someHandle' },
                { err: 'reqerror', res: { statusCode: 404 }, body: null }
            );
            it('should ask prompt to enter handle', function(done) {
                submission({ callback: function (err) {
                    setTimeout(function() {
                        expect(inquirer.prompt.called).to.be.true;
                        expect(jsonfile.writeFileSync.called).to.be.true;
                        expect(request.get.called).to.be.true;
                        expect(helpers.logr.called).to.false;
                        done();
                    });
                }});
            });
        });

        describe('[No user]', function() {
            beforeHelpers(
                { err: null, obj: {} },
                { handle: 'someHandle' },
                { err: 'reqerror', res: { statusCode: 404 }, body: null }
            );
            it('should ask prompt to enter handle when user not in config file', function(done) {
                submission({ callback: function (err) {
                    setTimeout(function() {
                        expect(inquirer.prompt.called).to.be.true;
                        expect(jsonfile.writeFileSync.called).to.be.true;
                        expect(request.get.called).to.be.true;
                        expect(helpers.logr.called).to.false;
                        done();
                    });
                }});
            });
        });

        describe('{request.get}', function() {

            describe('[error]', function() {
                beforeHelpers(
                    { err: null, obj: { user: 'someuser' } },
                    { handle: 'someHandle' },
                    { err: 'reqerror', res: { statusCode: 404 }, body: null }
                );
                it('should not ask prompt to enter handle when user found in config file', function(done) {
                    submission({ callback: function (err) {
                        setTimeout(function() {
                            expect(inquirer.prompt.called).to.be.false;
                            expect(jsonfile.writeFileSync.called).to.be.false;
                            expect(request.get.called).to.be.true;
                            expect(helpers.logr.called).to.false;
                            done();
                        });
                    }});
                });
                it('should match request error', function(done) {
                    submission({ callback: function (err) {
                        setTimeout(function() {
                            expect(inquirer.prompt.called).to.be.false;
                            expect(jsonfile.writeFileSync.called).to.be.false;
                            expect(request.get.called).to.be.true;
                            expect(helpers.logr.called).to.false;
                            expect(err).to.equal('reqerror');
                            done();
                        });
                    }});
                });
            });

            describe('[error - watch]', function() {
                beforeHelpers(
                    { err: null, obj: { user: 'someuser' } },
                    { handle: 'someHandle' },
                    { err: 'reqerror', res: { statusCode: 404 }, body: null }
                );
                it('should not ask prompt to enter handle when user found in config file', function(done) {
                    submission({ watch: true, callback: function (err) {
                        setTimeout(function() {
                            expect(inquirer.prompt.called).to.be.false;
                            expect(jsonfile.writeFileSync.called).to.be.false;
                            expect(request.get.called).to.be.true;
                            expect(helpers.logr.called).to.false;
                            done();
                        });
                    }});
                });
                it('should match request error', function(done) {
                    submission({ callback: function (err) {
                        setTimeout(function() {
                            expect(inquirer.prompt.called).to.be.false;
                            expect(jsonfile.writeFileSync.called).to.be.false;
                            expect(request.get.called).to.be.true;
                            expect(helpers.logr.called).to.false;
                            expect(err).to.equal('reqerror');
                            done();
                        });
                    }});
                });
            });

            describe('[api error]', function() {
                beforeHelpers(
                    { err: null, obj: { user: 'someuser' } },
                    { handle: 'someHandle' },
                    { err: null, res: { statusCode: 404 }, body: { comment: 'someAPIerror'  } }
                );
                it('should match comment error', function(done) {
                    submission({ callback: function (err) {
                        setTimeout(function() {
                            expect(inquirer.prompt.called).to.be.false;
                            expect(jsonfile.writeFileSync.called).to.be.false;
                            expect(request.get.called).to.be.true;
                            expect(helpers.logr.called).to.false;
                            expect(err).to.equal('someAPIerror');
                            done();
                        });
                    }});
                });
            });

            describe('[api error - watch]', function() {
                beforeHelpers(
                    { err: null, obj: { user: 'someuser' } },
                    { handle: 'someHandle' },
                    { err: null, res: { statusCode: 404 }, body: { comment: 'someAPIerror'  } }
                );
                it('should match comment error', function(done) {
                    submission({ watch: true, callback: function (err) {
                        setTimeout(function() {
                            expect(inquirer.prompt.called).to.be.false;
                            expect(jsonfile.writeFileSync.called).to.be.false;
                            expect(request.get.called).to.be.true;
                            expect(helpers.logr.called).to.false;
                            expect(err).to.equal('someAPIerror');
                            done();
                        });
                    }});
                });
            });

            describe('[HTTP error]', function() {
                beforeHelpers(
                    { err: null, obj: { user: 'someuser' } },
                    { handle: 'someHandle' },
                    { err: null, res: { statusCode: 404 }, body: {} }
                );
                it('should match HTTP error', function(done) {
                    submission({ callback: function (err) {
                        setTimeout(function() {
                            expect(inquirer.prompt.called).to.be.false;
                            expect(jsonfile.writeFileSync.called).to.be.false;
                            expect(request.get.called).to.be.true;
                            expect(helpers.logr.called).to.false;
                            expect(err).to.equal('HTTP failed with status 404');
                            done();
                        });
                    }});
                });
            });

            describe('[HTTP error - watch]', function() {
                beforeHelpers(
                    { err: null, obj: { user: 'someuser' } },
                    { handle: 'someHandle' },
                    { err: null, res: { statusCode: 404 }, body: {} }
                );
                it('should match HTTP error', function(done) {
                    submission({ watch: true, callback: function (err) {
                        setTimeout(function() {
                            expect(inquirer.prompt.called).to.be.false;
                            expect(jsonfile.writeFileSync.called).to.be.false;
                            expect(request.get.called).to.be.true;
                            expect(helpers.logr.called).to.false;
                            expect(err).to.equal('HTTP failed with status 404');
                            done();
                        });
                    }});
                });
            });

            describe('[api error2]', function() {
                beforeHelpers(
                    { err: null, obj: { user: 'someuser' } },
                    { handle: 'someHandle' },
                    { err: null, res: { statusCode: 200 }, body: { status: 'Failed', comment: 'failed api' } }
                );
                it('should match API error', function(done) {
                    submission({ callback: function (err) {
                        setTimeout(function() {
                            expect(inquirer.prompt.called).to.be.false;
                            expect(jsonfile.writeFileSync.called).to.be.false;
                            expect(request.get.called).to.be.true;
                            expect(helpers.logr.called).to.false;
                            expect(err).to.equal('failed api');
                            done();
                        });
                    }});
                });
            });

            describe('[api error2 - watch]', function() {
                beforeHelpers(
                    { err: null, obj: { user: 'someuser' } },
                    { handle: 'someHandle' },
                    { err: null, res: { statusCode: 200 }, body: { status: 'Failed', comment: 'failed api' } }
                );
                it('should match API error', function(done) {
                    submission({ watch: true, callback: function (err) {
                        setTimeout(function() {
                            expect(inquirer.prompt.called).to.be.false;
                            expect(jsonfile.writeFileSync.called).to.be.false;
                            expect(request.get.called).to.be.true;
                            expect(helpers.logr.called).to.false;
                            expect(err).to.equal('failed api');
                            done();
                        });
                    }});
                });
            });

            describe('[onsuccess]', function() {
                var mockData = [
                    {"id":20289294,"contestId":708,"creationTimeSeconds":1472588188,"relativeTimeSeconds":2147483647,"problem":{"contestId":708,"index":"C","name":"Centroids","type":"PROGRAMMING","points":1500.0,"tags":["data structures","dfs and similar","dp","greedy","trees"]},"author":{"contestId":708,"members":[{"handle":"Fefer_Ivan"}],"participantType":"PRACTICE","ghost":false,"startTimeSeconds":1472056500},"programmingLanguage":"GNU C++11","verdict":"OK","testset":"TESTS","passedTestCount":119,"timeConsumedMillis":701,"memoryConsumedBytes":50995200}
                ];
                beforeHelpers(
                    { err: null, obj: { user: 'someuser' } },
                    { handle: 'someHandle' },
                    { err: null, res: { statusCode: 200 }, body: { status: 'OK', result: mockData } }
                );
                it('should not have error', function(done) {
                    submission({ callback: function (err) {
                        setTimeout(function() {
                            expect(inquirer.prompt.called).to.be.false;
                            expect(jsonfile.writeFileSync.called).to.be.false;
                            expect(request.get.called).to.be.true;
                            expect(helpers.logr.called).to.false;
                            expect(err).to.be.null;
                            done();
                        });
                    }});
                });
                it('should not have error - watch mode', function(done) {
                    submission({ watch: true, callback: function (err) {
                        setTimeout(function() {
                            expect(inquirer.prompt.called).to.be.false;
                            expect(jsonfile.writeFileSync.called).to.be.false;
                            expect(request.get.called).to.be.true;
                            expect(helpers.logr.called).to.false;
                            expect(err).to.be.null;
                            done();
                        });
                    }});
                });
            });

            describe('[all params]', function() {
                var mockData = [
                    {"id":20289294,"contestId":708,"creationTimeSeconds":1472588188,"relativeTimeSeconds":2147483647,"problem":{"contestId":708,"index":"C","name":"Centroids","type":"PROGRAMMING","points":1500.0,"tags":["data structures","dfs and similar","dp","greedy","trees"]},"author":{"contestId":708,"members":[{"handle":"Fefer_Ivan"}],"participantType":"PRACTICE","ghost":false,"startTimeSeconds":1472056500},"programmingLanguage":"GNU C++11","verdict":"OK","testset":"TESTS","passedTestCount":119,"timeConsumedMillis":701,"memoryConsumedBytes":50995200}
                ];
                beforeHelpers(
                    { err: null, obj: { user: 'someuser' } },
                    { handle: 'someHandle' },
                    { err: null, res: { statusCode: 200 }, body: { status: 'OK', result: mockData } }
                );
                it('should not have error', function(done) {
                    submission({ count: 1, remember: false, watch: false, contest: true, contestId: 550, delay: 2000, callback: function (err) {
                        setTimeout(function() {
                            expect(inquirer.prompt.called).to.be.false;
                            expect(jsonfile.writeFileSync.called).to.be.false;
                            expect(request.get.called).to.be.true;
                            expect(helpers.logr.called).to.false;
                            expect(err).to.be.null;
                            done();
                        });
                    }});
                });
            });

            describe('[verdicts]', function() {
                describe('[RUNTIME_ERROR]', function() {
                    var mockData = [
                        {"id":20289294,"contestId":708,"creationTimeSeconds":1472588188,"relativeTimeSeconds":2147483647,"problem":{"contestId":708,"index":"C","name":"Centroids","type":"PROGRAMMING","points":1500.0,"tags":["data structures","dfs and similar","dp","greedy","trees"]},"author":{"contestId":708,"members":[{"handle":"Fefer_Ivan"}],"participantType":"PRACTICE","ghost":false,"startTimeSeconds":1472056500},"programmingLanguage":"GNU C++11","verdict":"RUNTIME_ERROR","testset":"TESTS","passedTestCount":119,"timeConsumedMillis":701,"memoryConsumedBytes":50995200}
                    ];
                    beforeHelpers(
                        { err: null, obj: { user: 'someuser' } },
                        { handle: 'someHandle' },
                        { err: null, res: { statusCode: 200 }, body: { status: 'OK', result: mockData } }
                    );
                    it('should not have error', function(done) {
                        submission({ callback: function (err) {
                            setTimeout(function() {
                                expect(inquirer.prompt.called).to.be.false;
                                expect(jsonfile.writeFileSync.called).to.be.false;
                                expect(request.get.called).to.be.true;
                                expect(helpers.logr.called).to.false;
                                expect(err).to.be.null;
                                done();
                            });
                        }});
                    });
                });
                describe('[WRONG_ANSWER]', function() {
                    var mockData = [
                        {"id":20289294,"contestId":708,"creationTimeSeconds":1472588188,"relativeTimeSeconds":2147483647,"problem":{"contestId":708,"index":"C","name":"Centroids","type":"PROGRAMMING","points":1500.0,"tags":["data structures","dfs and similar","dp","greedy","trees"]},"author":{"contestId":708,"members":[{"handle":"Fefer_Ivan"}],"participantType":"PRACTICE","ghost":false,"startTimeSeconds":1472056500},"programmingLanguage":"GNU C++11","verdict":"WRONG_ANSWER","testset":"TESTS","passedTestCount":119,"timeConsumedMillis":701,"memoryConsumedBytes":50995200}
                    ];
                    beforeHelpers(
                        { err: null, obj: { user: 'someuser' } },
                        { handle: 'someHandle' },
                        { err: null, res: { statusCode: 200 }, body: { status: 'OK', result: mockData } }
                    );
                    it('should not have error', function(done) {
                        submission({ callback: function (err) {
                            setTimeout(function() {
                                expect(inquirer.prompt.called).to.be.false;
                                expect(jsonfile.writeFileSync.called).to.be.false;
                                expect(request.get.called).to.be.true;
                                expect(helpers.logr.called).to.false;
                                expect(err).to.be.null;
                                done();
                            });
                        }});
                    });
                });
                describe('[PRESENTATION_ERROR]', function() {
                    var mockData = [
                        {"id":20289294,"contestId":708,"creationTimeSeconds":1472588188,"relativeTimeSeconds":2147483647,"problem":{"contestId":708,"index":"C","name":"Centroids","type":"PROGRAMMING","points":1500.0,"tags":["data structures","dfs and similar","dp","greedy","trees"]},"author":{"contestId":708,"members":[{"handle":"Fefer_Ivan"}],"participantType":"PRACTICE","ghost":false,"startTimeSeconds":1472056500},"programmingLanguage":"GNU C++11","verdict":"PRESENTATION_ERROR","testset":"TESTS","passedTestCount":119,"timeConsumedMillis":701,"memoryConsumedBytes":50995200}
                    ];
                    beforeHelpers(
                        { err: null, obj: { user: 'someuser' } },
                        { handle: 'someHandle' },
                        { err: null, res: { statusCode: 200 }, body: { status: 'OK', result: mockData } }
                    );
                    it('should not have error', function(done) {
                        submission({ callback: function (err) {
                            setTimeout(function() {
                                expect(inquirer.prompt.called).to.be.false;
                                expect(jsonfile.writeFileSync.called).to.be.false;
                                expect(request.get.called).to.be.true;
                                expect(helpers.logr.called).to.false;
                                expect(err).to.be.null;
                                done();
                            });
                        }});
                    });
                });
                describe('[TIME_LIMIT_EXCEEDED]', function() {
                    var mockData = [
                        {"id":20289294,"contestId":708,"creationTimeSeconds":1472588188,"relativeTimeSeconds":2147483647,"problem":{"contestId":708,"index":"C","name":"Centroids","type":"PROGRAMMING","points":1500.0,"tags":["data structures","dfs and similar","dp","greedy","trees"]},"author":{"contestId":708,"members":[{"handle":"Fefer_Ivan"}],"participantType":"PRACTICE","ghost":false,"startTimeSeconds":1472056500},"programmingLanguage":"GNU C++11","verdict":"TIME_LIMIT_EXCEEDED","testset":"TESTS","passedTestCount":119,"timeConsumedMillis":701,"memoryConsumedBytes":50995200}
                    ];
                    beforeHelpers(
                        { err: null, obj: { user: 'someuser' } },
                        { handle: 'someHandle' },
                        { err: null, res: { statusCode: 200 }, body: { status: 'OK', result: mockData } }
                    );
                    it('should not have error', function(done) {
                        submission({ callback: function (err) {
                            setTimeout(function() {
                                expect(inquirer.prompt.called).to.be.false;
                                expect(jsonfile.writeFileSync.called).to.be.false;
                                expect(request.get.called).to.be.true;
                                expect(helpers.logr.called).to.false;
                                expect(err).to.be.null;
                                done();
                            });
                        }});
                    });
                });
                describe('[MEMORY_LIMIT_EXCEEDED]', function() {
                    var mockData = [
                        {"id":20289294,"contestId":708,"creationTimeSeconds":1472588188,"relativeTimeSeconds":2147483647,"problem":{"contestId":708,"index":"C","name":"Centroids","type":"PROGRAMMING","points":1500.0,"tags":["data structures","dfs and similar","dp","greedy","trees"]},"author":{"contestId":708,"members":[{"handle":"Fefer_Ivan"}],"participantType":"PRACTICE","ghost":false,"startTimeSeconds":1472056500},"programmingLanguage":"GNU C++11","verdict":"MEMORY_LIMIT_EXCEEDED","testset":"TESTS","passedTestCount":119,"timeConsumedMillis":701,"memoryConsumedBytes":50995200}
                    ];
                    beforeHelpers(
                        { err: null, obj: { user: 'someuser' } },
                        { handle: 'someHandle' },
                        { err: null, res: { statusCode: 200 }, body: { status: 'OK', result: mockData } }
                    );
                    it('should not have error', function(done) {
                        submission({ callback: function (err) {
                            setTimeout(function() {
                                expect(inquirer.prompt.called).to.be.false;
                                expect(jsonfile.writeFileSync.called).to.be.false;
                                expect(request.get.called).to.be.true;
                                expect(helpers.logr.called).to.false;
                                expect(err).to.be.null;
                                done();
                            });
                        }});
                    });
                });
                describe('[IDLENESS_LIMIT_EXCEEDED]', function() {
                    var mockData = [
                        {"id":20289294,"contestId":708,"creationTimeSeconds":1472588188,"relativeTimeSeconds":2147483647,"problem":{"contestId":708,"index":"C","name":"Centroids","type":"PROGRAMMING","points":1500.0,"tags":["data structures","dfs and similar","dp","greedy","trees"]},"author":{"contestId":708,"members":[{"handle":"Fefer_Ivan"}],"participantType":"PRACTICE","ghost":false,"startTimeSeconds":1472056500},"programmingLanguage":"GNU C++11","verdict":"IDLENESS_LIMIT_EXCEEDED","testset":"TESTS","passedTestCount":119,"timeConsumedMillis":701,"memoryConsumedBytes":50995200}
                    ];
                    beforeHelpers(
                        { err: null, obj: { user: 'someuser' } },
                        { handle: 'someHandle' },
                        { err: null, res: { statusCode: 200 }, body: { status: 'OK', result: mockData } }
                    );
                    it('should not have error', function(done) {
                        submission({ callback: function (err) {
                            setTimeout(function() {
                                expect(inquirer.prompt.called).to.be.false;
                                expect(jsonfile.writeFileSync.called).to.be.false;
                                expect(request.get.called).to.be.true;
                                expect(helpers.logr.called).to.false;
                                expect(err).to.be.null;
                                done();
                            });
                        }});
                    });
                });
                describe('[DEFAULTS]', function() {
                    var mockData = [
                        {"id":20289294,"contestId":708,"creationTimeSeconds":1472588188,"relativeTimeSeconds":2147483647,"problem":{"contestId":708,"index":"C","name":"Centroids","type":"PROGRAMMING","points":1500.0,"tags":["data structures","dfs and similar","dp","greedy","trees"]},"author":{"contestId":708,"members":[{"handle":"Fefer_Ivan"}],"participantType":"PRACTICE","ghost":false,"startTimeSeconds":1472056500},"programmingLanguage":"GNU C++11","verdict":"DEFAULTS","testset":"TESTS","passedTestCount":119,"timeConsumedMillis":701,"memoryConsumedBytes":50995200}
                    ];
                    beforeHelpers(
                        { err: null, obj: { user: 'someuser' } },
                        { handle: 'someHandle' },
                        { err: null, res: { statusCode: 200 }, body: { status: 'OK', result: mockData } }
                    );
                    it('should not have error', function(done) {
                        submission({ callback: function (err) {
                            setTimeout(function() {
                                expect(inquirer.prompt.called).to.be.false;
                                expect(jsonfile.writeFileSync.called).to.be.false;
                                expect(request.get.called).to.be.true;
                                expect(helpers.logr.called).to.false;
                                expect(err).to.be.null;
                                done();
                            });
                        }});
                    });
                });
            });


            describe('[watch]', function() {

                this.timeout(20000);

                var mockData = [
                    {"id":20289294,"contestId":708,"creationTimeSeconds":1472588188,"relativeTimeSeconds":2147483647,"problem":{"contestId":708,"index":"C","name":"Centroids","type":"PROGRAMMING","points":1500.0,"tags":["data structures","dfs and similar","dp","greedy","trees"]},"author":{"contestId":708,"members":[{"handle":"Fefer_Ivan"}],"participantType":"PRACTICE","ghost":false,"startTimeSeconds":1472056500},"programmingLanguage":"GNU C++11","testset":"TESTS","passedTestCount":119,"timeConsumedMillis":701,"memoryConsumedBytes":50995200}
                ];
                var mockData2= [
                    {"verdict":"OK","id":20289294,"contestId":708,"creationTimeSeconds":1472588188,"relativeTimeSeconds":2147483647,"problem":{"contestId":708,"index":"C","name":"Centroids","type":"PROGRAMMING","points":1500.0,"tags":["data structures","dfs and similar","dp","greedy","trees"]},"author":{"contestId":708,"members":[{"handle":"Fefer_Ivan"}],"participantType":"PRACTICE","ghost":false,"startTimeSeconds":1472056500},"programmingLanguage":"GNU C++11","testset":"TESTS","passedTestCount":119,"timeConsumedMillis":701,"memoryConsumedBytes":50995200}
                ];
                beforeHelpers(
                    { err: null, obj: { user: 'someuser' } },
                    { handle: 'someHandle' },
                    {
                        ignore: true,
                        data:
                            [
                                { err: null, res: { statusCode: 200 }, body: { status: 'OK', result: mockData } },
                                { err: null, res: { statusCode: 200 }, body: { status: 'OK', result: mockData2 } }
                            ]
                    }
                );

                it('keep watching on undefined verdict', function(done) {
                    submission({ watch: true,callback: function (err) {
                        setTimeout(function() {
                            expect(inquirer.prompt.called).to.be.false;
                            expect(jsonfile.writeFileSync.called).to.be.false;
                            expect(request.get.called).to.be.true;
                            expect(helpers.logr.called).to.false;
                            expect(err).to.be.null;
                            done();
                        });
                    }});
                });
            });

            describe('[watch]', function() {

                this.timeout(20000);

                var mockData = [
                    {"verdict":"TESTING","id":20289294,"contestId":708,"creationTimeSeconds":1472588188,"relativeTimeSeconds":2147483647,"problem":{"contestId":708,"index":"C","name":"Centroids","type":"PROGRAMMING","points":1500.0,"tags":["data structures","dfs and similar","dp","greedy","trees"]},"author":{"contestId":708,"members":[{"handle":"Fefer_Ivan"}],"participantType":"PRACTICE","ghost":false,"startTimeSeconds":1472056500},"programmingLanguage":"GNU C++11","testset":"TESTS","passedTestCount":119,"timeConsumedMillis":701,"memoryConsumedBytes":50995200}
                ];
                var mockData2= [
                    {"verdict":"OK","id":20289294,"contestId":708,"creationTimeSeconds":1472588188,"relativeTimeSeconds":2147483647,"problem":{"contestId":708,"index":"C","name":"Centroids","type":"PROGRAMMING","points":1500.0,"tags":["data structures","dfs and similar","dp","greedy","trees"]},"author":{"contestId":708,"members":[{"handle":"Fefer_Ivan"}],"participantType":"PRACTICE","ghost":false,"startTimeSeconds":1472056500},"programmingLanguage":"GNU C++11","testset":"TESTS","passedTestCount":119,"timeConsumedMillis":701,"memoryConsumedBytes":50995200}
                ];
                beforeHelpers(
                    { err: null, obj: { user: 'someuser' } },
                    { handle: 'someHandle' },
                    {
                        ignore: true,
                        data:
                            [
                                { err: null, res: { statusCode: 200 }, body: { status: 'OK', result: mockData } },
                                { err: null, res: { statusCode: 200 }, body: { status: 'OK', result: mockData2 } }
                            ]
                    }
                );

                it('keep watching on TESTING verdict', function(done) {
                    submission({ watch: true,callback: function (err) {
                        setTimeout(function() {
                            expect(inquirer.prompt.called).to.be.false;
                            expect(jsonfile.writeFileSync.called).to.be.false;
                            expect(request.get.called).to.be.true;
                            expect(helpers.logr.called).to.false;
                            expect(err).to.be.null;
                            done();
                        });
                    }});
                });
            });

        });

    });
});



function MyError(code) {
    this.name = 'MyError';
    this.code = code;
    this.message = 'nothing to say';
    this.stack = (new Error()).stack;
}
MyError.prototype = new Error;