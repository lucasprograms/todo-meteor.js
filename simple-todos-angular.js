Tasks = new Mongo.Collection('tasks');

if (Meteor.isClient) {
  Accounts.ui.config({
    passwordSignupFields: "USERNAME_ONLY"
  });

  angular.module('simple-todos', ['angular-meteor', 'accounts.ui']);

  angular.module('simple-todos').controller('TodosAppCtrl', ['$scope', '$meteor',
    function ($scope, $meteor) {

      $scope.$meteorSubscribe('tasks');

      // tasks shown to user

      $scope.tasks = $meteor.collection(function () {
        return Tasks.find($scope.getReactively('query'), {
          sort: { createdAt: -1 }
        });
      });

      // task methods

      $scope.addTask = function(newTask) {
        $meteor.call('addTask', newTask);
      };

      $scope.deleteTask = function (task) {
        $meteor.call('deleteTask', task._id);
      };

      $scope.setChecked = function (task) {
        $meteor.call('setChecked', task._id, !task.checked);
      };

      // comment methods

      $scope.addComment = function (task, comment) {
        $meteor.call('addComment', task._id, comment);
      };

      $scope.deleteComment = function (task, comment) {
        $meteor.call('deleteComment', task._id, comment._id);
      };

      $scope.toggleComments = function (task) {
        $meteor.call('toggleComments', task._id, !task.showComments);
      };

      // utility

      $scope.incompleteCount = function () {
        return Tasks.find({ checked: { $ne: true } }).count();
      };

      $scope.$watch('hideCompleted', function () {
        if ($scope.hideCompleted) {
          $scope.query = { checked: { $ne: true }};
        } else {
          $scope.query = {};
        }
      });
    }]);
}

Meteor.methods({
  addComment: function (taskId, commentText) {
    if (!Meteor.userId()) {
      throw new Meteor.Error('not-authorized');
    }

    Tasks.update(taskId, { $push: { comments: {
      _id:        _.random(0, 100000000000000000),
      // new Meteor.Collection.ObjectID() presents issue when deleting
      text:       commentText,
      createdAt:  new Date(),
      owner:      Meteor.userId(),
      username:   Meteor.user().username,
      upvotes:    [],
      downvotes:  [],
      comments:   []
    }}});
  },

  deleteComment: function (taskId, commentId) {
    Tasks.update(taskId, { $pull: { comments: { _id: commentId }} });
  },

  toggleComments: function (taskId, showComments) {
    Tasks.update(taskId, { $set: { showComments: showComments } });
  },

  addTask: function (text) {
    if (!Meteor.userId()) {
      throw new Meteor.Error('not-authorized');
    }

    Tasks.insert({
      text:       text,
      createdAt:  new Date(),
      owner:      Meteor.userId(),
      username:   Meteor.user().username,
      comments:   []
    });
  },

  deleteTask: function (taskId) {
    Tasks.remove(taskId);
  },

  setChecked: function (taskId, setChecked) {
    Tasks.update(taskId, { $set: { checked: setChecked }});
  }
});

if (Meteor.isServer) {
  Meteor.publish('tasks', function() {
    return Tasks.find();
  });
}
