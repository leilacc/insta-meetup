var Meetups = new Meteor.Collection("meetups");
// Map of tag to array of meetup IDs containing that tag
var TagHash = new Meteor.Collection("tagHash");
var curDate = new Date();

if (Meteor.isClient) {
  // for debugging
  window.Meetups = Meetups;
  window.TagHash = TagHash;

  Session.set('curr_tags', []);
  Session.set('tag_results', null);

  var tagHash_loaded = false;
  Meteor.subscribe('tagHash', function() {
    tagHash_loaded = true;
    setPageState();
  });

  $(function() {
    $('body').on('click', 'a', function() {
      var url_suffix = $(this).attr('href').slice(1);
      if (url_suffix != window.location.hash) {
          // Trying to change to a different page
        if (url_suffix == '') {
          // Trying to go back to main page
          unsetCurrTag();
        } else {
          // Trying to go to a tag page
          history.pushState(null, null, encodeURI(url_suffix));
          setPageState();
        }

      }
      return false;
    });
  });

  Template.feed.ifOp = function(var1, options) {
    if(var1 == Meteor.user().services.facebook.id) {
      return options.fn(this);
    } else {
      return options.inverse(this);
    }
  };
  
  Template.feed.profileimg = function() {
    return "http://graph.facebook.com/" + Meteor.user().services.facebook.id + "/picture/?type=small";
  }

  function deleteOld() {
    var meets = Meetups.find({});
    meets.forEach(function(meet) {
          if(curDate.getDate() > (parseInt(meet.timestamp)+3) % 30) {
            Meetups.remove({_id: meet._id});
          }
    });
  }

  deleteOld();

  Accounts.ui.config({
    requestPermissions: {
        facebook: ['email'],
    },
    passwordSignupFields: 'USERNAME_AND_EMAIL'
  });

  Template.feed.meetups = function() {
    return Meetups.find({}).fetch().reverse();
  };

  function isExistingTag(tag_name) {
    return TagHash.findOne({tag: tag_name});
  }

  Template.feed.results = function() {
    for (var i = 0; i < Session.get('curr_tags'); i++) {
      if (isExistingTag(Session.get('curr_tags')[i])) {
        return true;
      }
    }
    return false;
  };

  Template.feed.userid = function() {
        return Meteor.user();
  };

  Template.tag_results.results = function() {
    return getTagResults(Session.get('curr_tags'));
  };

  Template.tag_results.tags = function() {
    return Session.get('curr_tags');
  };

  function getTags(meetup) {
    var tokens = meetup.split(" ");
    var tags = [];
    var linked_val = [];
    for (var i = 0; i < tokens.length; i++) {
      var curr_token = tokens[i];
      if (curr_token[0] == '#' && isExistingTag(curr_token)) {
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
    'input #new_meetup_wrapper': function() {
      debugger;
      var $meetup = $('#new_meetup');
      var tags = getTags($meetup.val())[1];
      var tagged_meetups = getTagResults(tags);
      Session.set('curr_tags', tags);
      Session.set('tag_results', tagged_meetups);
    }
  });

  Template.new_meetup.events({
    'submit #new_meetup_wrapper': function() {
      var $meetup = $('#new_meetup');
      var tags_tuple = getTags($meetup.val());
      var tags = tags_tuple[1];
      if(Meteor.user() == null) {
        Meteor.loginWithFacebook();
      }

      if(Meteor.user() != null) {
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
                                       datetime: datetime,
                                       userid: Meteor.user().services.facebook.id});

        updateTagHash(new_meetup, tags);
        $meetup.val('');
        deleteOld();
      }
      return false;
    }
  });

  window.onpopstate = function(event) {
    if (!tagHash_loaded) return;
    setPageState();
  };

  function getTagResults(tags) {
    // Returns an array of the Meetup objects that have a tag in tags
    var tag_meetup_ids = [];
    for (var i = 0; i < tags.length; i++) {
      var meetup_ids = getMeetupIdsFromTagName(tags[i]);
      if (meetup_ids != null) {
        for (var j = 0; j < meetup_ids.length; j++) {
          var curr_meetup_id = meetup_ids[i];
          if ($.inArray(curr_meetup_id, tag_meetup_ids) == -1) {
            // curr_meetup_id is not in tag_meetup_ids yet
            tag_meetup_ids.push(curr_meetup_id);
          }
        }
      }
    }
    if (tag_meetup_ids == null) {
      return null;
    }

    var tag_results = [];
    for (var i = 0; i < tag_meetup_ids.length; i++) {
      curr_meetup_id = tag_meetup_ids[i];
      tag_results.push(Meetups.findOne({_id: curr_meetup_id}));
    }
    return tag_results
  }

  function setPageState() {
    var new_tag = window.location.hash;
    Session.set('tag_results', getTagResults(new_tag));
    var new_tags = Session.get('curr_tags')
    new_tags.push(new_tag);
    Session.set('curr_tags', new_tags);
  }

  function getMeetupIdsFromTagName(tag_name) {
    var tag_obj = TagHash.findOne({tag: tag_name});
    if (typeof tag_obj != 'undefined') {
      return tag_obj.meetup_ids
    }
    return null;
  }

  function removeTagFromCurrTags(tag_name) {
    var curr_tags = Session.get('curr_tags');
    var new_tags = [];
    for (var i = 0; i < curr_tags.length; i++) {
      if (curr_tags[i] != tag_name) {
        new_tags.push(curr_tags[i]);
      }
    }
    Session.set('curr_tags', new_tags);
  }

  function removeTagFromResults(tag_name) {
    var results = Session.get('tag_results');
    if (results == null) {
      return results
    }

    var new_results = [];
    for (var i = 0; i < results.length; i++) {
      var tags = results[i].tags;
      if (tags.length != 1 || tags[0] != tag_name) {
        new_results.push(tags);
      }
    }
    return new_results;
  }

  function unsetCurrTag(tag_name) {
    removeTagFromCurrTags(tag_name);
    removeTagFromResults(tag_name);
    history.pushState(null, null, '/');
  }

  Template.tag_results.events({
    'click .stop_tag_search': function(event) {
      unsetCurrTag(this);
    }
  });

  Template.feed.events({
    'click .delete_meetup': function(event) {
      deleteMeetup(this);
    }
  });

  Template.tag_results.events({
    'click .delete_meetup': function(event) {
      deleteMeetup(this);
    }
  });

  function deleteMeetup(meetup){
    curUser = Meteor.user().services.facebook.id;
    console.log(curUser);
    console.log(meetup.userid);
    if (curUser == meetup.userid) {
        removeMeetupFromTagHash(meetup._id);
        Meetups.remove({_id: meetup._id});
    }
  }

  function removeMeetupFromTagHash(meetup_id) {
    var tags = Meetups.findOne({_id: meetup_id}).tags; 
    for (var i = 0; i < tags.length; i++) {
      var curr_tag = TagHash.findOne({tag: tags[i]});
      var curr_tag_meetup_ids = curr_tag.meetup_ids;
      var new_meetup_ids = [];
      for (var j = 0; j < curr_tag_meetup_ids.length; j++) {
        var curr_id = curr_tag_meetup_ids[j];
        if (curr_id != meetup_id) {
          new_meetup_ids.push(curr_id);
        }
      }
      TagHash.update({_id: curr_tag._id}, {$set: {meetup_ids: new_meetup_ids}});
    }
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
