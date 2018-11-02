app.service('lfServices', function($http){

    var lfServices = this;

    var LOG = { INFO : "info" , DEBUG : "debug" , ERR : "ERROR" , DEBUG_NO_TAG : "debugNoTag" }
    this.LOG = LOG;

    this.renderView = function( items , template ){
        var view = template;
        for(var i = 0 ; i < items.length ; i++){
            view = view.replace( "::"+(items[i].key)+"::" , items[i].value );
        }
        return view;
    }

    this.restCall = function( method , url  , data , callback ){
        $http({ method : method,
            url : url,
            data : data
        }).then(function mySuccess(response) {
            lfServices.log(LOG.DEBUG_NO_TAG,response.data);
            if(response.data.state){
                callback(response.data.payload);
            } else {
                lfServices.log(LOG.ERR,"Error fetching data from " + url);
            }
        }, function myError(err) {
            lfServices.log(LOG.ERR,err);
        });
    }

    this.log = function( tag , description) {
        if (tag === LOG.ERR) {
            console.error(tag + " : " + description);
        } else if ( tag === LOG.DEBUG_NO_TAG ) {
            console.log(description);
        } else {
            console.log(tag + " : " + description);
        }
    }
});

