var Meetups = new Meteor.Collection("meetups");

if (Meteor.isClient) {
  window.Meetups = Meetups;

  Template.feed.meetups = function() {
    return Meetups.find({}).fetch();
  };

  Template.feed.events({
    'submit #new_meetup_wrapper': function() {
      var $meetup = $('#new_meetup');
      console.log($meetup.val());
      Meetups.insert({meetup: $meetup.val()});
      return false;
    }
  });
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });
}
