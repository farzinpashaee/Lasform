app.directive("lfListItem", ['lfServices',  function( lfServices ) {
    return {
        restrict: 'E',
        scope: {
            location: '='
        },
        template : function() {
            return "<md-list-item class=\"md-3-line\"  >" + templates.markerListItem + "</md-list-item>";
        },
        link : function (scope, element) {
            function addRanking(){
                element.find('h4').html(lfServices.renderRating(scope.location.rating));
            }
            addRanking();
        }
    };
}]);