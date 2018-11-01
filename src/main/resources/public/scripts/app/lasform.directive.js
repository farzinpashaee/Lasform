app.directive("lfListItem", ['lfServices',  function( lfServices ) {
    return {
        template : function(elem, attr) {
            var image =  (attr.cover ? lfServices.renderView([{key:"src",value:"../img/locations/photo-"+attr.lid+".jpg"}],templates.markerListItemImage) : "");
            return "<md-list-item class=\"md-3-line\" >"+lfServices.renderView([
                    {key:"title",value:attr.title},
                    {key:"description",value:attr.description},
                    {key:"image",value:image}],
                templates.markerListItem)+"</md-list-item>";
        }
    };
}]);