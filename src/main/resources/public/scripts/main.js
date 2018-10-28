requirejs.config({
    baseUrl: 'scripts',
    paths: {
        app: 'app',
        jquery: 'lib/jquery/jquery',
        angular: 'lib/angular/1.6.9/angular.min',
        hammer: 'lib/hammer.min',
        angularAnimate: 'lib/angular/1.6.9/angular.min',
        angularMessages: 'lib/angular/1.6.9/angular.messages.min',
        angularAria: 'lib/angular/1.6.9/angular.aria.min',
        angularMaterial: 'lib/angular_material/1.1.8/angular.material.min',
        async: 'requirejs-plugins/async',
        googleMap: 'https://maps.googleapis.com/maps/api/js?key=AIzaSyDQz41w41dpAu2o9lPssyUCnDgd4rxGpYA&callback=initPage'
    },
    "shim": {
        //"jquery.nicescroll.min": ["jquery"],
        app: {
            exports: "app",
            deps: [
                "angular", "angularMessages", "angularMaterial"
            ]
        },
        angular: {
            exports: "angular"
        },
        jquery: {
            exports: "$"
        },
        angularAnimate: {
            deps: ['angular']
        },
        angularAria: {
            deps:[ 'angular']
        },
        angularMessages : {
            deps: ['angular']
        },
        angularMaterial: {
            deps: ['angular', 'angularAnimate', 'ngAria']
        }
    }
});

define(['angular'], function () {
    angular.module('lfApp', ['']);
});

// define(['jquery',
//         'async!https://maps.googleapis.com/maps/api/js?key=AIzaSyDQz41w41dpAu2o9lPssyUCnDgd4rxGpYA&callback=initPage',
//         'app/lasform.core'],function ($,gm,lastform) {
//
//     lastform.prepare();
//
// });