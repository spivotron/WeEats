"use strict";

/*
	This script will handle the user authentication and login
*/
angular.module("WeEats.controllers").controller("AdminAuthCtrl", 
	['FIREBASE_ROOT', '$scope', '$location', 'SlackAuthService', '$firebaseObject',
	function (FIREBASE_ROOT, $scope, $location, SlackAuthService, $firebaseObject){

		var userRef = new Firebase(FIREBASE_ROOT);

		$scope.user = {
			email: '',
			password: ''
		};

		$scope.auth = function() {
			userRef.createUser({
			  email    : $scope.user.email,
			  password : $scope.user.password
			}, function(error, userData) {
			  if (error) {
			    console.log("Error creating user:", error);
			    alert(error.toString());
			  } else {
			    console.log("Successfully created user account with uid:", userData.uid);
			    //SlackAuthService.authorize();
			    $scope.login($scope.user.email, $scope.user.password);
			  }
			});
		}

		$scope.login = function(email, password) {
			userRef.authWithPassword({
			  email    : $scope.user.email,
			 	password : $scope.user.password
			}, function(error, authData) {
			  if (error) {
			    console.log("Login Failed!", error);
			    alert(error.toString());
			  } else {
			    console.log("Authenticated successfully with payload:", authData);
	    		if(authData.uid) {
	    			userRef = new Firebase(FIREBASE_ROOT+"/users/"+authData.uid);
	    			var userObj = $firebaseObject(userRef);		    			
	    			userObj.$loaded(function(data){
	    				if (userObj.access_token) { // they have already added slack
	    					$location.path("/home");
	    					if(!$scope.$$phase) $scope.$apply();
	    				} else {
	    					$location.path("/view1");
	    					if(!$scope.$$phase) $scope.$apply();
	    				}
	    			})
	    			
	    		} else {
	    			$location.path('/view1');
	    		}
			  }
			});
		}
		



}]);