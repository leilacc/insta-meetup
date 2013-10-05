var Meetups = new Meteor.Collection("meetups");
// Map of tag to array of meetup IDs containing that tag
var TagHash = new Meteor.Collection("tagHash");
var curDate = new Date();

if (Meteor.isClient) {
  // for debugging
  window.Meetups = Meetups;
  window.TagHash = TagHash;

  Session.set('curr_tag', '');
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

  function deleteOld() {
    var meets = Meetups.find({});
    meets.forEach(function(meet) {
          if(curDate.getDate() > (parseInt(meet.timestamp)+3) % 30) {
            Meetups.remove({_id: meet._id});
          }
    });
  }

  deleteOld();

  Meteor.loginWithFacebook();
  Template.feed.meetups = function() {
    return Meetups.find({}).fetch().reverse();
  };

  Template.tag_results.results = function() {
    return Session.get('tag_results');
  };

  Template.tag_results.tag = function() {
    return Session.get('curr_tag');
  };

  function getTags(meetup) {
    var tokens = meetup.split(" ");
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

  Template.new_meetup.events({
    'submit #new_meetup_wrapper': function() {
      debugger;
      var $meetup = $('#new_meetup');
      var tags_tuple = getTags($meetup.val());
      var tags = tags_tuple[1];
      var datetime = "Creation Date: " + (curDate.getMonth()+1) + "/"
                      + (curDate.getDate())  + "/"
                      + curDate.getFullYear() + " @ "
                      + curDate.getHours() + ":"
                      + curDate.getMinutes() + ":"
                      + curDate.getSeconds();

      var new_meetup = Meetups.insert({meetup: $meetup.val(),
                                       tags: tags,
                                       meetup_with_linked_tags:
                                         tags_tuple[0],
                                       timestamp: new Date().getDate(),
                                       datetime: datetime});

      updateTagHash(new_meetup, tags);
      $meetup.val('');
      deleteOld();
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
      tag_results.push(Meetups.find({_id: curr_meetup_id}).fetch()[0]);
    }
    Session.set('tag_results', tag_results);
  }

  function setPageState() {
    setTagResults(window.location.hash);
  }

  function getMeetupsFromTagName(tag_name) {
    var tag_obj = TagHash.findOne({tag: tag_name});
    if (typeof tag_obj != 'undefined') {
      return tag_obj.meetup_ids   
    }
    return null;
  }

  Template.tag_results.events({
    'click .stop_tag_search': function(event) {
      Session.set('curr_tag', '');
      Session.set('tag_results', null);
      history.pushState(null, null, '/');
    }
  });
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
    Meteor.publish('tagHash', function() {
      return TagHash.find({});
    });
  });
}
