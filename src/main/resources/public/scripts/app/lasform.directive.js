app.directive("lfListItem", ['lfServices',  function( lfServices ) {
    return {
        restrict: 'E',
        template : function(scope, element, attr) {
            // return "<md-list-item class=\"md-3-line\" >"+lfServices.renderView([
            //         {key:"title",value:"{{title}}"}, // renderRanking
            //         {key:"description",value:"{{description}}"},
            //         {key:"rating",value: attr["rating"]},
            //         {key:"image",value: lfServices.renderView([
            //                                   {key:"title",value:"{{title}}"},
            //                                   {key:"src",value:"../img/locations/photo-{{lid}}.jpg"}],templates.markerListItemImage) }],
            //     templates.markerListItem)+"</md-list-item>"
            return "<md-list-item class=\"md-3-line\" {{location.id}} >" + templates.markerListItem + "</md-list-item>";
        }
        // link : function (scope, element, attrs) {
        //     scope.ratingStars = lfServices.renderRating(scope.$eval(attrs.rating));
        // }

    };
}]);