var map;
var userLocationAvailble = false;
var boundChangeTimeoutId = 0;
var markers = [];
var lastInfoWindow = null;
var currentMarkersListCount = 0;

$(window).ready(function() {
    resizeMapConatiner();
    resizeMainPan();
    $("#markers-list").niceScroll();
});

$(window).resize(function() {
    resizeMapConatiner();
    resizeMainPan();
});

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

function itemClicked( lat , lng , id ){
    if(lastInfoWindow!=null) lastInfoWindow.close();
    map.panTo({lat: lat, lng: lng});
    var infowindow = markers[id].contentInfo;
    infowindow.open(map,markers[id]);
    lastInfoWindow = infowindow;
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
        console.log("Geolocation is not supported by this browser")
    }
}

function updateUserLocation(position){
    map.setCenter({lat: position.coords.latitude, lng: position.coords.longitude});
}

function prepareMarkers(map,locations){
    clearMarkers();
    for (i = 0; i < locations.length; i++) {
        if(markers[locations[i].id]==null){
            var infowindow = new google.maps.InfoWindow({
                content: '<span class="infowindow-header">' + locations[i].name + '</span><p>'+ locations[i].description + '</p>'
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

function clearMarkers(){}

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
                + "<span class='marker-list-item-header'>"
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
                resizeMainPan();
            } else {
                console.log("failed");
            }
        },
        failure: function(err) {
            console.log(err);
        }
    });
}