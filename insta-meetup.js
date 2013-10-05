var Meetups = new Meteor.Collection("meetups");

if (Meteor.isClient) {
  window.Meetups = Meetups;
  Meteor.loginWithFacebook();

  Template.feed.meetups = function() {
    return Meetups.find({}).fetch().reverse();
  };

  Template.feed.events({
    'submit #new_meetup_wrapper': function() {
      var $meetup = $('#new_meetup');
      Meetups.insert({meetup: $meetup.val()});
      //$meetup.val() = '';
      return false;
    }
  });
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });
}
