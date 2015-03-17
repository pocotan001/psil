'use strict';

var assert = require('assert');
var psil = require('../lib/psil');

describe('API', function() {
    this.timeout(50000);

    it('should get data from local HTML', function(done) {
        psil('test/fixtures/hello.html', null, function(err) {
            assert(!err, err);
            done();
        });
    });
});
