Tasks = new Mongo.Collection('tasks');

TasksIndex = new EasySearch.Index({
  collection: Tasks,
  fields: ['username'],
  engine: new EasySearch.Minimongo()
});

if (Meteor.isClient) {
  Accounts.ui.config({
    passwordSignupFields: "USERNAME_ONLY"
  });

  angular.module('simple-todos', ['angular-meteor', 'accounts.ui']);

  angular.module('simple-todos').controller('TodosAppController', ['$scope', '$meteor',
    function ($scope, $meteor) {

      $scope.$meteorSubscribe('tasks');

      // tasks shown to user

      $scope.tasks = $meteor.collection(function () {
        return Tasks.find($scope.getReactively('query'), {
          sort: { createdAt: -1 }
        });
      });

      // search methods

      $scope.performSearch = function (params) {
        $scope.results = [];
        params = params.split(' ');

        _.each(params, function(param) {
          $scope.results.push(TasksIndex.search(param).fetch());
        });

        $scope.results = _.flatten($scope.results);
      };

      // task methods

      $scope.addTask = function(newTask) {
        $meteor.call('addTask', newTask);
      };

      $scope.deleteTask = function (task) {
        $meteor.call('deleteTask', task);
      };

      $scope.setChecked = function (task) {
        $meteor.call('setChecked', task, !task.checked);
      };

      $scope.setPrivate = function (task) {
        $meteor.call('setPrivate', task._id, !task.private);
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

      // upvotes & downvotes

      $scope.upvote = function (task, currentUser) {
        $meteor.call('upvote', task._id, currentUser._id);
      };

      $scope.downvote = function (task, currentUser) {
        $meteor.call('downvote', task._id, currentUser._id);
      };

      $scope.votes = function (task) {
        return calculateVotes(task.upvotes, task.downvotes);
      };

      $scope.upvoted = function (task, currentUser) {
        // debugger
        return Tasks.find({$and: [{_id: task._id}, {upvotes : { $elemMatch : {_id : currentUser._id }}}]}).count() > 0;
      };

      $scope.downvoted = function (task, currentUser) {
        return Tasks.find({$and: [{_id: task._id}, {downvotes : { $elemMatch : {_id : currentUser._id }}}]}).count() > 0;
      };

      // utility

      calculateVotes = function (upvotes, downvotes) {
        return upvotes.length - downvotes.length;
      };

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

  // task methods

  addTask: function (text) {
    if (!Meteor.userId()) {
      throw new Meteor.Error('not-authorized');
    }

    Tasks.insert({
      text:       text,
      createdAt:  new Date(),
      owner:      Meteor.userId(),
      username:   Meteor.user().username,
      upvotes:    [],
      downvotes:  [],
      comments:   []
    });
  },

  deleteTask: function (task) {
    if (task.private && task.owner !== Meteor.userId()) {
      throw new Meteor.Error('not-authorized');
    }

    Tasks.remove(task._id);
  },

  setChecked: function (task, setChecked) {
    if (task.private && task.owner !== Meteor.userId()) {
      throw new Meteor.Error('not-authorized');
    }

    Tasks.update(task._id, { $set: { checked: setChecked }});
  },

  setPrivate: function (taskId, setToPrivate) {
    var task = Tasks.findOne(taskId);

    if (task.owner !== Meteor.userId()) {
      throw new Meteor.Error('not-authorized');
    }

    Tasks.update(taskId, { $set: { private: setToPrivate }});
  },

  // comment methods

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
      comments:   []
    }}});
  },

  deleteComment: function (taskId, commentId) {
    Tasks.update(taskId, { $pull: { comments: { _id: commentId }} });
  },

  toggleComments: function (taskId, showComments) {
    Tasks.update(taskId, { $set: { showComments: showComments } });
  },

  // upvote methods

  upvote: function (taskId, currentUserId) {

    if (Tasks.find({$and: [{_id: taskId}, {upvotes : { $elemMatch : {_id : currentUserId }}}]}).count() > 0) {
      Tasks.update(taskId, { $pull: { upvotes: { _id: currentUserId  }}});
    } else {
      Tasks.update(taskId, { $pull: { downvotes: { _id: currentUserId  }}});
      Tasks.update(taskId, { $push: { upvotes:   { _id: currentUserId  }}});
    }

  },

  downvote: function (taskId, currentUserId) {

    if (Tasks.find({$and: [{_id: taskId}, {downvotes : { $elemMatch : {_id : currentUserId }}}]}).count() > 0) {
      Tasks.update(taskId, { $pull: { downvotes:   { _id: currentUserId  }}});
    } else {
      Tasks.update(taskId, { $pull: { upvotes: { _id: currentUserId  }}});
      Tasks.update(taskId, { $push: { downvotes:   { _id: currentUserId  }}});
    }

  },

  upvoted: function (taskId, currentUserId) {
    return Tasks.find({$and: [{_id: taskId}, {upvotes : { $elemMatch : {_id : currentUserId }}}]}).count() > 0;
  },

  downvoted: function (taskId, currentUserId) {
    return Tasks.find({$and: [{_id: taskId}, {downvotes : { $elemMatch : {_id : currentUserId }}}]}).count() > 0;
  }

});

if (Meteor.isServer) {
  Meteor.publish('tasks', function() {
    return Tasks.find({
      $or: [
        { private: { $ne: true } },
        { owner: this.userId }
      ]
    });
  });
}
