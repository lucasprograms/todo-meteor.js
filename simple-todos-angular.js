Tasks = new Mongo.Collection('tasks');

if (Meteor.isClient) {
  angular.module('simple-todos', ['angular-meteor']);

  angular.module('simple-todos').controller('TodosAppCtrl', ['$scope', '$meteor',
    function ($scope, $meteor) {

      $scope.tasks = $meteor.collection(Tasks);

      $scope.addTask = function(newTask) {
        $scope.tasks.push({
          text:       newTask,
          createdAt:  new Date()
        });
      };

    }]);
}

// if (Meteor.isServer) {
//   Meteor.startup(function () {
//     // code to run on server at startup
//   });
// }
