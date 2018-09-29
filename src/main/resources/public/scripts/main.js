requirejs.config({
    baseUrl: 'scripts/lib',
    paths: {
        app: '../app',
    },
    "shim": {
        "jquery.nicescroll.min": ["jquery"],
    }
});

requirejs(['app/lasform.core']);
requirejs(['app/lasform.core']);