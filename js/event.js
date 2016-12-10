
/**
 * Usage
 *
 * var eventApi = new ndEvent("http://notts-digital.pavlakis.info/index.php");
 * eventApi.load(groupsArray);
 * eventApi.getByGroup("PHPMinds");
 *
 * Note: Dealing with async events. Wrap around $(document).ajaxStop(function(){}); or use Promises
 */


var NDEvent = function (args) {
    this.apiUrl = args.api;
    this.events = [];

    if (!window.localStorage) {
        this.cache = false;
    } else {
        this.cache = window.localStorage;
        this.refreshCache();
    }
};

NDEvent.prototype.renderEvents = function (groupNodes) {

    var self = this;

    groupNodes.each(function (index, node) {

        var groupName = $.trim($(node).html());

        if (self.getByGroup(groupName) && self.getByGroup(groupName).group) {

            var data = self.getByGroup(groupName);
            var date = data.date_time;
            date = date.replace('at ', '');
            // Wednesday 5th October 2016 7:00pm
            var niceDate = moment(date, 'dddd Do MMMM YYYY h:mma').format('Do MMMM');
            $(node).parent().parent().find('.event__date').append(' — Next: <a class="event__next" href="' + data.event_url + '" title="' + data.date_time + '">' + niceDate + '</a>');
            if (data.iso_date == '') {
                data.iso_date = '1970-01-01T00:00:00+00:00';
            }

            $(node).parent().parent().attr("data-isodate", data.iso_date);

        }

    });


};


NDEvent.prototype.getByGroup = function (groupName) {

    if (!this.isCached(groupName)) {
        this.fetchGroup(groupName);
    }

    return this.getEvent(groupName);

};

NDEvent.prototype.fetchGroup = function (groupName) {
    var self = this;

    $.ajax(
        {
            method: "GET",
            url: this.apiUrl,
            data: {group: groupName}
        }
    ).done(function (data) {
        if (data) {
            self.addEvent(groupName, data);
        }
    });
};

NDEvent.prototype.addEvent = function (groupName, data) {
    if (this.cache) {
        if (!this.isCached(groupName)) {
            this.cache.setItem(groupName, JSON.stringify(data));
        }
    } else {
        this.events[groupName] = JSON.stringify(data);
    }
};

NDEvent.prototype.getEvent = function (groupName) {
    if (!this.cache) {
        if (groupName in this.events) {
            return this.events[groupName];
        }
    }

    return this.getFromCache(groupName);
};

NDEvent.prototype.isCached = function (groupName) {

    if (!this.cache) {
        if (groupName in this.events) {
            return true;
        }
        return false;
    }

    if (!this.cache.getItem(groupName)) {
        return false;
    }

    return true;
};

NDEvent.prototype.getFromCache = function (groupName) {
    if (this.isCached(groupName)) {
        return JSON.parse(this.cache.getItem(groupName));
    }
}

// tomorrow's calculation taken from SO link: http://stackoverflow.com/questions/9444745/javascript-how-to-get-tomorrows-date-in-format-dd-mm-yy
NDEvent.prototype.refreshCache = function () {
    if (!this.cache) {
        return false;
    }

    if (this.cache.getItem('expiry')) {
        // reset if more than 24 hours
        if (new Date() > Date.parse(this.cache.getItem('expiry'))) {
            this.cache.clear();
            this.cache.setItem('expiry', new Date(new Date().getTime() + 24 * 60 * 60 * 1000));
        }
    } else {
        this.cache.setItem('expiry', new Date(new Date().getTime() + 24 * 60 * 60 * 1000));
    }
};

NDEvent.prototype.load = function (groupsArray) {

    var self = this;

    groupsArray.forEach(function (groupName) {
        self.getByGroup(groupName);
    });
};

NDEvent.prototype.addFilter = function () {
    var $filterList = $('<ul class="filters"></ul>');
    $('.header').append($filterList);
    var types = ["all", "tech", "design", "ops"];

    types.forEach(function (element) {
        var filter = '<li class="filter filter--' + element + ' " data-filter="' + element +
            '"><span>' + element.split(' ').map(function (s) {
                return s.slice(0, 1).toUpperCase() + s.slice(1).toLowerCase();
            }).join(' ') + '</span></li>';

        $filterList.append(filter);

    });

    $firstItem = $($filterList.children()[0]).addClass('filter--active');
    this.addFilterListener();


};

NDEvent.prototype.addFilterListener = function () {
    $('[data-filter]').on('click', function (e) {
        e.preventDefault();
        var filterSelected = $(this).data('filter');
        $('.filter').removeClass('filter--active').filter('[data-filter="' + filterSelected + '"]').addClass('filter--active');
        if (filterSelected == 'all') {
            $('.event').show();
        } else {
            $('.event').hide().filter('[data-theme="' + filterSelected + '"]').show();
        }
    });
};

NDEvent.prototype.sortByDate = function () {
    var $events = $.makeArray($(".events").find(".event"));
    var itemsToSort = $events.filter(function(e){ return $(e).data('isodate')});
    var emptyItems = $events.filter(function(e){ return !$(e).data('isodate')});;
    
    itemsToSort.sort(function (a, b) {
        return new Date($(a).data("isodate")) < new Date($(b).data("isodate"))? -1: new Date($(a).data("isodate")) > new Date($(b).data("isodate"))?1:0;
    });
    $events = emptyItems.concat(itemsToSort.reverse());
    
    $events.forEach(function (e) {

        $(".events").prepend($(e));
    });


};
/**
 Initialisation code
 **/


(function ($) {

    var arguments = {

        "api": "https://notts-digital.pavlakis.info/index.php"
    };


    var eventApi = new NDEvent(arguments),
        groupNodes = $('.vcard .url'),
        groups = groupNodes.map(function () {
            return $.trim($(this).text());
        }).get();

    eventApi.load(groups);
    $.ajax(); // dummy workaround for ajaxStop to always fire
    $(document).ajaxStop(function () {
        eventApi.renderEvents(groupNodes);
        eventApi.sortByDate();
    });
    eventApi.addFilter();


})(jQuery);
