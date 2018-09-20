var map;
var contextMenu;
var userLocationAvailble = false;
var boundChangeTimeoutId = 0;
var markers = [];
var lastInfoWindow = null;
var currentMarkersListCount = 0;
var tokenCsrf = "";

document.oncontextmenu = function() {
    return false;
}

$(window).ready(function() {
    resizeMapConatiner();
    resizeMainPan();
    $("#marker-details").hide();
    $("#markers-list").niceScroll();
    $("#map").click(function(){
        contextMenuHide();
    });
    tokenCsrf = $("meta[name='_csrf']").attr("content");
});

$(window).resize(function() {
    resizeMapConatiner();
    resizeMainPan();
    $("#markers-list").niceScroll();
});

function debug( description ){
    console.log( description );
}

function initPage() {
        getLocation();
        resizeMapConatiner();
        resizeMainPan();
        $("#markers-list").niceScroll();
            map = new google.maps.Map(document.getElementById('map'), {
                center: {lat: -34.397, lng: 150.644},
                zoom: 14,
                disableDefaultUI: true
            });
            google.maps.event.addListener(map, 'bounds_changed', function() {
                clearTimeout(boundChangeTimeoutId);
                boundChangeTimeoutId = setTimeout(function(){
                    reloadMapView(map);
                },1000);
            });

        contextMenu = google.maps.event.addListener(
            map,
            "rightclick",
            function( event ) {
                $(".contextMenu").css({top: event.pixel.y, left: event.pixel.x, position:'absolute'});
                $(".contextMenu").show();
                $('.contextMenu').data('lat',event.latLng.lat());
                $('.contextMenu').data('lng',event.latLng.lng());
                // use JS Dom methods to create the menu
                // use event.pixel.x and event.pixel.y
                // to position menu at mouse position
                console.log( event );
            }
        );
}

function contextMenuZoomIn(){
    debug("Zooming in");
    contextMenuHide();
    map.panTo({lat:  $(".contextMenu").data('lat') , lng:  $(".contextMenu").data('lng')});
    map.setZoom(map.getZoom()+1);
}

function contextMenuZoomOut(){
    debug("Zooming out");
    contextMenuHide();
    map.panTo({lat:  $(".contextMenu").data('lat') , lng:  $(".contextMenu").data('lng')});
    map.setZoom(map.getZoom()-1);
}

function contextMenuSetCenter(){
    debug("Setting center");
    contextMenuHide();
    map.panTo({lat:  $(".contextMenu").data('lat') , lng:  $(".contextMenu").data('lng')});
}

function contextMenuHide(){
    $(".contextMenu").hide();
}

function itemClicked( lat , lng , id ){
    if(lastInfoWindow!=null) lastInfoWindow.close();
    map.panTo({lat: lat, lng: lng});
    var infowindow = markers[id].contentInfo;
    infowindow.open(map,markers[id]);
    lastInfoWindow = infowindow;
    viewDetails(id);
}

function viewDetails( id ){
    $("#marker-details").html(markers[id].contentInfo);
    $("#marker-list").hide();
    $("#marker-details").show();
}

function resizeMapConatiner(){
    $("#map").height($(window).height());
}

function resizeMainPan(){
    realHeight = currentMarkersListCount * 50;
    if( realHeight > $(window).height() ){
        if($(window).height()>200){
            $("#main-pan").height($(window).height()-100);
            $("#markers-list").height($(window).height()-180);
        } else {
            $("#main-pan").height($(window).height()-50);
            $("#markers-list").height($(window).height()-130);
        }
    } else {
        $("#main-pan").height(realHeight+130);
        $("#markers-list").height(realHeight+50);
    }
    $("#markers-list").niceScroll();
}

function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(updateUserLocation);
        userLocationAvailble = true;
    } else {
        userLocationAvailble = false;
        debug("Geolocation is not supported by this browser");
    }
}

function updateUserLocation(position){
    map.setCenter({lat: position.coords.latitude, lng: position.coords.longitude});
}

function prepareMarkers(map,locations){
    for (i = 0; i < locations.length; i++) {
        if(markers[locations[i].id]==null){
            var infowindow = new google.maps.InfoWindow({
                content: templates.infoWindow.replace("::title::",locations[i].name).replace("::description::",locations[i].description )
            });
            var marker = new google.maps.Marker({
                position: new google.maps.LatLng( locations[i].latitude , locations[i].longitude ),
                map: map,
                contentInfo: infowindow
            });
            google.maps.event.addListener(marker,'click',function() {
                if(lastInfoWindow!=null) lastInfoWindow.close();
                map.panTo(this.position);
                infowindow.open(map,this);
                lastInfoWindow = infowindow;
            });
            markers[locations[i].id] = marker;
        }
    }
}

function markerFocus(){}

function prepareMarkersList(locations){
    $("#markers-list").html("");
    markersListCotent = "";
    currentMarkersListCount = 0;
    if( locations.length == 0){
        markersListCotent = "No location found in the area";
    } else {
        for ( i = 0; i < locations.length; i++ ) {
            currentMarkersListCount ++;
            markersListCotent += "<div class='marker-list-item' onclick='itemClicked("+locations[i].latitude+","+locations[i].longitude+","+locations[i].id+")'>"
                + templates.markerListItem.replace("::title::",locations[i].name).replace("::description::",locations[i].description )
                + "</div>";
        }
    }
    $("#markers-list").html(markersListCotent);
}

function reloadMapView(map){
    debug("Reloading map view data...");
    northeastCurrent = map.getBounds().getNorthEast();
    southwestCurrent = map.getBounds().getSouthWest();
    $.ajax({
        type: "POST",
        url: "/api/location/getLocationsInBoundary",
        data: JSON.stringify({
            northeast: { latitude : northeastCurrent.lat() , longitude : northeastCurrent.lng() },
            southwest: { latitude : southwestCurrent.lat() , longitude : southwestCurrent.lng() }
        }),
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        headers: {
            _csrf :tokenCsrf,
        },
        success: function(data){
            debug( data );
            if(data.state){
                prepareMarkers(map,data.payload);
                prepareMarkersList(data.payload);
                resizeMainPan();
            } else {
                console.error("Failed loading data!");
            }
        },
        failure: function(err) {
            console.error( err );
        }
    });
}