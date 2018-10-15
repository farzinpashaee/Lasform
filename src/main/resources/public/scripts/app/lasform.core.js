define(['jquery',
    'jquery.nicescroll.min',
    'app/templates',
    'app/lasform.utils'],function($) {
    var map;
    var contextMenu;
    var userLocationAvailable = false;
    var boundChangeTimeoutId = 0;
    var markers = [];
    var lastInfoWindow = null;
    var currentMarkersListCount = 0;
    var tokenCsrf = "";

    var e = {
        map : '#map',
        markersList : '#markers-list',
        markerDetails : '#marker-details',
        searchInput : '#lf-search-input'
    };

    var config = {
        mapDragDelay : 1000
    }

    return {
        prepare: function () {
            // disable context menu
            document.oncontextmenu = function () {
                return false;
            }
            // on window ready
            $(window).ready(function () {
                resizeView();
                $(e.markerDetails).hide();
                $(e.markersList).niceScroll();
                $(e.map).click(function () {
                    contextMenuHide();
                });
                tokenCsrf = $("meta[name='_csrf']").attr("content");
            });
            // on window resize
            $(window).resize(function () {
                resizeView();
                $(e.markersList).niceScroll();
            });
            // UI prepare
            $(e.searchInput).keyup(function(event){
                if(event.keyCode == 13){
                    debug("INFO" , "Searching '"+$(e.searchInput).val()+"'");
                    search($(e.searchInput).val());
                }
            });
            $("#lf-search-button").click(function(){
                debug("INFO" , "Searching '"+$(e.searchInput).val()+"'");
                search($(e.searchInput).val());
            });
            // initial map
            initMap();
        }
    };

    function initMap() {
        resizeView();
        $(e.markersList).niceScroll();
        // load initial settings
        ajaxCall("/api/location/initialSetting",{},function(payload){
            debug("INFO" , "Initial setting loaded")
            debug("INFO" , "userLocationPolicy:" + payload.userLocationPolicy)
            // generate map
            map = new google.maps.Map(document.getElementById(e.map.substr(1,e.map.length-1)), {
                center: {lat: parseInt(payload.initialMapCenter.latitude) , lng:  parseInt(payload.initialMapCenter.longitude)},
                zoom: 14,
                disableDefaultUI: true
            });
            google.maps.event.addListener(map, 'bounds_changed', function () {
                clearTimeout(boundChangeTimeoutId);
                boundChangeTimeoutId = setTimeout(function () {
                    reloadMapView(map);
                }, config.mapDragDelay);
            });
            contextMenu = google.maps.event.addListener(map,"rightclick",function (event) {
                    $(".contextMenu").css({top: event.pixel.y, left: event.pixel.x, position: 'absolute'});
                    $(".contextMenu").show();
                    $('.contextMenu').data('lat', event.latLng.lat());
                    $('.contextMenu').data('lng', event.latLng.lng());
                }
            );
            // initial user location policy
            if(payload.userLocationPolicy){
                getUserLocation();
            }
        });
    }

    function resizeView(){
        $(e.map).height($(window).height());
    }

    function itemClicked(lat, lng, id) {
        if (lastInfoWindow != null) lastInfoWindow.close();
        map.panTo({lat: lat, lng: lng});
        var infowindow = markers[id].contentInfo;
        infowindow.open(map, markers[id]);
        lastInfoWindow = infowindow;
        viewDetails(id);
    }

    function viewDetails(id) {
        $("#marker-details").html(markers[id].contentInfo);
        $("#marker-list").hide();
        $("#marker-details").show();
    }


    // Updating user location
    function getUserLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(updateUserLocation);
            userLocationAvailable = true;
        } else {
            userLocationAvailable = false;
            debug("user location","Geolocation is not supported by this browser");
        }
    }

    function updateUserLocation(position) {
        map.setCenter({lat: position.coords.latitude, lng: position.coords.longitude});
    }

    // Preparing markers for map
    function prepareMarkers(locations) {
        for (i = 0; i < locations.length; i++) {
            if (markers[locations[i].id] == null) {
                var infowindow = new google.maps.InfoWindow({
                    content: templates.infoWindow.replace("::title::", locations[i].name).replace("::description::", locations[i].description)
                });
                var marker = new google.maps.Marker({
                    position: new google.maps.LatLng(locations[i].latitude, locations[i].longitude),
                    map: map,
                    contentInfo: infowindow
                });
                google.maps.event.addListener(marker, 'click', function () {
                    if (lastInfoWindow != null) lastInfoWindow.close();
                    map.panTo(this.position);
                    infowindow.open(map, this);
                    lastInfoWindow = infowindow;
                });
                markers[locations[i].id] = marker;
            }
        }
    }


    // function prepareMarkersList(locations) {
    //     $("#markers-list").html("");
    //     markersListCotent = "";
    //     currentMarkersListCount = 0;
    //     if (locations.length == 0) {
    //         markersListCotent = "No location found in the area";
    //     } else {
    //         for (i = 0; i < locations.length; i++) {
    //             currentMarkersListCount++;
    //             markersListCotent += "<div class='marker-list-item' onclick='itemClicked(" + locations[i].latitude + "," + locations[i].longitude + "," + locations[i].id + ")'>"
    //                 + templates.markerListItem.replace("::title::", locations[i].name).replace("::description::", locations[i].description)
    //                 + "</div>";
    //         }
    //     }
    //     $("#markers-list").html(markersListCotent);
    // }

    // Server side Requests
    // reloadMapView: Reloading map on view change
    function reloadMapView() {
        debug("Reloading map view data...");
        var northeastCurrent = map.getBounds().getNorthEast();
        var southwestCurrent = map.getBounds().getSouthWest();
        ajaxCall("/api/location/getLocationsInBoundary",{
            northeast: {latitude: northeastCurrent.lat(), longitude: northeastCurrent.lng()},
            southwest: {latitude: southwestCurrent.lat(), longitude: southwestCurrent.lng()}
        },function(data){
            prepareMarkers(data);
        });
    }
    // Searching map
    function search( searchQuery ){
        debug("INFO","searchQuery " + searchQuery);
        ajaxCall("/api/location/searchByName",
            { name : searchQuery } ,
            function(data){
            debug("INFO","Data " + data);
                prepareMarkers(data);
            });
    }

    // Context Menu
    function contextMenuZoomIn() {
        contextMenuHide();
        map.panTo({lat: $(".contextMenu").data('lat'), lng: $(".contextMenu").data('lng')});
        map.setZoom(map.getZoom() + 1);
    }

    function contextMenuZoomOut() {
        debug("Zooming out");
        contextMenuHide();
        map.panTo({lat: $(".contextMenu").data('lat'), lng: $(".contextMenu").data('lng')});
        map.setZoom(map.getZoom() - 1);
    }

    function contextMenuSetCenter() {
        debug("Setting center");
        contextMenuHide();
        map.panTo({lat: $(".contextMenu").data('lat'), lng: $(".contextMenu").data('lng')});
    }

    function contextMenuHide() {
        $(".contextMenu").hide();
    }

    

});