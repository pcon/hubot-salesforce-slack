/*jslint browser: false, regexp: true */
/*global module, require */

module.exports = function (grunt) {
    'use strict';

    grunt.initConfig({
        release: {
            options: {
                tagName: 'v<%= version %>',
                commitMessage: 'Prepared to release <%= version %>.'
            }
        },
        watch: {
            files: ['Gruntfile.js', 'src/**/*.coffee', 'test/**/*.coffee'],
            tasks: ['test']
        }
    });

    // load all grunt tasks
    require('matchdep').filterDev(['grunt-*', '!grunt-cli']).forEach(grunt.loadNpmTasks);

    grunt.registerTask('test', []);
    grunt.registerTask('test:watch', ['watch']);
    grunt.registerTask('default', ['test']);
};