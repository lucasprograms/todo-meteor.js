Tasks = new Mongo.Collection('tasks');

if (Meteor.isClient) {
  angular.module('simple-todos', ['angular-meteor']);

  angular.module('simple-todos').controller('TodosAppCtrl', ['$scope', '$meteor',
    function ($scope, $meteor) {

      $scope.tasks = $meteor.collection(function () {
        return Tasks.find($scope.getReactively('query'), {
          sort: { createdAt: -1 }
        });
      });

      $scope.incompleteCount = function () {
        return Tasks.find({ checked: { $ne: true } }).count();
      };

      $scope.addTask = function(newTask) {
        $scope.tasks.push({
          text:       newTask,
          createdAt:  new Date()
        });

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

// if (Meteor.isServer) {
//   Meteor.startup(function () {
//     // code to run on server at startup
//   });
// }
