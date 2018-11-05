var app = angular.module('lfApp', ['ngMaterial']);
app.controller('mapCtrl', function($scope, $http , lfServices ) {

        var map;
        var contextMenu;
        var boundChangeTimeoutId = 0;
        $scope.markers = [];
        var currentMarkersListCount = 0;
        var lastInfoWindow = null;
        var userLocationAvailable = false;
        var userMarker = null;

        var CONFIG = { MAP_DRAG_DELAY : 1000 }
        var e = {
            map : '#map',
            markerDetails : '#marker-details',
            contextMenu: ".contextMenu",
            searchInput: '.lf-search-input',
            searchButton: '.lf-search-button',
            searchQuerySpan : '.lp-search-query',
            markersList : '#lf-search-list',
            userLocationButtonIcon : '.lf-user-location-button-icon',
            listItemContainer : '.lf-list-item-container'
        };

        // Preparing Application
        $( document ).ready(function() {
            prepare();
        });

        function prepare(){
            lfServices.log(lfServices.LOG.INFO,"Preparing Application");
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
                    search($scope.searchQuery);
                }
            });
            // On search button clicked
            $(e.searchButton).click(function(){
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

            $(e.listItemContainer).niceScroll();

            $scope.loadingView = false;
            $scope.searchListView = false;
            $scope.locationDetailsView = false;
        }

        function initMap(){
            onViewResize();
            lfServices.restCall("POST","/api/location/initialSetting" , {} ,function (payload) {
                lfServices.log(lfServices.LOG.INFO,"InitialSetting loaded");
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
            lfServices.log(lfServices.LOG.INFO,"Reloading map view data...");
            // Checking map bound area
            var northeastCurrent = map.getBounds().getNorthEast();
            var southwestCurrent = map.getBounds().getSouthWest();
            lfServices.restCall("POST","/api/location/getLocationsInBoundary",{
                northeast: {latitude: northeastCurrent.lat(), longitude: northeastCurrent.lng()},
                southwest: {latitude: southwestCurrent.lat(), longitude: southwestCurrent.lng()}
            },function(payload){
                prepareMarkers(payload);
            });
        }

        function prepareMarkers(locations) {
            lfServices.log(lfServices.LOG.INFO,"Preparing markers");
            for (var i = 0; i < locations.length; i++) {
                if ($scope.markers[locations[i].id] == null) {
                    var listItemContent = lfServices.renderView([
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
                    $scope.markers[locations[i].id] = marker;
                }
            }
        }

        function listItemClicked(lat, lng, id) {
            lfServices.log(lfServices.LOG.INFO,"List item clicked id : " + id);
            if (lastInfoWindow != null) lastInfoWindow.close();
            if($scope.markers[id].details.cover){
                $(e.locationDetailsTitle).css("height","160px");
                $(e.locationDetailsTitle).css("background-image","url(../img/locations/photo-"+id+".jpg)");
            } else {
                $(e.locationDetailsTitle).css("height","60px");
                $(e.locationDetailsTitle).css("background-image","");
            }
            viewItemDetails(id);
            map.panTo({lat: parseFloat(lat), lng: parseFloat(lng)});
            $scope.markers[id].contentInfoWindow.open(map, $scope.markers[id]);
            lastInfoWindow = $scope.markers[id].contentInfoWindow;
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
                lfServices.log(lfServices.LOG.DEBUG,"user location","Geolocation is not supported by this browser");
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
            $(e.locationDetails).html($scope.markers[id].contentInfoWindow.content);
            $(e.searchContainer).hide();
            $(e.searchDetailsCard).show()
            $(e.locationDetailsContainer).show();
        }

        function renderMarkersList(locations) {
            var markersListContent = "";
            currentMarkersListCount = 0;
            if (locations.length == 0) {
                markersListContent = "No location found in the area";
            } else {
                for (var i = 0; i < locations.length; i++) {
                    currentMarkersListCount++;
                    var image =  (locations[i].cover ? lfServices.renderView([{key:"src",value:"../img/locations/photo-"+locations[i].id+".jpg"}],templates.markerListItemImage) : "");
                    var listItem = lfServices.renderView([
                            {key:"title",value:locations[i].name},
                            {key:"description",value:locations[i].description},
                            {key:"image",value:image}],
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
            lfServices.log(lfServices.LOG.DEBUG,"Searching query '" + searchQuery + "'");
            $scope.searchedQuery = searchQuery;
            $scope.loadingView = true;
            $scope.searchListView = false;
            $scope.locationDetailsView = false;
            lfServices.restCall("POST","/api/location/searchByName",
                { name : searchQuery } ,
                function(data){
                    $scope.loadingView = false;
                    $scope.searchListView = true;
                    $scope.searchResult = data;
                    prepareMarkers(data);
                    $(e.listItemContainer).niceScroll();
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



    })