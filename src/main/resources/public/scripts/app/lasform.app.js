angular.module('lfApp', ['ngMaterial'])
    .controller('mapCtrl', function($scope, $http) {

        var map;
        var contextMenu;
        var boundChangeTimeoutId = 0;
        var markers = [];
        var currentMarkersListCount = 0;
        var lastInfoWindow = null;
        var userLocationAvailable = false;
        var userMarker = null;

        var CONFIG = { MAP_DRAG_DELAY : 1000 }
        var LOG = { INFO : "info" , DEBUG : "debug" , ERR : "ERROR" , DEBUG_NO_TAG : "debugNoTag" }
        var e = {
            map : '#map',
            markerDetails : '#marker-details',
            contextMenu: ".contextMenu",
            searchInput: '.lf-search-input',
            searchButton: '.lf-search-button',
            userLocationButtonIcon : ".lf-user-location-button-icon"
        };

        // Preparing Application
        prepare();

        function prepare(){
            log(LOG.INFO,"Preparing Application");
            prepareUI();
            initMap();
        }

        function prepareUI(){
            // Disable context menu
            // document.oncontextmenu = function () {return false;}
            // Hide context menu on click anywhere
            $(document).click(function(){ contextMenuHide(); });
            // on window resize
            $(window).resize(function () { onViewResize(); });
            $(window).ready(function () {
                onViewResize();
            });
            // On press Enter in search input
            $(e.searchInput).keyup(function(event){
                if(event.keyCode == 13){
                    log(LOG.INFO, "Searching '"+$scope.searchQuery+"'");
                    search($scope.searchQuery);
                }
            });
            // On search button clicked
            $(e.searchButton).click(function(){
                log(LOG.INFO, "Searching '"+$scope.searchQuery+"'");
                search($scope.searchQuery);
            });
            // Click on maker list item
            $(document).on( 'click' , e.markerListItem , function(){
                //searchItemClicked($(this).data("lat"),$(this).data("lng"),$(this).data("id"));
            });
            // Find user's location
            $(e.userLocationButton).click(function(){
                getUserLocation();
            });
        }

        function initMap(){
            onViewResize();
            restCall("POST","/api/location/initialSetting" , {} ,function (payload) {
                log(LOG.INFO,"InitialSetting loaded");
                // Creating map
                map = new google.maps.Map(document.getElementById(e.map.substr(1,e.map.length-1)), {
                    center: {lat: parseInt(payload.initialMapCenter.latitude) , lng:  parseInt(payload.initialMapCenter.longitude)},
                    zoom: 14,
                    disableDefaultUI: true
                });
                // Adding change bound listener
                google.maps.event.addListener(map, 'bounds_changed', function () {
                    clearTimeout(boundChangeTimeoutId);
                    boundChangeTimeoutId = setTimeout(function () {
                        reloadMapView();
                    }, CONFIG.MAP_DRAG_DELAY);
                });
                // Adding context menu
                contextMenu = google.maps.event.addListener(map,"rightclick",function (event) {
                        $(".contextMenu").css({top: event.pixel.y, left: event.pixel.x, position: 'absolute'});
                        $(".contextMenu").show();
                        $('.contextMenu').data('lat', event.latLng.lat());
                        $('.contextMenu').data('lng', event.latLng.lng());
                    }
                );
                // Check user location policy
                if(payload.userLocationPolicy) getUserLocation();
            });
        }

        function reloadMapView(){
            log(LOG.INFO,"Reloading map view data...");
            var northeastCurrent = map.getBounds().getNorthEast();
            var southwestCurrent = map.getBounds().getSouthWest();
            restCall("POST","/api/location/getLocationsInBoundary",{
                northeast: {latitude: northeastCurrent.lat(), longitude: northeastCurrent.lng()},
                southwest: {latitude: southwestCurrent.lat(), longitude: southwestCurrent.lng()}
            },function(payload){
                prepareMarkers(payload);
            });
        }

        function prepareMarkers(locations) {
            for (var i = 0; i < locations.length; i++) {
                if (markers[locations[i].id] == null) {
                    var listItemContent = renderView([
                        {key:"title",value:locations[i].name},
                        {key:"description",value:locations[i].description},
                        {key:"image",value:(locations[i].cover ? "<div class='image' style='background-image: url(\"../img/locations/photo-"+locations[i].id+".jpg\")' ></div>":"")}],
                        templates.infoWindow);
                    var infoWindow = new google.maps.InfoWindow({
                        content: listItemContent
                    });
                    var location = locations[i];
                    var marker = new google.maps.Marker({
                        position: new google.maps.LatLng(locations[i].latitude, locations[i].longitude),
                        map: map,
                        contentInfoWindow: infoWindow,
                        details: location
                    });
                    google.maps.event.addListener(marker, 'click', function () {
                        if (lastInfoWindow != null) lastInfoWindow.close();
                        map.panTo(this.position);
                        infoWindow.open(map, this);
                        lastInfoWindow = infoWindow;
                        listItemClicked(this.details.latitude,this.details.longitude,this.details.id);
                    });
                    markers[locations[i].id] = marker;
                }
            }
        }

        function listItemClicked(lat, lng, id) {
            log(LOG.INFO,"Clicked " + id);
            if (lastInfoWindow != null) lastInfoWindow.close();
            if(markers[id].details.cover){
                $(e.locationDetailsTitle).css("height","160px");
                $(e.locationDetailsTitle).css("background-image","url(../img/locations/photo-"+id+".jpg)");
            } else {
                $(e.locationDetailsTitle).css("height","60px");
                $(e.locationDetailsTitle).css("background-image","");
            }
            viewItemDetails(id);
            map.panTo({lat: parseFloat(lat), lng: parseFloat(lng)});
            markers[id].contentInfoWindow.open(map, markers[id]);
            lastInfoWindow = markers[id].contentInfoWindow;
        }

        // Updating user location
        function getUserLocation() {
            if (navigator.geolocation) {
                //$(e.userLocationButtonIcon).addClass("blinking");
                navigator.geolocation.getCurrentPosition(updateUserLocation);
                userLocationAvailable = true;
            } else {
                //$(e.userLocationButtonIcon).removeClass("blinking");
                userLocationAvailable = false;
                log(LOG.DEBUG,"user location","Geolocation is not supported by this browser");
            }
        }

        function updateUserLocation(position) {
            $(e.userLocationButtonIcon).removeClass("blinking");
            if(userMarker == null ){
                var icon = {
                    url: "../../img/icons/users-locations.png",
                    scaledSize: new google.maps.Size(25, 25),
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

        function viewItemDetails(id) {
            $(e.locationDetails).html(markers[id].contentInfoWindow.content);
            $(e.searchContainer).hide();
            $(e.searchDetailsCard).show()
            $(e.locationDetailsContainer).show();
        }

        function prepareMarkersList(locations) {
            var markersListContent = "";
            currentMarkersListCount = 0;
            if (locations.length == 0) {
                markersListContent = "No location found in the area";
            } else {
                for (var i = 0; i < locations.length; i++) {
                    currentMarkersListCount++;
                    var listItem = renderView([
                            {key:"title",value:locations[i].name},
                            {key:"description",value:locations[i].description},
                            {key:"image",value:(locations[i].cover ? "<div class='image' style='background-image: url(\"../img/locations/photo-"+locations[i].id+".jpg\")' ></div>":"")}],
                        templates.markerListItem);
                    markersListContent += "<div class='lf-marker-list-item' data-lat='" + locations[i].latitude + "' data-lng='" + locations[i].longitude + "' data-id='"+locations[i].id+"'>"
                        + listItem
                        + "</div>";
                }
            }
            return markersListContent;
        }

        function onViewResize(){
            $(e.map).height($(window).height());
        }

        function search( searchQuery ){
            log(LOG.DEBUG,"searchQuery " + searchQuery);
            $(e.searchQuerySpan).html(searchQuery);
            $(e.searchDetailsCard).show()
            $(e.loadingContainer).show();
            $(e.searchContainer).show();
            $(e.locationDetailsContainer).hide();
            restCall("POST","/api/location/searchByName",
                { name : searchQuery } ,
                function(data){
                    log(LOG.DEBUG,"Data Size : " + data.length);
                    $(e.loadingContainer).hide();
                    $(e.markersList).html(prepareMarkersList(data));
                    prepareMarkers(data);
                });
        }

        // Context Menu
        function contextMenuZoomIn() {
            contextMenuHide();
            map.panTo({lat: $(e.contextMenu).data('lat'), lng: $(e.contextMenu).data('lng')});
            map.setZoom(map.getZoom() + 1);
        }

        function contextMenuZoomOut() {
            contextMenuHide();
            map.panTo({lat: $(e.contextMenu).data('lat'), lng: $(e.contextMenu).data('lng')});
            map.setZoom(map.getZoom() - 1);
        }

        function contextMenuSetCenter() {
            contextMenuHide();
            map.panTo({lat: $(e.contextMenu).data('lat'), lng: $(e.contextMenu).data('lng')});
        }

        function contextMenuHide() {
            $(e.contextMenu).hide();
        }

        function renderView( items , template ){
            var view = template;
            for(var i = 0 ; i < items.length ; i++){
                view = view.replace( "::"+(items[i].key)+"::" , items[i].value );
            }
            return view;
        }

        function restCall( method , url  , data , callback ){
            $http({ method : method,
                url : url,
                data : data
            }).then(function mySuccess(response) {
                log(LOG.DEBUG_NO_TAG,response.data);
                if(response.data.state){
                    callback(response.data.payload);
                } else {
                    log(LOG.ERR,"Error fetching data from " + url);
                }
            }, function myError(err) {
                log(LOG.ERR,err);
            });
        }

        function log( tag , description) {
            if (tag === LOG.ERR) {
                console.error(tag + " : " + description);
            } else if ( tag === LOG.DEBUG_NO_TAG ) {
                console.log(description);
            } else {
                console.log(tag + " : " + description);
            }
        }

    });