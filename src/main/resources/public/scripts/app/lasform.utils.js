ec = {
    ajaxFail : { code : 110 , message : "" },
    ajaxResponseFail : { code : 111 , message : "Failed on response" }
}

function debug(code,description) {
    console.log( code + " - " + description );
}

function error(code,description) {
    console.error( "ERROR:" + code + " - "+ description );
}

function ajaxCall( path , data , callback ){
    debug("ajaxCall","loading " + path + " with " + data);
    $.ajax({
        type: "POST",
        url: path ,
        data: JSON.stringify(data),
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        headers: {
            _csrf: $("meta[name='_csrf']").attr("content"),
        },
        success: function (data) {
            debug(data);
            if (data.state) {
                callback(data.payload);
            } else {
                error(ec.ajaxResponseFail.code,ec.ajaxResponseFail.message);
            }
        },
        failure: function (err) {
            error(ec.ajaxFail.code,ec.ajaxFail.message + " " + err);
        }
    });
}

