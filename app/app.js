class ArtistService {
    constructor(url, app_key = 'test') {
        this.app_key = app_key;
        this.url = url;
    }

    getSingleArtist(artistName) {
        return this.fetchApi(`${this.url}/artists/${artistName}?app_id=${this.app_key}`);
    }

    getArtistEvent(artistName, dateStart, dateEnd) {
        if(!dateStart || !dateEnd){
            return this.fetchApi(`${this.url}/artists/${artistName}/events?app_id=${this.app_key}`);
        } else {
            return this.fetchApi(`${this.url}/artists/${artistName}/events?app_id=${this.app_key}&date=${dateStart}%2C${dateEnd}`);
        }
        
    }

    fetchApi(url) {
        // ES2017
        return new Promise((resolve, reject) => {
                fetch(url).then(response => {
                    let contentType = response.headers.get("content-type");
                    if (contentType && contentType.includes("application/json") && response.status === 200) {
                        resolve(response.json());
                    } else {
                        reject({status: 'failed'});
                    }
                }).catch(function(error) {});
            
        });
    }
}

// model
const OfferModel = Backbone.Model.extend({
    defaults: {
        'type': '',
        'url': '',
        'status': ''
    },    
})

const VenueModel = Backbone.Model.extend({
    defaults: {
        'name': '',
        'latitude': '',
        'longitude': '',
        'city': '',
        'region': '',
        'country': ''
    },    
})

const EventModel = Backbone.Model.extend({
    defaults: {
        'id': '',
        'artist_id': '',
        'url': '',
        'on_sale_datetime': '',
        'datetime': '',
        'venue': new VenueModel(),
        'offers': new Backbone.Collection(null, {model: OfferModel}),
        'lineup': []
    },    
})

const ArtistModel = Backbone.Model.extend({
    defaults: {
        'id': '',
        'name': '',
        'url': '',
        'image_url': '',
        'thumb_url': '',
        'facebook_page_url': '',
        'mbid': '',
        'tracker_count': 0,
        'upcoming_event_count': 0,
    },    
    
    initialize: function (artistName='', dateStart='', dateEnd='') {
        this.artistService = new ArtistService('https://rest.bandsintown.com');
        this.artistName = artistName;
        this.dateStart = dateStart;
        this.dateEnd = dateEnd;
        this.eventCollection = new Backbone.Collection(null, {model: EventModel});
    },

    load: function(){
        return this.artistService.getSingleArtist(this.artistName).then((responseArtist)=>{
            this.set(responseArtist);
            return this.artistService.getArtistEvent(this.artistName, this.dateStart, this.dateEnd)
        }, this).then((responseEvents)=>{
            responseEvents.forEach(event => {
                let eventModel = new EventModel(event);
                eventModel.set({
                    'venue': new VenueModel(event.venue),
                    'offers': new Backbone.Collection(null, {model: OfferModel})
                });
                event.offers.forEach(offer => {
                    eventModel.get('offers').push(new OfferModel(offer))    
                })
                this.eventCollection.push(eventModel);
            });
        }, this);
    }
});


// view
const ArtistView = Backbone.View.extend({
        events: {
            'click .js-search-button': 'onSearch',
            'keyup input.autocomplete': 'onAutocomplete',
            'change #name': 'onCheckName',
            'change .datepicker-start': 'onChangeDateEnd',
            'change .datepicker-end': 'onChangeDateStart'
        },

        initialize: function() {
            this.$el.find('.datepicker').pickadate({
                selectMonths: true,
                selectYears: 15,
                today: 'Today',
                clear: 'Clear',
                close: 'Ok',
                closeOnSelect: true
              });
              this.$el.find('.js-table').hide();
            this.$el.find('.js-progress').hide();
              
          this.artistService = new ArtistService('https://rest.bandsintown.com');
        },

        onCheckName(){
            console.log(this.$el.find('#name').val())
            if(!!this.$el.find('#name').val()){
                this.$el.find('.js-search-button').removeClass("disabled");
            } else {
                this.$el.find('.js-search-button').addClass("disabled");
            }
        },

        onChangeDateStart(){
            this.$el.find('.datepicker-start').pickadate('picker').set({
                max: new Date(this.$el.find('.datepicker-end').val()),
            });
        },

        onChangeDateEnd(){
            this.$el.find('.datepicker-end').pickadate('picker').set({
                min: new Date(this.$el.find('.datepicker-start').val()),
            });
        },

        onSearch(){
            let name = this.$el.find('#name').val();
            if(!!name){
                let dateStart = this.$el.find('.datepicker-start').val();
                let dateEnd = this.$el.find('.datepicker-end').val();
                this.artistModel = new ArtistModel(name, this.parseDate(dateStart), this.parseDate(dateEnd));
                this.load().then(()=>{
                    this.renderTable();
                });
            }
        },

        parseDate(date){
            if(!!date) {
                let dateFormat = new Date(date);
                return `${dateFormat.getFullYear()}-${this.parseDateNumber(dateFormat.getMonth()+1)}-${this.parseDateNumber(dateFormat.getDate())}`;
            } else {
                return ''
            }
        },

        parseDateNumber(dateNumber){
            return ("0" + dateNumber).slice(-2);
        },

        onAutocomplete(){
            let name = this.$el.find('#name').val();
            if(!!name){
                this.artistService.getSingleArtist(name).then(response => {
                    this.$el.find('.js-help-list').html(`<option value="${response.name}">`)
                });
            }
            
        },

        load(){
            this.showLoaderAndHideTable();
            return this.artistModel.load().then(()=>{
                this.hideLoaderAndShowTable();
            }).catch(()=>{
                this.hideLoaderAndShowTable();
            });
            
        },

        showLoaderAndHideTable(){
            this.$el.find('.js-table').hide();
            this.$el.find('.js-progress').show();
        },

        hideLoaderAndShowTable(){
            this.$el.find('.js-progress').hide();
            this.$el.find('.js-table').show();
        },

        renderTable: function(){
            this.$el.find('#js-table-body').html('');
            this.artistModel.eventCollection.models.forEach(event => {
                let venue = event.get('venue');
                this.$el.find('#js-table-body').append(`<tr>
                <td>${this.artistModel.get('name')}</td>
                <td>${event.get('datetime')}</td>
                <td>${venue.get('country')}</td>
                <td>${venue.get('city')}</td>
                <td>${event.get('url')}</td>
                </tr>`);
            })            
        }
    });

$(document).ready(function () {
    let view = new ArtistView({el: $('.app')});
});