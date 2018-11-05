templates = {
    infoWindow : '<div class="lf-info-window">{{image}}<div class="details"><span class="title">{{title}}</span><p class="description">{{description}}</p></div></div>',
    markerListItemOld : '{{image}}<div class="details"><span class="title">{{title}}</span><br/><span class="description" >{{description}}</span></div></div>',
    markerListItemImage : '<img ng-src="{{src}}" class="md-avatar" alt="{{title}}" ng-if="cover==\'true\'" />',
    markerListItem : '<img ng-src="../img/locations/photo-{{location.id}}.jpg" class="md-avatar" alt="{{location.name}}" ng-if="location.cover" /><div class="md-list-item-text" layout="column"><h3>{{location.name}}</h3><h4>{{location.rating}}</h4><p>{{location.description}}</p></div>',
    infoDetails : ''
}
