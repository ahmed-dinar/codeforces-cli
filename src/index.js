'use strict';

import standings from './lib/api/standings';
import tags from './lib/api/tags';
import userinfo from './lib/api/userinfo';
import Userrating from './lib/api/Userrating';
import usertags from './lib/api/usertags';
import Countrystandings from './lib/crawler/Countrystandings';
import Ratings from './lib/crawler/Ratings';
import Sourcecode from './lib/crawler/Sourcecode';
import Submit from './lib/crawler/Submit';
import submission from './lib/api/submission';
import cfdefault from './lib/utils/cfdefault';


export default {
    standings: standings,
    tags: tags,
    userinfo: userinfo,
    Userrating: Userrating,
    usertags: usertags,
    Countrystandings: Countrystandings,
    Ratings: Ratings,
    Sourcecode: Sourcecode,
    Submit: Submit,
    submission: submission,
    cfdefault: cfdefault
};


