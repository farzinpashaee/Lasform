var map;
var userLocationAvailble = false;
var boundChangeTimeoutId = 0;
var markers = [];

function initMap() {
    getLocation();
    resizeMapConatiner();
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

}

$(window).resize(function() {
    resizeMapConatiner();
});

function resizeMapConatiner(){
    $("#map").height($(window).height());
}

function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(updateUserLocation);
        userLocationAvailble = true;
    } else {
        userLocationAvailble = false;
        console.log("Geolocation is not supported by this browser")
    }
}

function updateUserLocation(position){
    map.setCenter({lat: position.coords.latitude, lng: position.coords.longitude});
}

function prepareMarkers(map,locations){
    clearMarkers();
    for (i = 0; i < locations.length; i++) {
        marker = new google.maps.Marker({
            position: new google.maps.LatLng( locations[i].latitude , locations[i].longitude ),
            map: map
        });
        markers.push(marker);
    }
}

function clearMarkers(){
    for(i=0; i<markers.length; i++){
        markers[i].setMap(null);
    }
}

function prepareMarkersList(locations){
    $("#markers-list").html("");
    markersListCotent = "";
    if( locations.length == 0){
        markersListCotent = "No location found in the area";
    } else {
        for ( i = 0; i < locations.length; i++ ) {
            markersListCotent += "<div class='marker-list-item'><span class='marker-list-item-header'>"
                + locations[i].name + "</span><br/><span class='marker-list-item-description' >"
                + locations[i].description + "</span></div>";
        }
    }
    $("#markers-list").html(markersListCotent);
}

function reloadMapView(map){
    console.log("Reloading map view data...");
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
        success: function(data){
            console.log(data);
            if(data.state){
                prepareMarkers(map,data.payload);
                prepareMarkersList(data.payload);
            } else {
                console.log("failed");
            }
        },
        failure: function(err) {
            console.log(err);
        }
    });
}