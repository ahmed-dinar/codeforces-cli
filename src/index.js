'use strict';

import standings from './lib/api/standings';
import tags from './lib/api/tags';
import userinfo from './lib/api/userinfo';
import Userrating from './lib/api/Userrating';
import usertags from './lib/api/usertags';
import countrystandings from './lib/crawler/countrystandings';
import ratings from './lib/crawler/ratings';
import sourcecode from './lib/crawler/sourcecode';
import Submit from './lib/crawler/Submit';
import submission from './lib/api/submission';
import cfdefault from './lib/utils/cfdefault';


export default {
    standings: standings,
    tags: tags,
    userinfo: userinfo,
    Userrating: Userrating,
    usertags: usertags,
    countrystandings: countrystandings,
    ratings: ratings,
    sourcecode: sourcecode,
    Submit: Submit,
    submission: submission,
    cfdefault: cfdefault
};


