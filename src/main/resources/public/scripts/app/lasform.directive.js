app.directive("lfListItem", ['lfServices',  function( lfServices ) {
    return {
        restrict: 'E',
        scope: {
            title:'@',
            lid:'@',
            description:'@',
            cover:'@'
        },
        template : function(scope, element, attr) {
            return "<md-list-item onclick='alert(\"s\")' class=\"md-3-line\" >"+lfServices.renderView([
                    {key:"title",value:"{{title}}"}, // renderRanking
                    {key:"description",value:"{{description}}"},
                    {key:"rating",value: lfServices.renderRating(3) },
                    {key:"image",value: lfServices.renderView([
                                              {key:"title",value:"{{title}}"},
                                              {key:"src",value:"../img/locations/photo-{{lid}}.jpg"}],templates.markerListItemImage) }],
                templates.markerListItem)+"</md-list-item>"
        },
        // link: function(scope, elems, attrs) {
        //     if (attrs.cover=="true") {
        //         scope.image = lfServices.renderView([
        //                 {key:"title",value:"{{title}}"},
        //                 {key:"src",value:"../img/locations/photo-{{lid}}.jpg"}],templates.markerListItemImage);
        //     } else {
        //         scope.image = ""
        //     }
        // }
        //'<img class="md-avatar" src="../img/locations/photo-{{lid}}.jpg" ng-if="cover==\'true\'" />
    };
}]);