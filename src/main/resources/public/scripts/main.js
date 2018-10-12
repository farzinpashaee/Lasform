requirejs.config({
    baseUrl: 'scripts/lib',
    paths: {
        app: '../app',
        async: 'requirejs-plugins/async',
    },
    "shim": {
        "jquery.nicescroll.min": ["jquery"],
    }
});

define(['jquery',
        'async!https://maps.googleapis.com/maps/api/js?key=AIzaSyDQz41w41dpAu2o9lPssyUCnDgd4rxGpYA&callback=initPage',
        'app/lasform.core'],function ($,gm,lastform) {

    lastform.prepare();

});