requirejs.config({
    baseUrl: 'scripts',
    paths: {
        lfCore: 'app/lasform.core',
        jquery: 'jquery.js',
        angular: 'lib/angular/angular.min',
        angularAnim: 'lib/angular/angular.animate.min',
        angularAria: 'lib/angular/angular.aria.min',
        angularMessage: 'lib/angular/angular.messages.min',
        angularMaterial: 'lib/angular/angular.material.min',
        async: 'lib/requirejs-plugins/async',
        googleMap: 'https://maps.googleapis.com/maps/api/js?key=AIzaSyDQz41w41dpAu2o9lPssyUCnDgd4rxGpYA&callback=initPage'
    },
    "shim": {
        "jquery.nicescroll.min": ["jquery"],
        'angular': {
            exports: 'angular'
        }
    }
});


define(['angular'],function(angular){

    angular.module('lfApp', [])
        .controller('appCtrl', function($scope) {
            $scope.title1 = 'Button';
        });

    //lastform.prepare();
})

// define(['jquery',
//         'async!https://maps.googleapis.com/maps/api/js?key=AIzaSyDQz41w41dpAu2o9lPssyUCnDgd4rxGpYA&callback=initPage',
//         'app/lasform.core'],function ($,gm,lastform) {
//
//     lastform.prepare();
//
// });