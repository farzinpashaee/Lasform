app.directive("lfListItem", ['lfServices',  function( lfServices ) {

    var getTemplate = function(attr) {
        return "<b>"+attr.cover+"</b>"+(attr.cover==true?"Aaa1":"Bbb1")+"<br/>";
    }

    return {
        // scope: {
        //     location:'=data'
        // },
        template : function(elem, attr) {
            return "<md-list-item class=\"md-3-line\" >"+lfServices.renderView([
                    {key:"title",value:attr.title},
                    {key:"description",value:attr.description},
                    {key:"image",value: attr.cover=='1'?"d":"zz" }],
                templates.markerListItem)+"</md-list-item>"
        }
    };
}]);

