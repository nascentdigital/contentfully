// imports
const path = require('path');
const TestSequencer = require('@jest/test-sequencer').default;


// class definition
class Sequencer extends TestSequencer {

    sort(tests) {

        // build test folders
        const utilTests = [];
        const otherTests = [];
        for (const test of tests) {

            // get relative path to root
            const rootDir = test.context.config.rootDir;
            const relativePath = path.relative(rootDir, test.path);

            // add to appropriate test bucket
            if (relativePath.startsWith("test/util/")) {
                utilTests.push(test);
            }
            else {
                otherTests.push(test);
            }
        }

        function testComparer(lhs, rhs) {
            return lhs.path > rhs.path ? 1 : -1;
        }

        // return sorted tests
        return [...utilTests.sort(testComparer), ...otherTests.sort(testComparer)];
    }
}

// export sequencer
module.exports = Sequencer;
