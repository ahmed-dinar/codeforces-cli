'use strict';

import standings from './lib/api/standings';
import tags from './lib/api/tags';
import userinfo from './lib/api/userinfo';
import userrating from './lib/api/userrating';
import usertags from './lib/api/usertags';
import countrystandings from './lib/crawler/countrystandings';
import ratings from './lib/crawler/ratings';
import sourcecode from './lib/crawler/sourcecode';
import submit from './lib/crawler/submit';
import submission from './lib/api/submission';
import cfdefault from './lib/utils/cfdefault';


export default {
    standings: standings,
    tags: tags,
    userinfo: userinfo,
    userrating: userrating,
    usertags: usertags,
    countrystandings: countrystandings,
    ratings: ratings,
    sourcecode: sourcecode,
    submit: submit,
    submission: submission,
    cfdefault: cfdefault
}


