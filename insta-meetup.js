var Meetups = new Meteor.Collection("meetups");
var curDate = new Date();

if (Meteor.isClient) {
  window.Meetups = Meetups;

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

  Template.feed.events({
    'submit #new_meetup_wrapper': function() {
      var $meetup = $('#new_meetup');
      var datetime = "Creation Date: " + (curDate.getMonth()+1) + "/"
                      + (curDate.getDate())  + "/"
                      + curDate.getFullYear() + " @ "
                      + curDate.getHours() + ":"
                      + curDate.getMinutes() + ":"
                      + curDate.getSeconds();
      Meetups.insert({meetup: $meetup.val(), timestamp: new Date().getDate(), datetime: datetime});
      $meetup.val('');
      deleteOld();
      return false;
    }
  });
}

if (Meteor.isServer) {
  Meteor.startup(function () {
  //server functions
  });
}
