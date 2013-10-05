var Meetups = new Meteor.Collection("meetups");
// Map of tag to array of meetup IDs containing that tag
var TagHash = new Meteor.Collection("tagHash");

if (Meteor.isClient) {
  // for debugging
  window.Meetups = Meetups;
  window.TagHash = TagHash;

  Session.set('curr_tag', null);
  Session.set('tag_results', null);

  var tagHash_loaded = false;
  Meteor.subscribe('tagHash', function() {
    tagHash_loaded = true;
    setPageState();
  });

  $(function() {
    $('body').on('click', 'a', function() {
      history.pushState(null, null, encodeURI($(this).attr('href')));
      setPageState();
      return false;
    });
  });

  Template.feed.meetups = function() {
    return Meetups.find({}).fetch().reverse();
  };

  Template.tag_results.results = function() {
    return Session.get('tag_results');
  };

  function getTags(activity) {
    var tokens = activity.split(" ");
    var tags = [];
    var linked_val = [];
    for (var i = 0; i < tokens.length; i++) {
      var curr_token = tokens[i];
      if (curr_token[0] == '#') {
        tags.push(curr_token);
        linked_val.push('<a href="/' + curr_token + '">' + curr_token + '</a>');
      } else {
        linked_val.push(curr_token);
      }
    }
    return [linked_val.join(' '), tags];
  }

  function updateTagHash(meetup_id, tags) {
    for (var i = 0; i < tags.length; i++) {
      var curr_tag = tags[i];
      var tag = TagHash.findOne({tag: curr_tag});
      if (typeof tag == 'undefined') {
        TagHash.insert({tag: curr_tag, meetup_ids: [meetup_id]});
      } else {
        TagHash.update({_id: tag._id}, {$push: {meetup_ids: meetup_id}});
      }
    }
  }

  Template.feed.events({
    'submit #new_meetup_wrapper': function() {
      var $activity = $('#new_activity');
      var tags_tuple = getTags($activity.val());
      var tags = tags_tuple[1];
      var new_meetup = Meetups.insert({activity: $activity.val(),
                                       tags: tags,
                                       activity_with_linked_tags:
                                         tags_tuple[0]});
      updateTagHash(new_meetup, tags);
      return false;
    }
  });

  window.onpopstate = function(event) {
    if (!tagHash_loaded) return;
    setPageState();
  };

  function setTagResults(tag_name) {
    Session.set('curr_tag', tag_name);
    var tag_meetup_ids = getMeetupsFromTagName(tag_name);
    if (tag_meetup_ids == null) {
      return null;
    }

    var tag_results = [];
    for (var i = 0; i < tag_meetup_ids.length; i++) {
      curr_meetup_id = tag_meetup_ids[i];
      tag_results.push(Meetups.find({_id: curr_meetup_id}).fetch());
    }
    Session.set('tag_results', tag_results);
  }

  function setPageState() {
    setTagResults(getTagFromURI());
  }

  function getTagFromURI() {
    // Returns the tag specified in the URI
    return window.location.hash;
  }

  function getMeetupsFromTagName(tag_name) {
    var tag_obj = TagHash.findOne({tag: tag_name});
    if (typeof tag_obj != 'undefined') {
      return tag_obj.meetup_ids   
    }
    return null;
  }
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
    Meteor.publish('tagHash', function() {
      return TagHash.find({});
    });
  });
}
