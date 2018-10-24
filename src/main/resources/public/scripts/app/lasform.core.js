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
    var userMarker = null;

    var e = {
        map : '#map',
        markerDetails : '#marker-details',
        searchDetailsCard : '.lf-search-details-card',
        searchInput : '#lf-search-input',
        searchButton : '#lf-search-button',
        searchCard : '.lf-search-card',
        searchContainer : '.if-search-container',
        markersList : '.lf-search-list',
        markerListItem : '.lf-marker-list-item',
        locationDetailsContainer : '.lf-location-details-container',
        locationDetails : '.lf-location-details',
        loadingContainer : '.lf-loading-container',
        backToSearchButton : '.lf-back-to-search-button',
        searchQuerySpan : '.lp-search-query',
        searchCardCloseButton : '.lf-search-card-close-button',
        locationDetailsTitle : ".if-location-details-title",
        userLocationButton : ".lf-user-location-button",
        userLocationButtonIcon : ".lf-user-location-button-icon"
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
            $(document).click(function(){
                contextMenuHide();
            });
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
            $(e.searchButton).click(function(){
                debug("INFO" , "Searching '"+$(e.searchInput).val()+"'");
                search($(e.searchInput).val());
            });

            $(e.backToSearchButton).click(function(){
                backToSearchList();
            });

            $(document).on( 'click' , e.markerListItem , function(){
                searchItemClicked($(this).data("lat"),$(this).data("lng"),$(this).data("id"));
            });

            $(e.searchCardCloseButton).click(function(){
                $(e.searchDetailsCard).hide();
                $(e.searchInput).val("");
            });

            $(e.userLocationButton).click(function(){
                getUserLocation();
            });

            // $(".marker-list-item").click(function(){
            //     debug("INFO","Clicked " + id);
            //     $( e.searchCard ).fadeOut();
            //     // if (lastInfoWindow != null) lastInfoWindow.close();
            //     // map.panTo({lat: lat, lng: lng});
            //     // var infowindow = markers[id].contentInfo;
            //     // infowindow.open(map, markers[id]);
            //     // lastInfoWindow = infowindow;
            //     // viewDetails(id);
            // });
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

    function searchItemClicked(lat, lng, id) {
        debug("INFO","Clicked " + id);
        viewDetails(id);
        if (lastInfoWindow != null) lastInfoWindow.close();
        map.panTo({lat: parseFloat(lat), lng: parseFloat(lng)});
        var infowindow = markers[id].contentInfo;
         if(markers[id].details.cover){
             $(e.locationDetailsTitle).css("height","160px");
             $(e.locationDetailsTitle).css("background-image","url(../img/locations/photo-"+id+".jpg)");
         } else {
             $(e.locationDetailsTitle).css("height","60px");
             $(e.locationDetailsTitle).css("background-image","");
         }
        infowindow.open(map, markers[id]);
        lastInfoWindow = infowindow;
    }

    function viewDetails(id) {
        $(e.locationDetails).html(markers[id].contentInfo.content);
        $(e.searchContainer).hide();
        $(e.searchDetailsCard).show()
        $(e.locationDetailsContainer).show();
    }

    function backToSearchList(){
        $(e.locationDetailsContainer).hide();
        $(e.searchContainer).show();
    }

    // Updating user location
    function getUserLocation() {
        if (navigator.geolocation) {
            $(e.userLocationButtonIcon).addClass("blinking");
            navigator.geolocation.getCurrentPosition(updateUserLocation);
            userLocationAvailable = true;
        } else {
            $(e.userLocationButtonIcon).removeClass("blinking");
            userLocationAvailable = false;
            debug("user location","Geolocation is not supported by this browser");
        }
    }

    function updateUserLocation(position) {
        $(e.userLocationButtonIcon).removeClass("blinking");
        if(userMarker == null ){
            var icon = {
                url: "../../img/icons/users-locations.png", // url
                scaledSize: new google.maps.Size(25, 25), // scaled size
            };
            userMarker = new google.maps.Marker({
                position: new google.maps.LatLng(position.coords.latitude, position.coords.longitude),
                map: map,
                icon: icon
            });
        } else {
            userMarker.setPosition(new google.maps.LatLng(position.coords.latitude, position.coords.longitude));
        }
        map.setCenter({lat: position.coords.latitude, lng: position.coords.longitude});
    }

    // Preparing markers for map
    function prepareMarkers(locations) {
        for (i = 0; i < locations.length; i++) {
            if (markers[locations[i].id] == null) {
                // var listItem = templates.infoWindow.replace("::title::", locations[i].name).replace("::description::", locations[i].description);
                // debug("COVER",locations[i].cover)
                // if(locations[i].cover){
                //     listItem.replace("::image::","<div class='lf-list-item image' style='background-image: url(\"../img/locations/photo-"+locations[i].id+".jpg\")' ></div>");
                // } else {
                //     listItem.replace("::image::","");
                // }
                var infowindow = new google.maps.InfoWindow({
                    content: templates.infoWindow.replace("::title::", locations[i].name).replace("::description::", locations[i].description)
                });
                var location = locations[i];
                var marker = new google.maps.Marker({
                    position: new google.maps.LatLng(locations[i].latitude, locations[i].longitude),
                    map: map,
                    contentInfo: infowindow,
                    details: location
                });
                google.maps.event.addListener(marker, 'click', function () {
                    if (lastInfoWindow != null) lastInfoWindow.close();
                    map.panTo(this.position);
                    infowindow.open(map, this);
                    lastInfoWindow = infowindow;
                    searchItemClicked(this.details.latitude,this.details.longitude,this.details.id);
                });
                markers[locations[i].id] = marker;
            }
        }
    }


    function prepareMarkersList(locations) {
        var markersListContent = "";
        currentMarkersListCount = 0;
        if (locations.length == 0) {
            markersListContent = "No location found in the area";
        } else {
            for (i = 0; i < locations.length; i++) {
                currentMarkersListCount++;
                var listItem = templates.markerListItem.replace("::title::", locations[i].name).replace("::description::", locations[i].description);
                if(locations[i].cover){
                    listItem = listItem.replace("::image::","<div class='image' style='background-image: url(\"../img/locations/photo-"+locations[i].id+".jpg\")' ></div>");
                } else {
                    listItem = listItem.replace("::image::","");
                }
                markersListContent += "<div class='lf-marker-list-item' data-lat='" + locations[i].latitude + "' data-lng='" + locations[i].longitude + "' data-id='"+locations[i].id+"'>"
                    + listItem
                    + "</div>";
            }
        }
        return markersListContent;
    }

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
        $(e.searchQuerySpan).html(searchQuery);
        $(e.searchDetailsCard).show()
        $(e.loadingContainer).show();
        $(e.searchContainer).show();
        $(e.locationDetailsContainer).hide();
        ajaxCall("/api/location/searchByName",
            { name : searchQuery } ,
            function(data){
                debug("INFO","Data Size : " + data.length);
                $(e.loadingContainer).hide();
                $(e.markersList).html(prepareMarkersList(data));
                $(e.markersList).niceScroll();
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