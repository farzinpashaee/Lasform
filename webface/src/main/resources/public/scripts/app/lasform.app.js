var app = angular.module('lfApp', ['ngMaterial']);
app.controller('mapCtrl',  function($scope, $http , lfServices ) {

        var mapCtrl = this;
        var map;
        var contextmenu;
        var boundChangeTimeoutId = 0;
        var markers = [];
        var currentMarkersListCount = 0;
        var lastInfoWindow = null;
        var userLocationAvailable = false;
        var userMarker = null;
        var userCurrentLocation = null;
        var directionsService = new google.maps.DirectionsService();
        var directionsDisplay = new google.maps.DirectionsRenderer({ polylineOptions: { strokeColor: "#8b0013" } });
        var coreServiceUrl = "http://localhost:8088/";

        var CONFIG = { MAP_DRAG_DELAY : 1000 , DEFAULT_ZOOM : 14 }
        var STYLE = [
            {
                "featureType": "all",
                "elementType": "labels.text.fill",
                "stylers": [
                    {"saturation": 36},
                    {"color": "#000000"},
                    {"lightness": 40}
                ]
            },
            {
                "featureType": "all",
                "elementType": "labels.text.stroke",
                "stylers": [
                    {"visibility": "on"},
                    {"color": "#000000"},
                    {"lightness": 16}
                ]
            },
            {
                "featureType": "all",
                "elementType": "labels.icon",
                "stylers": [{"visibility": "off"}]
            },
            {
                "featureType": "administrative",
                "elementType": "geometry.fill",
                "stylers": [
                    {"color": "#000000"},
                    {"lightness": 20}
                ]
            },
            {
                "featureType": "administrative",
                "elementType": "geometry.stroke",
                "stylers": [
                    {"color": "#000000"},
                    {"lightness": 17},
                    {"weight": 1.2}
                ]
            },
            {
                "featureType": "landscape",
                "elementType": "geometry",
                "stylers": [{"color": "#000000"},
                    {"lightness": 20}
                ]
            },
            {
                "featureType": "poi",
                "elementType": "geometry",
                "stylers": [
                    {"color": "#000000"},
                    {"lightness": 21}
                ]
            },
            {
                "featureType": "road.highway",
                "elementType": "geometry.fill",
                "stylers": [
                    {"color": "#000000"},
                    {"lightness": 17}
                ]
            },
            {
                "featureType": "road.highway",
                "elementType": "geometry.stroke",
                "stylers": [
                    {"color": "#000000"},
                    {"lightness": 29},
                    {"weight": 0.2}
                ]
            },
            {
                "featureType": "road.arterial",
                "elementType": "geometry",
                "stylers": [
                    {"color": "#000000"},
                    {"lightness": 18}
                ]
            },
            {
                "featureType": "road.local",
                "elementType": "geometry",
                "stylers": [
                    {"color": "#000000"},
                    {"lightness": 16}
                ]
            },
            {
                "featureType": "transit",
                "elementType": "geometry",
                "stylers": [
                    {"color": "#000000"},
                    {"lightness": 19}
                ]
            },
            {
                "featureType": "water",
                "elementType": "geometry",
                "stylers": [
                    {"color": "#000000"},
                    {"lightness": 17}
                ]
            }
        ]
        var e = {
            map : '#map',
            markerDetails : '#marker-details',
            markersList : '#lf-search-list',
            searchInput: '.lf-search-input',
            searchButton: '.lf-search-button',
            searchQuerySpan : '.lp-search-query',
            userLocationButton : '.lf-user-location-button',
            userLocationButtonIcon : '.lf-user-location-button-icon',
            listItemContainer : '.lf-list-item-container',
            locationDetailsRating : '.lf-location-rating',
            uiLoading : '.lf-ui-loading',
            lfRoutingDetails : '.lf-routing-details',
            contextmenu : '.lf-contextmenu'
        };

        // Preparing Application
        $( document ).ready(function() {
            $scope.init();
        });

        $scope.init = function(){
            lfServices.log(lfServices.LOG.INFO,"Preparing Application");
            $scope.prepareUI();
            $scope.initMap();
        }

        $scope.prepareUI = function(){
            lfServices.log(lfServices.LOG.INFO,"Preparing User Interface");

            // Disable context menu
            document.oncontextmenu = function () {return false;}
            $("#zoomIn").click(function(){ contextmenuZoomIn(); });
            $("#zoomOut").click(function(){ contextmenuZoomOut(); });
            $("#setCenter").click(function(){ contextmenuSetCenter(); });
            $("#imHere").click(function(){ contextmenuImHere(); });
            $("#directionFromHere").click(function(){ contextmenuDirectionFromHere(); });
            $("#addLocation").click(function(){ contextmenuAddNewLocation(); });

            // Hide context menu on click anywhere
            $(document).click(function(){ contextmenuHide(); });
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
            $scope.routingDetailsView = false;
            $scope.loadingMessage = "Searching...";

            $scope.locationDetails = {id:0,name:"No name",description:"No description",cover:false};
            setTimeout(function(){
                $(e.uiLoading).fadeOut();
            },500);
        }

        $scope.initMap = function(){
            lfServices.log(lfServices.LOG.INFO,"Initiating Map");
            onViewResize();
            lfServices.restCall("POST","http://localhost:8088/api/webDelegate/initialSetting" , {} ,function (payload) {
                lfServices.log(lfServices.LOG.INFO,"InitialSetting loaded");
                // Creating map
                map = new google.maps.Map(document.getElementById(e.map.substr(1,e.map.length-1)), {
                    center: {lat: parseInt(payload.initialMapCenter.latitude) , lng:  parseInt(payload.initialMapCenter.longitude)},
                    zoom: CONFIG.DEFAULT_ZOOM ,
                    disableDefaultUI: true,
                    styles: STYLE
                });
                // Adding change bound listener
                google.maps.event.addListener(map, 'bounds_changed', function () {
                    clearTimeout(boundChangeTimeoutId);
                    boundChangeTimeoutId = setTimeout(function () {
                        reloadMapView();
                    }, CONFIG.MAP_DRAG_DELAY);
                });
                // Adding context menu
                contextmenu = google.maps.event.addListener(map,"rightclick",function (event) {
                        $(e.contextmenu).css({top: event.pixel.y, left: event.pixel.x, position: 'absolute'});
                        $(e.contextmenu).show();
                        $(e.contextmenu).data('lat', event.latLng.lat());
                        $(e.contextmenu).data('lng', event.latLng.lng());
                    }
                );
                directionsDisplay.setOptions({map: map, suppressMarkers: true});
                // Check user location policy
                if(payload.userLocationPolicy) getUserLocation();
            });
        }

        function reloadMapView(){
            lfServices.log(lfServices.LOG.INFO,"Reloading map view data...");
            // Checking map bound area
            var northeastCurrent = map.getBounds().getNorthEast();
            var southwestCurrent = map.getBounds().getSouthWest();
            lfServices.restCall("POST",coreServiceUrl + "api/location/getLocationsInBoundary",{
                northeast: {latitude: northeastCurrent.lat(), longitude: northeastCurrent.lng()},
                southwest: {latitude: southwestCurrent.lat(), longitude: southwestCurrent.lng()}
            },function(payload){
                prepareMarkers(payload);
            });
        }

        function prepareMarkers(locations) {
            lfServices.log(lfServices.LOG.INFO,"Preparing markers");
            for (var i = 0; i < locations.length; i++) {
                if (markers[locations[i].id] == null) {
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
                    markers[locations[i].id] = marker;
                }
            }
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
                lfServices.log(lfServices.LOG.DEBUG,"user location","Geolocation is not supported by this browser");
            }
        }

        function updateUserLocation(position) {
            lfServices.log(lfServices.LOG.INFO,"Updating user location");
            $(e.userLocationButtonIcon).removeClass("blinking");
            if(userMarker == null ){
                var icon = {
                    url: "../../img/icons/user-marker.svg",
                    scaledSize: new google.maps.Size(35, 35),
                };
                userMarker = new google.maps.Marker({
                    position: new google.maps.LatLng(position.coords.latitude, position.coords.longitude),
                    map: map,
                    icon: icon
                });

            } else {
                userMarker.setPosition(new google.maps.LatLng(position.coords.latitude, position.coords.longitude));
            }
            userCurrentLocation = {latitude : position.coords.latitude, longitude: position.coords.longitude};
            map.setCenter({lat: position.coords.latitude, lng: position.coords.longitude});
        }

        function viewItemDetails(id) {
            $(e.locationDetails).html(markers[id].contentInfoWindow.content);
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
            $scope.loadingMessage = "Searching...";
            $scope.loadingView = true;
            $scope.searchListView = false;
            $scope.locationDetailsView = false;
            lfServices.restCall("POST","/api/location/searchLocationByName",
                { name : searchQuery } ,
                function(data){
                    $scope.loadingView = false;
                    $scope.searchListView = true;
                    $scope.searchResult = data;
                    prepareMarkers(data);
                    $(e.listItemContainer).niceScroll();
                });
        }

        $scope.showDetailsFromList = function(location){
            $scope.locationDetails = location;
            $(e.locationDetailsRating).html(lfServices.renderRating(location.rating));
            this.focusLocation(location);
            $scope.searchListView = false;
            $scope.locationDetailsView = true;
        }

        $scope.backToList = function(){
            $scope.searchListView = true;
            $scope.locationDetailsView = false;
        }

        $scope.backToDetails = function(){
            $scope.locationDetailsView = true;
            $scope.routingDetailsView = false;
        }

        $scope.focusLocation = function(location){
            map.panTo({lat: parseFloat(location.latitude), lng: parseFloat(location.longitude)});
            this.showInfoWindow(location);
        }

        $scope.showInfoWindow = function(location){
            if (lastInfoWindow != null) lastInfoWindow.close();
            var infowindow = markers[location.id].contentInfoWindow;
            infowindow.open(map, markers[location.id]);
            lastInfoWindow = infowindow;
        }

        $scope.routWithPath = function(destination,origin) {
            $scope.loadingMessage = "Routing...";
            $scope.loadingView = true;
            $scope.locationDetailsView = false;
            if(origin==null){
                if(userCurrentLocation==null){
                    return false;
                } else {
                    origin = userCurrentLocation;
                }
            }
            var request = {
                origin: new google.maps.LatLng(origin.latitude, origin.longitude),
                destination: new google.maps.LatLng(destination.latitude, destination.longitude),
                travelMode: 'DRIVING'
            };
            directionsService.route(request, function(result, status) {
                $scope.loadingView = false;
                $scope.routingDetailsView = true;
                if (status == 'OK') {
                    console.log(result);
                    directionsDisplay.setDirections(result);
                    // parse address description
                    $scope.routSteps = result.routes[0].legs[0].steps;
                } else {
                    // NOT_FOUND,ZERO_RESULTS,MAX_WAYPOINTS_EXCEEDED,MAX_ROUTE_LENGTH_EXCEEDED,INVALID_REQUEST,
                    // OVER_QUERY_LIMIT,REQUEST_DENIED,UNKNOWN_ERROR
                    lfServices.log(lfServices.ERR,"Status : " + status);
                    $(e.lfRoutingDetails).html("Rout not found!");
                }
            });
        }



        $scope.routTo = function(destination,origin) {
            $scope.loadingView = true;
            if(origin==null){
                if(userCurrentLocation==null){
                    return false;
                } else {
                    origin = userCurrentLocation;
                }
            }
            lfServices.restCall("POST", "/api/thirdParty/mapDirection/" ,
                    {origin:{latitude:origin.latitude,longitude:origin.longitude},
                    destination:{latitude:destination.latitude,longitude:destination.longitude},
                    mode:"driving"},
                function (data) {
                    $scope.loadingView = false;
                    console.log(data);
            });

        }


        $scope.test = function() {
            lfServices.log(lfServices.LOG.DEBUG,"-----------------");
        }

        $scope.showAdvanced = function(ev) {
            lfServices.log(lfServices.LOG.DEBUG,"Add new location using context menu");
            $mdDialog.show({
                controller: DialogController,
                templateUrl: 'addNewLocation.html',
                parent: angular.element(document.body),
                targetEvent: ev,
                clickOutsideToClose:true,
                fullscreen: false // Only for -xs, -sm breakpoints.
            })
                .then(function(answer) {
                    $scope.status = 'You said the information was "' + answer + '".';
                }, function() {
                    $scope.status = 'You cancelled the dialog.';
                });
        };

        function DialogController($scope, $mdDialog) {
            $scope.hide = function() {
                $mdDialog.hide();
            };

            $scope.cancel = function() {
                $mdDialog.cancel();
            };

            $scope.answer = function(answer) {
                $mdDialog.hide(answer);
            };
        }

        function showDetailsFromMarker(location){
            $scope.locationDetails = location;
            $scope.searchListView = false;
            $scope.locationDetailsView = true;
        }

        // Context Menu
        function contextmenuZoomIn(){
            contextmenuHide();
            map.panTo({lat: $(e.contextmenu).data('lat'), lng: $(e.contextmenu).data('lng')});
            map.setZoom(map.getZoom() + 1);
        }
        function contextmenuZoomOut(){
            contextmenuHide();
            map.panTo({lat: $(e.contextmenu).data('lat'), lng: $(e.contextmenu).data('lng')});
            map.setZoom(map.getZoom() - 1);
        }

        function contextmenuSetCenter(){
            contextmenuHide();
            map.panTo({lat: $(e.contextmenu).data('lat'), lng: $(e.contextmenu).data('lng')});
        }

        function contextmenuImHere(){
            contextmenuHide();
            updateUserLocation({coords:{latitude:$(e.contextmenu).data('lat'),longitude:$(e.contextmenu).data('lng')}});
        }
        
        function contextmenuDirectionFromHere(){
            contextmenuHide();
        }

        function contextmenuAddNewLocation(){
            lfServices.log(lfServices.LOG.DEBUG,"Add new location using context menu");
        }

        function contextmenuHide() {
            $(e.contextmenu).hide();
        }


    })

app.filter('trustAsHtml',['$sce', function($sce) {
        return function(text) {
            return $sce.trustAsHtml(text);
        };
    }]);